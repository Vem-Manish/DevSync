import { checkAuthCallback, initiateLogin, getStoredToken } from './modules/authView.js';

// --- Theme Orchestration ---
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = document.getElementById('theme-icon-sun');
const moonIcon = document.getElementById('theme-icon-moon');

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    sunIcon?.classList.remove('hidden');
    moonIcon?.classList.add('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    sunIcon?.classList.add('hidden');
    moonIcon?.classList.remove('hidden');
  }
  localStorage.setItem('devsync_theme', theme);
}

const savedTheme = localStorage.getItem('devsync_theme') || 
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);

themeToggle?.addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
});

// --- State Management ---
let ACTIVE_PROJECT = null;

export function getActiveProject() {
  if (!ACTIVE_PROJECT) {
    const cached = localStorage.getItem('devsync_active_project');
    if (cached) {
      try {
        ACTIVE_PROJECT = JSON.parse(cached);
      } catch (e) {
        ACTIVE_PROJECT = null;
      }
    }
  }
  return ACTIVE_PROJECT;
}

const moduleContainer = document.getElementById('module-container');
const sidebar = document.getElementById('app-sidebar');
const breadcrumb = document.getElementById('workspace-breadcrumb');
const breadcrumbProjectName = document.getElementById('breadcrumb-project-name');
const repoLabel = document.getElementById('current-repo-label');
const roleLabel = document.getElementById('current-role-label');
const navButtons = document.querySelectorAll('#nav-tabs button');

const MODULE_REGISTRY = {
  dashboard: { file: './modules/dashboardView.js' },
  wizard: { file: './modules/wizardView.js' },
  mission: { file: './modules/missionHub.js' },
  editor: { file: './modules/editorView.js' },
  conflict: { file: './modules/conflictView.js' }
};

export async function navigate(viewKey) {
  // If user clicks the Team & Invites tab, render inline
  if (viewKey === 'team') {
    if (sidebar) {
      sidebar.classList.remove('hidden');
      sidebar.classList.add('flex');
    }
    if (breadcrumb) {
      breadcrumb.classList.remove('hidden');
      breadcrumb.classList.add('flex');
    }
    updateNavSelection('team');
    renderTeamRosterView(moduleContainer);
    return;
  }

  const config = MODULE_REGISTRY[viewKey];
  if (!config) return;

  if (viewKey === 'dashboard' || viewKey === 'wizard') {
    if (sidebar) {
      sidebar.classList.add('hidden');
      sidebar.classList.remove('flex');
    }
    if (breadcrumb) {
      breadcrumb.classList.add('hidden');
      breadcrumb.classList.remove('flex');
    }
  } else {
    if (sidebar) {
      sidebar.classList.remove('hidden');
      sidebar.classList.add('flex');
    }
    if (breadcrumb) {
      breadcrumb.classList.remove('hidden');
      breadcrumb.classList.add('flex');
    }

    const project = getActiveProject();
    if (project) {
      if (breadcrumbProjectName) breadcrumbProjectName.textContent = project.name;
      if (repoLabel) repoLabel.textContent = project.full_name;
      if (roleLabel) roleLabel.textContent = project.is_lead ? 'Role: Project Lead' : `Branch: ${project.assigned_branch}`;
    }

    updateNavSelection(viewKey);
  }

  try {
    // Dynamic import with timestamp to prevent module caching
    const module = await import(`${config.file}?t=${Date.now()}`);
    module.render(moduleContainer);
  } catch (err) {
    console.error(`Failed to load view ${viewKey}:`, err);
    if (moduleContainer) {
      moduleContainer.innerHTML = `<div class="ds-card p-6 text-rose-500 font-mono text-sm">Failed to load view: ${err.message}</div>`;
    }
  }
}

function updateNavSelection(selectedTab) {
  navButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === selectedTab) {
      btn.classList.add('active');
      btn.querySelector('svg')?.classList.add('text-[var(--royal-gold)]');
    } else {
      btn.classList.remove('active');
      btn.querySelector('svg')?.classList.remove('text-[var(--royal-gold)]');
    }
  });
}

// In-project team view, mission brief & branch visualizer
function renderTeamRosterView(container) {
  const token = getStoredToken();
  const project = getActiveProject();

  if (!project) {
    container.innerHTML = `<div class="ds-card text-center py-12"><p class="text-sm">No active project selected.</p></div>`;
    return;
  }

  const isLead = project.is_lead;
  const user = JSON.parse(localStorage.getItem('devsync_user_profile') || '{}');
  const myUsername = user.username || '';
  const myMemberInfo = project.members ? project.members[myUsername] : null;

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      <div class="border-b border-[var(--border-subtle)] pb-5 flex items-center justify-between">
        <div>
          <h2 class="font-serif text-3xl font-bold tracking-tight text-[var(--royal-navy)]">Team Hub & Mission Brief</h2>
          <p class="text-sm text-[var(--text-secondary)] mt-1.5">Project orientation, domain boundaries, and branch topology for <span class="font-mono text-[var(--royal-gold)]">${project.full_name}</span>.</p>
        </div>
        <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${isLead ? 'bg-amber-500/10 text-[var(--royal-gold)] border border-[var(--border-gold)]' : 'bg-emerald-500/10 text-emerald-500'}">
          ${isLead ? 'ROLE: PROJECT LEAD' : 'ROLE: COLLABORATOR'}
        </span>
      </div>

      <!-- Feature 1: Assignment Brief -->
      <div class="ds-card border-[var(--border-gold)] bg-amber-500/5 p-4.5 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-base">🎯</span>
            <h3 class="font-cinzel text-xs font-bold tracking-wider text-[var(--royal-gold)] uppercase">Active Assignment Brief</h3>
          </div>
          <span class="text-xs font-mono text-[var(--text-tertiary)]">${isLead ? 'Trunk & Merge Governance' : (myMemberInfo?.branch || 'Collaborator')}</span>
        </div>
        <p class="text-xs text-[var(--text-secondary)] leading-relaxed">
          ${isLead 
            ? 'As Project Lead, you have complete authority to scaffold architecture, cut team branches, review pull requests, and execute 1-Click merges into main.' 
            : `Welcome aboard! You are writing features inside <strong>${myMemberInfo?.branch || 'your branch'}</strong>. You can drag and drop assets, write code in the Studio, and audit pull requests. Your code is protected from overwriting main.`}
        </p>
      </div>

      <!-- Feature 2: Branch Graph -->
      <div class="ds-card space-y-3">
        <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div class="flex items-center gap-2">
            <span class="text-base">🌳</span>
            <h3 class="font-serif text-base font-semibold text-[var(--royal-navy)]">Branch Architecture Topology</h3>
          </div>
          <button id="btn-refresh-graph" class="text-xs font-mono text-[var(--royal-gold)] hover:underline cursor-pointer">Refresh Topology</button>
        </div>
        <p class="text-xs text-[var(--text-secondary)]">Live branch divergence relative to the production main trunk:</p>
        <div id="branch-graph-container" class="space-y-2 font-mono text-xs pt-1">
          <p class="text-[var(--text-tertiary)] animate-pulse">Calculating branch tracks...</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Invite Card (Lead only) -->
        <div class="ds-card lg:col-span-1 space-y-4 ${!isLead ? 'opacity-60 pointer-events-none' : ''}">
          <div class="border-b border-[var(--border-subtle)] pb-3">
            <h3 class="font-serif text-lg font-semibold text-[var(--royal-navy)]">Invite Collaborator</h3>
            <p class="text-xs text-[var(--text-secondary)] mt-0.5">Sends a GitHub invite & cuts their feature branch automatically.</p>
          </div>

          <form id="form-invite-member" class="space-y-3">
            <div>
              <label class="block text-[11px] font-mono text-[var(--text-secondary)] uppercase mb-1">GitHub Username</label>
              <input type="text" id="invite-username" required placeholder="e.g. octocat"
                class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-xs text-[var(--text-main)] focus:border-[var(--royal-gold)]">
            </div>

            <div>
              <label class="block text-[11px] font-mono text-[var(--text-secondary)] uppercase mb-1">Role Title</label>
              <input type="text" id="invite-role" required placeholder="e.g. Quality Engineer"
                class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-xs text-[var(--text-main)] focus:border-[var(--royal-gold)]">
            </div>

            <div>
              <label class="block text-[11px] font-mono text-[var(--text-secondary)] uppercase mb-1">Assigned Feature Branch</label>
              <input type="text" id="invite-branch" required placeholder="e.g. feat/qa-testing"
                class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-xs font-mono text-[var(--royal-gold)] focus:border-[var(--royal-gold)]">
            </div>

            <button type="submit" id="btn-submit-invite" ${!isLead ? 'disabled' : ''} class="w-full ds-btn ds-btn-primary py-2.5 mt-2">
              <span>Send GitHub Invite</span>
            </button>
            <div id="invite-status" class="text-xs font-mono text-center"></div>
          </form>
        </div>

        <!-- Team Roster -->
        <div class="ds-card lg:col-span-2 space-y-4">
          <div class="border-b border-[var(--border-subtle)] pb-3 flex items-center justify-between">
            <h3 class="font-serif text-lg font-semibold text-[var(--royal-navy)]">Active Domain Matrix</h3>
            <span class="text-xs font-mono text-[var(--text-tertiary)]">Synced via .devsync.json</span>
          </div>

          <div id="roster-list" class="space-y-2.5">
            <div class="p-3 rounded-xl border border-[var(--border-gold)] bg-[var(--bg-surface-elevated)] flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-[var(--royal-gold)] border border-[var(--border-gold)] font-mono">LEAD</span>
                <div>
                  <p class="text-xs font-bold text-[var(--text-main)]">@${project.lead_username}</p>
                  <p class="text-[11px] text-[var(--text-secondary)]">Repository Owner & Full Admin</p>
                </div>
              </div>
              <span class="text-xs font-mono text-[var(--text-tertiary)]">All Branches (Merge Access)</span>
            </div>
            <div id="member-rows-container" class="space-y-2.5"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  async function loadGraph() {
    const graphBox = document.getElementById('branch-graph-container');
    if (!graphBox) return;

    try {
      const res = await fetch(`/api/resolver/branch-graph?repo_name=${encodeURIComponent(project.full_name)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      graphBox.innerHTML = '';

      if (!data.nodes || !data.nodes.length) {
        graphBox.innerHTML = '<p class="text-[var(--text-tertiary)]">No remote branches detected.</p>';
        return;
      }

      data.nodes.forEach(node => {
        const row = document.createElement('div');
        row.className = 'p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] flex items-center justify-between';
        
        if (node.is_main) {
          row.innerHTML = `
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-blue-500"></span>
              <span class="font-bold text-[var(--royal-navy)]">main (Trunk)</span>
            </div>
            <span class="text-[11px] text-[var(--text-tertiary)]">Base SHA: ${node.latest_commit_sha}</span>
          `;
        } else {
          row.innerHTML = `
            <div class="flex items-center gap-2">
              <span class="text-[var(--royal-gold)]">└──</span>
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span class="text-[var(--text-main)] font-semibold">${node.branch}</span>
            </div>
            <div class="flex items-center gap-2 text-[11px]">
              <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">+${node.ahead_by} ahead</span>
              <span class="text-[var(--text-tertiary)]">SHA: ${node.latest_commit_sha}</span>
            </div>
          `;
        }
        graphBox.appendChild(row);
      });
    } catch (err) {
      graphBox.innerHTML = `<p class="text-rose-500 text-xs">Failed to load branch graph: ${err.message}</p>`;
    }
  }

  loadGraph();
  document.getElementById('btn-refresh-graph')?.addEventListener('click', loadGraph);

  function renderMembers() {
    const container = document.getElementById('member-rows-container');
    if (!container) return;
    container.innerHTML = '';
    const members = project.members || {};
    const entries = Object.entries(members);

    if (entries.length === 0) {
      container.innerHTML = `<p class="text-xs text-[var(--text-tertiary)] py-4 text-center">No additional teammates assigned yet.</p>`;
      return;
    }

    entries.forEach(([u, info]) => {
      const row = document.createElement('div');
      row.className = 'p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] flex items-center justify-between';
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-mono">MEMBER</span>
          <div>
            <p class="text-xs font-bold text-[var(--text-main)]">@${u}</p>
            <p class="text-[11px] text-[var(--text-secondary)]">${info.role || 'Collaborator'}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs font-mono font-bold text-[var(--royal-gold)]">${info.branch}</span>
          <p class="text-[10px] text-[var(--text-tertiary)]">Assigned Branch</p>
        </div>
      `;
      container.appendChild(row);
    });
  }

  renderMembers();

  // Invite handler
  document.getElementById('form-invite-member')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-invite');
    const status = document.getElementById('invite-status');

    const username = document.getElementById('invite-username').value.trim();
    const role = document.getElementById('invite-role').value.trim();
    const branch_name = document.getElementById('invite-branch').value.trim();

    btn.disabled = true;
    btn.innerHTML = `<span class="animate-pulse">Dispatching Invite...</span>`;
    status.innerHTML = `<span class="text-[var(--text-secondary)]">Calling GitHub API...</span>`;

    try {
      const res = await fetch('/api/provision/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          repo_name: project.full_name,
          username,
          role,
          branch_name
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invite failed');

      status.innerHTML = `<span class="text-emerald-500 font-bold">${data.message}</span>`;
      document.getElementById('form-invite-member').reset();

      if (!project.members) project.members = {};
      project.members[username] = { role, branch: branch_name };
      localStorage.setItem('devsync_active_project', JSON.stringify(project));
      renderMembers();
      loadGraph();
    } catch (err) {
      status.innerHTML = `<span class="text-rose-500 font-bold">Error: ${err.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>Send GitHub Invite</span>`;
    }
  });
}

// Global App API
window.DevSyncApp = {
  selectProject: (project) => {
    ACTIVE_PROJECT = project;
    localStorage.setItem('devsync_active_project', JSON.stringify(project));
    navigate('team');
  },
  openProvisioner: () => {
    navigate('wizard');
  },
  openDashboard: () => {
    ACTIVE_PROJECT = null;
    localStorage.removeItem('devsync_active_project');
    navigate('dashboard');
  }
};

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    navigate(btn.getAttribute('data-tab'));
  });
});

document.getElementById('btn-home-logo')?.addEventListener('click', () => window.DevSyncApp.openDashboard());
document.getElementById('btn-back-projects')?.addEventListener('click', () => window.DevSyncApp.openDashboard());

// App Initialization
(async () => {
  await checkAuthCallback();
  const token = getStoredToken();
  if (token && getActiveProject()) {
    navigate('team');
  } else {
    navigate('dashboard');
  }
})();