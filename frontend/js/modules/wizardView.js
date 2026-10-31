import { getStoredToken } from './authView.js';

export function render(container) {
    const token = getStoredToken();

    container.innerHTML = `
        <div class="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <div class="border-b border-[var(--border-subtle)] pb-5">
                <h2 class="font-serif text-3xl font-bold tracking-tight text-[var(--royal-navy)]">
                    Lead Architect Provisioner
                </h2>
                <p class="text-sm text-[var(--text-secondary)] mt-1.5">
                    Configure your collaborative suite, assign isolated domains,
                    and scaffold GitHub branches automatically.
                </p>
            </div>

            ${!token ? `
                <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm flex items-center justify-between">
                    <span>GitHub authentication required to provision repositories.</span>
                    <span class="font-semibold underline cursor-pointer"
                          onclick="document.getElementById('btn-login')?.click()">
                        Sign In
                    </span>
                </div>
            ` : ''}

            <form id="provision-form" class="space-y-6">

                <div class="ds-card space-y-4">
                    <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                        <h3 class="font-serif text-lg font-semibold text-[var(--royal-navy)]">
                            1. Repository Architecture
                        </h3>
                        <span class="text-xs font-mono text-[var(--royal-gold)] uppercase tracking-wider">
                            Step 01 / 02
                        </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                                Repository Name
                            </label>
                            <input
                                type="text"
                                id="repo-name"
                                required
                                placeholder="e.g. DevSync-Core"
                                class="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--royal-gold)] transition-colors"
                            >
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                                Visibility
                            </label>
                            <select
                                id="repo-visibility"
                                class="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--royal-gold)] transition-colors"
                            >
                                <option value="false">
                                    Public (Recommended for Open Collaboration)
                                </option>
                                <option value="true">Private</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                            Project Brief / Description
                        </label>
                        <input
                            type="text"
                            id="repo-desc"
                            placeholder="High-performance collaborative engineering workspace"
                            class="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--royal-gold)] transition-colors"
                        >
                    </div>
                </div>

                <div class="ds-card space-y-4">
                    <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                        <div>
                            <h3 class="font-serif text-lg font-semibold text-[var(--royal-navy)]">
                                2. Domain Assignments & Branch Matrix
                            </h3>
                            <p class="text-xs text-[var(--text-secondary)] mt-0.5">
                                Isolated branches prevent merge collisions.
                            </p>
                        </div>

                        <button
                            type="button"
                            id="btn-add-member"
                            class="text-xs font-semibold text-[var(--royal-gold)] hover:underline cursor-pointer"
                        >
                            + Add Member
                        </button>
                    </div>

                    <div id="collaborator-list" class="space-y-3"></div>
                </div>

                <div class="flex items-center justify-between pt-2">
                    <div
                        id="provision-status"
                        class="text-xs font-mono text-[var(--text-secondary)]"
                    ></div>

                    <button
                        type="submit"
                        id="btn-scaffold"
                        ${!token ? 'disabled' : ''}
                        class="ds-btn ds-btn-primary px-6 py-3 font-semibold"
                    >
                        <span>Scaffold Repository & Branches</span>
                        <svg
                            class="w-4 h-4 text-[#c29b48]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    `;

    const defaultMembers = [
        {
            username: 'Jahnavi-A',
            role: 'Architect & Wizard',
            branch: 'feat/project-wizard'
        },
        {
            username: 'Chidvilas',
            role: 'Mission Hub & Dropzone',
            branch: 'feat/mission-dropzone'
        },
        {
            username: 'Gautam',
            role: 'Studio Code Editor',
            branch: 'feat/code-editor'
        },
        {
            username: 'Aravind',
            role: 'PR & Conflict Resolver',
            branch: 'feat/pr-conflict-resolver'
        }
    ];

    const listContainer = document.getElementById('collaborator-list');

    function renderMemberRow(
        member = {
            username: '',
            role: '',
            branch: ''
        }
    ) {
        const row = document.createElement('div');

        row.className =
            'collaborator-row grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]';

        row.innerHTML = `
            <input
                type="text"
                placeholder="GitHub Username"
                value="${member.username}"
                required
                class="member-username px-3 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)]"
            >

            <input
                type="text"
                placeholder="Assigned Role"
                value="${member.role}"
                required
                class="member-role px-3 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)]"
            >

            <input
                type="text"
                placeholder="Feature Branch"
                value="${member.branch}"
                required
                class="member-branch px-3 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--royal-gold)]"
            >
        `;

        listContainer.appendChild(row);
    }

    defaultMembers.forEach(member => renderMemberRow(member));

    document
        .getElementById('btn-add-member')
        .addEventListener('click', () => renderMemberRow());

    document
        .getElementById('provision-form')
        .addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.getElementById('btn-scaffold');
            const statusBox = document.getElementById('provision-status');

            const rows = document.querySelectorAll('.collaborator-row');

            const collaborators = Array.from(rows).map(row => ({
                username: row
                    .querySelector('.member-username')
                    .value
                    .trim(),

                role: row
                    .querySelector('.member-role')
                    .value
                    .trim(),

                branch_name: row
                    .querySelector('.member-branch')
                    .value
                    .trim(),

                assigned_files: []
            }));

            const payload = {
                repo_name: document
                    .getElementById('repo-name')
                    .value
                    .trim(),

                description: document
                    .getElementById('repo-desc')
                    .value
                    .trim(),

                is_private:
                    document.getElementById('repo-visibility').value === 'true',

                tech_stack: 'FastAPI + Vanilla JS',

                collaborators
            };

            btn.disabled = true;

            btn.innerHTML = `
                <span class="animate-pulse">
                    Scaffolding via GitHub API...
                </span>
            `;

            statusBox.textContent =
                'Creating repository & provisioning branch matrix...';

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

                if (!res.ok) {
                    throw new Error(
                        data.detail || 'Scaffolding failed'
                    );
                }

                const repoLabel =
                    document.getElementById('current-repo-label');

                if (repoLabel) {
                    repoLabel.textContent = payload.repo_name;
                }

                container.innerHTML = `
                    <div class="max-w-2xl mx-auto ds-card text-center space-y-6 py-12">

                        <div class="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                            <svg
                                class="w-7 h-7"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>

                        <div>
                            <h3 class="font-serif text-2xl font-bold text-[var(--royal-navy)]">
                                Architecture Successfully Deployed
                            </h3>

                            <p class="text-sm text-[var(--text-secondary)] mt-1">
                                Repository initialized and all teammate branches were created.
                            </p>
                        </div>

                        <div class="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] font-mono text-xs text-left space-y-2">

                            <p>
                                <span class="text-[var(--text-tertiary)]">
                                    Repository:
                                </span>

                                <a
                                    href="${data.repo_url}"
                                    target="_blank"
                                    class="text-[var(--royal-gold)] underline"
                                >
                                    ${data.repo_url}
                                </a>
                            </p>

                            <p>
                                <span class="text-[var(--text-tertiary)]">
                                    Branches Provisioned:
                                </span>

                                ${data.branches_created.join(', ')}
                            </p>

                        </div>

                        <button
                            onclick="window.location.reload()"
                            class="ds-btn ds-btn-primary"
                        >
                            Provision Another Project
                        </button>

                    </div>
                `;

            } catch (err) {

                statusBox.innerHTML = `
                    <span class="text-rose-500 font-semibold">
                        Error: ${err.message}
                    </span>
                `;

                btn.disabled = false;

                btn.innerHTML = `
                    <span>Try Again</span>
                `;
            }
        });
}