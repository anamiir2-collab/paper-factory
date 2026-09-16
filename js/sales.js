/* ============================================
   sales.js - المبيعات: الحجز + الصرف + التحميل
   ============================================ */

const Sales = {
  render(container) {
    container.innerHTML = `
      <div class="tabs">
        <button class="tab-btn active" data-tab="available">البيع (اختيار شركة)</button>
        <button class="tab-btn" data-tab="reservations">الحجوزات</button>
        <button class="tab-btn" data-tab="dispatched">المصروفات</button>
        <button class="tab-btn" data-tab="shipments">التحميل</button>
      </div>

      <div class="tab-panel active" id="tab-available"></div>
      <div class="tab-panel" id="tab-reservations"></div>
      <div class="tab-panel" id="tab-dispatched"></div>
      <div class="tab-panel" id="tab-shipments"></div>
    `;

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      });
    });

    this._renderAvailable();
    this._renderReservations();
    this._renderDispatched();
    this._renderShipments();
  },

  /* ============ قائمة البكر للشركة المختارة ============ */
  _renderAvailable() {
    const container = document.getElementById('tab-available');
    const companies = Storage.list('companies').filter(c => c.active);
    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header">
          <h3>اختر شركة لعرض البكر المتاحة</h3>
        </div>
        <div class="card-body">
          <div class="form-group mb-3">
            <label>الشركة</label>
            <select id="saleCompanySelect" class="form-control" onchange="Sales.loadCompanyCoils()">
              <option value="">— اختر شركة —</option>
              ${companies.map(c => `<option value="${c.id}">${Utils.esc(c.name)} (${Utils.esc(c.code)}) - حد ${c.maxJoints} وصلات</option>`).join('')}
            </select>
          </div>
          <div id="companyCoilsList"></div>
        </div>
      </div>
    `;
  },

  loadCompanyCoils() {
    const cid = document.getElementById('saleCompanySelect').value;
    const container = document.getElementById('companyCoilsList');
    if (!cid) {
      container.innerHTML = '<div class="empty-state"><p>اختر شركة لعرض البكر المتاحة</p></div>';
      return;
    }
    const company = Storage.find('companies', cid);
    const allCoils = Storage.list('coils').filter(c =>
      ['available', 'reserved'].includes(c.status) && !c.archived
    );
    const allowed = [];
    const blocked = [];
    allCoils.forEach(coil => {
      const check = Inventory.isAllowedForCompany(coil, company);
      if (check.allowed) allowed.push({ coil, check });
      else blocked.push({ coil, check });
    });

    let html = `
      <div class="stats-grid mb-3">
        <div class="stat-card is-green"><div class="stat-icon">✓</div><div class="stat-label">بكر متاحة</div><div class="stat-value">${allowed.length}</div></div>
        <div class="stat-card is-red"><div class="stat-icon">✕</div><div class="stat-label">بكر ممنوعة</div><div class="stat-value">${blocked.length}</div></div>
        <div class="stat-card is-blue"><div class="stat-icon">$</div><div class="stat-label">محجوزة لهذه الشركة</div><div class="stat-value">${allowed.filter(a => a.coil.status === 'reserved').length}</div></div>
        <div class="stat-card is-gold"><div class="stat-icon">⚖</div><div class="stat-label">إجمالي الوزن المتاح</div><div class="stat-value">${Utils.formatNum(allowed.reduce((s,a) => s + a.coil.weight, 0),1)}</div><div class="stat-foot">كجم</div></div>
      </div>
    `;

    if (allowed.length) {
      html += `<h4 class="mb-2" style="color:var(--c-green)">✓ البكر المتاحة للتحميل (${allowed.length})</h4>
      <div class="table-wrap mb-4">
        <table class="data-table">
          <thead><tr><th>الكود</th><th>المقاس</th><th>الجرام</th><th>النوع</th><th>الوزن</th><th>الوصلات</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            ${allowed.map(({ coil, check }) => {
              const st = Utils.COIL_STATUS[coil.status] || {};
              return `<tr>
                <td class="fw-600">${Utils.esc(coil.code)}</td>
                <td>${Utils.esc(coil.size)}</td>
                <td>${Utils.esc(coil.gram)}</td>
                <td>${Utils.esc(coil.type)}</td>
                <td>${Utils.formatNum(coil.weight)} كجم</td>
                <td><span class="badge ${coil.joints > company.maxJoints - 1 ? 'badge-gold' : 'badge-gray'}">${coil.joints}</span></td>
                <td><span class="badge ${st.badge}">${st.label}</span>${check.reason === 'موافقة استثنائية من الجودة' ? ' <span class="badge badge-orange">استثنائي</span>' : ''}</td>
                <td>
                  ${coil.status === 'available' ?
                    `<button class="btn btn-primary btn-sm" onclick="Sales.openReservation('${coil.id}', '${cid}')">حجز</button>` :
                    `<button class="btn btn-success btn-sm" onclick="Sales.openDispatch('${coil.id}')">صرف</button>`
                  }
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    }

    if (blocked.length) {
      html += `<h4 class="mb-2" style="color:var(--c-red)">✕ البكر غير المتاحة للشركة (${blocked.length})</h4>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>الكود</th><th>المقاس</th><th>الجرام</th><th>الوصلات</th><th>سبب المنع</th><th></th></tr></thead>
          <tbody>
            ${blocked.map(({ coil, check }) => `<tr>
              <td class="fw-600">${Utils.esc(coil.code)}</td>
              <td>${Utils.esc(coil.size)}</td>
              <td>${Utils.esc(coil.gram)}</td>
              <td>${coil.joints}</td>
              <td class="text-danger" style="font-size:11px">${Utils.esc(check.reason)}</td>
              <td><button class="btn btn-warning btn-sm" onclick="Sales.requestReview('${coil.id}', '${cid}')">طلب مراجعة الجودة</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }

    container.innerHTML = html;
  },

  /* ============ الحجز ============ */
  openReservation(coilId, companyId = null) {
    const coil = Storage.find('coils', coilId);
    if (!coil) return;
    const companies = Storage.list('companies').filter(c => c.active);
    const user = Auth.currentUser();

    const body = `
      <div class="alert alert-info mb-3">
        <strong>البكرة:</strong> ${Utils.esc(coil.code)} • ${Utils.esc(coil.size)} • ${Utils.esc(coil.gram)} GSM • ${coil.joints} وصلات • ${Utils.formatNum(coil.weight)} كجم
      </div>
      <form id="reservationForm">
        <div class="form-grid">
          <div class="form-group">
            <label>الشركة <span class="req">*</span></label>
            <select name="companyId" required class="form-control">
              ${companies.map(c => {
                const check = Inventory.isAllowedForCompany(coil, c);
                return `<option value="${c.id}" ${companyId === c.id ? 'selected' : ''} ${!check.allowed ? 'disabled' : ''}>
                  ${Utils.esc(c.name)} ${check.allowed ? '✓' : '✕ (غير مسموح)'} - ${c.maxJoints} وصلات
                </option>`;
              }).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>الموظف</label>
            <input type="text" name="employee" required class="form-control" value="${Utils.esc(user.name)}" readonly>
          </div>
          <div class="form-group">
            <label>التاريخ <span class="req">*</span></label>
            <input type="date" name="date" required value="${Utils.today()}" class="form-control">
          </div>
          <div class="form-group">
            <label>الوقت <span class="req">*</span></label>
            <input type="time" name="time" required value="${Utils.now()}" class="form-control">
          </div>
        </div>
        <div class="form-group mt-2">
          <label>ملاحظات</label>
          <textarea name="notes" rows="2" class="form-control"></textarea>
        </div>
      </form>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-primary" onclick="Sales.saveReservation('${coilId}')">حجز البكرة</button>
    `;
    Modal.open('حجز بكرة', body, footer, 'md');
  },

  saveReservation(coilId) {
    const form = document.getElementById('reservationForm');
    const fd = new FormData(form);
    const companyId = fd.get('companyId');
    const user = Auth.currentUser();

    const coil = Storage.find('coils', coilId);
    const company = Storage.find('companies', companyId);
    if (!coil || !company) return Toast.error('خطأ', 'بيانات ناقصة');

    /* فحص الحالة */
    if (coil.status !== 'available') {
      Toast.error('لا يمكن الحجز', `البكرة حالتها: ${Utils.COIL_STATUS[coil.status]?.label}`);
      return;
    }

    /* فحص الشركة */
    const check = Inventory.isAllowedForCompany(coil, company);
    if (!check.allowed) {
      Toast.error('غير مسموح', `لا يمكن حجز البكرة لشركة ${company.name}: ${check.reason}`);
      return;
    }

    /* فحص هل هي محجوزة من قبل */
    const existing = Storage.list('reservations').find(r =>
      r.coilId === coilId && r.status === 'active'
    );
    if (existing) {
      Toast.error('محجوزة مسبقاً', 'البكرة محجوزة من موظف آخر');
      return;
    }

    const reservation = {
      id: Utils.uid('res'),
      coilId,
      coilCode: coil.code,
      companyId,
      companyName: company.name,
      employee: user.name,
      employeeId: user.id,
      date: fd.get('date'),
      time: fd.get('time'),
      notes: fd.get('notes'),
      status: 'active',
      createdAt: Utils.nowDateTime()
    };
    Storage.insert('reservations', reservation);

    /* تحديث حالة البكرة */
    Storage.update('coils', coilId, { status: 'reserved', companyId });
    Audit.log('reserve', 'coil', coilId, {
      notes: `حجز البكرة ${coil.code} للشركة ${company.name} بواسطة ${user.name}`
    });

    Toast.success('تم الحجز', `تم حجز البكرة ${coil.code} للشركة ${company.name}`);
    Modal.close();
    this.loadCompanyCoils();
    this._renderReservations();
    App.updateNotifBadge();
  },

  /* ============ الصرف ============ */
  openDispatch(coilId) {
    const coil = Storage.find('coils', coilId);
    if (!coil) return;
    const reservation = Storage.list('reservations').find(r =>
      r.coilId === coilId && r.status === 'active'
    );
    const company = reservation ? Storage.find('companies', reservation.companyId) :
      (coil.companyId ? Storage.find('companies', coil.companyId) : null);
    const user = Auth.currentUser();

    /* فحص كامل قبل السماح بالصرف */
    const checks = this._fullDispatchCheck(coil, company, reservation);

    const body = `
      <div class="alert ${checks.allPass ? 'alert-success' : 'alert-danger'} mb-3">
        <strong>نتيجة الفحص التلقائي:</strong> ${checks.allPass ? '✓ مسموح بالصرف' : '✕ غير مسموح بالصرف'}
      </div>
      <ul style="font-size:13px;margin-bottom:16px;padding-right:20px">
        ${checks.results.map(r => `<li style="margin-bottom:4px;color:${r.pass ? 'var(--c-green)' : 'var(--c-red)'}">
          ${r.pass ? '✓' : '✕'} ${Utils.esc(r.message)}
        </li>`).join('')}
      </ul>
      ${checks.allPass ? `
        <form id="dispatchForm">
          <div class="form-grid">
            <div class="form-group">
              <label>الشركة</label>
              <input type="text" class="form-control" value="${company ? Utils.esc(company.name) : '—'}" readonly>
            </div>
            <div class="form-group">
              <label>الموظف</label>
              <input type="text" name="employee" class="form-control" value="${Utils.esc(user.name)}" readonly>
            </div>
            <div class="form-group">
              <label>التاريخ</label>
              <input type="date" name="date" class="form-control" value="${Utils.today()}" readonly>
            </div>
            <div class="form-group">
              <label>الوقت</label>
              <input type="time" name="time" class="form-control" value="${Utils.now()}" readonly>
            </div>
          </div>
          <div class="form-group">
            <label>ملاحظات الصرف</label>
            <textarea name="notes" rows="2" class="form-control" placeholder="ملاحظات..."></textarea>
          </div>
        </form>
      ` : ''}
    `;

    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إغلاق</button>
      ${checks.allPass ? `<button class="btn btn-success" onclick="Sales.confirmDispatch('${coilId}')">تأكيد الصرف</button>` : ''}
    `;
    Modal.open(`فحص صرف البكرة ${coil.code}`, body, footer, 'md');
  },

  /* فحص كامل قبل الصرف */
  _fullDispatchCheck(coil, company, reservation) {
    const results = [];
    let allPass = true;

    /* 1. هل البكرة موجودة */
    if (!coil) {
      results.push({ pass: false, message: 'البكرة غير موجودة' });
      allPass = false;
      return { allPass, results };
    } else {
      results.push({ pass: true, message: 'البكرة موجودة في النظام' });
    }

    /* 2. هل البكرة متاحة أو محجوزة */
    if (!['available', 'reserved'].includes(coil.status)) {
      results.push({ pass: false, message: `البكرة غير متاحة - الحالة: ${Utils.COIL_STATUS[coil.status]?.label}` });
      allPass = false;
    } else {
      results.push({ pass: true, message: `حالة البكرة: ${Utils.COIL_STATUS[coil.status]?.label}` });
    }

    /* 3. هل الجودة موافقة (إذا كان هناك اختبار) */
    const tests = Storage.list('qualityTests').filter(t => t.rollId === coil.parentRollId);
    if (tests.length > 0) {
      if (!tests[0].overallPass) {
        results.push({ pass: false, message: 'الجودة غير موافقة على الرول الأم' });
        allPass = false;
      } else {
        results.push({ pass: true, message: 'الجودة موافقة على الرول الأم' });
      }
    } else {
      results.push({ pass: true, message: 'لا يوجد اختبار جودة (مسموح)' });
    }

    /* 4. هل مسموح بها للشركة */
    if (company) {
      const check = Inventory.isAllowedForCompany(coil, company);
      if (!check.allowed) {
        results.push({ pass: false, message: `غير مسموح للشركة: ${check.reason}` });
        allPass = false;
      } else {
        results.push({ pass: true, message: `مسموحة للشركة ${company.name}` });
      }
    } else {
      results.push({ pass: false, message: 'لم يتم تحديد شركة' });
      allPass = false;
    }

    /* 5. هل محجوزة لموظف آخر */
    if (coil.status === 'reserved' && reservation) {
      const user = Auth.currentUser();
      if (reservation.employeeId !== user.id && user.role !== 'admin') {
        results.push({ pass: false, message: `محجوزة من موظف آخر (${reservation.employee})` });
        allPass = false;
      } else {
        results.push({ pass: true, message: `محجوزة بواسطتك` });
      }
    }

    /* 6. مشاكل جودة مانعة */
    if (coil.status === 'quality_hold' || coil.status === 'needs_review') {
      results.push({ pass: false, message: 'البكرة محجوزة للجودة' });
      allPass = false;
    }

    return { allPass, results };
  },

  confirmDispatch(coilId) {
    const form = document.getElementById('dispatchForm');
    const fd = new FormData(form);
    const coil = Storage.find('coils', coilId);
    const reservation = Storage.list('reservations').find(r =>
      r.coilId === coilId && r.status === 'active'
    );
    const company = reservation ? Storage.find('companies', reservation.companyId) :
      (coil.companyId ? Storage.find('companies', coil.companyId) : null);
    const user = Auth.currentUser();

    /* إعادة الفحص قبل التأكيد */
    const check = this._fullDispatchCheck(coil, company, reservation);
    if (!check.allPass) {
      Toast.error('لا يمكن الصرف', 'فشل الفحص التلقائي');
      return;
    }

    /* إنشاء سجل الصرف */
    const sale = {
      id: Utils.uid('sal'),
      coilId,
      coilCode: coil.code,
      companyId: company.id,
      companyName: company.name,
      employee: user.name,
      employeeId: user.id,
      date: fd.get('date'),
      time: fd.get('time'),
      notes: fd.get('notes'),
      reservationId: reservation ? reservation.id : null,
      createdAt: Utils.nowDateTime()
    };
    Storage.insert('sales', sale);

    /* تحديث حالة البكرة */
    Storage.update('coils', coilId, { status: 'dispatched', companyId: company.id });

    /* إنهاء الحجز */
    if (reservation) {
      Storage.update('reservations', reservation.id, { status: 'dispatched', dispatchId: sale.id });
    }

    Audit.log('dispatch', 'coil', coilId, {
      notes: `صرف البكرة ${coil.code} للشركة ${company.name} بواسطة ${user.name}`
    });

    Toast.success('تم الصرف', `تم صرف البكرة ${coil.code} للشركة ${company.name}`);
    Modal.close();
    this.loadCompanyCoils();
    this._renderReservations();
    this._renderDispatched();
    App.updateNotifBadge();
  },

  /* ============ طلب مراجعة الجودة ============ */
  requestReview(coilId, companyId) {
    const coil = Storage.find('coils', coilId);
    const company = Storage.find('companies', companyId);
    if (!coil || !company) return;
    const check = Inventory.isAllowedForCompany(coil, company);
    const user = Auth.currentUser();

    const body = `
      <div class="alert alert-warning">
        <strong>طلب مراجعة جودة للبكرة ${Utils.esc(coil.code)}</strong><br>
        الشركة المطلوبة: ${Utils.esc(company.name)}<br>
        سبب الرفض: ${Utils.esc(check.reason)}
      </div>
      <p>سيتم تحويل البكرة إلى قائمة "بكر تحتاج مراجعة" لمسؤول الجودة، وسيظهر لها سبب الرفض وطلب المراجعة.</p>
      <div class="form-group">
        <label>ملاحظات إضافية للجودة</label>
        <textarea id="reviewNotes" rows="3" class="form-control" placeholder="ملاحظات..."></textarea>
      </div>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-warning" onclick="Sales.submitReview('${coilId}', '${companyId}')">إرسال طلب المراجعة</button>
    `;
    Modal.open('طلب مراجعة الجودة', body, footer, 'sm');
  },

  submitReview(coilId, companyId) {
    const coil = Storage.find('coils', coilId);
    const company = Storage.find('companies', companyId);
    if (!coil || !company) return;
    const check = Inventory.isAllowedForCompany(coil, company);
    const user = Auth.currentUser();
    const notes = document.getElementById('reviewNotes').value.trim();

    /* إذا كانت محجوزة، ألغ الحجز */
    if (coil.status === 'reserved') {
      const reservation = Storage.list('reservations').find(r =>
        r.coilId === coilId && r.status === 'active'
      );
      if (reservation) {
        Storage.update('reservations', reservation.id, { status: 'cancelled' });
      }
    }

    /* تحويل للمراجعة */
    Storage.update('coils', coilId, {
      status: 'needs_review',
      reviewCompanyId: companyId,
      reviewReason: check.reason,
      reviewRequestedBy: user.name,
      reviewRequestedById: user.id,
      reviewRequestedAt: Utils.nowDateTime(),
      reviewNotes: notes
    });

    Audit.log('quality_review', 'coil', coilId, {
      oldValue: 'available/reserved',
      newValue: 'needs_review',
      notes: `طلب مراجعة جودة للبكرة ${coil.code} - ${check.reason}`
    });

    Notifications.add('warning', 'طلب مراجعة جودة',
      `البكرة ${coil.code} تحتاج مراجعة جودة قبل تحميلها لشركة ${company.name}`,
      coilId, 'coil');

    Toast.success('تم', 'تم تحويل البكرة لقائمة المراجعة');
    Modal.close();
    this.loadCompanyCoils();
    App.updateNotifBadge();
  },

  /* ============ عرض الحجوزات ============ */
  _renderReservations() {
    const reservations = Storage.list('reservations').slice().reverse();
    const container = document.getElementById('tab-reservations');
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>الحجوزات النشطة (${reservations.filter(r => r.status === 'active').length})</h3></div>
        <div class="card-body" style="padding:0">
          ${!reservations.length ? `<div class="empty-state"><p>لا توجد حجوزات</p></div>` : `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>البكرة</th><th>الشركة</th><th>الموظف</th><th>التاريخ</th><th>الوقت</th><th>الحالة</th><th></th></tr></thead>
                <tbody>
                  ${reservations.map(r => {
                    const coil = Storage.find('coils', r.coilId);
                    return `<tr>
                      <td class="fw-600">${Utils.esc(r.coilCode)}</td>
                      <td>${Utils.esc(r.companyName)}</td>
                      <td>${Utils.esc(r.employee)}</td>
                      <td>${Utils.formatDate(r.date)}</td>
                      <td>${Utils.esc(r.time)}</td>
                      <td><span class="badge ${r.status === 'active' ? 'badge-blue' : r.status === 'dispatched' ? 'badge-green' : 'badge-gray'}">${r.status === 'active' ? 'نشط' : r.status === 'dispatched' ? 'تم صرفها' : 'ملغي'}</span></td>
                      <td>
                        ${r.status === 'active' && coil ? `<button class="btn btn-success btn-sm" onclick="Sales.openDispatch('${r.coilId}')">صرف</button>` : ''}
                        ${r.status === 'active' && Auth.isAdmin() ? ` <button class="btn btn-ghost btn-sm" onclick="Sales.cancelReservation('${r.id}')">إلغاء</button>` : ''}
                      </td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  cancelReservation(id) {
    const r = Storage.find('reservations', id);
    if (!r) return;
    Modal.confirm(`إلغاء حجز البكرة ${r.coilCode}؟`, () => {
      Storage.update('reservations', id, { status: 'cancelled' });
      Storage.update('coils', r.coilId, { status: 'available', companyId: null });
      Audit.log('update', 'reservation', id, {
        oldValue: 'active',
        newValue: 'cancelled',
        notes: `إلغاء حجز البكرة ${r.coilCode}`
      });
      Toast.success('تم', 'تم إلغاء الحجز');
      this._renderReservations();
      this.loadCompanyCoils();
    });
  },

  /* ============ عرض المصروفات ============ */
  _renderDispatched() {
    const sales = Storage.list('sales').slice().reverse();
    const container = document.getElementById('tab-dispatched');
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>المصروفات (${sales.length})</h3>
          ${sales.length ? `<button class="btn btn-success" onclick="Sales.openLoading()">+ تجهيز شحنة تحميل</button>` : ''}
        </div>
        <div class="card-body" style="padding:0">
          ${!sales.length ? `<div class="empty-state"><p>لا توجد مصروفات بعد</p></div>` : `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>البكرة</th><th>الشركة</th><th>الموظف</th><th>التاريخ</th><th>الوقت</th><th>الحالة</th><th></th></tr></thead>
                <tbody>
                  ${sales.map(s => {
                    const coil = Storage.find('coils', s.coilId);
                    const loaded = Storage.list('shipments').find(sh => sh.coils && sh.coils.includes(s.coilId));
                    return `<tr>
                      <td class="fw-600">${Utils.esc(s.coilCode)}</td>
                      <td>${Utils.esc(s.companyName)}</td>
                      <td>${Utils.esc(s.employee)}</td>
                      <td>${Utils.formatDate(s.date)}</td>
                      <td>${Utils.esc(s.time)}</td>
                      <td><span class="badge ${loaded ? 'badge-gray' : 'badge-gold'}">${loaded ? 'تم تحميلها' : 'مصروفة'}</span></td>
                      <td>${!loaded && coil ? `<button class="btn btn-success btn-sm" onclick="Sales.openLoading('${s.coilId}')">تحميل</button>` : ''}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  /* ============ التحميل ============ */
  openLoading(presetCoilId = null) {
    /* جمع البكر المصروفة وغير محملة */
    const sales = Storage.list('sales').filter(s => {
      const loaded = Storage.list('shipments').find(sh => sh.coils && sh.coils.includes(s.coilId));
      return !loaded;
    });

    if (!sales.length) {
      Toast.info('لا يوجد', 'لا توجد بكر مصروفة وجاهزة للتحميل');
      return;
    }

    const body = `
      <form id="loadingForm">
        <div class="form-grid mb-3">
          <div class="form-group">
            <label>رقم أمر التحميل <span class="req">*</span></label>
            <input type="text" name="orderNumber" required class="form-control" value="LD-${new Date().getTime().toString().slice(-6)}">
          </div>
          <div class="form-group">
            <label>الشركة <span class="req">*</span></label>
            <select name="companyId" id="loadCompanySelect" required class="form-control" onchange="Sales.filterLoadCoils()">
              ${[...new Set(sales.map(s => s.companyId))].map(cid => {
                const co = Storage.find('companies', cid);
                return co ? `<option value="${cid}">${Utils.esc(co.name)}</option>` : '';
              }).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>التاريخ <span class="req">*</span></label>
            <input type="date" name="date" required value="${Utils.today()}" class="form-control">
          </div>
          <div class="form-group">
            <label>الوقت <span class="req">*</span></label>
            <input type="time" name="time" required value="${Utils.now()}" class="form-control">
          </div>
          <div class="form-group">
            <label>السيارة <span class="req">*</span></label>
            <input type="text" name="vehicle" required class="form-control" placeholder="رقم السيارة/الحاوية">
          </div>
          <div class="form-group">
            <label>اسم السائق <span class="req">*</span></label>
            <input type="text" name="driver" required class="form-control" placeholder="اسم السائق">
          </div>
        </div>

        <h4 class="mb-2" style="color:var(--c-navy)">اختر البكر للتحميل</h4>
        <div id="loadCoilsList" style="max-height:300px;overflow-y:auto;border:1px solid var(--c-border);border-radius:8px;padding:10px"></div>
      </form>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-success" onclick="Sales.confirmLoading(${presetCoilId ? `'${presetCoilId}'` : 'null'})">تأكيد التحميل</button>
    `;
    Modal.open('🚚 تحميل سيارة', body, footer, 'lg');

    this.filterLoadCoils(presetCoilId);
  },

  filterLoadCoils(presetCoilId = null) {
    const cid = document.getElementById('loadCompanySelect').value;
    const list = document.getElementById('loadCoilsList');
    if (!cid) {
      list.innerHTML = '<p class="text-muted">اختر الشركة أولاً</p>';
      return;
    }
    const sales = Storage.list('sales').filter(s => {
      const loaded = Storage.list('shipments').find(sh => sh.coils && sh.coils.includes(s.coilId));
      return !loaded && s.companyId === cid;
    });

    if (!sales.length) {
      list.innerHTML = '<p class="text-muted">لا توجد بكر مصروفة لهذه الشركة</p>';
      return;
    }

    list.innerHTML = sales.map(s => {
      const coil = Storage.find('coils', s.coilId);
      if (!coil) return '';
      const checked = presetCoilId === coil.id ? 'checked' : '';
      return `<label class="checkbox-item ${checked ? 'checked' : ''}" style="display:block;margin-bottom:6px">
        <input type="checkbox" name="loadCoils" value="${coil.id}" ${checked} onchange="this.closest('.checkbox-item').classList.toggle('checked', this.checked)">
        <span style="flex:1">
          <strong>${Utils.esc(coil.code)}</strong> - ${Utils.esc(coil.size)} • ${Utils.esc(coil.gram)} • ${Utils.formatNum(coil.weight)} كجم • ${coil.joints} وصلات
        </span>
      </label>`;
    }).join('');
  },

  confirmLoading(presetCoilId = null) {
    const form = document.getElementById('loadingForm');
    const fd = new FormData(form);
    const data = {
      orderNumber: fd.get('orderNumber'),
      companyId: fd.get('companyId'),
      date: fd.get('date'),
      time: fd.get('time'),
      vehicle: fd.get('vehicle'),
      driver: fd.get('driver')
    };
    const coilIds = fd.getAll('loadCoils');

    if (!data.orderNumber || !data.companyId || !data.vehicle || !data.driver) {
      Toast.error('بيانات ناقصة', 'أكمل البيانات الأساسية');
      return;
    }
    if (!coilIds.length) {
      Toast.error('لا يوجد بكر', 'اختر بكر واحدة على الأقل');
      return;
    }

    const company = Storage.find('companies', data.companyId);
    const coils = coilIds.map(id => Storage.find('coils', id)).filter(Boolean);
    const totalWeight = coils.reduce((s, c) => s + (c.weight || 0), 0);
    const sizes = [...new Set(coils.map(c => c.size))];
    const grams = [...new Set(coils.map(c => c.gram))];
    const types = [...new Set(coils.map(c => c.type))];

    const user = Auth.currentUser();
    const shipment = {
      id: Utils.uid('sh'),
      ...data,
      companyName: company.name,
      coils: coilIds,
      coilCodes: coils.map(c => c.code),
      totalWeight,
      sizes,
      grams,
      types,
      coilCount: coils.length,
      loadedBy: user.name,
      loadedById: user.id,
      createdAt: Utils.nowDateTime()
    };
    Storage.insert('shipments', shipment);

    /* تحديث حالة كل بكر إلى "loaded" */
    coilIds.forEach(id => {
      Storage.update('coils', id, { status: 'loaded' });
      Audit.log('load', 'coil', id, {
        notes: `تحميل البكرة على السيارة ${data.vehicle} - أمر ${data.orderNumber}`
      });
    });

    Audit.log('load', 'shipment', shipment.id, {
      notes: `تحميل ${coils.length} بكرة للشركة ${company.name} على السيارة ${data.vehicle}`
    });

    Toast.success('تم التحميل', `تم تحميل ${coils.length} بكرة (${Utils.formatNum(totalWeight,1)} كجم) على السيارة ${data.vehicle}`);
    Modal.close();
    this._renderShipments();
    this._renderDispatched();
    App.updateNotifBadge();
  },

  /* ============ عرض الشحنات ============ */
  _renderShipments() {
    const shipments = Storage.list('shipments').slice().reverse();
    const container = document.getElementById('tab-shipments');
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>🚚 الشحنات المحملة (${shipments.length})</h3>
          ${shipments.length ? `<button class="btn btn-success" onclick="Sales.openLoading()">+ تجهيز شحنة</button>` : ''}
        </div>
        <div class="card-body" style="padding:0">
          ${!shipments.length ? `<div class="empty-state"><div class="empty-icon">🚚</div><p>لا توجد شحنات محملة بعد</p></div>` : `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>أمر التحميل</th><th>الشركة</th><th>التاريخ</th><th>السيارة</th><th>السائق</th><th>عدد البكر</th><th>إجمالي الوزن</th><th></th></tr></thead>
                <tbody>
                  ${shipments.map(s => `<tr>
                    <td class="fw-600">${Utils.esc(s.orderNumber)}</td>
                    <td>${Utils.esc(s.companyName)}</td>
                    <td>${Utils.formatDate(s.date)} ${s.time}</td>
                    <td>${Utils.esc(s.vehicle)}</td>
                    <td>${Utils.esc(s.driver)}</td>
                    <td>${s.coilCount}</td>
                    <td>${Utils.formatNum(s.totalWeight,1)} كجم</td>
                    <td><button class="btn btn-outline btn-sm" onclick="Sales.viewShipment('${s.id}')">عرض</button></td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  viewShipment(id) {
    const s = Storage.find('shipments', id);
    if (!s) return;
    const coils = s.coils.map(cid => Storage.find('coils', cid)).filter(Boolean);
    const body = `
      <div class="grid-2 mb-3">
        <table class="data-table">
          <tr><th>أمر التحميل</th><td class="fw-600">${Utils.esc(s.orderNumber)}</td></tr>
          <tr><th>الشركة</th><td>${Utils.esc(s.companyName)}</td></tr>
          <tr><th>التاريخ</th><td>${Utils.formatDateAr(s.date)} ${s.time}</td></tr>
          <tr><th>السيارة</th><td>${Utils.esc(s.vehicle)}</td></tr>
          <tr><th>السائق</th><td>${Utils.esc(s.driver)}</td></tr>
          <tr><th>عدد البكر</th><td>${s.coilCount}</td></tr>
          <tr><th>إجمالي الوزن</th><td>${Utils.formatNum(s.totalWeight,1)} كجم</td></tr>
          <tr><th>المقاسات</th><td>${s.sizes.join('، ')}</td></tr>
          <tr><th>الجرامات</th><td>${s.grams.join('، ')}</td></tr>
          <tr><th>الأنواع</th><td>${s.types.join('، ')}</td></tr>
          <tr><th>المُحمّل</th><td>${Utils.esc(s.loadedBy)}</td></tr>
        </table>
      </div>
      <h4 class="mb-2">البكر المحملة (${coils.length})</h4>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>الكود</th><th>المقاس</th><th>الجرام</th><th>النوع</th><th>الوزن</th><th>الوصلات</th></tr></thead>
          <tbody>
            ${coils.map(c => `<tr>
              <td class="fw-600">${Utils.esc(c.code)}</td><td>${Utils.esc(c.size)}</td><td>${Utils.esc(c.gram)}</td>
              <td>${Utils.esc(c.type)}</td><td>${Utils.formatNum(c.weight)} كجم</td><td>${c.joints}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
    const footer = `<button class="btn btn-ghost" onclick="Modal.close()">إغلاق</button>`;
    Modal.open(`الشحنة ${s.orderNumber}`, body, footer, 'lg');
  }
};
