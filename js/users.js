/* ============================================
   users.js - المستخدمون + إدارة النظام
   ============================================ */

const Users = {
  render(container) {
    const users = Storage.list('users');
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>☺ المستخدمون (${users.length})</h3>
          <button class="btn btn-primary" onclick="Users.openForm()">+ مستخدم جديد</button>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الحالة</th><th>أضيف في</th><th></th></tr></thead>
              <tbody>
                ${users.map(u => {
                  const role = Utils.ROLES[u.role] || { label: u.role };
                  return `<tr>
                    <td class="fw-600">${Utils.esc(u.name)}</td>
                    <td><code style="background:var(--c-gray-100);padding:2px 6px;border-radius:4px">${Utils.esc(u.username)}</code></td>
                    <td><span class="badge badge-blue">${role.label}</span></td>
                    <td><span class="badge ${u.active ? 'badge-green' : 'badge-gray'}">${u.active ? 'نشط' : 'موقوف'}</span></td>
                    <td class="text-muted" style="font-size:11px">${u.createdAt ? Utils.formatDateAr(u.createdAt) : '—'}</td>
                    <td>
                      <button class="btn btn-outline btn-sm" onclick="Users.openForm('${u.id}')">✎</button>
                      ${u.role !== 'admin' && Auth.isAdmin() ? `<button class="btn btn-ghost btn-sm" onclick="Users.toggle('${u.id}')">${u.active ? '⏸' : '▶'}</button>` : ''}
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="card mt-4">
        <div class="card-header"><h3>🔐 صلاحيات الأدوار</h3></div>
        <div class="card-body">
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>الدور</th><th>الصلاحيات</th></tr></thead>
              <tbody>
                ${Object.entries(Utils.ROLES).map(([key, role]) => {
                  const perms = Utils.PERMISSIONS[key] || [];
                  return `<tr>
                    <td class="fw-600">${role.label}</td>
                    <td>${perms.map(p => `<span class="badge badge-blue" style="margin:2px">${p}</span>`).join('')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  openForm(editId = null) {
    const edit = editId ? Storage.find('users', editId) : null;
    const body = `
      <form id="userForm">
        <div class="form-grid">
          <div class="form-group">
            <label>الاسم الكامل <span class="req">*</span></label>
            <input type="text" name="name" required value="${edit ? Utils.esc(edit.name) : ''}" class="form-control">
          </div>
          <div class="form-group">
            <label>اسم المستخدم <span class="req">*</span></label>
            <input type="text" name="username" required value="${edit ? Utils.esc(edit.username) : ''}" class="form-control" ${edit ? 'readonly' : ''} placeholder="لاتوجد مسافات">
          </div>
          <div class="form-group">
            <label>كلمة المرور <span class="req">*</span></label>
            <input type="text" name="password" required value="${edit ? Utils.esc(edit.password) : ''}" class="form-control">
            ${edit ? '<div class="form-hint">اتركها كما هي للحفاظ على الكلمة الحالية</div>' : ''}
          </div>
          <div class="form-group">
            <label>الدور <span class="req">*</span></label>
            <select name="role" required class="form-control">
              ${Object.entries(Utils.ROLES).map(([key, r]) => `<option value="${key}" ${edit && edit.role === key ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>الحالة</label>
            <select name="active" class="form-control">
              <option value="true" ${edit ? (edit.active ? 'selected' : '') : 'selected'}>نشط</option>
              <option value="false" ${edit && !edit.active ? 'selected' : ''}>موقوف</option>
            </select>
          </div>
        </div>
      </form>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-primary" onclick="Users.save(${edit ? `'${edit.id}'` : 'null'})">حفظ</button>
    `;
    Modal.open(edit ? 'تعديل مستخدم' : 'مستخدم جديد', body, footer, 'md');
  },

  save(editId) {
    const form = document.getElementById('userForm');
    const fd = new FormData(form);
    const data = {
      name: fd.get('name').trim(),
      username: fd.get('username').trim(),
      password: fd.get('password'),
      role: fd.get('role'),
      active: fd.get('active') === 'true'
    };

    if (!data.name || !data.username || !data.password) {
      Toast.error('بيانات ناقصة', 'أكمل جميع الحقول المطلوبة');
      return;
    }

    /* تحقق من تفرّد اسم المستخدم */
    const existing = Storage.list('users').find(u =>
      u.username.toLowerCase() === data.username.toLowerCase() && u.id !== editId
    );
    if (existing) {
      Toast.error('مكرر', 'اسم المستخدم مستخدم بالفعل');
      return;
    }

    if (editId) {
      const old = Storage.find('users', editId);
      Storage.update('users', editId, data);
      Audit.log('update', 'user', editId, {
        oldValue: old.username,
        newValue: data.username,
        notes: `تعديل المستخدم ${data.name}`
      });
      Toast.success('تم', 'تم تعديل المستخدم');
    } else {
      data.id = Utils.uid('u');
      data.createdAt = Utils.nowDateTime();
      Storage.insert('users', data);
      Audit.log('create', 'user', data.id, { notes: `إضافة المستخدم ${data.name}` });
      Toast.success('تم', `تمت إضافة المستخدم ${data.name}`);
    }
    Modal.close();
    App.navigate('users');
  },

  toggle(id) {
    const u = Storage.find('users', id);
    if (!u) return;
    Modal.confirm(`${u.active ? 'إيقاف' : 'تنشيط'} حساب ${u.name}؟`, () => {
      Storage.update('users', id, { active: !u.active });
      Audit.log('update', 'user', id, {
        oldValue: u.active ? 'نشط' : 'موقوف',
        newValue: u.active ? 'موقوف' : 'نشط',
        notes: `${u.active ? 'إيقاف' : 'تنشيط'} حساب ${u.name}`
      });
      Toast.success('تم', `تم ${u.active ? 'إيقاف' : 'تنشيط'} الحساب`);
      App.navigate('users');
    });
  },

  /* ============ صفحة إدارة النظام ============ */
  renderSettings(container) {
    const settings = Storage.obj('settings');
    const sizes = settings.defaultSizes || [];
    const grams = settings.defaultGrams || [];
    const types = settings.defaultPaperTypes || [];

    container.innerHTML = `
      <div class="tabs">
        <button class="tab-btn active" data-stab="general">عام</button>
        <button class="tab-btn" data-stab="defaults">القيم الافتراضية</button>
        <button class="tab-btn" data-stab="backup">النسخ الاحتياطي</button>
        <button class="tab-btn" data-stab="audit">سجل العمليات</button>
      </div>

      <div class="tab-panel active" id="stab-general"></div>
      <div class="tab-panel" id="stab-defaults"></div>
      <div class="tab-panel" id="stab-backup"></div>
      <div class="tab-panel" id="stab-audit"></div>
    `;

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`stab-${btn.dataset.stab}`).classList.add('active');
      });
    });

    /* General */
    document.getElementById('stab-general').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>⚙ إعدادات عامة</h3></div>
        <div class="card-body">
          <form id="settingsForm">
            <div class="form-grid">
              <div class="form-group">
                <label>اسم الشركة</label>
                <input type="text" name="companyName" class="form-control" value="${Utils.esc(settings.companyName || '')}">
              </div>
              <div class="form-group">
                <label>بداية يوم العمل <span class="req">*</span></label>
                <input type="time" name="workDayStart" required class="form-control" value="${Utils.esc(settings.workDayStart || '08:00')}">
                <div class="form-hint">تُستخدم في تقارير 12 و24 ساعة</div>
              </div>
              <div class="form-group">
                <label>حد التنبيه للمخزون المنخفض</label>
                <input type="number" name="lowStockThreshold" min="1" class="form-control" value="${settings.lowStockThreshold || 10}">
                <div class="form-hint">تنبيه عند انخفاض البكر بمقاس معين عن هذا العدد</div>
              </div>
              <div class="form-group">
                <label>العملة</label>
                <input type="text" name="currency" class="form-control" value="${Utils.esc(settings.currency || 'ج.م')}">
              </div>
            </div>
            <button type="button" class="btn btn-primary mt-3" onclick="Users.saveSettings()">حفظ الإعدادات</button>
          </form>
        </div>
      </div>
    `;

    /* Defaults */
    document.getElementById('stab-defaults').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>📋 القيم الافتراضية</h3></div>
        <div class="card-body">
          <div class="form-group mb-3">
            <label>المقاسات الافتراضية</label>
            <input type="text" id="defaultSizes" class="form-control" value="${sizes.join('، ')}" placeholder="افصل بين القيم بفاصلة">
            <div class="form-hint">افصل بين القيم بفاصلة (،) - مثال: 190، 220، 240</div>
          </div>
          <div class="form-group mb-3">
            <label>الجرامات الافتراضية</label>
            <input type="text" id="defaultGrams" class="form-control" value="${grams.join('، ')}" placeholder="مثال: 125، 150، 175">
          </div>
          <div class="form-group mb-3">
            <label>أنواع الورق الافتراضية</label>
            <input type="text" id="defaultTypes" class="form-control" value="${types.join('، ')}" placeholder="مثال: فلوت، تست معالج">
          </div>
          <button type="button" class="btn btn-primary" onclick="Users.saveDefaults()">حفظ القيم</button>
        </div>
      </div>
    `;

    /* Backup */
    document.getElementById('stab-backup').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>💾 النسخ الاحتياطي</h3></div>
        <div class="card-body">
          <div class="alert alert-info mb-3">
            <strong>تنبيه:</strong> البيانات محفوظة محلياً في متصفحك. اعمل نسخة احتياطية بانتظام.
          </div>
          <div class="grid-2">
            <div>
              <h4 class="mb-2">تصدير البيانات</h4>
              <p class="text-muted mb-2">حمّل نسخة JSON من جميع بيانات النظام.</p>
              <button class="btn btn-primary" onclick="Users.exportBackup()">💾 تصدير البيانات</button>
            </div>
            <div>
              <h4 class="mb-2">استيراد البيانات</h4>
              <p class="text-muted mb-2">استرجع نسخة احتياطية (سيتم استبدال البيانات الحالية).</p>
              <input type="file" id="importFile" accept=".json" class="form-control mb-2">
              <button class="btn btn-warning" onclick="Users.importBackup()">📂 استيراد البيانات</button>
            </div>
          </div>
          <div class="divider"></div>
          <h4 class="text-danger mb-2">إعادة التهيئة (خطر)</h4>
          <p class="text-muted mb-2">سيتم حذف جميع البيانات وإعادة تحميل البيانات التجريبية.</p>
          <button class="btn btn-danger" onclick="Users.resetData()">🗑 إعادة التهيئة الكاملة</button>
        </div>
      </div>
    `;

    /* Audit */
    const auditLogs = Audit.list().slice(0, 100);
    document.getElementById('stab-audit').innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>📝 آخر 100 عملية</h3>
          <button class="btn btn-outline" onclick="App.navigate('reports')">عرض التقارير الكاملة</button>
        </div>
        <div class="card-body" style="padding:0">
          ${auditLogs.length === 0 ? '<div class="empty-state"><p>لا توجد عمليات</p></div>' : `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>العملية</th><th>الكيان</th><th>المستخدم</th><th>التاريخ</th><th>الوقت</th><th>التفاصيل</th></tr></thead>
                <tbody>
                  ${auditLogs.map(l => `<tr>
                    <td><span class="badge badge-blue">${Audit.actionLabel(l.action)}</span></td>
                    <td>${Audit.entityLabel(l.entity)}</td>
                    <td>${Utils.esc(l.user)}</td>
                    <td>${Utils.formatDate(l.date)}</td>
                    <td>${l.time}</td>
                    <td class="text-muted" style="font-size:11px">${Utils.esc(l.notes || '')}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  saveSettings() {
    const form = document.getElementById('settingsForm');
    const fd = new FormData(form);
    const settings = Storage.obj('settings');
    settings.companyName = fd.get('companyName');
    settings.workDayStart = fd.get('workDayStart');
    settings.lowStockThreshold = parseInt(fd.get('lowStockThreshold')) || 10;
    settings.currency = fd.get('currency');
    Storage.set('settings', settings);
    Audit.log('update', 'setting', null, { notes: 'تحديث الإعدادات العامة' });
    Toast.success('تم', 'تم حفظ الإعدادات');
  },

  saveDefaults() {
    const settings = Storage.obj('settings');
    settings.defaultSizes = document.getElementById('defaultSizes').value
      .split(/[،,]/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    settings.defaultGrams = document.getElementById('defaultGrams').value
      .split(/[،,]/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    settings.defaultPaperTypes = document.getElementById('defaultTypes').value
      .split(/[،,]/).map(s => s.trim()).filter(Boolean);
    Storage.set('settings', settings);
    Audit.log('update', 'setting', null, { notes: 'تحديث القيم الافتراضية' });
    Toast.success('تم', 'تم حفظ القيم الافتراضية');
  },

  exportBackup() {
    const data = Storage.exportAll();
    const json = JSON.stringify(data, null, 2);
    Utils.download(`paper_factory_backup_${Utils.today()}.json`, json, 'application/json');
    Audit.log('backup_export', 'setting', null, { notes: `تصدير نسخة احتياطية (${json.length} بايت)` });
    Toast.success('تم التصدير', 'تم تنزيل ملف النسخة الاحتياطية');
  },

  importBackup() {
    const fileInput = document.getElementById('importFile');
    if (!fileInput.files.length) {
      Toast.warning('لا يوجد ملف', 'اختر ملف JSON أولاً');
      return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Modal.confirm('سيتم استبدال جميع البيانات الحالية. متابعة؟', () => {
          Storage.importAll(data, true);
          Audit.log('backup_import', 'setting', null, { notes: `استيراد نسخة احتياطية` });
          Toast.success('تم', 'تم استيراد البيانات. سيتم إعادة التحميل...');
          setTimeout(() => location.reload(), 1500);
        });
      } catch (err) {
        Toast.error('خطأ', 'الملف غير صالح: ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  resetData() {
    Modal.confirm('سيتم حذف كل البيانات وإعادة تحميل البيانات التجريبية. متابعة؟', () => {
      Modal.confirm('تأكيد نهائي: سيتم فقدان كل البيانات. هل أنت متأكد؟', () => {
        /* حذف كل شيء */
        Object.values(Storage.KEYS).forEach(k => Storage.remove(k));
        localStorage.removeItem('pf_initialized');
        Audit.log('delete', 'setting', null, { notes: 'إعادة تهيئة النظام' });
        Toast.success('تم', 'تم حذف البيانات. سيتم إعادة التحميل...');
        setTimeout(() => location.reload(), 1500);
      });
    });
  }
};
