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
  var K_LEAD = 'jehan_leads';
  var K_TASK = 'jehan_tasks';
  var K_EVT  = 'jehan_events';
  var K_AUD  = 'jehan_audit';
  var K_OPS  = 'jehan_opsorders';
  var K_TRIP = 'jehan_trips';
  var K_AST  = 'jehan_assets';
  var K_PCO  = 'jehan_pcorders';
  var K_CAST = 'jehan_castings';
  var K_DEL  = 'jehan_deliveries';
  var K_VER  = 'jehan_data_version';
  var VERSION = '6';

  // Sales-system constants
  var CONCRETE_DAILY_CAPACITY = 600; // m³ per day
  var APPROVAL_VOLUME_THRESHOLD = 200; // m³ — bookings at/above need approval
  var APPROVAL_DISCOUNT_THRESHOLD = 10; // % — discounts above need approval
  var LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Quoted', 'Negotiation', 'Won', 'Lost'];
  var WORKFLOW_STAGES = {
    concrete: ['Inquiry', 'Quote', 'Confirmed Booking', 'Dispatch Planned', 'Delivered', 'Closed'],
    precast:  ['Inquiry', 'Quote', 'Design / Approval', 'Production Queue', 'Delivery Plan', 'Closed'],
    block:    ['Inquiry', 'Quote', 'Confirmed', 'Dispatch', 'Closed']
  };
  var BOOKING_STATUSES = ['Pending', 'Pending Confirmation', 'Quote Sent', 'Booked', 'Paid', 'Delayed', 'Cancelled', 'Expired', 'Rejected', 'Approved', 'Contacted'];

  // Map cache key → server collection name.
  var COLLECTION = {};
  COLLECTION[K_REQ]  = 'requests';
  COLLECTION[K_CUST] = 'customers';
  COLLECTION[K_MSG]  = 'messages';
  COLLECTION[K_LEAD] = 'leads';
  COLLECTION[K_TASK] = 'tasks';
  COLLECTION[K_EVT]  = 'events';
  COLLECTION[K_AUD]  = 'audit';
  COLLECTION[K_OPS]  = 'opsorders';
  COLLECTION[K_TRIP] = 'trips';
  COLLECTION[K_AST]  = 'assets';
  COLLECTION[K_PCO]  = 'pcorders';
  COLLECTION[K_CAST] = 'castings';
  COLLECTION[K_DEL]  = 'deliveries';

  // ── Precast Operations constants ─────────────────────────────
  var CAST_MILESTONES = ['Queued', 'Mold Prep', 'Casting', 'Curing', 'Demolding', 'QC', 'In Yard'];
  var QC_REASONS = ['Surface Defect', 'Dimensional Error', 'Cracking', 'Reinforcement Issue', 'Curing Problem', 'Other'];
  var DELIVERY_MILESTONES = ['Planned', 'Loading', 'En Route', 'Delivered'];
  var DESIGN_STATUSES = ['Awaiting Drawings', 'Design Approved'];

  // ── Plant Operations constants ───────────────────────────────
  var TRIP_MILESTONES = ['Scheduled', 'Loading', 'En Route', 'On Site', 'Discharging', 'Washout', 'Returned'];
  var DELAY_REASONS = ['Traffic', 'Plant Breakdown', 'Pump Breakdown', 'Truck Breakdown', 'Site Not Ready', 'Weather', 'Quality Issue', 'Customer Delay', 'Other'];
  var REJECT_REASONS = ['Slump Out of Spec', 'Excess Wait Time', 'Wrong Mix', 'Site Rejection', 'Other'];
  var OPS_SHIFTS = ['Morning', 'Evening', 'Night'];
  var AUTH_STATUSES = ['Pending Review', 'Authorized', 'On Hold'];

  // api.php lives at the site root. Dashboard pages are one level deeper.
  var API = (location.pathname.indexOf('/dashboard/') !== -1) ? '../api.php' : 'api.php';
  var IS_DASHBOARD = location.pathname.indexOf('/dashboard/') !== -1;

  // ── One-time cache reset on version bump ─────────────────────
  try {
    if (localStorage.getItem(K_VER) !== VERSION) {
      [K_REQ, K_CUST, K_MSG, K_LEAD, K_TASK, K_EVT, K_AUD, K_OPS, K_TRIP, K_AST, K_PCO, K_CAST, K_DEL].forEach(function (k) {
        localStorage.setItem(k, '[]');
      });
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
    var keys = [K_REQ, K_CUST, K_MSG, K_LEAD, K_TASK, K_EVT, K_AUD, K_OPS, K_TRIP, K_AST, K_PCO, K_CAST, K_DEL];
    Promise.all(keys.map(function (k) { return serverGet(COLLECTION[k]); }))
      .then(function (res) {
        var changed = false;
        for (var i = 0; i < keys.length; i++) {
          if (res[i] && res[i].constructor === Array) { write(keys[i], res[i]); changed = true; }
        }
        pulling = false;
        if (changed) {
          try { maybeExpireQuotes(); } catch (e) {}
          notify();
        }
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
      status: data.status || 'Pending', date: nowISO(), quote: null, addedToCustomers: false,
      // ── Sales-system fields ──
      productType: data.productType || 'concrete',        // concrete | precast | block
      stage: data.stage || 'Inquiry',                     // workflow stage (per product type)
      source: data.source || 'website',                   // walk-in | phone | website | representative
      representative: data.representative || '',          // rep name when source = representative
      dispatchWindow: data.dispatchWindow || '',          // e.g. "08:00–12:00"
      followUp: data.followUp || '',                      // next follow-up date (YYYY-MM-DD)
      discount: data.discount != null ? data.discount : 0,// % discount on the quote
      versions: [],                                       // quote version history [{v, rate, total, reason, date, by}]
      expiry: data.expiry || '',                          // quote expiry date (YYYY-MM-DD)
      approval: null,                                     // {required, reasons[], status, by, date, note}
      tentative: !!data.tentative
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
      activity: data.activity || 'Enquiry', notes: data.notes || '', date: nowISO(),
      // ── Sales-system fields ──
      company: data.company || '',
      segment: data.segment || '',                    // contractor | consultant | walk-in | government | retail | developer
      keyAccount: !!data.keyAccount,
      representative: data.representative || '',
      contacts: data.contacts || []                   // [{name, phone, email, role}]
    };
    list.push(cust); write(K_CUST, list);
    push(K_CUST, 'create', cust);
    return cust;
  }
  function updateCustomer(id, patch) { return updateIn(K_CUST, id, patch); }
  function deleteCustomer(id) { deleteIn(K_CUST, id); }
  function getCustomer(id) { return getById(K_CUST, id); }
  function customerExists(email) {
    email = (email || '').trim().toLowerCase();
    if (!email) return false;
    return read(K_CUST).some(function (c) { return (c.email || '').trim().toLowerCase() === email; });
  }
  // Activity timeline for a customer: quotes, messages and tasks matched
  // by email/phone, merged and sorted (newest first).
  function customerTimeline(cust) {
    var em = (cust.email || '').trim().toLowerCase();
    var ph = String(cust.phone || '').replace(/\D/g, '');
    var items = [];
    read(K_REQ).forEach(function (r) {
      var rEm = (r.email || '').trim().toLowerCase();
      var rPh = String(r.phone || '').replace(/\D/g, '');
      if ((em && rEm === em) || (ph && rPh === ph)) {
        items.push({ kind: 'request', date: r.date, label: r.ref + ' · ' + (r.project || ''), status: r.status, id: r.id });
        if (r.quote && r.quote.sentAt) items.push({ kind: 'quote', date: r.quote.sentAt, label: r.ref + ' · ' + (r.quote.total || '') + ' SAR', status: 'Quote Sent', id: r.id });
      }
    });
    read(K_MSG).forEach(function (m) {
      if (em && (m.email || '').trim().toLowerCase() === em) {
        items.push({ kind: 'message', date: m.date, label: m.subject || '(message)', status: m.read ? 'Read' : 'Unread', id: m.id });
      }
    });
    read(K_TASK).forEach(function (t) {
      if (t.linkType === 'customer' && t.linkId === cust.id) {
        items.push({ kind: 'task', date: t.date, label: t.title, status: t.status, id: t.id });
      }
    });
    items.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    return items;
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

  // ── Generic CRUD helper for the sales collections ────────────
  function listOf(key, sortField) {
    return read(key).slice().sort(function (a, b) {
      return new Date(b[sortField || 'date']) - new Date(a[sortField || 'date']);
    });
  }
  function getById(key, id) {
    return read(key).filter(function (x) { return x.id === id; })[0] || null;
  }
  function createIn(key, obj) {
    var list = read(key);
    if (obj.id == null) obj.id = uid();
    if (!obj.date) obj.date = nowISO();
    list.push(obj); write(key, list);
    push(key, 'create', obj);
    return obj;
  }
  function updateIn(key, id, patch) {
    var list = read(key);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        for (var k in patch) { if (patch.hasOwnProperty(k)) list[i][k] = patch[k]; }
        write(key, list);
        push(key, 'update', list[i]);
        return list[i];
      }
    }
    return null;
  }
  function deleteIn(key, id) {
    write(key, read(key).filter(function (x) { return x.id !== id; }));
    push(key, 'delete', { id: id });
  }

  // ── Leads (pipeline) ─────────────────────────────────────────
  // lead = { id, name, company, email, phone, productType, stage, priority,
  //          source, representative, followUp, notes, lastActivity, date,
  //          convertedRequestId }
  function getLeads() { return listOf(K_LEAD); }
  function getLead(id) { return getById(K_LEAD, id); }
  function addLead(data) {
    return createIn(K_LEAD, {
      id: uid(),
      name: data.name || 'Unknown',
      company: data.company || '',
      email: data.email || '',
      phone: data.phone || '',
      productType: data.productType || 'concrete',
      stage: data.stage || 'New',
      priority: data.priority || 'Medium',          // High | Medium | Low
      source: data.source || 'phone',
      representative: data.representative || '',
      followUp: data.followUp || '',
      notes: data.notes || '',
      lastActivity: nowISO(),
      date: nowISO(),
      convertedRequestId: null
    });
  }
  function updateLead(id, patch) {
    patch.lastActivity = nowISO();
    return updateIn(K_LEAD, id, patch);
  }
  function deleteLead(id) { deleteIn(K_LEAD, id); }
  // Duplicate detection: match by phone digits or normalized name across
  // leads AND customers. Returns array of {type, record} matches.
  function findDuplicates(name, phone, email, excludeLeadId) {
    var digits = String(phone || '').replace(/\D/g, '');
    var nm = String(name || '').trim().toLowerCase();
    var em = String(email || '').trim().toLowerCase();
    var out = [];
    read(K_LEAD).forEach(function (l) {
      if (l.id === excludeLeadId) return;
      var lp = String(l.phone || '').replace(/\D/g, '');
      if ((digits && lp && digits === lp) ||
          (nm && (l.name || '').trim().toLowerCase() === nm) ||
          (em && (l.email || '').trim().toLowerCase() === em)) {
        out.push({ type: 'lead', record: l });
      }
    });
    read(K_CUST).forEach(function (c) {
      var cp = String(c.phone || '').replace(/\D/g, '');
      if ((digits && cp && digits === cp) ||
          (nm && (c.name || '').trim().toLowerCase() === nm) ||
          (em && (c.email || '').trim().toLowerCase() === em)) {
        out.push({ type: 'customer', record: c });
      }
    });
    return out;
  }
  // Hours a lead has been waiting since its last activity (SLA timer).
  function leadWaitingHours(lead) {
    var t = new Date(lead.lastActivity || lead.date);
    if (isNaN(t)) return 0;
    return Math.floor((Date.now() - t.getTime()) / 3600000);
  }

  // ── Tasks & follow-ups ───────────────────────────────────────
  // task = { id, title, due, status, assignee, linkType, linkId, linkLabel,
  //          notes, date, doneDate }
  function getTasks() {
    return read(K_TASK).slice().sort(function (a, b) {
      // open tasks first, then by due date ascending
      var ao = a.status === 'Done' ? 1 : 0, bo = b.status === 'Done' ? 1 : 0;
      if (ao !== bo) return ao - bo;
      return String(a.due || '9999').localeCompare(String(b.due || '9999'));
    });
  }
  function addTask(data) {
    return createIn(K_TASK, {
      id: uid(),
      title: data.title || 'Follow up',
      due: data.due || '',
      status: data.status || 'Open',                // Open | Done
      assignee: data.assignee || '',
      linkType: data.linkType || '',                // request | lead | customer
      linkId: data.linkId != null ? data.linkId : null,
      linkLabel: data.linkLabel || '',
      notes: data.notes || '',
      date: nowISO(), doneDate: null
    });
  }
  function updateTask(id, patch) { return updateIn(K_TASK, id, patch); }
  function deleteTask(id) { deleteIn(K_TASK, id); }
  function overdueTasks() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return read(K_TASK).filter(function (t) {
      return t.status !== 'Done' && t.due && new Date(t.due + 'T23:59:59') < new Date() &&
             new Date(t.due) < today;
    });
  }

  // ── Calendar events ──────────────────────────────────────────
  // event = { id, title, productType, day (YYYY-MM-DD), window, quantity,
  //           location, client, status, tentative, requestId, notes, date }
  function getEvents() { return listOf(K_EVT, 'day'); }
  function addEvent(data) {
    return createIn(K_EVT, {
      id: uid(),
      title: data.title || '',
      productType: data.productType || 'concrete',
      day: data.day || '',
      window: data.window || '',
      quantity: data.quantity != null ? data.quantity : '',
      location: data.location || '',
      client: data.client || '',
      status: data.status || 'Pending Confirmation',
      tentative: !!data.tentative,
      requestId: data.requestId != null ? data.requestId : null,
      notes: data.notes || '',
      date: nowISO()
    });
  }
  function updateEvent(id, patch) { return updateIn(K_EVT, id, patch); }
  function deleteEvent(id) { deleteIn(K_EVT, id); }
  // Concrete m³ booked on a given day (events + dated concrete bookings
  // that have no event of their own).
  function dayConcreteVolume(day) {
    var sum = 0;
    var counted = {};
    read(K_EVT).forEach(function (ev) {
      if (ev.day === day && ev.productType === 'concrete' && ev.status !== 'Cancelled') {
        var q = parseFloat(ev.quantity); if (!isNaN(q)) sum += q;
        if (ev.requestId != null) counted[ev.requestId] = true;
      }
    });
    read(K_REQ).forEach(function (r) {
      if ((r.productType || 'concrete') === 'concrete' && r.deliveryDate === day &&
          !counted[r.id] && ['Cancelled', 'Rejected', 'Expired'].indexOf(r.status) === -1 &&
          !approvalRejected(r)) {
        var q = parseFloat(r.quantity); if (!isNaN(q)) sum += q;
      }
    });
    return sum;
  }
  // A request whose approval was rejected must not occupy the schedule
  // until it is revised and approved.
  function approvalRejected(r) {
    return !!(r.approval && r.approval.required && r.approval.status === 'rejected');
  }

  // ── Audit log ────────────────────────────────────────────────
  // entry = { id, action, detail, refId, refLabel, by, date }
  function getAudit() { return listOf(K_AUD); }
  function logAudit(action, detail, refId, refLabel) {
    var by = '';
    try {
      var u = window.JehanAuth && window.JehanAuth.currentUser();
      if (u) by = u.name || u.email || '';
    } catch (e) {}
    return createIn(K_AUD, {
      id: uid(), action: action, detail: detail || '',
      refId: refId != null ? refId : null, refLabel: refLabel || '',
      by: by, date: nowISO()
    });
  }

  // ── Approval rules ───────────────────────────────────────────
  // Evaluate whether a request needs approval. Returns array of reason codes.
  function approvalReasons(req, opts) {
    var reasons = [];
    var qty = parseFloat(req.quantity);
    if (!isNaN(qty) && qty >= APPROVAL_VOLUME_THRESHOLD) reasons.push('large_volume');
    var disc = parseFloat((opts && opts.discount != null) ? opts.discount : req.discount);
    if (!isNaN(disc) && disc > APPROVAL_DISCOUNT_THRESHOLD) reasons.push('high_discount');
    var today = new Date().toISOString().slice(0, 10);
    if (req.deliveryDate === today) reasons.push('same_day_dispatch');
    return reasons;
  }
  function pendingApprovals() {
    return read(K_REQ).filter(function (r) {
      return r.approval && r.approval.required && r.approval.status === 'pending';
    });
  }

  // ── Plant Operations: orders / trips / assets ────────────────
  // opsorder = { id, requestId, ref, client, phone, email, project, site,
  //              mix, quantity, deliveryDate, window, authStatus, siteReady,
  //              plantId, priority, notes, completed, date }
  // trip     = { id, orderId, day, seq, truckId, pumpId, driver, qty,
  //              loadTime, status, times{}, delayReason, rejectReason, date }
  // asset    = { id, kind: plant|mixer|pump|staff, name, capacity, boom,
  //              operator, role, phone, shift, status, notes, date }
  function getOpsOrders() { return listOf(K_OPS); }
  function getOpsOrder(id) { return getById(K_OPS, id); }
  function addOpsOrder(data) { return createIn(K_OPS, data); }
  function updateOpsOrder(id, patch) { return updateIn(K_OPS, id, patch); }
  function deleteOpsOrder(id) { deleteIn(K_OPS, id); }

  function getTrips() { return listOf(K_TRIP); }
  function getTrip(id) { return getById(K_TRIP, id); }
  function addTrip(data) { return createIn(K_TRIP, data); }
  function updateTrip(id, patch) { return updateIn(K_TRIP, id, patch); }
  function deleteTrip(id) { deleteIn(K_TRIP, id); }
  function tripsForOrder(orderId) {
    return read(K_TRIP).filter(function (t) { return t.orderId === orderId; })
      .sort(function (a, b) { return (a.seq || 0) - (b.seq || 0); });
  }

  function getAssets(kind) {
    var list = listOf(K_AST, 'date');
    return kind ? list.filter(function (a) { return a.kind === kind; }) : list;
  }
  function getAsset(id) { return getById(K_AST, id); }
  function addAsset(data) { return createIn(K_AST, data); }
  function updateAsset(id, patch) { return updateIn(K_AST, id, patch); }
  function deleteAsset(id) { deleteIn(K_AST, id); }

  // Sync from sales: create an ops order for every eligible concrete
  // booking that doesn't have one yet. Sales data is consumed read-only;
  // execution data lives entirely on the ops record.
  function syncOpsFromSales() {
    var have = {};
    read(K_OPS).forEach(function (o) { if (o.requestId != null) have[o.requestId] = true; });
    var created = 0;
    read(K_REQ).forEach(function (r) {
      if ((r.productType || 'concrete') !== 'concrete') return;
      if (have[r.id]) return;
      if (['Cancelled', 'Rejected', 'Expired'].indexOf(r.status) !== -1) return;
      if (r.approval && r.approval.required && r.approval.status !== 'approved') return;
      // commercially meaningful: it has a quote or a confirmed/booked status
      var released = ['Booked', 'Paid', 'Approved'].indexOf(r.status) !== -1;
      if (!released && !r.quote) return;
      addOpsOrder({
        id: uid(), requestId: r.id, ref: r.ref,
        client: r.client, phone: r.phone || '', email: r.email || '',
        project: r.project || '', site: r.location || '',
        mix: r.mix || '', quantity: r.quantity,
        deliveryDate: r.deliveryDate || '', window: r.dispatchWindow || 'flexible',
        commerciallyReleased: released,
        authStatus: 'Pending Review', siteReady: false,
        plantId: null, priority: 'Normal', notes: '',
        completed: false, date: nowISO()
      });
      created++;
    });
    return created;
  }

  // Derived operational status for the live board.
  function opsOrderStatus(o) {
    if (o.completed) return 'Completed';
    var trips = tripsForOrder(o.id);
    var active = trips.filter(function (t) { return ['Cancelled'].indexOf(t.status) === -1; });
    var delayed = active.some(function (t) { return t.delayReason; });
    var rank = { 'Discharging': 5, 'On Site': 4, 'En Route': 3, 'Loading': 2, 'Washout': 1 };
    var best = null, bestRank = -1;
    active.forEach(function (t) {
      var rk = rank[t.status] || 0;
      if (rk > bestRank) { bestRank = rk; best = t.status; }
    });
    if (delayed) return 'Delayed';
    if (bestRank > 0 && best !== 'Washout') return best === 'Loading' ? 'Batching' : best;
    if (active.length) return 'Scheduled';
    if (o.authStatus === 'Authorized') return 'Authorized';
    if (o.authStatus === 'On Hold') return 'On Hold';
    return 'Booked';
  }

  // Is an asset already assigned to an active trip on a given day?
  function assetBusy(assetId, day, excludeTripId) {
    if (assetId == null) return false;
    return read(K_TRIP).some(function (t) {
      if (t.id === excludeTripId) return false;
      if (t.day !== day) return false;
      if (['Returned', 'Cancelled'].indexOf(t.status) !== -1) return false;
      return t.truckId === assetId || t.pumpId === assetId;
    });
  }

  // Minutes between leaving the plant and returning (turnaround).
  function tripTurnaround(t) {
    var ts = t.times || {};
    var start = ts['Loading'] || ts['En Route'];
    var end = ts['Returned'];
    if (!start || !end) return null;
    return Math.round((new Date(end) - new Date(start)) / 60000);
  }

  // ── Precast Operations: orders / castings / deliveries ───────
  // pcorder  = { id, requestId, ref, client, phone, email, project, site,
  //              element, quantity (units), deliveryDate, authStatus,
  //              designStatus, priority, notes, completed, date }
  // casting  = { id, orderId, day, lineId, element, units, status,
  //              qcFail, times{}, date }
  // delivery = { id, orderId, day, trailerId, driver, units, items,
  //              status, delayReason, times{}, date }
  function getPcOrders() { return listOf(K_PCO); }
  function getPcOrder(id) { return getById(K_PCO, id); }
  function addPcOrder(data) { return createIn(K_PCO, data); }
  function updatePcOrder(id, patch) { return updateIn(K_PCO, id, patch); }
  function deletePcOrder(id) { deleteIn(K_PCO, id); }

  function getCastings() { return listOf(K_CAST); }
  function getCasting(id) { return getById(K_CAST, id); }
  function addCasting(data) { return createIn(K_CAST, data); }
  function updateCasting(id, patch) { return updateIn(K_CAST, id, patch); }
  function deleteCasting(id) { deleteIn(K_CAST, id); }
  function castingsForOrder(orderId) {
    return read(K_CAST).filter(function (c) { return c.orderId === orderId; })
      .sort(function (a, b) { return String(a.day).localeCompare(String(b.day)); });
  }

  function getDeliveries() { return listOf(K_DEL); }
  function getDelivery(id) { return getById(K_DEL, id); }
  function addDelivery(data) { return createIn(K_DEL, data); }
  function updateDelivery(id, patch) { return updateIn(K_DEL, id, patch); }
  function deleteDelivery(id) { deleteIn(K_DEL, id); }
  function deliveriesForOrder(orderId) {
    return read(K_DEL).filter(function (d) { return d.orderId === orderId; })
      .sort(function (a, b) { return String(a.day).localeCompare(String(b.day)); });
  }

  // Sync precast bookings from the sales system (read-only commercial
  // source; execution data lives on the precast order).
  function syncPcFromSales() {
    var have = {};
    read(K_PCO).forEach(function (o) { if (o.requestId != null) have[o.requestId] = true; });
    var created = 0;
    read(K_REQ).forEach(function (r) {
      if (r.productType !== 'precast') return;
      if (have[r.id]) return;
      if (['Cancelled', 'Rejected', 'Expired'].indexOf(r.status) !== -1) return;
      if (r.approval && r.approval.required && r.approval.status !== 'approved') return;
      var released = ['Booked', 'Paid', 'Approved'].indexOf(r.status) !== -1;
      if (!released && !r.quote) return;
      addPcOrder({
        id: uid(), requestId: r.id, ref: r.ref,
        client: r.client, phone: r.phone || '', email: r.email || '',
        project: r.project || '', site: r.location || '',
        element: r.mix || '', quantity: r.quantity,
        deliveryDate: r.deliveryDate || '',
        commerciallyReleased: released,
        authStatus: 'Pending Review', designStatus: 'Awaiting Drawings',
        priority: 'Normal', notes: '', completed: false, date: nowISO()
      });
      created++;
    });
    return created;
  }

  // Units that passed QC and reached the yard for an order.
  function unitsInYard(orderId) {
    return castingsForOrder(orderId).reduce(function (s, c) {
      if (c.status === 'In Yard' && !c.qcFail) {
        var u = parseFloat(c.units); return s + (isNaN(u) ? 0 : u);
      }
      return s;
    }, 0);
  }
  // Units delivered to site for an order.
  function unitsDelivered(orderId) {
    return deliveriesForOrder(orderId).reduce(function (s, d) {
      if (d.status === 'Delivered') {
        var u = parseFloat(d.units); return s + (isNaN(u) ? 0 : u);
      }
      return s;
    }, 0);
  }

  // Derived precast order status for the live lanes.
  function pcOrderStatus(o) {
    if (o.completed) return 'Completed';
    if (o.authStatus === 'On Hold') return 'On Hold';
    var dels = deliveriesForOrder(o.id);
    var activeDel = dels.some(function (d) { return ['Loading', 'En Route'].indexOf(d.status) !== -1; });
    var anyDelay = dels.some(function (d) { return d.delayReason; });
    if (anyDelay) return 'Delayed';
    if (activeDel) return 'Delivering';
    var casts = castingsForOrder(o.id);
    var inProd = casts.some(function (c) { return ['Mold Prep', 'Casting', 'Curing', 'Demolding', 'QC'].indexOf(c.status) !== -1; });
    if (inProd) return 'In Production';
    var target = parseFloat(o.quantity) || 0;
    if (target > 0 && unitsInYard(o.id) >= target && unitsDelivered(o.id) < target) return 'Ready in Yard';
    if (casts.length) return 'In Production';
    if (o.authStatus === 'Authorized') {
      return o.designStatus === 'Design Approved' ? 'Authorized' : 'Design Review';
    }
    return o.designStatus === 'Design Approved' ? 'Booked' : 'Design Review';
  }

  // Units scheduled on a production line for a given day (capacity check).
  function lineLoad(lineId, day, excludeCastingId) {
    return read(K_CAST).reduce(function (s, c) {
      if (c.id === excludeCastingId) return s;
      if (c.lineId !== lineId || c.day !== day) return s;
      var u = parseFloat(c.units); return s + (isNaN(u) ? 0 : u);
    }, 0);
  }

  // ── Quote expiry auto-marking ────────────────────────────────
  function maybeExpireQuotes() {
    var today = new Date().toISOString().slice(0, 10);
    var list = read(K_REQ);
    var changed = false;
    list.forEach(function (r) {
      if (r.expiry && r.expiry < today && r.status === 'Quote Sent') {
        r.status = 'Expired';
        changed = true;
        push(K_REQ, 'update', r);
        try { logAudit('quote_expired', 'Quote passed its expiry date (' + r.expiry + ')', r.id, r.ref); } catch (e) {}
      }
    });
    if (changed) write(K_REQ, list);
    return changed;
  }

  // ── KPIs ─────────────────────────────────────────────────────
  function kpis() {
    var reqs = read(K_REQ);
    var leads = read(K_LEAD);
    var today = new Date().toISOString().slice(0, 10);
    return {
      totalRequests: reqs.length,
      newLeads: reqs.filter(function (r) { return r.status === 'Pending'; }).length,
      activeQuotes: reqs.filter(function (r) { return r.status === 'Quote Sent'; }).length,
      estVolume: reqs.reduce(function (s, r) { var q = parseFloat(r.quantity); return s + (isNaN(q) ? 0 : q); }, 0),
      customers: read(K_CUST).length,
      unreadMessages: unreadMessageCount(),
      // sales KPIs
      openLeads: leads.filter(function (l) { return ['Won', 'Lost'].indexOf(l.stage) === -1; }).length,
      pendingQuotes: reqs.filter(function (r) { return ['Pending', 'Pending Confirmation', 'Quote Sent'].indexOf(r.status) !== -1; }).length,
      upcomingBookings: reqs.filter(function (r) { return r.deliveryDate && r.deliveryDate >= today && ['Cancelled', 'Rejected', 'Expired'].indexOf(r.status) === -1 && !approvalRejected(r); }).length,
      overdueFollowUps: overdueTasks().length,
      pendingApprovals: pendingApprovals().length
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
      case 'Pending':               return 'bg-gold-bg text-dark border border-gold';
      case 'Pending Confirmation':  return 'bg-gold-bg text-dark border border-gold';
      case 'Contacted':             return 'bg-surface-mid text-mid border border-border';
      case 'Quote Sent':            return 'bg-primary-lt/20 text-primary border border-primary-lt';
      case 'Approved':              return 'bg-primary-lt/30 text-primary border border-primary-lt';
      case 'Booked':                return 'bg-primary-lt/30 text-primary border border-primary-lt';
      case 'Paid':                  return 'bg-primary text-white border border-primary';
      case 'Delayed':               return 'bg-gold-bg text-gold-hover border border-gold';
      case 'Cancelled':             return 'bg-error-bg text-error border border-error/30';
      case 'Rejected':              return 'bg-error-bg text-error border border-error/30';
      case 'Expired':               return 'bg-surface-high text-light border border-border';
      // ops board + trip milestones
      case 'Scheduled':             return 'bg-surface-mid text-mid border border-border';
      case 'Authorized':            return 'bg-primary-lt/20 text-primary border border-primary-lt';
      case 'On Hold':               return 'bg-gold-bg text-gold-hover border border-gold';
      case 'Batching':              return 'bg-gold-bg text-dark border border-gold';
      case 'Loading':               return 'bg-gold-bg text-dark border border-gold';
      case 'En Route':              return 'bg-primary-lt/20 text-primary border border-primary-lt';
      case 'On Site':               return 'bg-primary-lt/30 text-primary border border-primary-lt';
      case 'Discharging':           return 'bg-primary text-white border border-primary';
      case 'Washout':               return 'bg-surface-mid text-mid border border-border';
      case 'Returned':              return 'bg-surface-high text-light border border-border';
      case 'Completed':             return 'bg-primary text-white border border-primary';
      // precast statuses
      case 'Design Review':         return 'bg-gold-bg text-gold-hover border border-gold';
      case 'Queued':                return 'bg-surface-mid text-mid border border-border';
      case 'Mold Prep':             return 'bg-gold-bg text-dark border border-gold';
      case 'Casting':               return 'bg-gold-bg text-dark border border-gold';
      case 'Curing':                return 'bg-primary-lt/20 text-primary border border-primary-lt';
      case 'Demolding':             return 'bg-primary-lt/20 text-primary border border-primary-lt';
      case 'QC':                    return 'bg-primary-lt/30 text-primary border border-primary-lt';
      case 'In Yard':               return 'bg-primary-lt/30 text-primary border border-primary-lt';
      case 'In Production':         return 'bg-gold-bg text-dark border border-gold';
      case 'Ready in Yard':         return 'bg-primary-lt/30 text-primary border border-primary-lt';
      case 'Delivering':            return 'bg-primary text-white border border-primary';
      case 'Planned':               return 'bg-surface-mid text-mid border border-border';
      case 'Delivered':             return 'bg-primary text-white border border-primary';
      // lead stages
      case 'New':                   return 'bg-gold-bg text-dark border border-gold';
      case 'Qualified':             return 'bg-primary-lt/20 text-primary border border-primary-lt';
      case 'Quoted':                return 'bg-primary-lt/20 text-primary border border-primary-lt';
      case 'Negotiation':           return 'bg-gold-bg text-gold-hover border border-gold';
      case 'Won':                   return 'bg-primary text-white border border-primary';
      case 'Lost':                  return 'bg-error-bg text-error border border-error/30';
      default:                      return 'bg-surface-mid text-mid border border-border';
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
    getCustomers: getCustomers, getCustomer: getCustomer, addCustomer: addCustomer,
    updateCustomer: updateCustomer, deleteCustomer: deleteCustomer,
    customerExists: customerExists, customerTimeline: customerTimeline,
    getMessages: getMessages, addMessage: addMessage, updateMessage: updateMessage,
    unreadMessageCount: unreadMessageCount,
    // leads
    getLeads: getLeads, getLead: getLead, addLead: addLead,
    updateLead: updateLead, deleteLead: deleteLead,
    findDuplicates: findDuplicates, leadWaitingHours: leadWaitingHours,
    // tasks
    getTasks: getTasks, addTask: addTask, updateTask: updateTask,
    deleteTask: deleteTask, overdueTasks: overdueTasks,
    // calendar events
    getEvents: getEvents, addEvent: addEvent, updateEvent: updateEvent,
    deleteEvent: deleteEvent, dayConcreteVolume: dayConcreteVolume,
    // audit + approvals
    getAudit: getAudit, logAudit: logAudit,
    approvalReasons: approvalReasons, pendingApprovals: pendingApprovals,
    approvalRejected: approvalRejected,
    maybeExpireQuotes: maybeExpireQuotes,
    // precast operations
    getPcOrders: getPcOrders, getPcOrder: getPcOrder, addPcOrder: addPcOrder,
    updatePcOrder: updatePcOrder, deletePcOrder: deletePcOrder,
    getCastings: getCastings, getCasting: getCasting, addCasting: addCasting,
    updateCasting: updateCasting, deleteCasting: deleteCasting, castingsForOrder: castingsForOrder,
    getDeliveries: getDeliveries, getDelivery: getDelivery, addDelivery: addDelivery,
    updateDelivery: updateDelivery, deleteDelivery: deleteDelivery, deliveriesForOrder: deliveriesForOrder,
    syncPcFromSales: syncPcFromSales, pcOrderStatus: pcOrderStatus,
    unitsInYard: unitsInYard, unitsDelivered: unitsDelivered, lineLoad: lineLoad,
    CAST_MILESTONES: CAST_MILESTONES, QC_REASONS: QC_REASONS,
    DELIVERY_MILESTONES: DELIVERY_MILESTONES, DESIGN_STATUSES: DESIGN_STATUSES,
    // plant operations
    getOpsOrders: getOpsOrders, getOpsOrder: getOpsOrder, addOpsOrder: addOpsOrder,
    updateOpsOrder: updateOpsOrder, deleteOpsOrder: deleteOpsOrder,
    getTrips: getTrips, getTrip: getTrip, addTrip: addTrip,
    updateTrip: updateTrip, deleteTrip: deleteTrip, tripsForOrder: tripsForOrder,
    getAssets: getAssets, getAsset: getAsset, addAsset: addAsset,
    updateAsset: updateAsset, deleteAsset: deleteAsset,
    syncOpsFromSales: syncOpsFromSales, opsOrderStatus: opsOrderStatus,
    assetBusy: assetBusy, tripTurnaround: tripTurnaround,
    TRIP_MILESTONES: TRIP_MILESTONES, DELAY_REASONS: DELAY_REASONS,
    REJECT_REASONS: REJECT_REASONS, OPS_SHIFTS: OPS_SHIFTS, AUTH_STATUSES: AUTH_STATUSES,
    // constants
    LEAD_STAGES: LEAD_STAGES, WORKFLOW_STAGES: WORKFLOW_STAGES,
    BOOKING_STATUSES: BOOKING_STATUSES,
    CONCRETE_DAILY_CAPACITY: CONCRETE_DAILY_CAPACITY,
    APPROVAL_VOLUME_THRESHOLD: APPROVAL_VOLUME_THRESHOLD,
    APPROVAL_DISCOUNT_THRESHOLD: APPROVAL_DISCOUNT_THRESHOLD,
    kpis: kpis, fmtDate: fmtDate, fmtRelative: fmtRelative, initials: initials,
    escapeHtml: escapeHtml, statusPill: statusPill, syncInboxBadge: syncInboxBadge,
    // server sync
    subscribe: subscribe, refresh: pull, pull: pull
  };
})();
