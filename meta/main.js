import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Hoist scales and data to be accessible by multiple functions
let xScale, yScale; 
let commits; 

// --- Step 1.1: Reading the CSV file ---
async function loadData() {
  try {
    const data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line),
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));
    
    if (data.length === 0) {
        throw new Error("CSV file is empty or could not be loaded.");
    }

    return data;
  } catch (error) {
    console.error("Error loading or parsing CSV data:", error);
    // Display a user-friendly message on the page
    d3.select("main").html(`
        <h1>Error</h1>
        <p>Could not load the code analysis data (loc.csv).</p>
        <p>Please ensure you have run the following command in your project's terminal:</p>
        <pre><code>npx elocuent -d . -o meta/loc.csv --spaces 2</code></pre>
    `);
    return null;
  }
}

// --- Step 1.2: Computing commit data ---
function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/wendydu1102/DSC106_Portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false, 
        configurable: true,
        writable: true,
      });

      return ret;
    });
}

// --- Step 1.3: Displaying summary stats (Updated to match Figure 1) ---
function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // Commits
  dl.append('dt').text('Commits');
  dl.append('dd').text(commits.length);

  // Files
  const numFiles = d3.group(data, d => d.file).size;
  dl.append('dt').text('Files');
  dl.append('dd').text(numFiles);

  // Total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // Max Depth
  const maxDepth = d3.max(data, d => d.depth);
  dl.append('dt').text('Max Depth');
  dl.append('dd').text(maxDepth);

  // Longest Line
  const longestLine = d3.max(data, d => d.length);
  dl.append('dt').text('Longest Line');
  dl.append('dd').text(longestLine);

  // Max Lines (in a single file)
  const fileLengths = d3.rollups(data, v => d3.max(v, d => d.line), d => d.file);
  const maxLines = d3.max(fileLengths, d => d[1]);
  dl.append('dt').text('Max Lines');
  dl.append('dd').text(maxLines);
}


// --- Step 2 & 4: Scatterplot ---
function renderScatterPlot(commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Scales (assign to hoisted variables)
  xScale = d3.scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();
    
  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  // Step 4.1 & 4.2: Radius scale
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([3, 25]);

  // Step 2.3: Gridlines
  const gridlines = svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).ticks(12).tickFormat('').tickSize(-usableArea.width));

  // Step 2.2: Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .ticks(12)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // Step 4.3: Sort commits for rendering
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  // Step 2.1 & 4.1: Dots and Tooltip events
  const dots = svg.append('g').attr('class', 'dots');
  
  dots.selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1).raise();
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  // Step 5: Brushing
  const brush = d3.brush()
    .extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
    .on('start brush end', brushed);

  svg.append('g')
    .attr('class', 'brush')
    .call(brush);
    
  // Step 5.2: Raise dots over brush overlay
  dots.raise();
}

// --- Step 3: Tooltip Functions ---
function renderTooltipContent(commit) {
  if (!commit || Object.keys(commit).length === 0) return;

  d3.select('#commit-link').attr('href', commit.url).text(commit.id.substring(0, 7));
  d3.select('#commit-date').text(commit.datetime?.toLocaleDateString('en', { dateStyle: 'full' }));
  d3.select('#commit-time').text(commit.datetime?.toLocaleTimeString('en'));
  d3.select('#commit-author').text(commit.author);
  d3.select('#commit-lines').text(commit.totalLines);
}

function updateTooltipVisibility(isVisible) {
  d3.select('#commit-tooltip').attr('hidden', isVisible ? null : true);
}

function updateTooltipPosition(event) {
  const tooltip = d3.select('#commit-tooltip');
  const offsetX = 15;
  const offsetY = 15;
  tooltip.style('left', `${event.clientX + offsetX}px`);
  tooltip.style('top', `${event.clientY + offsetY}px`);
}

// --- Step 5: Brushing Functions ---
function isCommitSelected(selection, commit) {
  if (!selection) return false;

  const [[x0, y0], [x1, y1]] = selection;
  const cx = xScale(commit.datetime);
  const cy = yScale(commit.hourFrac);

  return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
}

function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commit(s) selected`;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');
  
  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const lines = selectedCommits.flatMap((d) => d.lines);

  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  container.innerHTML = '';

  const sortedBreakdown = Array.from(breakdown).sort(([, a], [, b]) => b - a);

  for (const [language, count] of sortedBreakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}

function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d),
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}


// --- Main Execution ---
async function main() {
  const data = await loadData();
  if (!data) return; // Stop execution if data failed to load

  commits = processCommits(data);

  renderCommitInfo(data, commits);
  renderScatterPlot(commits);
}

main();