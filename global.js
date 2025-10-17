console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// -- Automatic navigation menu --
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/DSC106_Portfolio/"; 

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'resume/', title: 'Resume' },
  { url: 'contact/', title: 'Contact' },
  { url: 'https://github.com/wendydu1102', title: 'GitHub' }
];

let nav = document.createElement('nav');
let ul = document.createElement('ul');
nav.append(ul);
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  
  // Adjust URL for local vs. GitHub Pages hosting
  url = !url.startsWith('http') ? BASE_PATH + url : url;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  
  // Highlight current page
  a.classList.toggle('current', a.host === location.host && a.pathname === location.pathname);

  // Open external links in a new tab
  if (a.host !== location.host) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  
  let li = document.createElement('li');
  li.append(a);
  ul.append(li);
}

// -- Dark mode switch --
document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
			<option value="light dark">Automatic</option>
			<option value="light">Light</option>
			<option value="dark">Dark</option>
		</select>
	</label>`,
);

const colorSchemeSelect = document.querySelector('.color-scheme select');

function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty('color-scheme', colorScheme);
    localStorage.colorScheme = colorScheme;
    if (colorSchemeSelect) {
        colorSchemeSelect.value = colorScheme;
    }
}

// Apply saved theme on page load
if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
}

// Add event listener for theme changes
colorSchemeSelect?.addEventListener('input', function (event) {
  setColorScheme(event.target.value);
});


// -- Better contact form (Optional) --
const contactForm = document.querySelector("main form");

contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
  
    const data = new FormData(contactForm);
    const params = new URLSearchParams(); // This handles URL encoding correctly
  
    for (const [name, value] of data) {
      params.append(name, value);
    }
  
    let url = contactForm.action + "?" + params.toString();
    location.href = url;
});