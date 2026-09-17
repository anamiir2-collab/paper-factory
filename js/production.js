/* ============================================
   production.js - قسم الإنتاج
   ============================================ */

const Production = {
  render(container) {
    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header">
          <h3>⚙ الرولات المنتجة</h3>
          <div class="actions">
            <button class="btn btn-primary" onclick="Production.openAddForm()">+ إضافة رول</button>
            <button class="btn btn-outline" onclick="Production.sendToCutting()">↗ إرسال للمقص</button>
          </div>
        </div>
        <div class="card-body" style="padding:0">
          <div class="filter-bar" style="padding:14px 20px 0">
            <input type="text" id="prodSearch" placeholder="بحث برقم الرول..." class="form-control form-control-sm">
            <select id="prodShiftFilter" class="form-control form-control-sm">
              <option value="">كل الورديات</option>
              <option value="صباحية">صباحية</option>
              <option value="مسائية">مسائية</option>
            </select>
            <select id="prodStatusFilter" class="form-control form-control-sm">
              <option value="">كل الحالات</option>
              <option value="new">جديد</option>
              <option value="in_quality">بالجودة</option>
              <option value="in_cutting">بالمقص</option>
              <option value="cut">تم قصه</option>
              <option value="archived">مؤرشف</option>
            </select>
          </div>
          <div class="table-wrap mt-3">
            <table class="data-table" id="rollsTable">
              <thead>
                <tr>
                  <th>رقم الرول</th>
                  <th>التاريخ</th>
                  <th>الوقت</th>
                  <th>الوردية</th>
                  <th>نوع الورق</th>
                  <th>الجرام</th>
                  <th>الوزن</th>
                  <th>العرض</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody id="rollsTbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this._loadTable();

    document.getElementById('prodSearch').addEventListener('input', Utils.debounce(() => this._loadTable(), 250));
    document.getElementById('prodShiftFilter').addEventListener('change', () => this._loadTable());
    document.getElementById('prodStatusFilter').addEventListener('change', () => this._loadTable());
  },

  _loadTable() {
    const search = document.getElementById('prodSearch').value.toLowerCase().trim();
    const shift = document.getElementById('prodShiftFilter').value;
    const status = document.getElementById('prodStatusFilter').value;

    let rolls = Storage.list('rolls').slice().reverse();
    if (search) rolls = rolls.filter(r => r.rollNumber.toLowerCase().includes(search));
    if (shift) rolls = rolls.filter(r => r.shift === shift);
    if (status) rolls = rolls.filter(r => r.status === status);

    const tbody = document.getElementById('rollsTbody');
    if (!rolls.length) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">∅</div><p>لا توجد رولات. اضغط "+ إضافة رول" لإضافة أول رول.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = rolls.map(r => {
      const st = Utils.ROLL_STATUS[r.status] || { label: r.status, badge: 'badge-gray' };
      return `<tr class="${r.archived ? 'archived' : ''}">
        <td class="fw-600">${Utils.esc(r.rollNumber)}</td>
        <td>${Utils.formatDate(r.date)}</td>
        <td>${Utils.esc(r.time)}</td>
        <td><span class="badge badge-gray">${Utils.esc(r.shift)}</span></td>
        <td>${Utils.esc(r.paperType)}</td>
        <td>${Utils.esc(r.gram)} GSM</td>
        <td>${Utils.formatNum(r.weight)} كجم</td>
        <td>${Utils.formatNum(r.width)} مم</td>
        <td><span class="badge ${st.badge}">${st.label}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn btn-outline" onclick="Production.viewRoll('${r.id}')" title="عرض">👁</button>
            ${(Auth.can('production') && !r.archived) ? `<button class="btn btn-outline" onclick="Production.openAddForm('${r.id}')" title="تعديل">✎</button>` : ''}
            ${(Auth.can('production') && !r.archived && r.status === 'new') ? `<button class="btn btn-ghost" onclick="Production.sendToCutting('${r.id}')" title="إرسال للمقص">↗</button>` : ''}
            ${(Auth.isAdmin() && !r.archived) ? `<button class="btn btn-ghost" onclick="Production.archive('${r.id}')" title="أرشفة">⊟</button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  openAddForm(editId = null) {
    const edit = editId ? Storage.find('rolls', editId) : null;
    const settings = Storage.obj('settings');
    const paperTypes = settings.defaultPaperTypes || ['فلوت','تست معالج'];
    const grams = settings.defaultGrams || [125, 150];

    const body = `
      <form id="rollForm">
        <div class="form-grid">
          <div class="form-group">
            <label>رقم الرول <span class="req">*</span></label>
            <input type="text" name="rollNumber" required value="${edit ? Utils.esc(edit.rollNumber) : ''}" ${edit ? 'readonly' : ''} class="form-control" placeholder="مثال: 13626">
            <div class="form-hint">يجب أن يكون فريداً</div>
          </div>
          <div class="form-group">
            <label>تاريخ الإنتاج <span class="req">*</span></label>
            <input type="date" name="date" required value="${edit ? edit.date : Utils.today()}" class="form-control">
          </div>
          <div class="form-group">
            <label>وقت الإنتاج <span class="req">*</span></label>
            <input type="time" name="time" required value="${edit ? edit.time : Utils.now()}" class="form-control">
          </div>
          <div class="form-group">
            <label>الوردية <span class="req">*</span></label>
            <select name="shift" required class="form-control">
              <option value="صباحية" ${edit && edit.shift === 'صباحية' ? 'selected' : !edit ? 'selected' : ''}>صباحية</option>
              <option value="مسائية" ${edit && edit.shift === 'مسائية' ? 'selected' : ''}>مسائية</option>
            </select>
          </div>
          <div class="form-group">
            <label>نوع الورق <span class="req">*</span></label>
            <select name="paperType" required class="form-control">
              ${paperTypes.map(t => `<option value="${Utils.esc(t)}" ${edit && edit.paperType === t ? 'selected' : ''}>${Utils.esc(t)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>الجرام (GSM) <span class="req">*</span></label>
            <input
               type="number"
               name="gram"
               min="80"
               step="1"
               required
               value="${edit ? edit.gram : ''}"
               class="from-control"
               placeholder="مثال : 100"
               >
          </div>
          <div class="form-group">
            <label>الوزن (كجم) <span class="req">*</span></label>
            <input type="number" name="weight" step="0.1" required value="${edit ? edit.weight : ''}" class="form-control" placeholder="مثال: 1850">
          </div>
          <div class="form-group">
            <label>العرض (مم) <span class="req">*</span></label>
            <input type="number" name="width" step="1" required value="${edit ? edit.width : ''}" class="form-control" placeholder="مثال: 2400">
          </div>
        </div>
        <div class="form-group mt-2">
          <label>ملاحظات</label>
          <textarea name="notes" rows="2" class="form-control" placeholder="ملاحظات إضافية...">${edit ? Utils.esc(edit.notes) : ''}</textarea>
        </div>
      </form>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-primary" onclick="Production.saveRoll(${edit ? `'${edit.id}'` : 'null'})">${edit ? 'حفظ التعديل' : 'حفظ الرول'}</button>
    `;
    Modal.open(edit ? 'تعديل رول' : 'إضافة رول جديد', body, footer, 'lg');
  },

  saveRoll(editId) {
    const form = document.getElementById('rollForm');
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    if (!data.rollNumber || !data.date || !data.time) {
      Toast.error('بيانات ناقصة', 'يجب إدخال رقم الرول والتاريخ والوقت');
      return;
    }

    const user = Auth.currentUser();

    /* التحقق من تفرّد رقم الرول */
    const rolls = Storage.list('rolls');
    const duplicate = rolls.find(r => r.rollNumber === data.rollNumber && r.id !== editId);
    if (duplicate) {
      Toast.error('رقم مكرر', `الرول رقم ${data.rollNumber} موجود مسبقاً`);
      return;
    }

    const prepared = {
      rollNumber: data.rollNumber,
      date: data.date,
      time: data.time,
      shift: data.shift,
      paperType: data.paperType,
      gram: parseInt(data.gram),
      weight: parseFloat(data.weight),
      width: parseInt(data.width),
      notes: data.notes,
      status: 'new'
    };

    if (editId) {
      const old = Storage.find('rolls', editId);
      Storage.update('rolls', editId, prepared);
      Audit.log('update', 'roll', editId, {
        oldValue: old.rollNumber,
        newValue: prepared.rollNumber,
        notes: `تعديل بيانات الرول ${prepared.rollNumber}`
      });
      Toast.success('تم التحديث', `تم تعديل بيانات الرول ${prepared.rollNumber}`);
    } else {
      prepared.id = Utils.uid('r');
      prepared.createdAt = Utils.nowDateTime();
      prepared.createdBy = user.id;
      prepared.archived = false;
      Storage.insert('rolls', prepared);
      Audit.log('create', 'roll', prepared.id, { notes: `إضافة الرول ${prepared.rollNumber}` });
      Toast.success('تم الحفظ', `تم تسجيل الرول ${prepared.rollNumber} بنجاح`);
    }

    Modal.close();
    this._loadTable();
    Dashboard.render(document.getElementById('pageContainer'));
  },

  viewRoll(id) {
    const r = Storage.find('rolls', id);
    if (!r) return Toast.error('خطأ', 'الرول غير موجود');

    const qualityTests = Storage.list('qualityTests').filter(t => t.rollId === id);
    const cutRolls = Storage.list('cutRolls').filter(c => c.rollId === id);
    const coils = Storage.list('coils').filter(c => c.parentRollId === id);

    let html = `
      <div class="grid-2">
        <div>
          <h4 style="margin-bottom:8px;color:var(--c-navy)">بيانات الرول</h4>
          <table class="data-table">
            <tr><th>رقم الرول</th><td class="fw-600">${Utils.esc(r.rollNumber)}</td></tr>
            <tr><th>التاريخ</th><td>${Utils.formatDateAr(r.date)}</td></tr>
            <tr><th>الوقت</th><td>${Utils.esc(r.time)}</td></tr>
            <tr><th>الوردية</th><td>${Utils.esc(r.shift)}</td></tr>
            <tr><th>نوع الورق</th><td>${Utils.esc(r.paperType)}</td></tr>
            <tr><th>الجرام</th><td>${Utils.esc(r.gram)} GSM</td></tr>
            <tr><th>الوزن</th><td>${Utils.formatNum(r.weight)} كجم</td></tr>
            <tr><th>العرض</th><td>${Utils.formatNum(r.width)} مم</td></tr>
            <tr><th>الحالة</th><td><span class="badge ${(Utils.ROLL_STATUS[r.status]||{}).badge}">${(Utils.ROLL_STATUS[r.status]||{}).label}</span></td></tr>
            <tr><th>ملاحظات</th><td>${Utils.esc(r.notes) || '—'}</td></tr>
          </table>
        </div>
        <div>
          <h4 style="margin-bottom:8px;color:var(--c-navy)">التتبع</h4>
          <div class="timeline">
            <div class="timeline-item is-success">
              <div class="timeline-title">إنتاج الرول</div>
              <div class="timeline-meta">${Utils.formatDateAr(r.date)} ${r.time} - ${r.shift}</div>
            </div>
            ${qualityTests.length ? `
              <div class="timeline-item ${qualityTests[0].overallPass ? 'is-success' : 'is-danger'}">
                <div class="timeline-title">اختبارات الجودة</div>
                <div class="timeline-meta">${Utils.formatDateAr(qualityTests[0].createdAt)}</div>
                <div class="timeline-body">${qualityTests[0].overallPass ? 'مطابق' : 'غير مطابق'}</div>
              </div>` : `<div class="timeline-item is-muted"><div class="timeline-title">بانتظار الجودة</div></div>`}
            ${cutRolls.length ? `
              <div class="timeline-item is-success">
                <div class="timeline-title">تم القص</div>
                <div class="timeline-meta">${Utils.formatDateAr(cutRolls[0].createdAt)}</div>
                <div class="timeline-body">عدد البكر: ${cutRolls[0].cutCount}</div>
              </div>` : `<div class="timeline-item is-muted"><div class="timeline-title">بانتظار القص</div></div>`}
            ${coils.length ? `
              <div class="timeline-item is-success">
                <div class="timeline-title">دخول المخزن</div>
                <div class="timeline-meta">${Utils.formatDateAr(coils[0].createdAt)}</div>
                <div class="timeline-body">${coils.length} بكرة</div>
              </div>` : ''}
          </div>
        </div>
      </div>
    `;

    if (coils.length) {
      html += `
        <h4 class="mt-4 mb-2" style="color:var(--c-navy)">البكر الناتجة (${coils.length})</h4>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>الكود</th><th>المقاس</th><th>الجرام</th><th>النوع</th><th>الوزن</th><th>الوصلات</th><th>المشكلة</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              ${coils.map(c => {
                const st = Utils.COIL_STATUS[c.status] || {};
                return `<tr>
                  <td class="fw-600">${Utils.esc(c.code)}</td>
                  <td>${Utils.esc(c.size)}</td>
                  <td>${Utils.esc(c.gram)}</td>
                  <td>${Utils.esc(c.type)}</td>
                  <td>${Utils.formatNum(c.weight)} كجم</td>
                  <td>${Utils.esc(c.joints)}</td>
                  <td>${Utils.esc(c.problemName || '—')}</td>
                  <td><span class="badge ${st.badge}">${st.label}</span></td>
                  <td><button class="btn btn-outline btn-sm" onclick="Modal.close(); Inventory.viewCoil('${c.id}')">تفاصيل</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إغلاق</button>
      ${Auth.can('quality') && qualityTests.length === 0 ? `<button class="btn btn-primary" onclick="Modal.close(); Quality.openTestForm('${id}')">+ اختبار جودة</button>` : ''}
      ${Auth.can('production') && !cutRolls.length ? `<button class="btn btn-primary" onclick="Modal.close(); Cutting.openCutForm('${id}')">✂ قص الرول</button>` : ''}
    `;

    Modal.open(`تفاصيل الرول ${r.rollNumber}`, html, footer, 'lg');
  },

  sendToCutting(forceRollId = null) {
    const availableRolls = Storage.list('rolls').filter(r => r.status === 'new' && !r.archived);
    if (!availableRolls.length && !forceRollId) {
      Toast.info('لا يوجد', 'لا توجد رولات جديدة لإرسالها للمقص');
      return;
    }

    if (forceRollId) {
      const r = Storage.find('rolls', forceRollId);
      Modal.confirm(`هل تريد إرسال الرول ${r.rollNumber} إلى المقص؟`, () => {
        Storage.update('rolls', forceRollId, { status: 'in_cutting' });
        Audit.log('status_change', 'roll', forceRollId, {
          oldValue: 'new', newValue: 'in_cutting',
          notes: `إرسال الرول ${r.rollNumber} للمقص`
        });
        Toast.success('تم', `تم إرسال الرول ${r.rollNumber} للمقص`);
        this._loadTable();
      });
      return;
    }

    const body = `
      <p class="mb-3">اختر الرول المراد إرساله إلى المقص:</p>
      <select id="cutRollSelect" class="form-control">
        ${availableRolls.map(r => `<option value="${r.id}">${Utils.esc(r.rollNumber)} - ${Utils.formatDate(r.date)} (${Utils.esc(r.shift)})</option>`).join('')}
      </select>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-primary" id="confirmCutSend">إرسال</button>
    `;
    Modal.open('إرسال للمقص', body, footer, 'sm');
    document.getElementById('confirmCutSend').addEventListener('click', () => {
      const rid = document.getElementById('cutRollSelect').value;
      const r = Storage.find('rolls', rid);
      Storage.update('rolls', rid, { status: 'in_cutting' });
      Audit.log('status_change', 'roll', rid, {
        oldValue: 'new', newValue: 'in_cutting',
        notes: `إرسال الرول ${r.rollNumber} للمقص`
      });
      Toast.success('تم', `تم إرسال الرول ${r.rollNumber} للمقص`);
      Modal.close();
      this._loadTable();
    });
  },

  archive(id) {
    const r = Storage.find('rolls', id);
    if (!r) return;
    const relatedCoils = Storage.list('coils').filter(c => c.parentRollId === id && !c.archived);
    if (relatedCoils.length) {
      Toast.error('لا يمكن الأرشفة', `يوجد ${relatedCoils.length} بكرة مرتبطة بهذا الرول. يجب أرشفة البكر أولاً.`);
      return;
    }
    Modal.confirm(`هل تريد أرشفة الرول ${r.rollNumber}؟`, () => {
      Storage.update('rolls', id, { archived: true, status: 'archived' });
      Audit.log('archive', 'roll', id, { notes: `أرشفة الرول ${r.rollNumber}` });
      Toast.success('تم', `تم أرشفة الرول ${r.rollNumber}`);
      this._loadTable();
    });
  }
};
