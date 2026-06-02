/* ============================================================
   Jehan Holding Group — Dashboard Authentication
   ============================================================
   - Only the admin email may log in.
   - Password is checked via SHA-256 hash (never stored in plain).
   - Session is held in sessionStorage (cleared when tab closes).
   - Any dashboard page must call requireAuth() at top of <body>.
   ============================================================ */

(function () {
  'use strict';

  // ── Admin credentials ────────────────────────────────────────
  // Email comparison is case-insensitive.
  const ADMIN_EMAIL = 'info@jehanreadymix.com';

  // SHA-256 hex digest of the admin password.
  // (The plaintext password is NEVER stored in source.)
  const ADMIN_PASSWORD_HASH =
    '551f7ecd85ae0d184ddec47c86a1c18f43807c4d51507435248b48186ef63074';

  const SESSION_KEY = 'jehan_admin_session';
  const SESSION_TIMEOUT_MS = 1000 * 60 * 60 * 8; // 8 hours

  // ── Crypto helper ────────────────────────────────────────────
  async function sha256Hex(message) {
    const buf = new TextEncoder().encode(message);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ── Session helpers ──────────────────────────────────────────
  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session || !session.email || !session.expires) return null;
      if (Date.now() > session.expires) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  }

  function setSession(email) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      email: email,
      role: 'admin',
      expires: Date.now() + SESSION_TIMEOUT_MS
    }));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ── Public API ───────────────────────────────────────────────

  // Validates credentials and creates a session.
  // Returns { success: true } or { success: false, error: 'message' }.
  async function login(email, password) {
    if (!email || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedEmail !== ADMIN_EMAIL) {
      return { success: false, error: 'Invalid credentials. Access denied.' };
    }
    const hash = await sha256Hex(String(password));
    if (hash !== ADMIN_PASSWORD_HASH) {
      return { success: false, error: 'Invalid credentials. Access denied.' };
    }
    setSession(ADMIN_EMAIL);
    return { success: true };
  }

  // Logs out the current user and sends them to login.
  function logout() {
    clearSession();
    // Determine path to login — works from any dashboard page.
    const target = window.location.pathname.includes('/dashboard/')
      ? 'login.html'
      : 'dashboard/login.html';
    window.location.replace(target);
  }

  // Guards a dashboard page. Redirects to login if not authenticated.
  // Call at the very top of <body> on every protected page.
  function requireAuth() {
    const session = getSession();
    if (!session) {
      // Not authenticated — kick to login.
      window.location.replace('login.html');
      return false;
    }
    return true;
  }

  // Returns the currently logged-in admin info or null.
  function currentUser() {
    return getSession();
  }

  // ── Expose globally ──────────────────────────────────────────
  window.JehanAuth = {
    login: login,
    logout: logout,
    requireAuth: requireAuth,
    currentUser: currentUser
  };
})();
