import { getStoredToken } from './authView.js';

export function render(container) {
  const token = getStoredToken();

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      <div class="border-b border-[var(--border-subtle)] pb-5">
        <h2 class="font-serif text-3xl font-bold tracking-tight text-[var(--royal-navy)]">PR & Conflict Desk</h2>
        <p class="text-sm text-[var(--text-secondary)] mt-1.5">Automated Pull Request orchestration, merge conflict inspection, and 1-click main reconciliation.</p>
      </div>

      ${!token ? `
        <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm flex items-center justify-between">
          <span>GitHub authentication required to inspect and merge Pull Requests.</span>
          <span class="font-semibold underline cursor-pointer" onclick="document.getElementById('btn-login')?.click()">Sign In</span>
        </div>
      ` : ''}

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Card 1: Automated PR Generator -->
        <div class="ds-card space-y-4">
          <h3 class="font-serif text-lg font-semibold text-[var(--royal-navy)] border-b border-[var(--border-subtle)] pb-3">1. Launch Pull Request</h3>

          <div>
            <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Repository</label>
            <input type="text" id="pr-repo" placeholder="owner/repo"
              class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-xs font-mono focus:outline-none focus:border-[var(--royal-gold)]">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Feature Branch</label>
              <select id="pr-head" class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-xs font-mono">
                <option value="feat/project-wizard">feat/project-wizard (Jahnavi)</option>
                <option value="feat/mission-dropzone">feat/mission-dropzone (Chidvilas)</option>
                <option value="feat/code-editor">feat/code-editor (Gautam)</option>
                <option value="feat/pr-conflict-resolver">feat/pr-conflict-resolver (Aravind)</option>
                <option value="feat/auth-session">feat/auth-session (Manish)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Base Branch</label>
              <input type="text" id="pr-base" value="main" readonly class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-xs font-mono">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">PR Title</label>
            <input type="text" id="pr-title" placeholder="feat: integrate verified module into main"
              class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--royal-gold)]">
          </div>

          <button id="btn-create-pr" ${!token ? 'disabled' : ''} class="w-full ds-btn ds-btn-primary">
            <span>Create Pull Request</span>
          </button>
          <div id="create-pr-status" class="text-xs font-mono text-[var(--text-secondary)]"></div>
        </div>

        <!-- Card 2: Conflict Inspector & 1-Click Merger -->
        <div class="ds-card space-y-4">
          <h3 class="font-serif text-lg font-semibold text-[var(--royal-navy)] border-b border-[var(--border-subtle)] pb-3">2. Mergeability Audit</h3>

          <div class="flex items-center gap-2">
            <input type="number" id="check-pr-num" placeholder="PR Number (e.g. 1)"
              class="flex-1 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-xs font-mono">
            <button id="btn-check-pr" class="ds-btn ds-btn-primary text-xs py-2 px-4">Audit PR</button>
          </div>

          <div id="pr-audit-card" class="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-xs font-mono space-y-2 hidden">
            <div class="flex items-center justify-between">
              <span class="text-[var(--text-tertiary)]">Conflict Status:</span>
              <span id="audit-conflict-pill" class="px-2 py-0.5 rounded font-bold"></span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[var(--text-tertiary)]">Diff Delta:</span>
              <span id="audit-diff-stats" class="text-[var(--text-main)]"></span>
            </div>
          </div>

          <button id="btn-merge-pr" disabled class="w-full ds-btn ds-btn-primary !bg-emerald-600 hover:!bg-emerald-500 text-white font-semibold">
            <span>1-Click Merge into Main</span>
          </button>
          <div id="merge-status" class="text-xs font-mono text-[var(--text-secondary)]"></div>
        </div>
      </div>
    </div>
  `;

  let auditedPrNumber = null;

  document.getElementById('btn-create-pr').addEventListener('click', async () => {
    const statusBox = document.getElementById('create-pr-status');
    const repo = document.getElementById('pr-repo').value.trim();
    const head = document.getElementById('pr-head').value;
    const base = document.getElementById('pr-base').value;
    const title = document.getElementById('pr-title').value.trim() || `feat: merge ${head} into ${base}`;

    if (!repo) {
      statusBox.innerHTML = '<span class="text-rose-500 font-semibold">Repository is required.</span>';
      return;
    }

    statusBox.textContent = 'Generating Pull Request via GitHub...';

    try {
      const res = await fetch('/api/resolver/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ repo_name: repo, title, head_branch: head, base_branch: base })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create PR');

      statusBox.innerHTML = `
        <span class="text-emerald-500 font-semibold">PR #${data.pr_number} Created!</span>
        <a href="${data.html_url}" target="_blank" class="text-[var(--royal-gold)] underline">View on GitHub</a>
      `;
      document.getElementById('check-pr-num').value = data.pr_number;
    } catch (err) {
      statusBox.innerHTML = `<span class="text-rose-500 font-semibold">Error: ${err.message}</span>`;
    }
  });

  document.getElementById('btn-check-pr').addEventListener('click', async () => {
    const repo = document.getElementById('pr-repo').value.trim();
    const prNum = document.getElementById('check-pr-num').value;
    const auditCard = document.getElementById('pr-audit-card');
    const conflictPill = document.getElementById('audit-conflict-pill');
    const diffStats = document.getElementById('audit-diff-stats');
    const mergeBtn = document.getElementById('btn-merge-pr');

    if (!repo || !prNum) {
      alert('Enter repository and PR number to audit.');
      return;
    }

    try {
      const res = await fetch(`/api/resolver/status?repo_name=${encodeURIComponent(repo)}&pr_number=${prNum}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not audit PR');

      auditedPrNumber = data.pr_number;
      auditCard.classList.remove('hidden');

      if (data.mergeable === true) {
        conflictPill.className = 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold';
        conflictPill.textContent = 'CLEAN (No Conflicts)';
        mergeBtn.disabled = false;
      } else if (data.mergeable === false) {
        conflictPill.className = 'px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold';
        conflictPill.textContent = 'CONFLICT DETECTED';
        mergeBtn.disabled = true;
      } else {
        conflictPill.className = 'px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold';
        conflictPill.textContent = 'CALCULATING MERGEABILITY...';
        mergeBtn.disabled = true;
      }

      diffStats.textContent = `+${data.additions} / -${data.deletions} (${data.changed_files} files changed)`;
    } catch (err) {
      alert(`Audit failed: ${err.message}`);
    }
  });

  document.getElementById('btn-merge-pr').addEventListener('click', async () => {
    const statusBox = document.getElementById('merge-status');
    const repo = document.getElementById('pr-repo').value.trim();
    if (!auditedPrNumber) return;

    statusBox.textContent = 'Merging into main...';

    try {
      const res = await fetch('/api/resolver/merge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ repo_name: repo, pr_number: auditedPrNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Merge execution failed');

      statusBox.innerHTML = '<span class="text-emerald-500 font-bold">Successfully merged into main! Architecture reconciled.</span>';
      document.getElementById('btn-merge-pr').disabled = true;
    } catch (err) {
      statusBox.innerHTML = `<span class="text-rose-500 font-semibold">Merge error: ${err.message}</span>`;
    }
  });
}
