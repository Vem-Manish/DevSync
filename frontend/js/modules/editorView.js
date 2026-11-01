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

  const defaultBranch = project.is_lead ? 'main' : project.assigned_branch;

  container.innerHTML = `
    <div class="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      <div class="border-b border-[var(--border-subtle)] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-serif text-3xl font-bold tracking-tight text-[var(--royal-navy)]">Studio Code Editor & Sandbox</h2>
          <p class="text-sm text-[var(--text-secondary)] mt-1">Live in-browser code workspace with instant Micro-Sandbox runtime.</p>
        </div>
        <div class="flex items-center gap-3">
          <select id="editor-branch" class="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-xs font-mono text-[var(--text-main)]">
            <option value="${defaultBranch}" selected>${defaultBranch} ${!project.is_lead ? '(Your Assigned Branch)' : ''}</option>
            <option value="main">main</option>
            <option value="feat/project-wizard">feat/project-wizard</option>
            <option value="feat/mission-dropzone">feat/mission-dropzone</option>
            <option value="feat/code-editor">feat/code-editor</option>
            <option value="feat/pr-conflict-resolver">feat/pr-conflict-resolver</option>
          </select>
          <button id="btn-fetch-tree" class="ds-btn ds-btn-primary text-xs py-1.5 px-3">Load Files</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 h-[640px]">
        <!-- Branch Explorer -->
        <div class="ds-card md:col-span-1 p-3 flex flex-col h-full overflow-hidden">
          <span class="text-[10px] font-cinzel font-semibold tracking-wider text-[var(--royal-gold)] uppercase mb-2">Branch Explorer</span>
          <div id="file-tree-list" class="flex-1 overflow-y-auto space-y-1 font-mono text-xs">
            <p class="text-[var(--text-tertiary)] p-2">Click "Load Files" to populate repository tree.</p>
          </div>
        </div>

        <!-- Editor & Sandbox Surface -->
        <div class="ds-card md:col-span-3 p-4 flex flex-col h-full">
          <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-2">
            <div class="flex items-center gap-2 truncate">
              <span id="active-file-label" class="font-mono text-xs text-[var(--royal-gold)] font-semibold truncate">No file selected</span>
              <span id="read-only-badge" class="hidden px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 font-mono">READ-ONLY</span>
            </div>

            <!-- View Mode Switcher -->
            <div class="flex items-center gap-2">
              <div class="inline-flex rounded-lg border border-[var(--border-subtle)] p-0.5 bg-[var(--bg-surface-elevated)]">
                <button id="tab-code" class="px-2.5 py-1 text-xs font-semibold rounded-md bg-[var(--bg-surface)] text-[var(--royal-gold)] shadow-sm">Code</button>
                <button id="tab-preview" class="px-2.5 py-1 text-xs font-semibold rounded-md text-[var(--text-secondary)] hover:text-[var(--royal-gold)]">Live Preview</button>
              </div>

              <span id="editor-status" class="text-[11px] font-mono text-[var(--text-secondary)]"></span>
              <button id="btn-save-code" disabled class="ds-btn ds-btn-primary text-xs py-1 px-3">
                <span>Save to Branch</span>
              </button>
            </div>
          </div>

          <!-- Code View Area -->
          <div id="container-code-view" class="flex-1 flex flex-col h-full">
            <textarea id="code-textarea" spellcheck="false" placeholder="// Select a file from the explorer to begin editing..."
              class="flex-1 w-full p-3 font-mono text-xs bg-[#0b0e14] text-[#eceff4] rounded-lg border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--royal-gold)] resize-none leading-relaxed selection:bg-[#c29b48]/30"></textarea>
          </div>

          <!-- Micro-Sandbox Runtime Preview -->
          <div id="container-sandbox-view" class="flex-1 hidden flex-col h-full rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-white">
            <iframe id="sandbox-iframe" sandbox="allow-scripts allow-modals" class="w-full h-full border-none"></iframe>
          </div>
        </div>
      </div>
    </div>
  `;

  let currentSha = '';
  let currentFilePath = '';

  const treeList = document.getElementById('file-tree-list');
  const codeArea = document.getElementById('code-textarea');
  const activeLabel = document.getElementById('active-file-label');
  const readOnlyBadge = document.getElementById('read-only-badge');
  const saveBtn = document.getElementById('btn-save-code');
  const statusLabel = document.getElementById('editor-status');
  const branchSelect = document.getElementById('editor-branch');

  const tabCode = document.getElementById('tab-code');
  const tabPreview = document.getElementById('tab-preview');
  const codeViewContainer = document.getElementById('container-code-view');
  const sandboxViewContainer = document.getElementById('container-sandbox-view');
  const sandboxIframe = document.getElementById('sandbox-iframe');

  // Sandbox Switcher Tabs
  tabCode.addEventListener('click', () => {
    tabCode.className = 'px-2.5 py-1 text-xs font-semibold rounded-md bg-[var(--bg-surface)] text-[var(--royal-gold)] shadow-sm';
    tabPreview.className = 'px-2.5 py-1 text-xs font-semibold rounded-md text-[var(--text-secondary)] hover:text-[var(--royal-gold)]';
    codeViewContainer.classList.remove('hidden');
    sandboxViewContainer.classList.add('hidden');
  });

  tabPreview.addEventListener('click', () => {
    tabPreview.className = 'px-2.5 py-1 text-xs font-semibold rounded-md bg-[var(--bg-surface)] text-[var(--royal-gold)] shadow-sm';
    tabCode.className = 'px-2.5 py-1 text-xs font-semibold rounded-md text-[var(--text-secondary)] hover:text-[var(--royal-gold)]';
    codeViewContainer.classList.add('hidden');
    sandboxViewContainer.classList.remove('hidden');
    runSandboxPreview();
  });

  function runSandboxPreview() {
    const code = codeArea.value;
    let htmlContent = '';

    if (currentFilePath.endsWith('.html')) {
      htmlContent = code;
    } else if (currentFilePath.endsWith('.js')) {
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>body { font-family: sans-serif; padding: 20px; color: #1e293b; }</style>
        </head>
        <body>
          <h3>JS Execution Output:</h3>
          <pre id="output" style="background:#f1f5f9; padding:10px; border-radius:6px;"></pre>
          <script>
            const out = document.getElementById('output');
            console.log = function(...args) { out.textContent += args.join(' ') + '\\n'; };
            try {
              ${code}
            } catch(e) {
              out.textContent += 'Error: ' + e.message;
            }
          <\/script>
        </body>
        </html>
      `;
    } else {
      htmlContent = `
        <div style="font-family: sans-serif; padding: 24px; color: #334155;">
          <h2 style="margin-top:0;">Sandbox Preview</h2>
          <pre style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:8px; white-space:pre-wrap;">${code.replace(/</g, '&lt;')}</pre>
        </div>
      `;
    }

    sandboxIframe.srcdoc = htmlContent;
  }

  async function loadTree() {
    const branch = branchSelect.value;
    treeList.innerHTML = '<p class="text-[var(--text-tertiary)] p-2 animate-pulse">Loading tree...</p>';

    try {
      const res = await fetch(`/api/editor/tree?repo_name=${encodeURIComponent(project.full_name)}&branch_name=${encodeURIComponent(branch)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load tree');

      treeList.innerHTML = '';
      if (!data.files.length) {
        treeList.innerHTML = '<p class="text-[var(--text-tertiary)] p-2">No files on this branch.</p>';
        return;
      }

      data.files.forEach(path => {
        const item = document.createElement('div');
        item.className = 'px-2 py-1.5 rounded hover:bg-[var(--bg-surface-elevated)] cursor-pointer truncate text-[var(--text-main)] transition-colors';
        item.textContent = path;
        item.addEventListener('click', () => loadFile(branch, path));
        treeList.appendChild(item);
      });
    } catch (err) {
      treeList.innerHTML = `<p class="text-rose-500 p-2 text-xs">Error: ${err.message}</p>`;
    }
  }

  document.getElementById('btn-fetch-tree').addEventListener('click', loadTree);

  async function loadFile(branch, path) {
    statusLabel.textContent = 'Fetching content...';
    try {
      const res = await fetch('/api/editor/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ repo_name: project.full_name, branch_name: branch, file_path: path })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not fetch file');

      currentSha = data.sha;
      currentFilePath = data.file_path;
      activeLabel.textContent = `${branch} :: ${path}`;
      codeArea.value = data.content;

      if (data.read_only) {
        readOnlyBadge.classList.remove('hidden');
        saveBtn.disabled = true;
        saveBtn.classList.add('hidden');
        codeArea.setAttribute('readonly', 'true');
        statusLabel.textContent = 'Inspecting (Read-Only)';
      } else {
        readOnlyBadge.classList.add('hidden');
        saveBtn.disabled = false;
        saveBtn.classList.remove('hidden');
        codeArea.removeAttribute('readonly');
        statusLabel.textContent = 'Ready';
      }

      if (!sandboxViewContainer.classList.contains('hidden')) {
        runSandboxPreview();
      }
    } catch (err) {
      statusLabel.textContent = `Error: ${err.message}`;
    }
  }

  saveBtn.addEventListener('click', async () => {
    const branch = branchSelect.value;
    saveBtn.disabled = true;
    statusLabel.textContent = 'Saving to GitHub...';

    try {
      const res = await fetch('/api/editor/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          repo_name: project.full_name,
          branch_name: branch,
          file_path: currentFilePath,
          content: codeArea.value,
          sha: currentSha
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Save failed');

      statusLabel.innerHTML = `<span class="text-emerald-500">Saved!</span> <a href="${data.commit_url}" target="_blank" class="text-[var(--royal-gold)] underline">Commit</a>`;
      saveBtn.disabled = false;
    } catch (err) {
      statusLabel.textContent = `Error: ${err.message}`;
      saveBtn.disabled = false;
    }
  });

  loadTree();
}