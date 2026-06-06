// Dashboard bilingual support — English / Arabic
(function () {

  var T = {
    en: {
      // Sidebar
      nav_overview:       'Overview',
      nav_bookings:       'Quote Requests',
      nav_inbox:          'Inbox',
      nav_profile:        'Company Profile',
      nav_upload_profile: 'Upload PDF',
      profile_no_upload:  'No profile uploaded yet',
      profile_updated:    'Company profile updated successfully!',
      nav_customers:      'Customer Database',
      nav_access:         'User Access',
      nav_settings:       'Settings',
      nav_role:           'System Manager',
      nav_back:           'Back to Website',
      nav_logout:         'Logout',
      // Overview
      page_overview:      'Dashboard Overview',
      kpi_requests:       'Total Requests',
      kpi_leads:          'New Leads',
      kpi_volume:         'Est. Volume (m³)',
      kpi_quotes:         'Active Quotes',
      recent_title:       'Recent Quote Requests',
      recent_view_all:    'View All →',
      th_client_name:     'Client Name',
      th_date:            'Date Submitted',
      th_qty_m3:          'Quantity (m³)',
      th_status:          'Status',
      // Status badges
      status_pending_r:   'Pending Review',
      status_pending:     'Pending',
      status_quote_sent:  'Quote Sent',
      status_approved:    'Approved',
      status_contacted:   'Contacted',
      status_rejected:    'Rejected',
      // Bookings
      page_bookings:      'Quote Requests',
      btn_filter:         'Filter',
      filter_by_status:   'Filter by Status',
      filter_all:         'All Requests',
      filter_clear:       'Clear filters',
      label_quantity:     'Quantity',
      label_mix:          'Mix Type',
      label_location:     'Location',
      label_client_msg:   'Client Message',
      label_client:       'Client',
      btn_gen_quote:      'Generate Quote →',
      btn_upd_status:     'Update Status',
      // Quote modal
      modal_gen_quote:    'Generate Quote',
      modal_client:       'Client',
      modal_qty:          'Quantity',
      modal_mix:          'Mix Type',
      modal_price:        'Price per m³ (SAR)',
      modal_total:        'Total (SAR)',
      modal_delivery:     'Delivery Date',
      modal_notes:        'Notes to Client',
      modal_cancel:       'Cancel',
      modal_send_quote:   'Send Quote',
      toast_quote_sent:   'Quote sent successfully!',
      // Status modal
      modal_upd_status:   'Update Status',
      modal_new_status:   'New Status',
      modal_int_note:     'Internal Note (optional)',
      modal_save_status:  'Save Status',
      toast_status_saved: 'Status updated successfully!',
      // Inbox
      page_inbox:         'Inbox',
      tab_all:            'All',
      tab_unread:         'Unread',
      tab_flagged:        'Flagged',
      btn_send_reply:     'Send Reply',
      // Customers
      page_customers:     'Customer Database',
      btn_export:         'Export CSV',
      btn_add_record:     'Add Record →',
      btn_sort:           'Sort',
      th_cust_name:       'Customer Name',
      th_email:           'Email',
      th_phone:           'Phone',
      th_last_activity:   'Last Activity',
      th_location_c:      'Location',
      action_view:        'View Details →',
      pagination_cust:    'Showing 1 to 4 of 97 results',
      // Access
      page_access:        'Access Management',
      btn_add_user:       'Add User →',
      active_personnel:   'Active Personnel',
      th_name:            'Name',
      th_role_a:          'Role',
      th_status_a:        'Status',
      status_active:      'Active',
      status_inactive:    'Inactive',
      action_manage:      'Manage',
      pagination_access:  'Showing 1 to 3 of 12 personnel',
      module_access:      'Module Access Control',
      access_bookings:    'Quote Requests',
      access_bookings_d:  'View and manage bookings',
      access_financials:  'Financials',
      access_fin_d:       'Access financial reports',
      access_customers:   'Customer Data',
      access_cust_d:      'View customer database',
      access_settings:    'System Settings',
      access_sett_d:      'Modify system configuration',
      btn_save_config:    'Save Configuration',
      btn_revoke:         'Revoke All Access',
      // Settings
      page_settings:      'Settings',
      btn_save_changes:   'Save Changes',
      toast_saved:        'Settings saved successfully',
      sect_company:       'Company Information',
      lbl_co_name:        'Company Name',
      lbl_website:        'Website URL',
      lbl_co_email:       'Contact Email',
      lbl_co_phone:       'Phone Number',
      lbl_address:        'Head Office Address',
      sect_account:       'Account & Password',
      lbl_username:       'Admin Username',
      lbl_cur_pass:       'Current Password',
      lbl_new_pass:       'New Password',
      lbl_confirm_pass:   'Confirm New Password',
      sect_notif:         'Notification Preferences',
      notif1_t:           'New Booking Request',
      notif1_d:           'Get notified when a new concrete booking is submitted',
      notif2_t:           'New Inbox Message',
      notif2_d:           'Get notified when a customer submits a contact form',
      notif3_t:           'New Customer Record',
      notif3_d:           'Alert when a new customer is added to the database',
      notif4_t:           'Weekly Summary Report',
      notif4_d:           'Receive a weekly digest of requests, leads, and volumes',
      sect_system:        'System Preferences',
      lbl_lang:           'Default Language',
      lbl_tz:             'Timezone',
      lbl_date_fmt:       'Date Format',
      lbl_vol_unit:       'Volume Unit',
      sect_danger:        'Danger Zone',
      danger_t:           'Clear All Booking Records',
      danger_d:           'Permanently delete all booking requests from the system. This cannot be undone.',
      btn_clear:          'Clear Records',
      // Login
      login_heading:      'ACCESS',
      login_sub:          'Authorized personnel only',
      lbl_username_l:     'Username / Email',
      lbl_password:       'Password',
      forgot_pw:          'Forgot password?',
      btn_login:          'LOGIN →',
      login_footer:       'Secure System Environment',
      // Placeholders
      ph_search:          'Search…',
      ph_search_req:      'Search requests…',
      ph_search_cust:     'Search customers…',
      ph_search_pers:     'Search personnel…',
      ph_username:        'Enter your username or email',
      ph_password:        'Enter your password',
      ph_reply:           'Write a reply…',
      ph_int_note:        'Add an internal note about this status change…',
      ph_notes:           'Add any delivery notes, conditions, or instructions…',
    },

    ar: {
      // Sidebar
      nav_overview:       'نظرة عامة',
      nav_bookings:       'طلبات عروض الأسعار',
      nav_inbox:          'صندوق الوارد',
      nav_profile:        'ملف تعريف الشركة',
      nav_upload_profile: 'رفع PDF',
      profile_no_upload:  'لم يتم رفع ملف بعد',
      profile_updated:    'تم تحديث ملف الشركة بنجاح!',
      nav_customers:      'قاعدة بيانات العملاء',
      nav_access:         'صلاحيات المستخدمين',
      nav_settings:       'الإعدادات',
      nav_role:           'مدير النظام',
      nav_back:           'العودة للموقع',
      nav_logout:         'تسجيل الخروج',
      // Overview
      page_overview:      'نظرة عامة على لوحة التحكم',
      kpi_requests:       'إجمالي الطلبات',
      kpi_leads:          'عملاء جدد',
      kpi_volume:         'الحجم التقديري (م³)',
      kpi_quotes:         'عروض الأسعار النشطة',
      recent_title:       'طلبات عروض الأسعار الأخيرة',
      recent_view_all:    '← عرض الكل',
      th_client_name:     'اسم العميل',
      th_date:            'تاريخ التقديم',
      th_qty_m3:          'الكمية (م³)',
      th_status:          'الحالة',
      // Status badges
      status_pending_r:   'قيد المراجعة',
      status_pending:     'معلّق',
      status_quote_sent:  'تم إرسال العرض',
      status_approved:    'موافق عليه',
      status_contacted:   'تم التواصل',
      status_rejected:    'مرفوض',
      // Bookings
      page_bookings:      'طلبات عروض الأسعار',
      btn_filter:         'تصفية',
      filter_by_status:   'تصفية حسب الحالة',
      filter_all:         'جميع الطلبات',
      filter_clear:       'مسح التصفية',
      label_quantity:     'الكمية',
      label_mix:          'نوع الخلطة',
      label_location:     'الموقع',
      label_client_msg:   'رسالة العميل',
      label_client:       'العميل',
      btn_gen_quote:      '← إنشاء عرض سعر',
      btn_upd_status:     'تحديث الحالة',
      // Quote modal
      modal_gen_quote:    'إنشاء عرض سعر',
      modal_client:       'العميل',
      modal_qty:          'الكمية',
      modal_mix:          'نوع الخلطة',
      modal_price:        'السعر لكل م³ (ر.س)',
      modal_total:        'الإجمالي (ر.س)',
      modal_delivery:     'تاريخ التسليم',
      modal_notes:        'ملاحظات للعميل',
      modal_cancel:       'إلغاء',
      modal_send_quote:   'إرسال العرض',
      toast_quote_sent:   'تم إرسال عرض السعر بنجاح!',
      // Status modal
      modal_upd_status:   'تحديث الحالة',
      modal_new_status:   'الحالة الجديدة',
      modal_int_note:     'ملاحظة داخلية (اختياري)',
      modal_save_status:  'حفظ الحالة',
      toast_status_saved: 'تم تحديث الحالة بنجاح!',
      // Inbox
      page_inbox:         'صندوق الوارد',
      tab_all:            'الكل',
      tab_unread:         'غير مقروء',
      tab_flagged:        'مميّز',
      btn_send_reply:     'إرسال الرد',
      // Customers
      page_customers:     'قاعدة بيانات العملاء',
      btn_export:         'تصدير CSV',
      btn_add_record:     '← إضافة سجل',
      btn_sort:           'ترتيب',
      th_cust_name:       'اسم العميل',
      th_email:           'البريد الإلكتروني',
      th_phone:           'الهاتف',
      th_last_activity:   'آخر نشاط',
      th_location_c:      'الموقع',
      action_view:        '← عرض التفاصيل',
      pagination_cust:    'عرض 1 إلى 4 من أصل 97 نتيجة',
      // Access
      page_access:        'إدارة الصلاحيات',
      btn_add_user:       '← إضافة مستخدم',
      active_personnel:   'الموظفون النشطون',
      th_name:            'الاسم',
      th_role_a:          'الدور',
      th_status_a:        'الحالة',
      status_active:      'نشط',
      status_inactive:    'غير نشط',
      action_manage:      'إدارة',
      pagination_access:  'عرض 1 إلى 3 من أصل 12 موظفاً',
      module_access:      'التحكم في صلاحيات الوحدات',
      access_bookings:    'طلبات عروض الأسعار',
      access_bookings_d:  'عرض وإدارة الحجوزات',
      access_financials:  'الشؤون المالية',
      access_fin_d:       'الوصول إلى التقارير المالية',
      access_customers:   'بيانات العملاء',
      access_cust_d:      'عرض قاعدة بيانات العملاء',
      access_settings:    'إعدادات النظام',
      access_sett_d:      'تعديل إعدادات النظام',
      btn_save_config:    'حفظ الإعدادات',
      btn_revoke:         'إلغاء جميع الصلاحيات',
      // Settings
      page_settings:      'الإعدادات',
      btn_save_changes:   'حفظ التغييرات',
      toast_saved:        'تم حفظ الإعدادات بنجاح',
      sect_company:       'معلومات الشركة',
      lbl_co_name:        'اسم الشركة',
      lbl_website:        'رابط الموقع',
      lbl_co_email:       'البريد الإلكتروني',
      lbl_co_phone:       'رقم الهاتف',
      lbl_address:        'عنوان المقر الرئيسي',
      sect_account:       'الحساب وكلمة المرور',
      lbl_username:       'اسم المستخدم',
      lbl_cur_pass:       'كلمة المرور الحالية',
      lbl_new_pass:       'كلمة المرور الجديدة',
      lbl_confirm_pass:   'تأكيد كلمة المرور الجديدة',
      sect_notif:         'تفضيلات الإشعارات',
      notif1_t:           'طلب حجز جديد',
      notif1_d:           'تلقّي إشعار عند تقديم طلب حجز خرسانة جديد',
      notif2_t:           'رسالة واردة جديدة',
      notif2_d:           'تلقّي إشعار عند إرسال العميل نموذج تواصل',
      notif3_t:           'سجل عميل جديد',
      notif3_d:           'تنبيه عند إضافة عميل جديد إلى قاعدة البيانات',
      notif4_t:           'تقرير ملخص أسبوعي',
      notif4_d:           'استلام ملخص أسبوعي للطلبات والعملاء والكميات',
      sect_system:        'تفضيلات النظام',
      lbl_lang:           'اللغة الافتراضية',
      lbl_tz:             'المنطقة الزمنية',
      lbl_date_fmt:       'تنسيق التاريخ',
      lbl_vol_unit:       'وحدة الحجم',
      sect_danger:        'منطقة الخطر',
      danger_t:           'مسح جميع سجلات الحجز',
      danger_d:           'حذف جميع طلبات الحجز نهائياً من النظام. لا يمكن التراجع عن هذا الإجراء.',
      btn_clear:          'مسح السجلات',
      // Login
      login_heading:      'دخول',
      login_sub:          'للموظفين المصرح لهم فقط',
      lbl_username_l:     'اسم المستخدم / البريد الإلكتروني',
      lbl_password:       'كلمة المرور',
      forgot_pw:          'نسيت كلمة المرور؟',
      btn_login:          '← تسجيل الدخول',
      login_footer:       'بيئة نظام آمنة',
      // Placeholders
      ph_search:          'بحث…',
      ph_search_req:      'البحث في الطلبات…',
      ph_search_cust:     'البحث في العملاء…',
      ph_search_pers:     'البحث في الموظفين…',
      ph_username:        'أدخل اسم المستخدم أو البريد الإلكتروني',
      ph_password:        'أدخل كلمة المرور',
      ph_reply:           'اكتب ردك…',
      ph_int_note:        'أضف ملاحظة داخلية حول تغيير الحالة…',
      ph_notes:           'أضف ملاحظات التسليم أو الشروط أو التعليمات…',
    }
  };

  // RTL CSS injected when Arabic is active
  var RTL_CSS = [
    'html[dir=rtl] body, html[dir=rtl] p, html[dir=rtl] span:not(.material-symbols-outlined),',
    'html[dir=rtl] a, html[dir=rtl] button, html[dir=rtl] label,',
    'html[dir=rtl] input, html[dir=rtl] textarea, html[dir=rtl] select,',
    'html[dir=rtl] td, html[dir=rtl] th { font-family: "Tajawal", Arial, sans-serif !important; }',
    'html[dir=rtl] h1, html[dir=rtl] h2, html[dir=rtl] h3,',
    'html[dir=rtl] h4, html[dir=rtl] h5 {',
    '  font-family: "Tajawal", Arial, sans-serif !important;',
    '  letter-spacing: 0 !important; }',
    'html[dir=rtl] .tracking-wide,',
    'html[dir=rtl] .tracking-widest { letter-spacing: 0 !important; }',
    /* Sidebar border — sidebar moves to the right in RTL, so the inner border flips */
    'html[dir=rtl] aside { border-right: 0 !important; border-left: 1px solid #DCDBD7 !important; }',
    /* Inbox message list pane */
    'html[dir=rtl] .rtl-border-flip { border-right: 0 !important; border-left: 1px solid #DCDBD7 !important; }',
    /* Booking card detail pane (border-l) */
    'html[dir=rtl] .rtl-border-iflip { border-left: 0 !important; border-right: 1px solid #DCDBD7 !important; }',
    /* Table text */
    'html[dir=rtl] th.text-left, html[dir=rtl] td.text-left { text-align: right; }',
    'html[dir=rtl] .text-right { text-align: left; }',
    /* Icon search field — mirror padding */
    'html[dir=rtl] .rtl-search { padding-left: 1rem !important; padding-right: 2.5rem !important; }',
    'html[dir=rtl] .rtl-icon-r { left: auto !important; right: 0.75rem !important; }',
  ].join('\n');

  var currentLang = localStorage.getItem('dashLang') || 'en';

  function applyDashLang(lang) {
    currentLang = lang;
    localStorage.setItem('dashLang', lang);
    var t = T[lang];
    var isAr = lang === 'ar';

    // Set html attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';

    // Inject / clear RTL stylesheet
    var styleEl = document.getElementById('dash-rtl-css');
    if (isAr) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dash-rtl-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = RTL_CSS;
    } else {
      if (styleEl) styleEl.textContent = '';
    }

    // Translate text content
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.textContent = t[key];
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-ph');
      if (t[key] !== undefined) el.placeholder = t[key];
    });

    // Update toggle button label
    var btn = document.getElementById('dash-lang-btn');
    if (btn) btn.textContent = isAr ? 'English' : 'عربي';
  }

  window.toggleDashLang = function () {
    applyDashLang(currentLang === 'en' ? 'ar' : 'en');
  };

  // Re-apply the CURRENT language to the whole document. Call this
  // after dynamically injecting new [data-i18n] nodes so they translate.
  window.reapplyDashLang = function () { applyDashLang(currentLang); };

  // Auto-apply on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { applyDashLang(currentLang); });
  } else {
    applyDashLang(currentLang);
  }

}());
