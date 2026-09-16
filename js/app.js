/* ============================================
   app.js - الموجه الرئيسي للتطبيق
   ============================================ */

const App = {
  currentRoute: null,

  init() {
    /* تهيئة البيانات التجريبية عند أول تشغيل */
    Storage.initDemo();

    /* ربط شاشة الدخول */
    this._bindLogin();

    /* إذا كان هناك جلسة فعّالة، ادخل مباشرة */
    if (Auth.currentUser()) {
      this.start();
    } else {
      this.showLogin();
    }
  },

  /* ============ شاشة الدخول ============ */
  showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  },

  _bindLogin() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      const remember = document.getElementById('rememberMe').checked;
      const err = document.getElementById('loginError');

      const user = Auth.login(username, password, remember);
      if (!user) {
        err.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
        return;
      }
      err.textContent = '';
      this.start();
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      if (confirm('هل تريد تسجيل الخروج؟')) {
        Auth.logout();
        this.showLogin();
      }
    });
  },

  start() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    const user = Auth.currentUser();
    document.getElementById('currentUserName').textContent = user.name;
    document.getElementById('currentUserRole').textContent = Utils.ROLES[user.role]?.label || user.role;

    /* إظهار/إخفاء عناصر القائمة بناءً على الصلاحية */
    this._filterMenuByRole();

    /* ربط التنقل */
    this._bindNavigation();

    /* ربط القوائم */
    this._bindMoreDrawer();
    this._bindSidebarToggle();

    /* تحديث التنبيهات */
    this.updateNotifBadge();
    Notifications.checkLowStock();
    Notifications.checkReviews();

    /* الساعة الحية */
    this._startClock();

    /* الرابط الافتراضي */
    this.navigate('dashboard');

    /* Toast ترحيب */
    setTimeout(() => {
      Toast.success('مرحباً', `أهلاً ${user.name}`);
    }, 300);
  },

  _filterMenuByRole() {
    document.querySelectorAll('.sidebar-nav li[data-route]').forEach(li => {
      const route = li.dataset.route;
      const roles = li.dataset.roles;
      if (!roles || roles === 'all') return;
      if (!Auth.can(route)) {
        li.classList.add('disabled');
      }
    });
  },

  _bindNavigation() {
    document.querySelectorAll('.sidebar-nav li[data-route]').forEach(li => {
      li.addEventListener('click', () => {
        if (li.classList.contains('disabled')) return;
        const route = li.dataset.route;
        this.navigate(route);
        this._closeSidebar();
      });
    });

    document.querySelectorAll('.bottom-nav button[data-route]').forEach(btn => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route;
        if (route === 'more') {
          this._toggleMoreDrawer();
        } else {
          this.navigate(route);
        }
      });
    });

    document.getElementById('quickSearchBtn').addEventListener('click', () => {
      this.navigate('search');
    });

    document.getElementById('topbarNotifBtn').addEventListener('click', () => {
      this.navigate('notifications');
    });

    document.getElementById('modalClose').addEventListener('click', () => Modal.close());
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') Modal.close();
    });
  },

  _bindMoreDrawer() {
    document.querySelectorAll('.more-drawer-list li[data-route]').forEach(li => {
      li.addEventListener('click', () => {
        const route = li.dataset.route;
        if (!Auth.can(route)) {
          Toast.error('صلاحية', 'لا تملك صلاحية الوصول لهذا القسم');
          return;
        }
        this.navigate(route);
        this._toggleMoreDrawer(false);
      });
    });
    document.getElementById('moreDrawerClose').addEventListener('click', () => {
      this._toggleMoreDrawer(false);
    });
  },

  _toggleMoreDrawer(force) {
    const d = document.getElementById('moreDrawer');
    if (force === false) d.classList.add('hidden');
    else if (force === true) d.classList.remove('hidden');
    else d.classList.toggle('hidden');
  },

  _bindSidebarToggle() {
    document.getElementById('menuToggle').addEventListener('click', () => {
      this._openSidebar();
    });
    document.getElementById('sidebarOverlay').addEventListener('click', () => {
      this._closeSidebar();
    });
  },

  _openSidebar() {
    document.getElementById('sidebar').classList.add('show');
    document.getElementById('sidebarOverlay').classList.add('show');
  },

  _closeSidebar() {
    document.getElementById('sidebar').classList.remove('show');
    document.getElementById('sidebarOverlay').classList.remove('show');
  },

  /* ============ التنقل ============ */
  navigate(route) {
    if (!Auth.can(route)) {
      Toast.error('صلاحية', 'لا تملك صلاحية الوصول لهذا القسم');
      return;
    }

    this.currentRoute = route;
    this._setActiveNav(route);

    const titles = {
      dashboard: 'الرئيسية',
      production: 'قسم الإنتاج',
      quality: 'قسم الجودة',
      cutting: 'قسم المقص',
      inventory: 'المخزن',
      sales: 'قسم المبيعات',
      companies: 'الشركات',
      reports: 'التقارير',
      search: 'البحث',
      notifications: 'مركز التنبيهات',
      users: 'المستخدمون',
      settings: 'إدارة النظام'
    };
    document.getElementById('pageTitle').textContent = titles[route] || route;

    const container = document.getElementById('pageContainer');
    container.innerHTML = '';

    try {
      switch (route) {
        case 'dashboard': Dashboard.render(container); break;
        case 'production': Production.render(container); break;
        case 'quality': Quality.render(container); break;
        case 'cutting': Cutting.render(container); break;
        case 'inventory': Inventory.render(container); break;
        case 'sales': Sales.render(container); break;
        case 'companies': Companies.render(container); break;
        case 'reports': Reports.render(container); break;
        case 'search': this._renderSearch(container); break;
        case 'notifications': this._renderNotifications(container); break;
        case 'users': Users.render(container); break;
        case 'settings': Users.renderSettings(container); break;
        default: container.innerHTML = '<div class="empty-state"><h4>الصفحة غير موجودة</h4></div>';
      }
    } catch (err) {
      console.error('Route error:', err);
      container.innerHTML = `<div class="alert alert-danger">حدث خطأ في تحميل الصفحة: ${Utils.esc(err.message)}</div>`;
    }
  },

  _setActiveNav(route) {
    document.querySelectorAll('.sidebar-nav li[data-route]').forEach(li => {
      li.classList.toggle('active', li.dataset.route === route);
    });
    document.querySelectorAll('.bottom-nav button[data-route]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === route);
    });
  },

  /* ============ التنبيهات ============ */
  updateNotifBadge() {
    const count = Notifications.unreadCount();
    const badge = document.getElementById('notifBadge');
    const dot = document.getElementById('topbarNotifCount');
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
      dot.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
      dot.classList.add('hidden');
    }
  },

  _startClock() {
    const tick = () => {
      const d = new Date();
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      const el = document.getElementById('liveClock');
      if (el) el.textContent = `${days[d.getDay()]} ${h}:${m}:${s}`;
    };
    tick();
    setInterval(tick, 1000);
  },

  /* ============ صفحة البحث السريع ============ */
  _renderSearch(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>بحث عام</h3>
        </div>
        <div class="card-body">
          <div class="search-bar mb-3">
            <span class="search-icon">⌕</span>
            <input type="text" id="globalSearchInput" placeholder="ابحث برقم الرول (مثل 13626) أو كود البكرة (مثل 13626/2) أو اسم شركة...">
          </div>
          <div id="searchResults"></div>
        </div>
      </div>
    `;
    const input = document.getElementById('globalSearchInput');
    input.addEventListener('input', Utils.debounce(() => this._runSearch(input.value), 250));
    input.focus();
    this._runSearch('');
  },

  _runSearch(query) {
    const results = document.getElementById('searchResults');
    query = (query || '').trim().toLowerCase();
    if (!query) {
      results.innerHTML = `<div class="empty-state">
        <div class="empty-icon">⌕</div>
        <h4>ابدأ بالكتابة</h4>
        <p>ابحث برقم الرول أو كود البكرة أو اسم شركة</p>
      </div>`;
      return;
    }

    let html = '';

    /* البحث في الرولات */
    const rolls = Storage.list('rolls').filter(r =>
      r.rollNumber.toLowerCase().includes(query)
    );
    if (rolls.length) {
      html += `<h4 class="mb-2">الرولات (${rolls.length})</h4>`;
      html += '<div class="table-wrap mb-4"><table class="data-table"><thead><tr><th>رقم الرول</th><th>التاريخ</th><th>الوردية</th><th>النوع</th><th>الجرام</th><th>الوزن</th><th>الحالة</th><th></th></tr></thead><tbody>';
      rolls.forEach(r => {
        const st = Utils.ROLL_STATUS[r.status] || { label: r.status, badge: 'badge-gray' };
        html += `<tr>
          <td class="fw-600">${Utils.esc(r.rollNumber)}</td>
          <td>${Utils.formatDate(r.date)}</td>
          <td>${Utils.esc(r.shift)}</td>
          <td>${Utils.esc(r.paperType)}</td>
          <td>${Utils.esc(r.gram)}</td>
          <td>${Utils.formatNum(r.weight)} كجم</td>
          <td><span class="badge ${st.badge}">${st.label}</span></td>
          <td><button class="btn btn-outline btn-sm" onclick="Production.viewRoll('${r.id}')">عرض</button></td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    }

    /* البحث في البكر */
    const coils = Storage.list('coils').filter(c =>
      c.code.toLowerCase().includes(query) ||
      (c.parentRollNumber || '').toLowerCase().includes(query)
    );
    if (coils.length) {
      html += `<h4 class="mb-2">البكر (${coils.length})</h4>`;
      html += '<div class="table-wrap mb-4"><table class="data-table"><thead><tr><th>الكود</th><th>الرول الأم</th><th>المقاس</th><th>الجرام</th><th>النوع</th><th>الوصلات</th><th>الحالة</th><th></th></tr></thead><tbody>';
      coils.forEach(c => {
        const st = Utils.COIL_STATUS[c.status] || { label: c.status, badge: 'badge-gray' };
        html += `<tr>
          <td class="fw-600">${Utils.esc(c.code)}</td>
          <td>${Utils.esc(c.parentRollNumber)}</td>
          <td>${Utils.esc(c.size)}</td>
          <td>${Utils.esc(c.gram)}</td>
          <td>${Utils.esc(c.type)}</td>
          <td>${Utils.esc(c.joints)}</td>
          <td><span class="badge ${st.badge}">${st.label}</span></td>
          <td><button class="btn btn-outline btn-sm" onclick="Inventory.viewCoil('${c.id}')">تفاصيل</button></td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    }

    /* البحث في الشركات */
    const companies = Storage.list('companies').filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query)
    );
    if (companies.length) {
      html += `<h4 class="mb-2">الشركات (${companies.length})</h4>`;
      html += '<div class="table-wrap"><table class="data-table"><thead><tr><th>الشركة</th><th>الكود</th><th>أقصى وصلات</th><th>المقاسات</th><th></th></tr></thead><tbody>';
      companies.forEach(c => {
        html += `<tr>
          <td class="fw-600">${Utils.esc(c.name)}</td>
          <td>${Utils.esc(c.code)}</td>
          <td>${c.maxJoints}</td>
          <td>${(c.allowedSizes||[]).join('، ')}</td>
          <td><button class="btn btn-outline btn-sm" onclick="App.navigate('companies')">عرض</button></td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    }

    if (!html) {
      results.innerHTML = `<div class="empty-state"><div class="empty-icon">∅</div><h4>لا توجد نتائج</h4><p>لم يتم العثور على نتائج مطابقة لـ "${Utils.esc(query)}"</p></div>`;
    } else {
      results.innerHTML = html;
    }
  },

  /* ============ صفحة التنبيهات ============ */
  _renderNotifications(container) {
    const notifs = Notifications.list();
    let html = `
      <div class="card">
        <div class="card-header">
          <h3>مركز التنبيهات</h3>
          <div class="actions">
            <button class="btn btn-outline btn-sm" onclick="Notifications.markAllRead(); App.navigate('notifications')">تعليم الكل كمقروء</button>
          </div>
        </div>
        <div class="card-body" style="padding:0">
    `;

    if (!notifs.length) {
      html += `<div class="empty-state"><div class="empty-icon">✓</div><h4>لا توجد تنبيهات</h4></div>`;
    } else {
      html += '<ul class="notif-list" style="padding:8px 0">';
      notifs.forEach(n => {
        const colorClass = n.type === 'warning' ? 'badge-gold' :
          n.type === 'danger' ? 'badge-red' :
            n.type === 'success' ? 'badge-green' : 'badge-blue';
        html += `<li class="notif-item ${n.read ? 'read' : ''}" style="padding:12px 20px;border-bottom:1px solid var(--c-gray-100);display:flex;gap:12px;align-items:flex-start;">
          <div class="notif-icon ${colorClass}" style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">
            ${Notifications.typeIcon(n.type)}
          </div>
          <div style="flex:1">
            <div class="fw-600" style="font-size:13px">${Utils.esc(n.title)}</div>
            <div style="font-size:12px;color:var(--c-text-muted)">${Utils.esc(n.message)}</div>
            <div style="font-size:11px;color:var(--c-text-muted);margin-top:4px">${Utils.formatDateAr(n.createdAt)} ${n.createdAt.split(' ')[1] || ''}</div>
          </div>
          <div style="display:flex;gap:4px">
            ${!n.read ? `<button class="btn btn-ghost btn-sm" onclick="Notifications.markRead('${n.id}'); App.navigate('notifications')">مقروء</button>` : ''}
            <button class="btn btn-ghost btn-sm" onclick="Notifications.delete('${n.id}'); App.navigate('notifications')">حذف</button>
          </div>
        </li>`;
      });
      html += '</ul>';
    }

    html += '</div></div>';
    container.innerHTML = html;
  }
};

/* ============================================
   Toast - الإشعارات المنبثقة
   ============================================ */
const Toast = {
  show(title, msg, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `
      <div class="toast-icon">${this._icon(type)}</div>
      <div class="toast-content">
        <div class="toast-title">${Utils.esc(title)}</div>
        ${msg ? `<div class="toast-msg">${Utils.esc(msg)}</div>` : ''}
      </div>
    `;
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity .3s';
      setTimeout(() => t.remove(), 300);
    }, duration);
  },

  success(title, msg) { this.show(title, msg, 'success'); },
  error(title, msg) { this.show(title, msg, 'error', 5000); },
  warning(title, msg) { this.show(title, msg, 'warning', 4000); },
  info(title, msg) { this.show(title, msg, 'info'); },

  _icon(type) {
    return { success: '✓', error: '✕', warning: '!', info: 'ⓘ' }[type] || 'ⓘ';
  }
};

/* ============================================
   Modal - النوافذ المنبثقة
   ============================================ */
const Modal = {
  open(title, bodyHtml, footerHtml = '', size = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    document.getElementById('modalFooter').innerHTML = footerHtml;
    const modal = document.getElementById('modal');
    modal.className = 'modal ' + (size ? 'modal-' + size : '');
    document.getElementById('modalOverlay').classList.remove('hidden');
  },

  close() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.getElementById('modalBody').innerHTML = '';
    document.getElementById('modalFooter').innerHTML = '';
  },

  confirm(message, onConfirm, title = 'تأكيد') {
    this.open(title,
      `<div class="alert alert-warning"><strong>${Utils.esc(message)}</strong></div>`,
      `<button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
       <button class="btn btn-danger" id="modalConfirmBtn">تأكيد</button>`,
      'sm'
    );
    document.getElementById('modalConfirmBtn').addEventListener('click', () => {
      Modal.close();
      onConfirm();
    });
  }
};

/* ============ تشغيل التطبيق ============ */
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
