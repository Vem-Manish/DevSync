import { getStoredToken } from './authView.js';

export function render(container) {
  const token = getStoredToken();

  container.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div class="border-b border-[var(--border-subtle)] pb-5">
        <h2 class="font-serif text-3xl font-bold tracking-tight text-[var(--royal-navy)]">Mission Hub & Smart Dropzone</h2>
        <p class="text-sm text-[var(--text-secondary)] mt-1.5">Directly upload files into dedicated teammate feature branches with instant GitHub cloud commits.</p>
      </div>

      ${!token ? `
        <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm flex items-center justify-between">
          <span>GitHub authentication required to deploy files to branches.</span>
          <span class="font-semibold underline cursor-pointer" onclick="document.getElementById('btn-login')?.click()">Sign In</span>
        </div>
      ` : ''}

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Target Branch Configuration Card -->
        <div class="ds-card md:col-span-1 space-y-4">
          <h3 class="font-serif text-lg font-semibold text-[var(--royal-navy)] border-b border-[var(--border-subtle)] pb-3">Destination Branch</h3>

          <div>
            <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Repository</label>
            <input type="text" id="drop-repo" placeholder="owner/repo-name"
              class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-xs font-mono focus:outline-none focus:border-[var(--royal-gold)]">
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Target Branch</label>
            <select id="drop-branch"
              class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-xs font-mono focus:outline-none focus:border-[var(--royal-gold)]">
              <option value="feat/mission-dropzone">feat/mission-dropzone (Chidvilas)</option>
              <option value="feat/project-wizard">feat/project-wizard (Jahnavi)</option>
              <option value="feat/code-editor">feat/code-editor (Gautam)</option>
              <option value="feat/pr-conflict-resolver">feat/pr-conflict-resolver (Aravind)</option>
              <option value="feat/auth-session">feat/auth-session (Manish)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Path inside Repository</label>
            <input type="text" id="drop-path" placeholder="src/components/MyFile.js"
              class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-xs font-mono focus:outline-none focus:border-[var(--royal-gold)]">
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Commit Message</label>
            <input type="text" id="drop-msg" placeholder="feat(dropzone): upload new asset"
              class="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--royal-gold)]">
          </div>
        </div>

        <!-- Interactive Drag-and-Drop Dropzone Card -->
        <div class="ds-card md:col-span-2 flex flex-col justify-between">
          <div>
            <h3 class="font-serif text-lg font-semibold text-[var(--royal-navy)] border-b border-[var(--border-subtle)] pb-3">Smart File Drop</h3>

            <div id="drop-area" class="mt-4 border-2 border-dashed border-[var(--border-gold)] hover:bg-[var(--royal-gold-soft)] rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
              <svg class="w-12 h-12 text-[var(--royal-gold)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
              <p class="text-sm font-semibold text-[var(--text-main)]">Drag & drop source code or assets here</p>
              <p class="text-xs text-[var(--text-tertiary)] mt-1">or click to browse files from your computer</p>
              <input type="file" id="file-input" class="hidden">
            </div>

            <!-- Staged File Preview -->
            <div id="file-preview-card" class="hidden mt-4 p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="font-mono text-xs text-[var(--royal-gold)] font-bold">[FILE]</span>
                <div>
                  <p id="preview-filename" class="text-xs font-semibold text-[var(--text-main)]"></p>
                  <p id="preview-filesize" class="text-[10px] text-[var(--text-tertiary)] font-mono"></p>
                </div>
              </div>
              <button id="btn-remove-file" class="text-xs text-rose-500 hover:underline">Remove</button>
            </div>
          </div>

          <div class="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div id="upload-status" class="text-xs font-mono text-[var(--text-secondary)]"></div>
            <button id="btn-commit-upload" ${!token ? 'disabled' : ''} class="ds-btn ds-btn-primary">
              <span>Commit Directly to Branch</span>
              <svg class="w-4 h-4 text-[#c29b48]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  let selectedFileBase64 = null;
  let selectedFileName = null;

  const dropArea = document.getElementById('drop-area');
  const fileInput = document.getElementById('file-input');
  const previewCard = document.getElementById('file-preview-card');
  const previewName = document.getElementById('preview-filename');
  const previewSize = document.getElementById('preview-filesize');
  const pathInput = document.getElementById('drop-path');

  dropArea.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropArea.classList.add('bg-[var(--royal-gold-soft)]');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropArea.classList.remove('bg-[var(--royal-gold-soft)]');
    });
  });

  dropArea.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });

  function handleFile(file) {
    selectedFileName = file.name;
    previewName.textContent = file.name;
    previewSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    if (!pathInput.value) pathInput.value = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      // Extract clean Base64 string
      const base64String = reader.result.split(',')[1];
      selectedFileBase64 = base64String;
      previewCard.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  document.getElementById('btn-remove-file').addEventListener('click', () => {
    selectedFileBase64 = null;
    selectedFileName = null;
    fileInput.value = '';
    previewCard.classList.add('hidden');
  });

  document.getElementById('btn-commit-upload').addEventListener('click', async () => {
    const statusBox = document.getElementById('upload-status');
    const repoVal = document.getElementById('drop-repo').value.trim();
    const branchVal = document.getElementById('drop-branch').value;
    const pathVal = document.getElementById('drop-path').value.trim();
    const msgVal = document.getElementById('drop-msg').value.trim() || `feat(dropzone): upload ${selectedFileName}`;

    if (!selectedFileBase64) {
      statusBox.innerHTML = '<span class="text-rose-500 font-semibold">Please select or drop a file first.</span>';
      return;
    }
    if (!repoVal || !pathVal) {
      statusBox.innerHTML = '<span class="text-rose-500 font-semibold">Repository and file path are required.</span>';
      return;
    }

    statusBox.textContent = 'Committing file to GitHub branch...';

    try {
      const res = await fetch('/api/uploader/commit-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          repo_name: repoVal,
          branch_name: branchVal,
          file_path: pathVal,
          content_base64: selectedFileBase64,
          commit_message: msgVal
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload commit failed');

      statusBox.innerHTML = `
        <span class="text-emerald-500 font-semibold">Committed!</span>
        <a href="${data.commit_url}" target="_blank" class="text-[var(--royal-gold)] underline">SHA: ${data.commit_sha.substring(0, 7)}</a>
      `;
    } catch (err) {
      statusBox.innerHTML = `<span class="text-rose-500 font-semibold">Error: ${err.message}</span>`;
    }
  });
}
