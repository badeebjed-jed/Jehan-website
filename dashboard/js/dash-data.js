/* ============================================================
   Jehan Holding Group — Dashboard Shared Data Layer
   ============================================================
   A localStorage-backed store shared across the whole origin.
   Both the dashboard AND the public website forms read/write
   these same keys, so a quote submitted on the site shows up
   live in the dashboard.

   Starts COMPLETELY EMPTY — no demo/sample/placeholder data.

   Schema
   ──────
   request = {
     id, ref, project, client, email, phone,
     quantity, mix, location, message, deliveryDate,
     status,            // Pending | Contacted | Quote Sent | Approved | Rejected
     date,              // ISO timestamp
     quote,             // { rate, total, delivery, notes, sentAt } | null
     addedToCustomers   // bool
   }
   customer = { id, name, email, phone, location, activity, notes, date }
   message  = { id, name, email, subject, body, source, date, read, flagged }
   ============================================================ */

(function () {
  'use strict';

  var K_REQ  = 'jehan_requests';
  var K_CUST = 'jehan_customers';
  var K_MSG  = 'jehan_messages';
  var K_SEQ  = 'jehan_seq';            // global id counter
  var K_VER  = 'jehan_data_version';   // schema/version guard
  var VERSION = '2';                   // bump to wipe old demo data

  // ── One-time clean slate ─────────────────────────────────────
  // If the stored version is older (or the old hardcoded demo era),
  // wipe the operational collections so the dashboard starts clean.
  try {
    if (localStorage.getItem(K_VER) !== VERSION) {
      localStorage.setItem(K_REQ, '[]');
      localStorage.setItem(K_CUST, '[]');
      localStorage.setItem(K_MSG, '[]');
      localStorage.setItem(K_VER, VERSION);
    }
  } catch (e) { /* storage unavailable — degrade gracefully */ }

  // ── Low-level helpers ────────────────────────────────────────
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
  }
  function write(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {}
  }
  function nextId() {
    var n = parseInt(localStorage.getItem(K_SEQ) || '1000', 10) + 1;
    localStorage.setItem(K_SEQ, String(n));
    return n;
  }
  function nowISO() { return new Date().toISOString(); }

  // ── Requests ─────────────────────────────────────────────────
  function getRequests() {
    // newest first
    return read(K_REQ).slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
  }
  function getRequest(id) {
    return read(K_REQ).filter(function (r) { return r.id === id; })[0] || null;
  }
  function addRequest(data) {
    var list = read(K_REQ);
    var id = nextId();
    var req = {
      id: id,
      ref: 'REQ-' + id,
      project: data.project || 'Concrete Request',
      client: data.client || 'Unknown',
      email: data.email || '',
      phone: data.phone || '',
      quantity: data.quantity != null ? data.quantity : '',
      mix: data.mix || '',
      location: data.location || '',
      message: data.message || '',
      deliveryDate: data.deliveryDate || '',
      status: 'Pending',
      date: nowISO(),
      quote: null,
      addedToCustomers: false
    };
    list.push(req);
    write(K_REQ, list);
    return req;
  }
  function updateRequest(id, patch) {
    var list = read(K_REQ);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        for (var k in patch) { if (patch.hasOwnProperty(k)) list[i][k] = patch[k]; }
        write(K_REQ, list);
        return list[i];
      }
    }
    return null;
  }
  function deleteRequest(id) {
    write(K_REQ, read(K_REQ).filter(function (r) { return r.id !== id; }));
  }

  // ── Customers ────────────────────────────────────────────────
  function getCustomers() {
    return read(K_CUST).slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
  }
  function addCustomer(data) {
    var list = read(K_CUST);
    // de-dupe by email (case-insensitive)
    var email = (data.email || '').trim().toLowerCase();
    if (email) {
      var existing = list.filter(function (c) {
        return (c.email || '').trim().toLowerCase() === email;
      })[0];
      if (existing) return existing;
    }
    var cust = {
      id: nextId(),
      name: data.name || 'Unknown',
      email: data.email || '',
      phone: data.phone || '',
      location: data.location || '',
      activity: data.activity || 'Enquiry',
      notes: data.notes || '',
      date: nowISO()
    };
    list.push(cust);
    write(K_CUST, list);
    return cust;
  }
  function customerExists(email) {
    email = (email || '').trim().toLowerCase();
    if (!email) return false;
    return read(K_CUST).some(function (c) {
      return (c.email || '').trim().toLowerCase() === email;
    });
  }

  // ── Messages ─────────────────────────────────────────────────
  function getMessages() {
    return read(K_MSG).slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
  }
  function addMessage(data) {
    var list = read(K_MSG);
    var msg = {
      id: nextId(),
      name: data.name || 'Unknown',
      email: data.email || '',
      subject: data.subject || '(No subject)',
      body: data.body || '',
      source: data.source || 'Contact Us Form',
      date: nowISO(),
      read: false,
      flagged: false
    };
    list.push(msg);
    write(K_MSG, list);
    return msg;
  }
  function updateMessage(id, patch) {
    var list = read(K_MSG);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        for (var k in patch) { if (patch.hasOwnProperty(k)) list[i][k] = patch[k]; }
        write(K_MSG, list);
        return list[i];
      }
    }
    return null;
  }
  function unreadMessageCount() {
    return read(K_MSG).filter(function (m) { return !m.read; }).length;
  }

  // ── KPI / aggregate helpers ──────────────────────────────────
  function kpis() {
    var reqs = read(K_REQ);
    var totalRequests = reqs.length;
    var newLeads = reqs.filter(function (r) { return r.status === 'Pending'; }).length;
    var activeQuotes = reqs.filter(function (r) { return r.status === 'Quote Sent'; }).length;
    var estVolume = reqs.reduce(function (sum, r) {
      var q = parseFloat(r.quantity);
      return sum + (isNaN(q) ? 0 : q);
    }, 0);
    return {
      totalRequests: totalRequests,
      newLeads: newLeads,
      activeQuotes: activeQuotes,
      estVolume: estVolume,
      customers: read(K_CUST).length,
      unreadMessages: unreadMessageCount()
    };
  }

  // ── Formatting helpers ───────────────────────────────────────
  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtRelative(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var diff = Date.now() - d.getTime();
    var mins = Math.floor(diff / 60000);
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

  // Status → pill CSS classes (Tailwind utility strings used in the app)
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

  // ── Sidebar inbox badge sync (runs on every dashboard page) ───
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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncInboxBadge);
  } else {
    syncInboxBadge();
  }

  // ── Public API ───────────────────────────────────────────────
  window.JehanData = {
    // requests
    getRequests: getRequests,
    getRequest: getRequest,
    addRequest: addRequest,
    updateRequest: updateRequest,
    deleteRequest: deleteRequest,
    // customers
    getCustomers: getCustomers,
    addCustomer: addCustomer,
    customerExists: customerExists,
    // messages
    getMessages: getMessages,
    addMessage: addMessage,
    updateMessage: updateMessage,
    unreadMessageCount: unreadMessageCount,
    // aggregates + helpers
    kpis: kpis,
    fmtDate: fmtDate,
    fmtRelative: fmtRelative,
    initials: initials,
    escapeHtml: escapeHtml,
    statusPill: statusPill,
    syncInboxBadge: syncInboxBadge
  };
})();
