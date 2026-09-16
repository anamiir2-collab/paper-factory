/* ============================================
   inventory.js - قسم المخزن
   ============================================ */

const Inventory = {
  render(container) {
    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header">
          <h3>▦ مخزون البكر</h3>
          <div class="actions">
            <button class="btn btn-outline" onclick="Inventory.refresh()">↻ تحديث</button>
            <button class="btn btn-outline" onclick="Inventory.openStocktake()">📋 جرد المخزن</button>
          </div>
        </div>
        <div class="card-body" style="padding:0">
          <div class="filter-bar" style="padding:14px 20px 0">
            <input type="text" id="invSearch" placeholder="بحث بالكود أو الرول الأم..." class="form-control form-control-sm">
            <select id="invStatusFilter" class="form-control form-control-sm">
              <option value="">كل الحالات</option>
              <option value="available">متاحة</option>
              <option value="reserved">محجوزة</option>
              <option value="dispatched">مصروفة</option>
              <option value="loaded">تم تحميلها</option>
              <option value="rejected">مرفوضة</option>
              <option value="needs_review">تحتاج مراجعة</option>
              <option value="quality_hold">محجوزة للجودة</option>
            </select>
            <select id="invTypeFilter" class="form-control form-control-sm">
              <option value="">كل الأنواع</option>
              <option value="فلوت">فلوت</option>
              <option value="تست معالج">تست معالج</option>
            </select>
            <select id="invSizeFilter" class="form-control form-control-sm">
              <option value="">كل المقاسات</option>
              ${(Storage.obj('settings').defaultSizes || [190, 220, 240]).map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="table-wrap mt-3">
            <table class="data-table">
              <thead><tr>
                <th>الكود</th>
                <th>الرول الأم</th>
                <th>المقاس</th>
                <th>الجرام</th>
                <th>النوع</th>
                <th>الوزن</th>
                <th>الوصلات</th>
                <th>الحالة</th>
                <th>الشركات المسموح لها</th>
                <th class="hide-mobile">المشكلة</th>
                <th></th>
              </tr></thead>
              <tbody id="invTbody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>📊 إحصائيات المخزن</h3></div>
        <div class="card-body" id="invStats"></div>
      </div>
    `;

    this._loadTable();
    this._loadStats();
    document.getElementById('invSearch').addEventListener('input', Utils.debounce(() => this._loadTable(), 250));
    document.getElementById('invStatusFilter').addEventListener('change', () => this._loadTable());
    document.getElementById('invTypeFilter').addEventListener('change', () => this._loadTable());
    document.getElementById('invSizeFilter').addEventListener('change', () => this._loadTable());
  },

  _loadTable() {
    const search = document.getElementById('invSearch').value.toLowerCase().trim();
    const status = document.getElementById('invStatusFilter').value;
    const type = document.getElementById('invTypeFilter').value;
    const size = document.getElementById('invSizeFilter').value;

    let coils = Storage.list('coils').filter(c => !c.archived).slice().reverse();
    if (search) coils = coils.filter(c =>
      c.code.toLowerCase().includes(search) ||
      (c.parentRollNumber || '').toLowerCase().includes(search)
    );
    if (status) coils = coils.filter(c => c.status === status);
    if (type) coils = coils.filter(c => c.type === type);
    if (size) coils = coils.filter(c => c.size == size);

    const tbody = document.getElementById('invTbody');
    if (!coils.length) {
      tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><div class="empty-icon">∅</div><p>لا توجد بكر مطابقة</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = coils.map(c => {
      const st = Utils.COIL_STATUS[c.status] || { label: c.status, badge: 'badge-gray' };
      const allowedCompanies = this._getAllowedCompanies(c);
      return `<tr>
        <td class="fw-600">${Utils.esc(c.code)}</td>
        <td>${Utils.esc(c.parentRollNumber)}</td>
        <td>${Utils.esc(c.size)}</td>
        <td>${Utils.esc(c.gram)}</td>
        <td>${Utils.esc(c.type)}</td>
        <td>${Utils.formatNum(c.weight)} كجم</td>
        <td>${c.joints}</td>
        <td><span class="badge ${st.badge}">${st.label}</span></td>
        <td>${allowedCompanies.length ? allowedCompanies.map(cid => {
          const co = Storage.find('companies', cid);
          return co ? `<span class="badge badge-blue" style="margin:2px">${Utils.esc(co.name)}</span>` : '';
        }).join('') : '<span class="text-muted">—</span>'}</td>
        <td class="hide-mobile">${c.problemId && c.problemId !== 'p_none' ? `<span class="badge badge-gold">${Utils.esc(c.problemName)}</span>` : '—'}</td>
        <td><button class="btn btn-outline btn-sm" onclick="Inventory.viewCoil('${c.id}')">تفاصيل</button></td>
      </tr>`;
    }).join('');
  },

  /* الفحص: هل البكرة مسموحة للشركة؟ */
  isAllowedForCompany(coil, company) {
    if (!coil || !company) return { allowed: false, reason: 'بيانات ناقصة' };
    if (coil.archived) return { allowed: false, reason: 'البكرة مؤرشفة' };
    if (!['available', 'reserved'].includes(coil.status) && !coil.allowedCompanyId) {
      return { allowed: false, reason: `البكرة ${Utils.COIL_STATUS[coil.status]?.label || coil.status}` };
    }

    /* إذا كان هناك موافقة استثنائية لهذه الشركة */
    if (coil.allowedCompanyId === company.id) {
      return { allowed: true, reason: 'موافقة استثنائية من الجودة' };
    }

    /* فحص الوصلات */
    if (coil.joints > company.maxJoints) {
      return { allowed: false, reason: `عدد الوصلات ${coil.joints} بينما الحد الأقصى للشركة ${company.name} هو ${company.maxJoints}` };
    }

    /* فحص المقاس */
    if (company.allowedSizes && company.allowedSizes.length && !company.allowedSizes.includes(coil.size)) {
      return { allowed: false, reason: `المقاس ${coil.size} غير مسموح للشركة ${company.name}. المسموح: ${company.allowedSizes.join('، ')}` };
    }

    /* فحص الجرام */
    if (company.allowedGrams && company.allowedGrams.length && !company.allowedGrams.includes(coil.gram)) {
      return { allowed: false, reason: `الجرام ${coil.gram} غير مسموح للشركة ${company.name}` };
    }

    /* فحص النوع */
    if (company.allowedTypes && company.allowedTypes.length && !company.allowedTypes.includes(coil.type)) {
      return { allowed: false, reason: `النوع ${coil.type} غير مسموح للشركة ${company.name}` };
    }

    /* فحص المشاكل الممنوعة */
    if (company.forbiddenProblems && company.forbiddenProblems.length && coil.problemId &&
        company.forbiddenProblems.includes(coil.problemId)) {
      return { allowed: false, reason: `المشكلة "${coil.problemName}" ممنوعة لدى ${company.name}` };
    }

    return { allowed: true, reason: 'مطابقة لشروط الشركة' };
  },

  /* قائمة الشركات المسموح لها */
  _getAllowedCompanies(coil) {
    return Storage.list('companies').filter(c => c.active)
      .filter(c => this.isAllowedForCompany(coil, c).allowed)
      .map(c => c.id);
  },

  _loadStats() {
    const coils = Storage.list('coils').filter(c => !c.archived);
    const total = coils.length;
    const available = coils.filter(c => c.status === 'available').length;
    const reserved = coils.filter(c => c.status === 'reserved').length;
    const dispatched = coils.filter(c => c.status === 'dispatched').length;
    const rejected = coils.filter(c => c.status === 'rejected').length;
    const totalWeight = coils.reduce((s, c) => s + (c.weight || 0), 0);

    document.getElementById('invStats').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card is-blue"><div class="stat-icon">▦</div><div class="stat-label">إجمالي البكر</div><div class="stat-value">${total}</div></div>
        <div class="stat-card is-green"><div class="stat-icon">✓</div><div class="stat-label">متاحة</div><div class="stat-value">${available}</div></div>
        <div class="stat-card is-gold"><div class="stat-icon">$</div><div class="stat-label">محجوزة</div><div class="stat-value">${reserved}</div></div>
        <div class="stat-card is-orange"><div class="stat-icon">→</div><div class="stat-label">مصروفة</div><div class="stat-value">${dispatched}</div></div>
        <div class="stat-card is-red"><div class="stat-icon">✕</div><div class="stat-label">مرفوضة</div><div class="stat-value">${rejected}</div></div>
        <div class="stat-card is-blue"><div class="stat-icon">⚖</div><div class="stat-label">إجمالي الوزن</div><div class="stat-value">${Utils.formatNum(totalWeight,1)}</div><div class="stat-foot">كجم</div></div>
      </div>
    `;
  },

  refresh() {
    this._loadTable();
    this._loadStats();
    Notifications.checkLowStock();
    Toast.success('تم', 'تم تحديث المخزن');
  },

  /* ============ تفاصيل البكرة + Timeline ============ */
  viewCoil(id) {
    const c = Storage.find('coils', id);
    if (!c) return Toast.error('خطأ', 'البكرة غير موجودة');

    const roll = Storage.find('rolls', c.parentRollId);
    const tests = Storage.list('qualityTests').filter(t => t.rollId === c.parentRollId);
    const reservations = Storage.list('reservations').filter(r => r.coilId === id);
    const sales = Storage.list('sales').filter(s => s.coilId === id);
    const shipments = Storage.list('shipments').filter(sh => sh.coils && sh.coils.includes(id));
    const audits = Audit.list().filter(a => a.entity === 'coil' && a.entityId === id);
    const st = Utils.COIL_STATUS[c.status] || {};

    let timelineHtml = '<div class="timeline">';
    timelineHtml += `<div class="timeline-item is-success">
      <div class="timeline-title">إنتاج الرول الأم ${c.parentRollNumber}</div>
      <div class="timeline-meta">${roll ? Utils.formatDateAr(roll.date) + ' ' + roll.time : '—'}</div>
      ${roll ? `<div class="timeline-body">الوردية: ${roll.shift} • النوع: ${roll.paperType} • الجرام: ${roll.gram}</div>` : ''}
    </div>`;

    if (tests.length) {
      const t = tests[0];
      timelineHtml += `<div class="timeline-item ${t.overallPass ? 'is-success' : 'is-danger'}">
        <div class="timeline-title">اختبارات الجودة</div>
        <div class="timeline-meta">${Utils.formatDateAr(t.createdAt)}</div>
        <div class="timeline-body">النوع: ${t.coilType} • ${t.overallPass ? 'مطابق ✓' : 'غير مطابق ✕'}</div>
      </div>`;
    }

    timelineHtml += `<div class="timeline-item is-success">
      <div class="timeline-title">إنشاء البكرة ${c.code}</div>
      <div class="timeline-meta">${Utils.formatDateAr(c.createdAt)} ${c.createdAt.split(' ')[1] || ''}</div>
      <div class="timeline-body">المقاس: ${c.size} • الجرام: ${c.gram} • الوصلات: ${c.joints}</div>
    </div>`;

    timelineHtml += `<div class="timeline-item is-success">
      <div class="timeline-title">دخول المخزن</div>
      <div class="timeline-meta">${Utils.formatDateAr(c.createdAt)}</div>
      <div class="timeline-body">الحالة: متاحة</div>
    </div>`;

    if (c.problemId && c.problemId !== 'p_none') {
      timelineHtml += `<div class="timeline-item is-warning">
        <div class="timeline-title">تسجيل مشكلة</div>
        <div class="timeline-meta">${Utils.formatDateAr(c.createdAt)}</div>
        <div class="timeline-body">${c.problemName} - خطورة: ${Utils.SEVERITIES.find(s => s.value === c.severity)?.label || c.severity}</div>
      </div>`;
    }

    if (reservations.length) {
      reservations.forEach(r => {
        const co = Storage.find('companies', r.companyId);
        timelineHtml += `<div class="timeline-item is-warning">
          <div class="timeline-title">حجز البكرة</div>
          <div class="timeline-meta">${Utils.formatDateAr(r.createdAt)}</div>
          <div class="timeline-body">الشركة: ${co ? co.name : '—'} • الموظف: ${Utils.esc(r.employee)}</div>
        </div>`;
      });
    }

    if (c.status === 'needs_review' || c.reviewDecision) {
      timelineHtml += `<div class="timeline-item is-danger">
        <div class="timeline-title">طلب مراجعة الجودة</div>
        <div class="timeline-meta">${c.reviewRequestedAt ? Utils.formatDateAr(c.reviewRequestedAt) : '—'}</div>
        <div class="timeline-body">${Utils.esc(c.reviewReason || c.reviewReasonOriginal || '')}</div>
      </div>`;
      if (c.reviewDecision) {
        const decisionLabel = {
          approve_exception: 'موافقة استثنائية',
          reject: 'رفض نهائي',
          redirect: 'تحويل لشركة أخرى',
          keep_hold: 'إبقاء محجوزة'
        }[c.reviewDecision];
        timelineHtml += `<div class="timeline-item ${c.reviewDecision === 'reject' ? 'is-danger' : 'is-success'}">
          <div class="timeline-title">قرار المراجعة: ${decisionLabel}</div>
          <div class="timeline-meta">${Utils.formatDateAr(c.reviewAt)}</div>
          <div class="timeline-body">${Utils.esc(c.reviewReason)} • بواسطة: ${Utils.esc(c.reviewBy)}</div>
        </div>`;
      }
    }

    if (sales.length) {
      sales.forEach(s => {
        const co = Storage.find('companies', s.companyId);
        timelineHtml += `<div class="timeline-item is-warning">
          <div class="timeline-title">صرف البكرة</div>
          <div class="timeline-meta">${Utils.formatDateAr(s.createdAt)}</div>
          <div class="timeline-body">الشركة: ${co ? co.name : '—'} • الموظف: ${Utils.esc(s.employee)}</div>
        </div>`;
      });
    }

    if (shipments.length) {
      shipments.forEach(sh => {
        const co = Storage.find('companies', sh.companyId);
        timelineHtml += `<div class="timeline-item is-success">
          <div class="timeline-title">تحميل على السيارة</div>
          <div class="timeline-meta">${Utils.formatDateAr(sh.date)} ${sh.time || ''}</div>
          <div class="timeline-body">الشركة: ${co ? co.name : '—'} • السيارة: ${Utils.esc(sh.vehicle)} • السائق: ${Utils.esc(sh.driver)}</div>
        </div>`;
      });
    }
    timelineHtml += '</div>';

    /* قائمة الشركات المسموح لها */
    const allCompanies = Storage.list('companies').filter(co => co.active);
    const companiesHtml = allCompanies.map(co => {
      const check = this.isAllowedForCompany(c, co);
      return `<tr>
        <td>${Utils.esc(co.name)}</td>
        <td>${check.allowed ? '<span class="badge badge-green">✓ مسموحة</span>' : '<span class="badge badge-red">✕ ممنوعة</span>'}</td>
        <td class="text-muted" style="font-size:11px">${Utils.esc(check.reason)}</td>
      </tr>`;
    }).join('');

    const body = `
      <div class="grid-2">
        <div>
          <h4 style="margin-bottom:8px;color:var(--c-navy)">بيانات البكرة</h4>
          <table class="data-table">
            <tr><th>الكود</th><td class="fw-600">${Utils.esc(c.code)}</td></tr>
            <tr><th>الرول الأم</th><td>${Utils.esc(c.parentRollNumber)}</td></tr>
            <tr><th>المقاس</th><td>${Utils.esc(c.size)}</td></tr>
            <tr><th>الجرام</th><td>${Utils.esc(c.gram)} GSM</td></tr>
            <tr><th>النوع</th><td>${Utils.esc(c.type)}</td></tr>
            <tr><th>الوزن</th><td>${Utils.formatNum(c.weight)} كجم</td></tr>
            <tr><th>عدد الوصلات</th><td><span class="badge ${c.joints > 3 ? 'badge-gold' : 'badge-gray'}">${c.joints}</span></td></tr>
            <tr><th>الحالة</th><td><span class="badge ${st.badge}">${st.label}</span></td></tr>
            <tr><th>المشكلة</th><td>${c.problemId && c.problemId !== 'p_none' ? `<span class="badge badge-gold">${Utils.esc(c.problemName)}</span>` : '—'}</td></tr>
            <tr><th>ملاحظات</th><td>${Utils.esc(c.notes) || '—'}</td></tr>
          </table>
        </div>
        <div>
          <h4 style="margin-bottom:8px;color:var(--c-navy)">الشركات المسموح/الممنوع لها</h4>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>الشركة</th><th>الحالة</th><th>السبب</th></tr></thead>
              <tbody>${companiesHtml}</tbody>
            </table>
          </div>
        </div>
      </div>

      <h4 class="mt-4 mb-2" style="color:var(--c-navy)">📅 التتبع الزمني للبكرة</h4>
      ${timelineHtml}

      ${audits.length ? `
        <h4 class="mt-4 mb-2" style="color:var(--c-navy)">📝 سجل العمليات (${audits.length})</h4>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>العملية</th><th>المستخدم</th><th>التاريخ</th><th>الوقت</th><th>تفاصيل</th></tr></thead>
            <tbody>
              ${audits.map(a => `<tr>
                <td><span class="badge badge-blue">${Audit.actionLabel(a.action)}</span></td>
                <td>${Utils.esc(a.user)}</td>
                <td>${Utils.formatDate(a.date)}</td>
                <td>${a.time}</td>
                <td class="text-muted" style="font-size:11px">${Utils.esc(a.notes || '')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : ''}
    `;

    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إغلاق</button>
      ${Auth.can('sales') && c.status === 'available' ? `<button class="btn btn-primary" onclick="Modal.close(); Sales.openReservation('${c.id}')">حجز</button>` : ''}
      ${Auth.can('sales') && c.status === 'reserved' ? `<button class="btn btn-success" onclick="Modal.close(); Sales.openDispatch('${c.id}')">صرف</button>` : ''}
    `;
    Modal.open(`تفاصيل البكرة ${c.code}`, body, footer, 'lg');
  },

  openStocktake() {
    const coils = Storage.list('coils').filter(c => !c.archived);
    const body = `
      <p class="mb-3">جرد المخزن - تحقق من البكر المتاحة فعلياً. البكر المؤرشفة أو المرفوضة لن تظهر.</p>
      <div class="table-wrap" style="max-height:60vh;overflow:auto">
        <table class="data-table">
          <thead><tr><th>الكود</th><th>المقاس</th><th>الجرام</th><th>النوع</th><th>الوزن</th><th>الحالة المسجلة</th><th>وجدت فعلياً؟</th></tr></thead>
          <tbody>
            ${coils.map(c => {
              const st = Utils.COIL_STATUS[c.status] || {};
              return `<tr>
                <td class="fw-600">${Utils.esc(c.code)}</td>
                <td>${Utils.esc(c.size)}</td>
                <td>${Utils.esc(c.gram)}</td>
                <td>${Utils.esc(c.type)}</td>
                <td>${Utils.formatNum(c.weight)}</td>
                <td><span class="badge ${st.badge}">${st.label}</span></td>
                <td>
                  <select class="form-control form-control-sm" id="stocktake_${c.id}">
                    <option value="found">✓ موجودة</option>
                    <option value="missing">✕ مفقودة</option>
                    <option value="damaged">⚠ تالفة</option>
                  </select>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-primary" onclick="Inventory.saveStocktake()">حفظ الجرد</button>
    `;
    Modal.open('📋 جرد المخزن', body, footer, 'lg');
  },

  saveStocktake() {
    const coils = Storage.list('coils').filter(c => !c.archived);
    const user = Auth.currentUser();
    let updated = 0;
    coils.forEach(c => {
      const result = document.getElementById(`stocktake_${c.id}`).value;
      if (result === 'missing') {
        Storage.update('coils', c.id, { status: 'rejected', stocktakeNote: 'مفقودة أثناء الجرد' });
        Audit.log('status_change', 'coil', c.id, {
          oldValue: Utils.COIL_STATUS[c.status]?.label,
          newValue: 'مرفوضة',
          notes: `جرد: البكرة ${c.code} مفقودة`
        });
        updated++;
      } else if (result === 'damaged') {
        Storage.update('coils', c.id, { status: 'rejected', stocktakeNote: 'تالفة', problemId: 'p_other', problemName: 'تالفة' });
        Audit.log('status_change', 'coil', c.id, {
          oldValue: Utils.COIL_STATUS[c.status]?.label,
          newValue: 'مرفوضة',
          notes: `جرد: البكرة ${c.code} تالفة`
        });
        updated++;
      }
    });
    Audit.log('update', 'inventory', null, { notes: `جرد المخزن - تحديث ${updated} بكرة` });
    Toast.success('تم الجرد', `تم تحديث ${updated} بكرة`);
    Modal.close();
    this._loadTable();
    this._loadStats();
  }
};
