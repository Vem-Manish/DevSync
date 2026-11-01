import { getStoredToken } from './authView.js';

export function render(container) {
  const token = getStoredToken();

  container.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-5">
        <div>
          <h2 class="font-serif text-3xl font-bold tracking-tight text-[var(--royal-navy)]">Lead Architect Provisioner</h2>
          <p class="text-sm text-[var(--text-secondary)] mt-1.5">Configure your repository architecture and dispatch official GitHub collaborator invites.</p>
        </div>
        <button onclick="window.DevSyncApp.openDashboard()" class="text-xs font-mono text-[var(--text-tertiary)] hover:text-[var(--royal-gold)] transition-colors">
          &larr; Back to Dashboard
        </button>
      </div>

      <form id="provision-form" class="space-y-6">
        <!-- 1. Repo Architecture -->
        <div class="ds-card space-y-4">
          <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h3 class="font-serif text-lg font-semibold text-[var(--royal-navy)]">1. Repository Architecture</h3>
            <span class="text-xs font-mono text-[var(--royal-gold)] uppercase tracking-wider">Step 01 / 02</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Repository Name</label>
              <input type="text" id="repo-name" required placeholder="e.g. DevSync-Core"
                class="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--royal-gold)] transition-colors">
            </div>

            <div>
              <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Visibility</label>
              <select id="repo-visibility"
                class="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--royal-gold)] transition-colors">
                <option value="false">Public (Recommended)</option>
                <option value="true">Private</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Project Brief / Description</label>
            <input type="text" id="repo-desc" placeholder="e.g. High-performance collaborative workspace"
              class="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--royal-gold)] transition-colors">
          </div>
        </div>

        <!-- 2. Team Member Invitations -->
        <div class="ds-card space-y-4">
          <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-serif text-lg font-semibold text-[var(--royal-navy)]">2. Domain Assignments & Branch Matrix</h3>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-[var(--royal-gold)] border border-[var(--border-gold)] font-mono">Official GitHub Invites</span>
              </div>
              <p class="text-xs text-[var(--text-secondary)] mt-0.5">Enter the exact GitHub username to send an official repo invitation and automatically cut their dedicated branch.</p>
            </div>
            <button type="button" id="btn-add-member" class="text-xs font-semibold text-[var(--royal-gold)] hover:underline cursor-pointer flex items-center gap-1">
              <span>+ Add Member</span>
            </button>
          </div>

          <!-- Dynamic Collaborator Container -->
          <div id="collaborator-list" class="space-y-3"></div>
        </div>

        <div class="flex items-center justify-between pt-2">
          <div id="provision-status" class="text-xs font-mono text-[var(--text-secondary)]"></div>
          <button type="submit" id="btn-scaffold" class="ds-btn ds-btn-primary px-6 py-3 font-semibold">
            <span>Scaffold Repository & Dispatch Invites</span>
            <svg class="w-4 h-4 text-[#c29b48]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        </div>
      </form>
    </div>
  `;

  const listContainer = document.getElementById('collaborator-list');

  // Single cleanly scaffolded row function with explicit placeholders & Delete button
  function renderMemberRow(index) {
    const row = document.createElement('div');
    row.className = 'collaborator-row p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] space-y-2.5 transition-all';
    row.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-mono text-[var(--royal-gold)] uppercase font-semibold tracking-wider">Teammate #${index}</span>
        <button type="button" class="btn-remove-row text-xs text-rose-500 hover:text-rose-400 font-mono flex items-center gap-1 cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          <span>Delete</span>
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="block text-[10px] font-mono text-[var(--text-secondary)] uppercase mb-1 font-semibold">
            GitHub Username <span class="text-rose-400">*</span>
          </label>
          <input type="text" placeholder="e.g. Jahnavi-A" required
            class="member-username w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--royal-gold)] focus:outline-none">
        </div>
        <div>
          <label class="block text-[10px] font-mono text-[var(--text-secondary)] uppercase mb-1 font-semibold">
            Role Title <span class="text-rose-400">*</span>
          </label>
          <input type="text" placeholder="e.g. Lead Architect" required
            class="member-role w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--royal-gold)] focus:outline-none">
        </div>
        <div>
          <label class="block text-[10px] font-mono text-[var(--text-secondary)] uppercase mb-1 font-semibold">
            Assigned Feature Branch <span class="text-rose-400">*</span>
          </label>
          <input type="text" placeholder="e.g. feat/project-wizard" required
            class="member-branch w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--royal-gold)] placeholder:text-[var(--text-tertiary)]/70 focus:border-[var(--royal-gold)] focus:outline-none">
        </div>
      </div>
    `;

    // Delete row functionality
    row.querySelector('.btn-remove-row').addEventListener('click', () => {
      const allRows = document.querySelectorAll('.collaborator-row');
      if (allRows.length > 1) {
        row.remove();
        // Re-number labels
        document.querySelectorAll('.collaborator-row').forEach((r, idx) => {
          r.querySelector('span').textContent = `Teammate #${idx + 1}`;
        });
      } else {
        alert('You must provide at least one team member to provision a workspace.');
      }
    });

    listContainer.appendChild(row);
  }

  // Renders exactly ONE clean row on initial load
  renderMemberRow(1);

  // Add more rows on button click
  document.getElementById('btn-add-member').addEventListener('click', () => {
    const nextIndex = document.querySelectorAll('.collaborator-row').length + 1;
    renderMemberRow(nextIndex);
  });

  // Handle Form Submission
  document.getElementById('provision-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-scaffold');
    const statusBox = document.getElementById('provision-status');

    const rows = document.querySelectorAll('.collaborator-row');
    const collaborators = Array.from(rows).map(r => ({
      username: r.querySelector('.member-username').value.trim(),
      role: r.querySelector('.member-role').value.trim(),
      branch_name: r.querySelector('.member-branch').value.trim(),
      assigned_files: []
    }));

    const payload = {
      repo_name: document.getElementById('repo-name').value.trim(),
      description: document.getElementById('repo-desc').value.trim(),
      is_private: document.getElementById('repo-visibility').value === 'true',
      tech_stack: 'FastAPI + Vanilla JS',
      collaborators
    };

    btn.disabled = true;
    btn.innerHTML = `<span class="animate-pulse">Scaffolding Repo & Sending GitHub Invites...</span>`;
    statusBox.textContent = "Calling GitHub API: Creating repo, provisioning branches, and inviting team members...";

    try {
      const res = await fetch('/api/provision/scaffold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Scaffolding failed');

      container.innerHTML = `
        <div class="max-w-2xl mx-auto ds-card text-center space-y-6 py-12">
          <div class="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div>
            <h3 class="font-serif text-2xl font-bold text-[var(--royal-navy)]">Architecture Deployed & Invites Dispatched!</h3>
            <p class="text-sm text-[var(--text-secondary)] mt-1">Repository created, isolated branches cut, and official GitHub invites sent.</p>
          </div>
          <div class="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] font-mono text-xs text-left space-y-2">
            <p><span class="text-[var(--text-tertiary)]">Repository:</span> <a href="${data.repo_url}" target="_blank" class="text-[var(--royal-gold)] underline">${data.repo_url}</a></p>
            <p><span class="text-[var(--text-tertiary)]">Invited Teammates:</span> ${data.assignments.map(a => `@${a.username} (${a.branch})`).join(', ')}</p>
          </div>
          <button onclick="window.DevSyncApp.openDashboard()" class="ds-btn ds-btn-primary">Go to Command Center</button>
        </div>
      `;
    } catch (err) {
      statusBox.innerHTML = `<span class="text-rose-500 font-semibold">Error: ${err.message}</span>`;
      btn.disabled = false;
      btn.innerHTML = `<span>Try Again</span>`;
    }
  });
}