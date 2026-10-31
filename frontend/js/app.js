// Theme Toggle Controller
const themeToggleBtn = document.getElementById('theme-toggle');
const sunIcon = document.getElementById('theme-icon-sun');
const moonIcon = document.getElementById('theme-icon-moon');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('devsync_theme', theme);
  if (theme === 'dark') {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  } else {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('moon');
    moonIcon.classList.remove('hidden');
  }
}

// Initial theme setup (from localStorage or default to light)
const savedTheme = localStorage.getItem('devsync_theme') || 'light';
applyTheme(savedTheme);

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'light' ? 'dark' : 'light');
});

// Dynamic Module Loader
const moduleContainer = document.getElementById('module-container');
const tabs = document.querySelectorAll('.nav-item');

async function switchTab(tabName) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  moduleContainer.innerHTML = `<div class="text-[var(--text-tertiary)] animate-pulse">Loading module...</div>`;

  try {
    let module;
    if (tabName === 'wizard') module = await import('./modules/wizardView.js');
    if (tabName === 'mission') module = await import('./modules/missionHub.js');
    if (tabName === 'editor') module = await import('./modules/editorView.js');
    if (tabName === 'conflict') module = await import('./modules/conflictView.js');

    if (module && module.render) {
      module.render(moduleContainer);
    }
  } catch (err) {
    moduleContainer.innerHTML = `
      <div class="ds-card max-w-lg border-dashed">
        <h3 class="text-sm font-semibold text-[var(--text-main)]">Module Under Active Development</h3>
        <p class="text-xs text-[var(--text-secondary)] mt-1">This module is currently assigned to a teammate and will activate upon merge.</p>
      </div>`;
  }
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

switchTab('wizard');