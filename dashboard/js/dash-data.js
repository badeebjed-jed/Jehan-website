/* ============================================================
   Jehan Holding Group — Dashboard Shared Data Layer
   ============================================================
   Server-backed store (via api.php) with a localStorage cache.

   • The synchronous API (getRequests, addRequest, …) reads/writes a
     localStorage cache for instant UI.
   • On load AND on a short poll, it PULLS the authoritative data from
     the server so every device / account sees the same requests,
     messages and customers.
   • Every write is mirrored to the server so other devices pick it up.

   Pages call JehanData.subscribe(renderFn) so they re-render when
   fresh server data arrives.

   Schema
   ──────
   request  = { id, ref, project, client, email, phone, quantity, mix,
                location, message, deliveryDate, status, date, quote,
                addedToCustomers }
   customer = { id, name, email, phone, location, activity, notes, date }
   message  = { id, name, email, subject, body, source, date, read, flagged }
   ============================================================ */

(function () {
  'use strict';

  var K_REQ  = 'jehan_requests';
  var K_CUST = 'jehan_customers';
  var K_MSG  = 'jehan_messages';
  var K_VER  = 'jehan_data_version';
  var VERSION = '3';

  // Map cache key → server collection name.
  var COLLECTION = {};
  COLLECTION[K_REQ]  = 'requests';
  COLLECTION[K_CUST] = 'customers';
  COLLECTION[K_MSG]  = 'messages';

  // api.php lives at the site root. Dashboard pages are one level deeper.
  var API = (location.pathname.indexOf('/dashboard/') !== -1) ? '../api.php' : 'api.php';
  var IS_DASHBOARD = location.pathname.indexOf('/dashboard/') !== -1;

  // ── One-time cache reset on version bump ─────────────────────
  try {
    if (localStorage.getItem(K_VER) !== VERSION) {
      localStorage.setItem(K_REQ, '[]');
      localStorage.setItem(K_CUST, '[]');
      localStorage.setItem(K_MSG, '[]');
      localStorage.setItem(K_VER, VERSION);
    }
  } catch (e) {}

  // ── localStorage cache helpers ───────────────────────────────
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
  }
  function write(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {}
  }
  // Globally-unique id (works across devices, unlike a per-browser counter).
  function uid() { return Date.now() * 1000 + Math.floor(Math.random() * 1000); }
  function shortRef(id) { return 'REQ-' + String(id).slice(-6); }
  function nowISO() { return new Date().toISOString(); }

  // ── Server transport ─────────────────────────────────────────
  function serverGet(collection) {
    return fetch(API + '?collection=' + collection + '&_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  function serverPost(collection, op, obj) {
    var url = API + '?collection=' + collection + (op ? '&op=' + op : '');
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function push(key, op, obj) {
    var c = COLLECTION[key]; if (!c) return;
    serverPost(c, op, obj);
  }

  // ── Subscribers (pages re-render when server data lands) ─────
  var subscribers = [];
  function subscribe(fn) {
    if (typeof fn === 'function' && subscribers.indexOf(fn) === -1) subscribers.push(fn);
    pull(); // fetch fresh data for the newly-subscribed view
  }
  function notify() {
    subscribers.forEach(function (fn) { try { fn(); } catch (e) {} });
    try { syncInboxBadge(); } catch (e) {}
  }

  var pulling = false;
  function pull() {
    if (pulling) return;
    pulling = true;
    Promise.all([serverGet('requests'), serverGet('customers'), serverGet('messages')])
      .then(function (res) {
        var changed = false;
        if (res[0] && res[0].constructor === Array) { write(K_REQ, res[0]); changed = true; }
        if (res[1] && res[1].constructor === Array) { write(K_CUST, res[1]); changed = true; }
        if (res[2] && res[2].constructor === Array) { write(K_MSG, res[2]); changed = true; }
        pulling = false;
        if (changed) notify();
      })
      .catch(function () { pulling = false; });
  }

  // ── Requests ─────────────────────────────────────────────────
  function getRequests() {
    return read(K_REQ).slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  }
  function getRequest(id) {
    return read(K_REQ).filter(function (r) { return r.id === id; })[0] || null;
  }
  function addRequest(data) {
    var list = read(K_REQ);
    var id = uid();
    var req = {
      id: id, ref: shortRef(id),
      project: data.project || 'Concrete Request',
      client: data.client || 'Unknown',
      email: data.email || '', phone: data.phone || '',
      quantity: data.quantity != null ? data.quantity : '',
      mix: data.mix || '', location: data.location || '',
      message: data.message || '', deliveryDate: data.deliveryDate || '',
      status: 'Pending', date: nowISO(), quote: null, addedToCustomers: false
    };
    list.push(req); write(K_REQ, list);
    push(K_REQ, 'create', req);
    return req;
  }
  function updateRequest(id, patch) {
    var list = read(K_REQ);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        for (var k in patch) { if (patch.hasOwnProperty(k)) list[i][k] = patch[k]; }
        write(K_REQ, list);
        push(K_REQ, 'update', list[i]);
        return list[i];
      }
    }
    return null;
  }
  function deleteRequest(id) {
    write(K_REQ, read(K_REQ).filter(function (r) { return r.id !== id; }));
    push(K_REQ, 'delete', { id: id });
  }

  // ── Customers ────────────────────────────────────────────────
  function getCustomers() {
    return read(K_CUST).slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  }
  function addCustomer(data) {
    var list = read(K_CUST);
    var email = (data.email || '').trim().toLowerCase();
    if (email) {
      var existing = list.filter(function (c) { return (c.email || '').trim().toLowerCase() === email; })[0];
      if (existing) return existing;
    }
    var cust = {
      id: uid(), name: data.name || 'Unknown', email: data.email || '',
      phone: data.phone || '', location: data.location || '',
      activity: data.activity || 'Enquiry', notes: data.notes || '', date: nowISO()
    };
    list.push(cust); write(K_CUST, list);
    push(K_CUST, 'create', cust);
    return cust;
  }
  function customerExists(email) {
    email = (email || '').trim().toLowerCase();
    if (!email) return false;
    return read(K_CUST).some(function (c) { return (c.email || '').trim().toLowerCase() === email; });
  }

  // ── Messages ─────────────────────────────────────────────────
  function getMessages() {
    return read(K_MSG).slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  }
  function addMessage(data) {
    var list = read(K_MSG);
    var msg = {
      id: uid(), name: data.name || 'Unknown', email: data.email || '',
      subject: data.subject || '(No subject)', body: data.body || '',
      source: data.source || 'Contact Us Form', date: nowISO(), read: false, flagged: false
    };
    list.push(msg); write(K_MSG, list);
    push(K_MSG, 'create', msg);
    return msg;
  }
  function updateMessage(id, patch) {
    var list = read(K_MSG);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        for (var k in patch) { if (patch.hasOwnProperty(k)) list[i][k] = patch[k]; }
        write(K_MSG, list);
        push(K_MSG, 'update', list[i]);
        return list[i];
      }
    }
    return null;
  }
  function unreadMessageCount() {
    return read(K_MSG).filter(function (m) { return !m.read; }).length;
  }

  // ── KPIs ─────────────────────────────────────────────────────
  function kpis() {
    var reqs = read(K_REQ);
    return {
      totalRequests: reqs.length,
      newLeads: reqs.filter(function (r) { return r.status === 'Pending'; }).length,
      activeQuotes: reqs.filter(function (r) { return r.status === 'Quote Sent'; }).length,
      estVolume: reqs.reduce(function (s, r) { var q = parseFloat(r.quantity); return s + (isNaN(q) ? 0 : q); }, 0),
      customers: read(K_CUST).length,
      unreadMessages: unreadMessageCount()
    };
  }

  // ── Formatting helpers ───────────────────────────────────────
  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso); if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtRelative(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + ' min ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
    var days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return days + ' days ago';
    return fmtDate(iso);
  }
  function initials(name) {
    return (name || '?').split(/\s+/).map(function (w) { return w[0] || ''; })
      .slice(0, 2).join('').toUpperCase() || '?';
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function statusPill(status) {
    switch (status) {
      case 'Pending':    return 'bg-gold-bg text-dark border border-gold';
      case 'Contacted':  return 'bg-surface-mid text-mid border border-border';
      case 'Quote Sent': return 'bg-primary-lt/20 text-primary border border-primary-lt';
      case 'Approved':   return 'bg-primary-lt/30 text-primary border border-primary-lt';
      case 'Rejected':   return 'bg-error-bg text-error border border-error/30';
      default:           return 'bg-surface-mid text-mid border border-border';
    }
  }

  // ── Sidebar inbox badge ──────────────────────────────────────
  function syncInboxBadge() {
    try {
      var link = document.querySelector('nav a[href="inbox.html"]');
      if (!link) return;
      var badge = link.querySelector('span.rounded-full');
      var count = unreadMessageCount();
      if (!badge) {
        if (count > 0) {
          badge = document.createElement('span');
          badge.className = 'ml-auto bg-gold text-white text-xs font-bold px-2 py-0.5 rounded-full';
          link.appendChild(badge);
        } else { return; }
      }
      if (count > 0) { badge.textContent = count; badge.style.display = ''; }
      else { badge.style.display = 'none'; }
    } catch (e) {}
  }

  // ── Boot: pull from server + keep the dashboard fresh ────────
  function boot() {
    syncInboxBadge();
    pull();
    if (IS_DASHBOARD) {
      setInterval(pull, 20000);                 // poll every 20s
      window.addEventListener('focus', pull);   // and when the tab regains focus
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ── Public API ───────────────────────────────────────────────
  window.JehanData = {
    getRequests: getRequests, getRequest: getRequest, addRequest: addRequest,
    updateRequest: updateRequest, deleteRequest: deleteRequest,
    getCustomers: getCustomers, addCustomer: addCustomer, customerExists: customerExists,
    getMessages: getMessages, addMessage: addMessage, updateMessage: updateMessage,
    unreadMessageCount: unreadMessageCount,
    kpis: kpis, fmtDate: fmtDate, fmtRelative: fmtRelative, initials: initials,
    escapeHtml: escapeHtml, statusPill: statusPill, syncInboxBadge: syncInboxBadge,
    // server sync
    subscribe: subscribe, refresh: pull, pull: pull
  };
})();
