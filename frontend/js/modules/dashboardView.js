import { getStoredToken, getStoredUser } from './authView.js';

export function render(container) {
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token) {
    container.innerHTML = `
      <div class="max-w-xl mx-auto ds-card text-center py-16 space-y-4 animate-fadeIn">
        <h2 class="font-serif text-2xl font-bold text-[var(--royal-navy)]">Authentication Required</h2>
        <p class="text-sm text-[var(--text-secondary)]">Sign in with GitHub to view your active projects and collaboration invites.</p>
        <button onclick="document.getElementById('btn-login')?.click()" class="ds-btn ds-btn-primary">
          Sign In with GitHub
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      <!-- Dashboard Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <h2 class="font-serif text-3xl font-bold tracking-tight text-[var(--royal-navy)]">Project Command Center</h2>
          <p class="text-sm text-[var(--text-secondary)] mt-1">Manage active DevSync repositories, accept team invitations, and provision isolated suites.</p>
        </div>
        <button id="btn-create-project-launcher" class="ds-btn ds-btn-primary py-2.5 px-4 font-semibold">
          <svg class="w-4 h-4 text-[#c29b48]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          <span>Provision New Project</span>
        </button>
      </div>

      <!-- Section: Pending Invitations Shelf -->
      <div id="invitations-shelf" class="hidden space-y-3">
        <h3 class="font-cinzel text-xs font-bold tracking-wider text-[var(--royal-gold)] uppercase">Pending Team Invitations</h3>
        <div id="invitations-list" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
      </div>

      <!-- Section: Active Projects Grid -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-cinzel text-xs font-bold tracking-wider text-[var(--text-tertiary)] uppercase">Assigned Workspaces</h3>
          <span id="project-count" class="text-xs font-mono text-[var(--text-secondary)]">Fetching projects...</span>
        </div>

        <div id="projects-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <p class="text-xs font-mono text-[var(--text-tertiary)] col-span-3 py-8 animate-pulse">Loading DevSync projects from GitHub...</p>
        </div>
      </div>
    </div>
  `;

  // Attach launcher click
  document.getElementById('btn-create-project-launcher').addEventListener('click', () => {
    window.DevSyncApp.openProvisioner();
  });

  loadDashboardData(token);
}

async function loadDashboardData(token) {
  // 1. Load Invitations
  try {
    const invRes = await fetch('/api/auth/invitations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const invData = await invRes.json();
    const shelf = document.getElementById('invitations-shelf');
    const invList = document.getElementById('invitations-list');

    if (invData.invitations && invData.invitations.length > 0) {
      shelf.classList.remove('hidden');
      invList.innerHTML = '';
      invData.invitations.forEach(inv => {
        const card = document.createElement('div');
        card.className = 'ds-card border-amber-500/40 bg-amber-500/5 p-4 flex items-center justify-between';
        card.innerHTML = `
          <div>
            <p class="text-xs font-bold text-[var(--royal-navy)]">${inv.repository.full_name}</p>
            <p class="text-[11px] text-[var(--text-secondary)] mt-0.5">Invited by @${inv.inviter.login}</p>
          </div>
          <button data-id="${inv.id}" class="btn-accept-invite ds-btn ds-btn-primary text-xs py-1.5 px-3">
            Accept Invite
          </button>
        `;
        invList.appendChild(card);
      });

      document.querySelectorAll('.btn-accept-invite').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const invId = e.currentTarget.getAttribute('data-id');
          e.currentTarget.disabled = true;
          e.currentTarget.textContent = 'Accepting...';
          await fetch(`/api/auth/invitations/${invId}/accept`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          loadDashboardData(token);
        });
      });
    }
  } catch (err) {
    console.error('Failed to load invites:', err);
  }

  // 2. Load Projects
  try {
    const projRes = await fetch('/api/auth/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const projData = await projRes.json();
    const grid = document.getElementById('projects-grid');
    const counter = document.getElementById('project-count');

    if (!projData.projects || projData.projects.length === 0) {
      counter.textContent = '0 Projects';
      grid.innerHTML = `
        <div class="col-span-3 ds-card text-center py-12 space-y-3">
          <p class="text-sm font-semibold text-[var(--text-main)]">No DevSync workspaces detected.</p>
          <p class="text-xs text-[var(--text-secondary)]">Create a new project using the provisioner above or accept an invitation to join one.</p>
        </div>
      `;
      return;
    }

    counter.textContent = `${projData.projects.length} Workspace${projData.projects.length > 1 ? 's' : ''}`;
    grid.innerHTML = '';

    projData.projects.forEach(p => {
      const card = document.createElement('div');
      card.className = 'ds-card hover:border-[var(--border-gold)] transition-all cursor-pointer flex flex-col justify-between space-y-4 group';
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-mono ${p.is_lead ? 'bg-amber-500/10 text-[var(--royal-gold)] border border-[var(--border-gold)]' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'}">
              ${p.is_lead ? 'LEAD ARCHITECT' : 'COLLABORATOR'}
            </span>
            <span class="text-[10px] font-mono text-[var(--text-tertiary)]">${p.default_branch}</span>
          </div>
          <h4 class="font-serif text-lg font-bold text-[var(--royal-navy)] group-hover:text-[var(--royal-gold)] transition-colors">${p.name}</h4>
          <p class="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1 leading-relaxed">${p.description}</p>
        </div>

        <div class="border-t border-[var(--border-subtle)] pt-3 text-[11px] font-mono space-y-1">
          <div class="flex justify-between text-[var(--text-secondary)]">
            <span>Assigned Branch:</span>
            <span class="text-[var(--royal-gold)] font-bold">${p.assigned_branch}</span>
          </div>
          <div class="flex justify-between text-[var(--text-secondary)]">
            <span>Project Lead:</span>
            <span>@${p.lead_username}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        window.DevSyncApp.selectProject(p);
      });

      grid.appendChild(card);
    });
  } catch (err) {
    document.getElementById('projects-grid').innerHTML = `
      <p class="text-rose-500 text-xs font-mono col-span-3">Error loading workspaces: ${err.message}</p>
    `;
  }
}