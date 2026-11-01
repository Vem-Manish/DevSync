import { getStoredToken } from './authView.js';
import { getActiveProject } from '../app.js';

export function render(container) {
  const token = getStoredToken();
  const project = getActiveProject();

  if (!project) {
    container.innerHTML = `
      <div class="ds-card text-center py-12">
        <p class="text-sm font-semibold">No active workspace selected.</p>
        <button onclick="window.DevSyncApp.openDashboard()" class="ds-btn ds-btn-primary mt-3">Return to Projects</button>
      </div>
    `;
    return;
  }

  const isLead = project.is_lead;
  const assignedBranch = project.assigned_branch;

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      <div class="border-b border-[var(--border-subtle)] pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-serif text-3xl font-bold tracking-tight text-[var(--royal-navy)]">PR & Conflict Desk</h2>
          <p class="text-sm text-[var(--text-secondary)] mt-1.5">Automated Pull Request orchestration, pre-flight audits, and plain-English code reviews.</p>
        </div>
        <button id="btn-scan-radar" class="ds-btn ds-btn-primary text-xs py-2 px-3.5 flex items-center gap-2">
          <svg class="w-3.5 h-3.5 text-[#c29b48] animate-spin hidden" id="radar-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
          <span>Scan Collision Radar</span>
        </button>
      </div>

      <!-- Ghost Sync Radar Card -->
      <div id="radar-card" class="ds-card border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" id="radar-dot"></span>
            <span class="text-xs font-cinzel font-bold tracking-wider text-[var(--royal-navy)] uppercase">Ghost Sync: Predictive Collision Radar</span>
          </div>
          <span id="radar-summary" class="text-xs font-mono text-[var(--text-tertiary)]">Scanning branches...</span>
        </div>
        <div id="radar-collision-list" class="space-y-2 text-xs font-mono">
          <p class="text-[var(--text-tertiary)]">Analyzing cross-branch touchpoints across teammate branches...</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Card 1: Automated PR Generator & Pre-Flight Linter -->
        <div class="ds-card space-y-4">
          <h3 class="font-serif text-lg font-semibold text-[var(--royal-navy)] border-b border-[var(--border-subtle)] pb-3">1. Launch Pull Request</h3>

          <div>
            <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Repository</label>
            <input type="text" id="pr-repo" value="${project.full_name}" readonly
              class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-mono">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Feature Branch</label>
              ${isLead ? `
                <select id="pr-head" class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-xs font-mono">
                  <option value="feat/project-wizard">feat/project-wizard</option>
                  <option value="feat/mission-dropzone">feat/mission-dropzone</option>
                  <option value="feat/code-editor">feat/code-editor</option>
                  <option value="feat/pr-conflict-resolver">feat/pr-conflict-resolver</option>
                </select>
              ` : `
                <input type="text" id="pr-head" value="${assignedBranch}" readonly
                  class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--royal-gold)] font-bold text-xs font-mono">
              `}
            </div>
            <div>
              <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Base Branch</label>
              <input type="text" id="pr-base" value="${project.default_branch}" readonly class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-mono">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">PR Title</label>
            <input type="text" id="pr-title" placeholder="feat: integrate verified module into main"
              class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--royal-gold)]">
          </div>

          <!-- Pre-Flight Code & Secret Shield Check Button -->
          <div class="flex gap-2">
            <button id="btn-preflight-check" type="button" class="flex-1 ds-btn bg-slate-800 text-xs py-2 hover:bg-slate-700">
              <span>🛡️ Run Pre-Flight Audit</span>
            </button>
            <button id="btn-create-pr" class="flex-1 ds-btn ds-btn-primary text-xs py-2">
              <span>Create Pull Request</span>
            </button>
          </div>

          <!-- Pre-flight result box -->
          <div id="preflight-results" class="hidden p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-xs font-mono space-y-1.5"></div>
          <div id="create-pr-status" class="text-xs font-mono text-[var(--text-secondary)]"></div>
        </div>

        <!-- Card 2: Conflict Inspector, Plain Diff Explainer & 1-Click Merger -->
        <div class="ds-card space-y-4">
          <h3 class="font-serif text-lg font-semibold text-[var(--royal-navy)] border-b border-[var(--border-subtle)] pb-3">2. Mergeability Audit & Plain Diff</h3>

          <div class="flex items-center gap-2">
            <input type="number" id="check-pr-num" placeholder="PR Number (e.g. 1)"
              class="flex-1 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-xs font-mono">
            <button id="btn-check-pr" class="ds-btn ds-btn-primary text-xs py-2 px-4">Audit PR</button>
          </div>

          <div id="pr-audit-card" class="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-xs font-mono space-y-2.5 hidden">
            <div class="flex items-center justify-between">
              <span class="text-[var(--text-tertiary)]">Conflict Status:</span>
              <span id="audit-conflict-pill" class="px-2 py-0.5 rounded font-bold"></span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[var(--text-tertiary)]">Diff Delta:</span>
              <span id="audit-diff-stats" class="text-[var(--text-main)]"></span>
            </div>

            <!-- Plain English Diff Explainer -->
            <div class="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-[var(--royal-gold)] font-bold uppercase text-[10px]">Plain-English File Breakdown</span>
              </div>
              <div id="diff-explainer-list" class="space-y-1.5 text-[11px] font-sans">
                <p class="text-[var(--text-tertiary)] font-mono text-[10px]">Fetching human explanation...</p>
              </div>
            </div>
          </div>

          ${isLead ? `
            <button id="btn-merge-pr" disabled class="w-full ds-btn ds-btn-primary !bg-emerald-600 hover:!bg-emerald-500 text-white font-semibold">
              <span>1-Click Merge into Main</span>
            </button>
          ` : `
            <div class="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center">
              <p class="text-xs text-[var(--text-tertiary)] font-mono">Merge permissions restricted to Project Lead (@${project.lead_username})</p>
            </div>
          `}
          <div id="merge-status" class="text-xs font-mono text-[var(--text-secondary)]"></div>
        </div>
      </div>
    </div>
  `;

  let auditedPrNumber = null;

  // Radar Scan
  async function checkRadar() {
    const summary = document.getElementById('radar-summary');
    const list = document.getElementById('radar-collision-list');
    const dot = document.getElementById('radar-dot');
    const spin = document.getElementById('radar-spin');

    spin.classList.remove('hidden');

    try {
      const res = await fetch(`/api/resolver/radar?repo_name=${encodeURIComponent(project.full_name)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!data.collisions || data.collisions.length === 0) {
        dot.className = 'h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse';
        summary.textContent = `All Clear (${data.monitored_branches} branches synced)`;
        list.innerHTML = `<p class="text-emerald-500 font-semibold">No cross-branch collisions detected. All active branches are completely isolated.</p>`;
      } else {
        dot.className = 'h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping';
        summary.textContent = `Warning: ${data.collision_count} overlapping file touchpoints`;
        list.innerHTML = '';

        data.collisions.forEach(c => {
          const item = document.createElement('div');
          item.className = 'p-2.5 rounded border border-rose-500/30 bg-rose-500/10 flex items-center justify-between';
          item.innerHTML = `
            <div>
              <p class="font-bold text-rose-400">${c.file}</p>
              <p class="text-[11px] text-[var(--text-secondary)]">
                Touched on <span class="text-[var(--royal-gold)]">${c.branch_a}</span> (@${c.author_a}) & <span class="text-[var(--royal-gold)]">${c.branch_b}</span> (@${c.author_b})
              </p>
            </div>
            <span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">COLLISION RISK</span>
          `;
          list.appendChild(item);
        });
      }
    } catch (err) {
      summary.textContent = 'Radar scan unavailable';
      list.innerHTML = `<p class="text-[var(--text-tertiary)]">${err.message}</p>`;
    } finally {
      spin.classList.add('hidden');
    }
  }

  document.getElementById('btn-scan-radar').addEventListener('click', checkRadar);
  checkRadar();

  // Pre-flight check trigger
  document.getElementById('btn-preflight-check').addEventListener('click', async () => {
    const head = document.getElementById('pr-head').value;
    const box = document.getElementById('preflight-results');
    box.classList.remove('hidden');
    box.innerHTML = '<p class="text-[var(--text-tertiary)] animate-pulse">Running secret shield & hygiene scan...</p>';

    try {
      const res = await fetch(`/api/resolver/preflight?repo_name=${encodeURIComponent(project.full_name)}&branch_name=${encodeURIComponent(head)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      let html = `<div class="font-bold border-b border-[var(--border-subtle)] pb-1 mb-1 text-[var(--royal-navy)]">Pre-Flight Audit: ${data.branch} (${data.total_files} files checked)</div>`;

      if (data.passed_security) {
        html += `<div class="text-emerald-500">🛡️ Secret Shield: PASS (No leaked API keys or passwords)</div>`;
      } else {
        html += `<div class="text-rose-500 font-bold">🚨 Secret Shield: FAILED (${data.secret_findings.length} leaked tokens detected!)</div>`;
      }

      if (data.passed_cleanliness) {
        html += `<div class="text-emerald-500">✨ Hygiene: Clean (No stray console.log / print lines)</div>`;
      } else {
        html += `<div class="text-amber-400">⚠️ Hygiene: ${data.debug_findings.length} debug statements found in staged diffs.</div>`;
      }

      box.innerHTML = html;
    } catch (err) {
      box.innerHTML = `<p class="text-rose-500">Pre-flight check failed: ${err.message}</p>`;
    }
  });

  // Create PR
  document.getElementById('btn-create-pr').addEventListener('click', async () => {
    const statusBox = document.getElementById('create-pr-status');
    const head = document.getElementById('pr-head').value;
    const base = document.getElementById('pr-base').value;
    const title = document.getElementById('pr-title').value.trim() || `feat: merge ${head} into ${base}`;

    statusBox.textContent = 'Generating Pull Request via GitHub...';

    try {
      const res = await fetch('/api/resolver/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ repo_name: project.full_name, title, head_branch: head, base_branch: base })
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

  // Audit PR & Plain English Diff
  document.getElementById('btn-check-pr').addEventListener('click', async () => {
    const prNum = document.getElementById('check-pr-num').value;
    const auditCard = document.getElementById('pr-audit-card');
    const conflictPill = document.getElementById('audit-conflict-pill');
    const diffStats = document.getElementById('audit-diff-stats');
    const mergeBtn = document.getElementById('btn-merge-pr');
    const explainerList = document.getElementById('diff-explainer-list');

    if (!prNum) {
      alert('Enter a PR number to audit.');
      return;
    }

    try {
      const res = await fetch(`/api/resolver/status?repo_name=${encodeURIComponent(project.full_name)}&pr_number=${prNum}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not audit PR');

      auditedPrNumber = data.pr_number;
      auditCard.classList.remove('hidden');

      if (data.mergeable === true) {
        conflictPill.className = 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold';
        conflictPill.textContent = 'CLEAN (No Conflicts)';
        if (mergeBtn) mergeBtn.disabled = false;
      } else if (data.mergeable === false) {
        conflictPill.className = 'px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold';
        conflictPill.textContent = 'CONFLICT DETECTED';
        if (mergeBtn) mergeBtn.disabled = true;
      } else {
        conflictPill.className = 'px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold';
        conflictPill.textContent = 'CALCULATING MERGEABILITY...';
        if (mergeBtn) mergeBtn.disabled = true;
      }

      diffStats.textContent = `+${data.additions} / -${data.deletions} (${data.changed_files} files changed)`;

      // Load plain-English diff breakdown
      try {
        const diffRes = await fetch(`/api/resolver/diff-summary?repo_name=${encodeURIComponent(project.full_name)}&pr_number=${prNum}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const diffData = await diffRes.json();
        explainerList.innerHTML = '';
        if (diffData.explanations && diffData.explanations.length > 0) {
          diffData.explanations.forEach(item => {
            const row = document.createElement('div');
            row.className = 'p-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]';
            row.innerHTML = `<span class="font-mono text-[10px] text-[var(--royal-gold)] font-bold">${item.filename}:</span> <span class="text-[var(--text-main)]">${item.summary}</span>`;
            explainerList.appendChild(row);
          });
        } else {
          explainerList.innerHTML = '<p class="text-[var(--text-tertiary)]">No code lines modified.</p>';
        }
      } catch (e) {
        explainerList.innerHTML = '<p class="text-[var(--text-tertiary)]">Plain explanation unavailable.</p>';
      }

    } catch (err) {
      alert(`Audit failed: ${err.message}`);
    }
  });

  const mergeBtn = document.getElementById('btn-merge-pr');
  if (mergeBtn) {
    mergeBtn.addEventListener('click', async () => {
      const statusBox = document.getElementById('merge-status');
      if (!auditedPrNumber) return;

      statusBox.textContent = 'Merging into main...';

      try {
        const res = await fetch('/api/resolver/merge', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ repo_name: project.full_name, pr_number: auditedPrNumber })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Merge execution failed');

        statusBox.innerHTML = '<span class="text-emerald-500 font-bold">Successfully merged into main! Architecture reconciled.</span>';
        mergeBtn.disabled = true;
      } catch (err) {
        statusBox.innerHTML = `<span class="text-rose-500 font-semibold">Merge error: ${err.message}</span>`;
      }
    });
  }
}