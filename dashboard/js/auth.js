/* ============================================================
   Jehan Holding Group — Dashboard Authentication & Access
   ============================================================
   - Multi-user accounts stored in localStorage ("jehan_users").
   - The PRIMARY administrator (Abdullah Badeeb) is always seeded
     and can never be deleted, deactivated, or stripped of access.
   - Passwords are stored as SHA-256 hashes (never plaintext).
   - Login validates against the user store; only Active users
     may sign in. Sessions carry the user's role + permissions.
   - Per-module permissions are enforced across the dashboard.
   ============================================================ */

(function () {
  'use strict';

  // ── Primary administrator (the system owner) ─────────────────
  var PRIMARY_EMAIL = 'info@jehanreadymix.com';
  var PRIMARY_NAME  = 'Abdullah Badeeb';
  // SHA-256 of the primary admin password (Aa@@500500).
  var PRIMARY_HASH  = '551f7ecd85ae0d184ddec47c86a1c18f43807c4d51507435248b48186ef63074';

  // ── Pre-provisioned team members ─────────────────────────────
  // These accounts are seeded ONCE (guarded by SEED_VERSION) so real
  // staff exist on every device after deployment. Bump SEED_VERSION
  // to introduce new seed members. Deleting a seeded user in the UI
  // is permanent — they are NOT resurrected on the next load.
  var SEED_VERSION = '2';
  var SEED_USERS = [
    {
      name: 'Fayez Jamal',
      email: 'Fayez@jehanreadymix.com',
      role: 'Operations Manager',
      status: 'Active',
      // SHA-256 of the temporary password Aa@@100100
      passwordHash: '11cfcca5bc84ff9aef06f6082e0efc8932bec7a3826a9d0a01f2c2b7f83e6a5c',
      permissions: { bookings: true, customers: true, financials: true, settings: false, profile: false }
    }
  ];

  var USERS_KEY    = 'jehan_users';
  var SEQ_KEY      = 'jehan_seq';
  var SESSION_KEY  = 'jehan_admin_session';
  var SESSION_TIMEOUT_MS = 1000 * 60 * 60 * 8; // 8 hours

  // Permission modules every account can be granted.
  var MODULES = ['bookings', 'customers', 'financials', 'settings', 'profile', 'approvals'];

  // ── Crypto ───────────────────────────────────────────────────
  function sha256Hex(message) {
    var buf = new TextEncoder().encode(message);
    return crypto.subtle.digest('SHA-256', buf).then(function (digest) {
      return Array.prototype.map.call(new Uint8Array(digest), function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  // ── Low-level store ──────────────────────────────────────────
  function readUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function writeUsers(arr) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function nextId() {
    var n = parseInt(localStorage.getItem(SEQ_KEY) || '1000', 10) + 1;
    localStorage.setItem(SEQ_KEY, String(n));
    return n;
  }
  function allPerms(value) {
    var p = {}; MODULES.forEach(function (m) { p[m] = value; }); return p;
  }

  // ── Seed / repair the primary admin ──────────────────────────
  // Guarantees exactly one primary admin exists, with full access.
  function ensurePrimary() {
    var users = readUsers();
    var primary = users.filter(function (u) { return u.primary; })[0];
    if (!primary) {
      // Also clear out any stale demo accounts the first time we seed.
      primary = {
        id: nextId(),
        name: PRIMARY_NAME,
        email: PRIMARY_EMAIL,
        role: 'Administrator',
        status: 'Active',
        passwordHash: PRIMARY_HASH,
        permissions: allPerms(true),
        primary: true,
        createdAt: new Date().toISOString()
      };
      users.unshift(primary);
      writeUsers(users);
    } else {
      // Keep the primary account healthy no matter what.
      var changed = false;
      if (primary.email !== PRIMARY_EMAIL) { primary.email = PRIMARY_EMAIL; changed = true; }
      if (primary.status !== 'Active')     { primary.status = 'Active'; changed = true; }
      if (primary.role !== 'Administrator'){ primary.role = 'Administrator'; changed = true; }
      MODULES.forEach(function (m) {
        if (!primary.permissions || primary.permissions[m] !== true) {
          primary.permissions = primary.permissions || {};
          primary.permissions[m] = true; changed = true;
        }
      });
      if (changed) writeUsers(users);
    }
    return primary;
  }
  ensurePrimary();

  // One-time provisioning of pre-defined team members.
  function seedTeam() {
    try {
      if (localStorage.getItem('jehan_seed_version') === SEED_VERSION) return;
      var users = readUsers();
      SEED_USERS.forEach(function (su) {
        var exists = users.some(function (u) {
          return (u.email || '').trim().toLowerCase() === su.email.trim().toLowerCase();
        });
        if (!exists) {
          users.push({
            id: nextId(),
            name: su.name,
            email: su.email,
            role: su.role || 'Viewer',
            status: su.status === 'Inactive' ? 'Inactive' : 'Active',
            passwordHash: su.passwordHash,
            permissions: su.permissions || allPerms(false),
            primary: false,
            createdAt: new Date().toISOString()
          });
        }
      });
      writeUsers(users);
      localStorage.setItem('jehan_seed_version', SEED_VERSION);
    } catch (e) {}
  }
  seedTeam();

  // ── Session ──────────────────────────────────────────────────
  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.email || !s.expires) return null;
      if (Date.now() > s.expires) { sessionStorage.removeItem(SESSION_KEY); return null; }
      return s;
    } catch (e) { return null; }
  }
  function setSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      primary: !!user.primary,
      permissions: user.permissions || allPerms(false),
      expires: Date.now() + SESSION_TIMEOUT_MS
    }));
  }
  function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

  // ── Auth ─────────────────────────────────────────────────────
  function login(email, password) {
    if (!email || !password) {
      return Promise.resolve({ success: false, error: 'Please enter both email and password.' });
    }
    ensurePrimary();
    var e = String(email).trim().toLowerCase();
    var user = readUsers().filter(function (u) {
      return (u.email || '').trim().toLowerCase() === e;
    })[0];
    if (!user) return Promise.resolve({ success: false, error: 'Invalid credentials. Access denied.' });
    if (user.status === 'Inactive') {
      return Promise.resolve({ success: false, error: 'This account is inactive. Contact your administrator.' });
    }
    return sha256Hex(String(password)).then(function (hash) {
      if (hash !== user.passwordHash) {
        return { success: false, error: 'Invalid credentials. Access denied.' };
      }
      setSession(user);
      return { success: true };
    });
  }

  function logout() {
    clearSession();
    var target = window.location.pathname.indexOf('/dashboard/') !== -1
      ? 'login.html' : 'dashboard/login.html';
    window.location.replace(target);
  }

  function requireAuth() {
    if (!getSession()) { window.location.replace('login.html'); return false; }
    return true;
  }

  function currentUser() { return getSession(); }

  function isAdmin() {
    var s = getSession();
    return !!(s && (s.primary || s.role === 'Administrator'));
  }

  // Can the current user access a given module?
  function can(module) {
    var s = getSession();
    if (!s) return false;
    if (s.primary || s.role === 'Administrator') return true;
    return !!(s.permissions && s.permissions[module]);
  }

  // Page guard for a specific module. Redirects to overview if denied.
  function enforce(module) {
    if (!requireAuth()) return false;
    if (!can(module)) { window.location.replace('overview.html'); return false; }
    return true;
  }
  // Page guard for admin-only pages (User Access).
  function enforceAdmin() {
    if (!requireAuth()) return false;
    if (!isAdmin()) { window.location.replace('overview.html'); return false; }
    return true;
  }
  // Approval rights: administrators always, plus anyone granted the
  // 'approvals' permission in User Access.
  function canApprove() {
    return isAdmin() || can('approvals');
  }
  function enforceApprover() {
    if (!requireAuth()) return false;
    if (!canApprove()) { window.location.replace('overview.html'); return false; }
    return true;
  }

  // ── User management API (admin) ──────────────────────────────
  function listUsers() {
    // primary first, then by creation
    return readUsers().slice().sort(function (a, b) {
      if (a.primary && !b.primary) return -1;
      if (b.primary && !a.primary) return 1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }
  function getUser(id) {
    return readUsers().filter(function (u) { return u.id === id; })[0] || null;
  }
  function emailExists(email, exceptId) {
    var e = (email || '').trim().toLowerCase();
    return readUsers().some(function (u) {
      return (u.email || '').trim().toLowerCase() === e && u.id !== exceptId;
    });
  }

  // addUser returns a Promise resolving { success, error?, user? }
  function addUser(data) {
    var name = (data.name || '').trim();
    var email = (data.email || '').trim();
    var password = data.password || '';
    if (!name)  return Promise.resolve({ success: false, error: 'Please enter the user\'s full name.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return Promise.resolve({ success: false, error: 'Please enter a valid email address.' });
    if (emailExists(email))
      return Promise.resolve({ success: false, error: 'A user with that email already exists.' });
    if (String(password).length < 8)
      return Promise.resolve({ success: false, error: 'Password must be at least 8 characters.' });

    return sha256Hex(String(password)).then(function (hash) {
      var users = readUsers();
      var user = {
        id: nextId(),
        name: name,
        email: email,
        role: data.role || 'Viewer',
        status: data.status === 'Inactive' ? 'Inactive' : 'Active',
        passwordHash: hash,
        permissions: data.permissions || allPerms(false),
        primary: false,
        createdAt: new Date().toISOString()
      };
      users.push(user);
      writeUsers(users);
      return { success: true, user: user };
    });
  }

  // updateUser patches profile/role/status/permissions. If patch.password
  // is provided it is re-hashed. The primary admin is protected.
  function updateUser(id, patch) {
    var users = readUsers();
    var u = users.filter(function (x) { return x.id === id; })[0];
    if (!u) return Promise.resolve({ success: false, error: 'User not found.' });

    function applyAndSave(extra) {
      if (patch.name != null) u.name = patch.name;
      if (patch.role != null && !u.primary) u.role = patch.role;
      if (patch.status != null && !u.primary) u.status = patch.status;
      if (patch.permissions != null && !u.primary) u.permissions = patch.permissions;
      if (extra && extra.passwordHash) u.passwordHash = extra.passwordHash;
      // primary always keeps full access + active
      if (u.primary) { u.permissions = allPerms(true); u.status = 'Active'; u.role = 'Administrator'; }
      writeUsers(users);
      return { success: true, user: u };
    }

    if (patch.password) {
      return sha256Hex(String(patch.password)).then(function (hash) {
        return applyAndSave({ passwordHash: hash });
      });
    }
    return Promise.resolve(applyAndSave(null));
  }

  function deleteUser(id) {
    var u = getUser(id);
    if (!u) return { success: false, error: 'User not found.' };
    if (u.primary) return { success: false, error: 'The primary administrator cannot be deleted.' };
    writeUsers(readUsers().filter(function (x) { return x.id !== id; }));
    return { success: true };
  }

  // ── Apply access control to the current page chrome ──────────
  function updateSidebarUser() {
    try {
      var s = getSession(); if (!s) return;
      // Enrich from the user store in case the session was created by an
      // older build that didn't carry name/role/primary.
      if (!s.name || s.primary === undefined) {
        var u = readUsers().filter(function (x) {
          return (x.email || '').trim().toLowerCase() === (s.email || '').trim().toLowerCase();
        })[0];
        if (u) { s.name = s.name || u.name; s.role = s.role || u.role; if (s.primary === undefined) s.primary = !!u.primary; }
      }
      var aside = document.querySelector('aside'); if (!aside) return;
      var footer = aside.querySelector('div.border-t'); if (!footer) return;
      var avatar = footer.querySelector('.rounded-full span');
      var ps = footer.querySelectorAll('p');
      var name = s.name || 'User';
      if (avatar) {
        avatar.textContent = name.split(/\s+/).map(function (w) { return w[0] || ''; })
          .slice(0, 2).join('').toUpperCase();
      }
      if (ps[0]) { ps[0].textContent = name; ps[0].removeAttribute('data-i18n'); }
      if (ps[1]) { ps[1].textContent = s.primary ? 'Primary Administrator' : (s.role || 'User'); ps[1].removeAttribute('data-i18n'); }
    } catch (e) {}
  }

  function applyNavPermissions() {
    try {
      var map = {
        'bookings.html': 'bookings', 'customers.html': 'customers', 'settings.html': 'settings',
        // sales modules ride on the bookings permission; reports on financials
        'leads.html': 'bookings', 'sales-forms.html': 'bookings',
        'calendar.html': 'bookings', 'tasks.html': 'bookings',
        'reports.html': 'financials'
      };
      document.querySelectorAll('nav a[href]').forEach(function (a) {
        var href = a.getAttribute('href');
        if (map[href] && !can(map[href])) { a.style.display = 'none'; }
        if (href === 'approvals.html' && !canApprove()) { a.style.display = 'none'; }
      });
      // Settings → Workspace cards: hide individually based on permission,
      // and hide the whole section if neither card is visible.
      var cardAccess  = document.getElementById('card-access');
      var cardProfile = document.getElementById('card-profile');
      if (cardAccess  && !isAdmin())     cardAccess.style.display  = 'none';
      if (cardProfile && !can('profile'))cardProfile.style.display = 'none';
      var ws = document.getElementById('workspace-section');
      if (ws && (!cardAccess || cardAccess.style.display === 'none') &&
                (!cardProfile || cardProfile.style.display === 'none')) {
        ws.style.display = 'none';
      }
    } catch (e) {}
  }

  function applyAccessControl() { updateSidebarUser(); applyNavPermissions(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAccessControl);
  } else {
    applyAccessControl();
  }

  // ── Expose ───────────────────────────────────────────────────
  window.JehanAuth = {
    // auth
    login: login,
    logout: logout,
    requireAuth: requireAuth,
    enforce: enforce,
    enforceAdmin: enforceAdmin,
    enforceApprover: enforceApprover,
    currentUser: currentUser,
    isAdmin: isAdmin,
    can: can,
    canApprove: canApprove,
    // user management
    listUsers: listUsers,
    getUser: getUser,
    addUser: addUser,
    updateUser: updateUser,
    deleteUser: deleteUser,
    emailExists: emailExists,
    hashPassword: sha256Hex,
    MODULES: MODULES,
    applyAccessControl: applyAccessControl
  };
})();
