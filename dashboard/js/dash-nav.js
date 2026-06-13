/* ============================================================
   Jehan Holding Group — Shared Dashboard Sidebar
   ============================================================
   Single source of truth for the sidebar across every dashboard
   page. Renders the "Sales System" group + Settings + footer into
   the page's <aside data-nav> placeholder, synchronously (the
   script tag sits right after the aside), so auth.js permission
   hiding and dash-lang translation both see the final nav.
   ============================================================ */
(function () {
  'use strict';

  var aside = document.querySelector('aside[data-nav]');
  if (!aside) return;

  var page = (location.pathname.split('/').pop() || 'overview.html').toLowerCase();

  // Sales System group items: [href, material icon, i18n key, fallback EN]
  var SALES_ITEMS = [
    ['overview.html',    'dashboard',      'nav_sales_overview', 'Sales Overview'],
    ['leads.html',       'person_search',  'nav_leads',          'Leads & Opportunities'],
    ['bookings.html',    'list_alt',       'nav_quotes_bookings','Quotes & Booking Requests'],
    ['sales-forms.html', 'edit_note',      'nav_sales_forms',    'Sales Forms'],
    ['inbox.html',       'inbox',          'nav_inbox',          'Inbox'],
    ['calendar.html',    'calendar_month', 'nav_calendar',       'Calendar Management'],
    ['customers.html',   'group',          'nav_customers',      'Customer Database'],
    ['tasks.html',       'task_alt',       'nav_tasks',          'Tasks & Follow-Ups'],
    ['reports.html',     'monitoring',     'nav_reports',        'Reports & Analytics'],
    ['approvals.html',   'fact_check',     'nav_approvals',      'Approvals & Audit']
  ];

  // Plant Operations group items: [href, material icon, i18n key, fallback EN]
  var OPS_ITEMS = [
    ['ops-board.html',   'browse_activity', 'nav_ops_board',   'Operations Board'],
    ['ops-orders.html',  'fact_check',      'nav_ops_orders',  'Orders from Sales'],
    ['ops-fleet.html',   'local_shipping',  'nav_ops_fleet',   'Fleet & Master Data'],
    ['ops-reports.html', 'insights',        'nav_ops_reports', 'Ops Reports']
  ];

  // Precast Operations group items: [href, material icon, i18n key, fallback EN]
  var PC_ITEMS = [
    ['pc-orders.html',     'design_services', 'nav_pc_orders',     'Precast Orders'],
    ['pc-production.html', 'view_in_ar',      'nav_pc_production', 'Production Queue'],
    ['pc-delivery.html',   'local_shipping',  'nav_pc_delivery',   'Delivery Planning'],
    ['pc-reports.html',    'query_stats',     'nav_pc_reports',    'Precast Reports']
  ];

  var open = localStorage.getItem('jehan_nav_sales_open') !== '0';
  var opsOpen = localStorage.getItem('jehan_nav_ops_open') !== '0';
  var pcOpen = localStorage.getItem('jehan_nav_pc_open') !== '0';

  function itemHtml(it) {
    var active = page === it[0];
    var cls = active
      ? 'flex items-center gap-3 px-4 py-2 rounded text-sm font-semibold tracking-wide transition-colors bg-primary text-white'
      : 'flex items-center gap-3 px-4 py-2 rounded text-sm font-semibold tracking-wide transition-colors text-mid hover:bg-surface-mid hover:text-dark';
    return '<a href="' + it[0] + '" class="' + cls + '">' +
      '<span class="material-symbols-outlined text-[19px]">' + it[1] + '</span>' +
      '<span data-i18n="' + it[2] + '">' + it[3] + '</span>' +
      '</a>';
  }

  var html =
    '<div class="px-6 py-5 border-b border-border flex items-center justify-between">' +
      '<img src="../assets/images/logo.png" class="h-8 object-contain" alt="Jehan Holding Group"/>' +
      '<button onclick="toggleDashLang()" id="dash-lang-btn" class="text-xs font-bold px-2.5 py-1 rounded border border-border text-mid hover:bg-surface-mid hover:text-primary transition-colors flex-shrink-0">&#x0639;&#x0631;&#x0628;&#x064A;</button>' +
    '</div>' +
    '<nav class="flex-1 px-3 py-4 overflow-y-auto">' +
      // ── Sales System group ──
      '<button id="sales-group-btn" type="button" class="w-full flex items-center gap-2 px-3 py-2 rounded text-[11px] font-bold uppercase tracking-widest text-light hover:text-primary transition-colors select-none">' +
        '<span class="material-symbols-outlined text-[17px]">storefront</span>' +
        '<span data-i18n="nav_sales_system">Sales System</span>' +
        '<span id="sales-group-chev" class="material-symbols-outlined text-[18px] ml-auto transition-transform' + (open ? '' : ' -rotate-90') + '">expand_more</span>' +
      '</button>' +
      '<div id="sales-group-items" class="space-y-0.5 mt-1' + (open ? '' : ' hidden') + '">' +
        SALES_ITEMS.map(itemHtml).join('') +
      '</div>' +
      '<div class="my-3 h-px bg-border"></div>' +
      // ── Plant Operations group ──
      '<button id="ops-group-btn" type="button" class="w-full flex items-center gap-2 px-3 py-2 rounded text-[11px] font-bold uppercase tracking-widest text-light hover:text-primary transition-colors select-none">' +
        '<span class="material-symbols-outlined text-[17px]">factory</span>' +
        '<span data-i18n="nav_ops_system">Plant Operations</span>' +
        '<span id="ops-group-chev" class="material-symbols-outlined text-[18px] ml-auto transition-transform' + (opsOpen ? '' : ' -rotate-90') + '">expand_more</span>' +
      '</button>' +
      '<div id="ops-group-items" class="space-y-0.5 mt-1' + (opsOpen ? '' : ' hidden') + '">' +
        OPS_ITEMS.map(itemHtml).join('') +
      '</div>' +
      '<div class="my-3 h-px bg-border"></div>' +
      // ── Precast Operations group ──
      '<button id="pc-group-btn" type="button" class="w-full flex items-center gap-2 px-3 py-2 rounded text-[11px] font-bold uppercase tracking-widest text-light hover:text-primary transition-colors select-none">' +
        '<span class="material-symbols-outlined text-[17px]">view_in_ar</span>' +
        '<span data-i18n="nav_pc_system">Precast Operations</span>' +
        '<span id="pc-group-chev" class="material-symbols-outlined text-[18px] ml-auto transition-transform' + (pcOpen ? '' : ' -rotate-90') + '">expand_more</span>' +
      '</button>' +
      '<div id="pc-group-items" class="space-y-0.5 mt-1' + (pcOpen ? '' : ' hidden') + '">' +
        PC_ITEMS.map(itemHtml).join('') +
      '</div>' +
      '<div class="my-3 h-px bg-border"></div>' +
      itemHtml(['settings.html', 'settings', 'nav_settings', 'Settings']) +
    '</nav>' +
    '<div class="px-4 py-4 border-t border-border">' +
      '<div class="flex items-center gap-3 mb-3">' +
        '<div class="w-9 h-9 rounded-full bg-primary-lt/30 text-primary flex items-center justify-center flex-shrink-0">' +
          '<span class="text-xs font-bold">AU</span>' +
        '</div>' +
        '<div class="overflow-hidden">' +
          '<p class="text-sm font-semibold text-dark truncate">Admin User</p>' +
          '<p class="text-xs text-light truncate" data-i18n="nav_role">System Manager</p>' +
        '</div>' +
      '</div>' +
      '<a href="../index.html" class="flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold text-mid hover:bg-surface-mid hover:text-dark transition-colors w-full mb-1">' +
        '<span class="material-symbols-outlined text-[20px]">arrow_back</span>' +
        '<span data-i18n="nav_back">Back to Website</span>' +
      '</a>' +
      '<a href="login.html" onclick="event.preventDefault(); window.JehanAuth.logout();" class="flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold text-mid hover:bg-error-bg hover:text-error transition-colors w-full">' +
        '<span class="material-symbols-outlined text-[20px]">logout</span>' +
        '<span data-i18n="nav_logout">Logout</span>' +
      '</a>' +
    '</div>';

  aside.innerHTML = html;

  // Collapse / expand groups
  function wireGroup(btnId, itemsId, chevId, storeKey) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var items = document.getElementById(itemsId);
      var chev = document.getElementById(chevId);
      var nowOpen = items.classList.contains('hidden');
      items.classList.toggle('hidden', !nowOpen);
      if (chev) chev.classList.toggle('-rotate-90', !nowOpen);
      localStorage.setItem(storeKey, nowOpen ? '1' : '0');
    });
  }
  wireGroup('sales-group-btn', 'sales-group-items', 'sales-group-chev', 'jehan_nav_sales_open');
  wireGroup('ops-group-btn', 'ops-group-items', 'ops-group-chev', 'jehan_nav_ops_open');
  wireGroup('pc-group-btn', 'pc-group-items', 'pc-group-chev', 'jehan_nav_pc_open');

  // ── Mobile: turn the sidebar into a slide-in drawer ──────────
  (function () {
    if (document.getElementById('dash-nav-mobile-css')) return;
    var css = document.createElement('style');
    css.id = 'dash-nav-mobile-css';
    css.textContent =
      '@media (max-width:1023px){' +
        'aside[data-nav]{position:fixed;top:0;bottom:0;inset-inline-start:0;z-index:60;' +
          'transform:translateX(-100%);transition:transform .25s ease;box-shadow:0 12px 40px rgba(0,0,0,.28);}' +
        'html[dir="rtl"] aside[data-nav]{transform:translateX(100%);}' +
        'aside[data-nav].nav-open{transform:translateX(0)!important;}' +
        '.nav-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:55;opacity:0;' +
          'pointer-events:none;transition:opacity .2s;}' +
        '.nav-backdrop.show{opacity:1;pointer-events:auto;}' +
        '.nav-burger{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;' +
          'border-radius:6px;border:1px solid #DCDBD7;background:#fff;color:#444;flex-shrink:0;cursor:pointer;}' +
        'header.bg-surface{height:auto!important;min-height:4rem;flex-wrap:wrap;row-gap:.5rem;' +
          'padding-left:1rem!important;padding-right:1rem!important;}' +
        'header.bg-surface h1{font-size:1.3rem!important;line-height:1.15;}' +
        'main.flex-1.overflow-y-auto,div.flex-1.overflow-y-auto{padding:1rem!important;}' +
      '}' +
      '@media (min-width:1024px){.nav-burger{display:none!important;}}';
    document.head.appendChild(css);

    var backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    function setOpen(open) {
      aside.classList.toggle('nav-open', open);
      backdrop.classList.toggle('show', open);
      document.body.style.overflow = open ? 'hidden' : '';
    }
    backdrop.addEventListener('click', function () { setOpen(false); });
    // Close the drawer after tapping a navigation link.
    aside.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a[href]')) setOpen(false);
    });

    function injectBurger() {
      if (document.body && !backdrop.parentNode) document.body.appendChild(backdrop);
      var header = document.querySelector('header');
      if (!header || header.querySelector('.nav-burger')) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav-burger';
      b.setAttribute('aria-label', 'Menu');
      b.innerHTML = '<span class="material-symbols-outlined">menu</span>';
      b.addEventListener('click', function () { setOpen(!aside.classList.contains('nav-open')); });
      header.insertBefore(b, header.firstChild);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectBurger);
    } else { injectBurger(); }
    // Reset drawer state when crossing the desktop breakpoint.
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024) setOpen(false);
    });
  })();
})();
