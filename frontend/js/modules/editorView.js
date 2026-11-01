import { getStoredToken } from './authView.js';

export function render(container) {
  const token = getStoredToken();

  container.innerHTML = `
    <div class="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      <div class="border-b border-[var(--border-subtle)] pb-4 flex items-center justify-between">
        <div>
          <h2 class="font-serif text-3xl font-bold tracking-tight text-[var(--royal-navy)]">Studio Code Editor</h2>
          <p class="text-sm text-[var(--text-secondary)] mt-1">Live in-browser code workspace connected directly to isolated GitHub feature branches.</p>
        </div>
        <div class="flex items-center gap-3">
          <input type="text" id="editor-repo" placeholder="owner/repo"
            class="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-xs font-mono text-[var(--text-main)] w-44">
          <select id="editor-branch"
            class="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-xs font-mono text-[var(--text-main)]">
            <option value="main">main</option>
            <option value="feat/code-editor" selected>feat/code-editor</option>
            <option value="feat/project-wizard">feat/project-wizard</option>
            <option value="feat/mission-dropzone">feat/mission-dropzone</option>
            <option value="feat/pr-conflict-resolver">feat/pr-conflict-resolver</option>
            <option value="feat/auth-session">feat/auth-session</option>
          </select>
          <button id="btn-fetch-tree" class="ds-btn ds-btn-primary text-xs py-1.5 px-3">Load Files</button>
        </div>
      </div>

      ${!token ? `
        <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm flex items-center justify-between">
          <span>GitHub authentication required to inspect and edit code.</span>
          <span class="font-semibold underline cursor-pointer" onclick="document.getElementById('btn-login')?.click()">Sign In</span>
        </div>
      ` : ''}

      <!-- Main Editor Studio Workspace -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 h-[620px]">
        <!-- File Tree Sidebar -->
        <div class="ds-card md:col-span-1 p-3 flex flex-col h-full overflow-hidden">
          <span class="text-[10px] font-cinzel font-semibold tracking-wider text-[var(--royal-gold)] uppercase mb-2">Branch Explorer</span>
          <div id="file-tree-list" class="flex-1 overflow-y-auto space-y-1 font-mono text-xs">
            <p class="text-[var(--text-tertiary)] p-2">Click "Load Files" to populate repository tree.</p>
          </div>
        </div>

        <!-- Code Editor Surface -->
        <div class="ds-card md:col-span-3 p-4 flex flex-col h-full">
          <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-2">
            <span id="active-file-label" class="font-mono text-xs text-[var(--royal-gold)] font-semibold truncate">No file selected</span>
            <div class="flex items-center gap-2">
              <span id="editor-status" class="text-[11px] font-mono text-[var(--text-secondary)]"></span>
              <button id="btn-save-code" disabled class="ds-btn ds-btn-primary text-xs py-1 px-3">
                <span>Save to Branch</span>
              </button>
            </div>
          </div>

          <textarea id="code-textarea" spellcheck="false" placeholder="// Select a file from the explorer to begin editing..."
            class="flex-1 w-full p-3 font-mono text-xs bg-[#0b0e14] text-[#eceff4] rounded-lg border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--royal-gold)] resize-none leading-relaxed selection:bg-[#c29b48]/30"></textarea>
        </div>
      </div>
    </div>
  `;

  let currentSha = '';
  let currentFilePath = '';

  const treeList = document.getElementById('file-tree-list');
  const codeArea = document.getElementById('code-textarea');
  const activeLabel = document.getElementById('active-file-label');
  const saveBtn = document.getElementById('btn-save-code');
  const statusLabel = document.getElementById('editor-status');

  document.getElementById('btn-fetch-tree').addEventListener('click', async () => {
    const repo = document.getElementById('editor-repo').value.trim();
    const branch = document.getElementById('editor-branch').value;
    if (!repo) {
      alert('Please enter a repository name (e.g. Vem-Manish/DevSync)');
      return;
    }

    treeList.innerHTML = '<p class="text-[var(--text-tertiary)] p-2 animate-pulse">Loading branch tree...</p>';

    try {
      const res = await fetch(`/api/editor/tree?repo_name=${encodeURIComponent(repo)}&branch_name=${encodeURIComponent(branch)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load tree');

      treeList.innerHTML = '';
      if (!data.files.length) {
        treeList.innerHTML = '<p class="text-[var(--text-tertiary)] p-2">No files found on this branch.</p>';
        return;
      }

      data.files.forEach(path => {
        const item = document.createElement('div');
        item.className = 'px-2 py-1.5 rounded hover:bg-[var(--bg-surface-elevated)] cursor-pointer truncate text-[var(--text-main)] transition-colors';
        item.textContent = path;
        item.addEventListener('click', () => loadFile(repo, branch, path));
        treeList.appendChild(item);
      });
    } catch (err) {
      treeList.innerHTML = `<p class="text-rose-500 p-2 text-xs">Error: ${err.message}</p>`;
    }
  });

  async function loadFile(repo, branch, path) {
    statusLabel.textContent = 'Fetching content...';
    try {
      const res = await fetch('/api/editor/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ repo_name: repo, branch_name: branch, file_path: path })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not fetch file');

      currentSha = data.sha;
      currentFilePath = data.file_path;
      activeLabel.textContent = `${branch} :: ${path}`;
      codeArea.value = data.content;
      saveBtn.disabled = false;
      statusLabel.textContent = 'Ready';
    } catch (err) {
      statusLabel.textContent = `Error: ${err.message}`;
    }
  }

  saveBtn.addEventListener('click', async () => {
    const repo = document.getElementById('editor-repo').value.trim();
    const branch = document.getElementById('editor-branch').value;
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
          repo_name: repo,
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
}
