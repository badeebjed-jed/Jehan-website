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

  var open = localStorage.getItem('jehan_nav_sales_open') !== '0';
  var opsOpen = localStorage.getItem('jehan_nav_ops_open') !== '0';

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
})();
