// State & Storage keys
const TOKEN_KEY = 'devsync_gh_token';
const USER_KEY = 'devsync_user_profile';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  updateSessionBar();
}

export async function initiateLogin() {
  try {
    const res = await fetch('/api/auth/config');
    const data = await res.json();
    if (data.auth_url) {
      window.location.href = data.auth_url;
    }
  } catch (err) {
    console.error('Failed to initiate GitHub OAuth:', err);
  }
}

export async function checkAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    // Remove the temporary code from URL without reloading
    window.history.replaceState({}, document.title, window.location.pathname);

    try {
      const res = await fetch(`/api/auth/token?code=${code}`, { method: 'POST' });
      if (!res.ok) throw new Error('Token exchange failed');

      const data = await res.json();
      if (data.authenticated) {
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        updateSessionBar();
      }
    } catch (err) {
      console.error('Authentication failed:', err);
    }
  } else {
    updateSessionBar();
  }
}

export function updateSessionBar() {
  const sessionBar = document.getElementById('user-session-bar');
  if (!sessionBar) return;

  const user = getStoredUser();

  // Keep existing theme toggle if present
  const themeToggle = document.getElementById('theme-toggle');
  const themeToggleHtml = themeToggle ? themeToggle.outerHTML : '';

  if (user) {
    sessionBar.innerHTML = `
      ${themeToggleHtml}
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2.5 px-3 py-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]">
          <img src="${user.avatar_url}" alt="${user.username}" class="w-6 h-6 rounded-full border border-[var(--border-gold)]">
          <span class="text-xs font-semibold text-[var(--text-main)]">${user.name || user.username}</span>
        </div>
        <button id="btn-logout" class="text-xs text-[var(--text-tertiary)] hover:text-rose-500 transition-colors px-2 py-1 cursor-pointer">
          Sign out
        </button>
      </div>
    `;

    document.getElementById('btn-logout')?.addEventListener('click', clearSession);
  } else {
    sessionBar.innerHTML = `
      ${themeToggleHtml}
      <button id="btn-login" class="ds-btn ds-btn-primary">
        <svg class="w-4 h-4 text-[#c29b48]" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
        Sign in with GitHub
      </button>
    `;

    document.getElementById('btn-login')?.addEventListener('click', initiateLogin);
  }
}