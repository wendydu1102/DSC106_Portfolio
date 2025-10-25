import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

// --- Render GitHub Stats ---
const githubData = await fetchGitHubData('wendydu1102'); // Using your GitHub username
const profileStats = document.querySelector('#profile-stats');

if (profileStats && githubData) {
  profileStats.innerHTML = `
        <dl>
          <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
          <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
          <dt>Followers:</dt><dd>${githubData.followers}</dd>
          <dt>Following:</dt><dd>${githubData.following}</dd>
        </dl>
    `;
}

// --- Render Latest Projects ---
const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);
const projectsContainer = document.querySelector('.projects');

if (latestProjects && projectsContainer) {
    renderProjects(latestProjects, projectsContainer, 'h2');
}