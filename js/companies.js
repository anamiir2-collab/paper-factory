/* ============================================
   companies.js - إدارة الشركات وقواعد التحميل
   ============================================ */

const Companies = {
  render(container) {
    const companies = Storage.list('companies');
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>▣ الشركات</h3>
          <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap">
            ${(Auth.isAdmin() || Auth.can('sales')) ? `<button class="btn btn-outline" onclick="Companies.openImport()">⇪ استيراد شركات</button>` : ''}
            ${(Auth.isAdmin() || Auth.can('sales')) ? `<button class="btn btn-primary" onclick="Companies.openForm()">+ شركة جديدة</button>` : ''}
          </div>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr>
                <th>الشركة</th>
                <th>الكود</th>
                <th>أقصى وصلات</th>
                <th>المقاسات المسموحة</th>
                <th>الجرامات</th>
                <th>الأنواع</th>
                <th>المشاكل الممنوعة</th>
                <th>الحالة</th>
                <th></th>
              </tr></thead>
              <tbody>
                ${companies.length === 0 ? `<tr><td colspan="9"><div class="empty-state"><p>لا توجد شركات</p></div></td></tr>` : ''}
                ${companies.map(c => `
                  <tr>
                    <td class="fw-600">${Utils.esc(c.name)}</td>
                    <td>${Utils.esc(c.code)}</td>
                    <td><span class="badge ${c.maxJoints <= 3 ? 'badge-red' : c.maxJoints <= 5 ? 'badge-gold' : 'badge-green'}">${c.maxJoints}</span></td>
                    <td>${(c.allowedSizes || []).join('، ') || 'الكل'}</td>
                    <td>${(c.allowedGrams || []).join('، ') || 'الكل'}</td>
                    <td>${(c.allowedTypes || []).join('، ') || 'الكل'}</td>
                    <td>${(c.forbiddenProblems || []).map(p => {
                      const prob = Storage.find('problems', p);
                      return prob ? `<span class="badge badge-red" style="margin:2px">${Utils.esc(prob.name)}</span>` : '';
                    }).join('') || '—'}</td>
                    <td><span class="badge ${c.active ? 'badge-green' : 'badge-gray'}">${c.active ? 'نشطة' : 'متوقفة'}</span></td>
                    <td>
                      <button class="btn btn-outline btn-sm" onclick="Companies.view('${c.id}')">عرض</button>
                      ${(Auth.isAdmin() || Auth.can('sales')) ? `<button class="btn btn-outline btn-sm" onclick="Companies.openForm('${c.id}')">✎</button>` : ''}
                      ${Auth.isAdmin() ? `<button class="btn btn-ghost btn-sm" onclick="Companies.toggle('${c.id}')">${c.active ? '⏸' : '▶'}</button>` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  openForm(editId = null) {
    const edit = editId ? Storage.find('companies', editId) : null;
    const problems = Storage.list('problems');
    const settings = Storage.obj('settings');
    const sizes = settings.defaultSizes || [190, 220, 240];
    const grams = settings.defaultGrams || [125, 150, 175];
    const types = settings.defaultPaperTypes || ['فلوت', 'تست معالج'];

    const body = `
      <form id="companyForm">
        <div class="form-grid mb-3">
          <div class="form-group">
            <label>اسم الشركة <span class="req">*</span></label>
            <input type="text" name="name" required value="${edit ? Utils.esc(edit.name) : ''}" class="form-control" placeholder="مثال: C-PACK">
          </div>
          <div class="form-group">
            <label>كود الشركة <span class="req">*</span></label>
            <input type="text" name="code" required value="${edit ? Utils.esc(edit.code) : ''}" class="form-control" placeholder="مثال: CPK" maxlength="6">
          </div>
          <div class="form-group">
            <label>أقصى عدد وصلات مسموح <span class="req">*</span></label>
            <input type="number" name="maxJoints" min="0" max="20" required value="${edit ? edit.maxJoints : 3}" class="form-control">
          </div>
          <div class="form-group">
            <label>الحالة</label>
            <select name="active" class="form-control">
              <option value="true" ${edit ? (edit.active ? 'selected' : '') : 'selected'}>نشطة</option>
              <option value="false" ${edit ? (!edit.active ? 'selected' : '') : ''}>متوقفة</option>
            </select>
          </div>
        </div>

        <div class="form-group mb-3">
          <label>المقاسات المسموحة</label>
          <div class="checkbox-group" id="sizeGroup">
            ${sizes.map(s => {
              const checked = edit && edit.allowedSizes && edit.allowedSizes.includes(s);
              return `<label class="checkbox-item ${checked ? 'checked' : ''}">
                <input type="checkbox" name="sizes" value="${s}" ${checked ? 'checked' : ''}> ${s}
              </label>`;
            }).join('')}
          </div>
          <div class="form-hint">إذا لم يختر شيء، يقبل كل المقاسات</div>
        </div>

        <div class="form-group mb-3">
          <label>الجرامات المسموحة</label>
          <div class="checkbox-group" id="gramGroup">
            ${grams.map(g => {
              const checked = edit && edit.allowedGrams && edit.allowedGrams.includes(g);
              return `<label class="checkbox-item ${checked ? 'checked' : ''}">
                <input type="checkbox" name="grams" value="${g}" ${checked ? 'checked' : ''}> ${g}
              </label>`;
            }).join('')}
          </div>
        </div>

        <div class="form-group mb-3">
          <label>أنواع الورق المسموحة</label>
          <div class="checkbox-group" id="typeGroup">
            ${types.map(t => {
              const checked = edit && edit.allowedTypes && edit.allowedTypes.includes(t);
              return `<label class="checkbox-item ${checked ? 'checked' : ''}">
                <input type="checkbox" name="types" value="${Utils.esc(t)}" ${checked ? 'checked' : ''}> ${Utils.esc(t)}
              </label>`;
            }).join('')}
          </div>
        </div>

        <div class="form-group mb-3">
          <label>المشاكل الممنوعة</label>
          <div class="checkbox-group" id="probGroup">
            ${problems.map(p => {
              const checked = edit && edit.forbiddenProblems && edit.forbiddenProblems.includes(p.id);
              return `<label class="checkbox-item ${checked ? 'checked' : ''}">
                <input type="checkbox" name="problems" value="${p.id}" ${checked ? 'checked' : ''}> ${Utils.esc(p.name)}
              </label>`;
            }).join('')}
          </div>
        </div>

        <div class="form-group">
          <label>ملاحظات</label>
          <textarea name="notes" rows="2" class="form-control">${edit ? Utils.esc(edit.notes) : ''}</textarea>
        </div>

        <div class="quality-specs-section" id="qualitySpecsSection">
          <h4 class="mb-2 mt-3" style="color:var(--c-navy);border-top:1px dashed var(--c-border);padding-top:16px">
            مواصفات الجودة
          </h4>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="hasSpecialSpecs" onchange="Companies.toggleSpecsSection()">
              <span>هذه الشركة لديها مواصفة جودة خاصة</span>
            </label>
            <div class="form-hint">
              عند التفعيل يمكنك إضافة عدة مواصفات خاصة بهذه الشركة (لكل تركيبة نوع ورق + جرام مواصفة مستقلة).
              إذا لم تفعل، ستستخدم الشركة المواصفات العامة تلقائياً.
            </div>
          </div>
          <div id="specsPanel" class="hidden">
            <div class="alert alert-info mb-3">
              <strong>المواصفات الخاصة بهذه الشركة</strong>
              <div id="companySpecsList" style="margin-top:8px"></div>
              <div style="margin-top:8px">
                <button type="button" class="btn btn-outline btn-sm" onclick="Companies.addSpecForCompany(${edit ? `'${edit.id}'` : 'null'})">
                  + إضافة مواصفة جديدة
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-primary" onclick="Companies.save(${edit ? `'${edit.id}'` : 'null'})">حفظ</button>
    `;
    Modal.open(edit ? 'تعديل شركة' : 'شركة جديدة', body, footer, 'lg');

    /* تحديث الستايل عند التبديل */
    document.querySelectorAll('.checkbox-item input').forEach(cb => {
      cb.addEventListener('change', () => {
        cb.closest('.checkbox-item').classList.toggle('checked', cb.checked);
      });
    });

    /* تهيئة قسم مواصفات الجودة */
    this._initSpecsSection(edit ? edit.id : null);
  },

  /* تهيئة قسم المواصفات — يفحص إن كان للشركة مواصفات خاصة */
  _initSpecsSection(companyId) {
    const hasSpecs = companyId
      ? Storage.list('qualitySpecs').some(s => s.companyId === companyId)
      : false;
    const cb = document.getElementById('hasSpecialSpecs');
    if (hasSpecs) {
      cb.checked = true;
      /* لا يمكن إلغاء التفعيل إن كانت هناك مواصفات — يجب حذفها أولاً */
      cb.addEventListener('click', (e) => {
        if (!cb.checked && Storage.list('qualitySpecs').some(s => s.companyId === companyId)) {
          e.preventDefault();
          Toast.warning('لا يمكن الإلغاء', 'لا يمكن إلغاء التفعيل طالما هناك مواصفات خاصة محفوظة. احذفها أولاً من القائمة بالأسفل.');
          cb.checked = true;
        }
      });
    }
    this.toggleSpecsSection();
  },

  toggleSpecsSection() {
    const cb = document.getElementById('hasSpecialSpecs');
    const panel = document.getElementById('specsPanel');
    if (cb.checked) {
      panel.classList.remove('hidden');
      this._renderCompanySpecsList();
    } else {
      panel.classList.add('hidden');
    }
  },

  /* عرض قائمة المواصفات الخاصة بالشركة الحالية (إن وُجدت) */
  _renderCompanySpecsList() {
    /* نحتاج معرفة الشركة الحالية — نأخذها من زر التعديل الذي فُتح */
    /* نقرأها من الخاصية data على زر الإضافة */
    const addBtn = document.querySelector('button[onclick^="Companies.addSpecForCompany"]');
    let companyId = null;
    if (addBtn) {
      const m = addBtn.getAttribute('onclick').match(/addSpecForCompany\('([^']+)'\)/);
      if (m) companyId = m[1];
      else if (addBtn.getAttribute('onclick').includes('addSpecForCompany(null)')) {
        companyId = null;
      }
    }
    const list = document.getElementById('companySpecsList');
    if (!list) return;

    if (!companyId) {
      list.innerHTML = '<div class="text-muted" style="font-size:12px">سيتم حفظ الشركة أولاً ثم يمكنك إضافة المواصفات.</div>';
      return;
    }

    const specs = Storage.list('qualitySpecs').filter(s => s.companyId === companyId);
    if (!specs.length) {
      list.innerHTML = '<div class="text-muted" style="font-size:12px">لا توجد مواصفات خاصة بعد. اضغط "+ إضافة مواصفة جديدة".</div>';
      return;
    }
    list.innerHTML = `
      <div class="table-wrap">
        <table class="data-table" style="font-size:12px">
          <thead><tr><th>نوع الورق</th><th>الجرام</th><th>الحدود</th><th></th></tr></thead>
          <tbody>
            ${specs.map(s => `
              <tr>
                <td class="fw-600">${Utils.esc(s.paperType)}</td>
                <td>${Utils.esc(s.gramValue ?? s.gram ?? '—')} GSM</td>
                <td style="font-size:11px">
                  شد: ${s.tensileMD.min}-${s.tensileMD.max} •
                  انفجار: ${s.burst.min}-${s.burst.max} •
                  رطوبة: ${s.moisture.min}-${s.moisture.max}
                </td>
                <td>
                  <button type="button" class="btn btn-outline btn-sm" onclick="Quality.openSpecForm('${s.id}', '${companyId}')">✎</button>
                  <button type="button" class="btn btn-ghost btn-sm" onclick="Companies.deleteSpec('${s.id}')">✕</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  /* فتح نموذج مواصفة جديدة مرتبطة بالشركة الحالية */
  addSpecForCompany(companyId) {
    if (!companyId) {
      Toast.warning('احفظ الشركة أولاً', 'يجب حفظ الشركة قبل إضافة مواصفات خاصة. اضغط "حفظ" ثم عاود فتح الشركة لتضاف المواصفات.');
      return;
    }
    /* إغلاق نموذج الشركة الحالي قبل فتح نموذج المواصفة.
       Quality.saveSpec سيعيد فتح نموذج الشركة تلقائياً بعد الحفظ لوجود presetCompanyId. */
    Modal.close();
    setTimeout(() => {
      Quality.openSpecForm(null, companyId);
    }, 100);
  },

  /* حذف مواصفة من داخل نموذج الشركة */
  deleteSpec(specId) {
    Modal.confirm('حذف المواصفة الخاصة؟', () => {
      Storage.delete('qualitySpecs', specId);
      Audit.log('delete','qualitySpec', specId, { notes: 'حذف مواصفة خاصة من نموذج الشركة' });
      Toast.success('تم', 'تم حذف المواصفة');
      this._renderCompanySpecsList();
    });
  },

  save(editId) {
    const form = document.getElementById('companyForm');
    const fd = new FormData(form);
    const data = {
      name: fd.get('name').trim(),
      code: fd.get('code').trim().toUpperCase(),
      maxJoints: parseInt(fd.get('maxJoints')),
      active: fd.get('active') === 'true',
      allowedSizes: fd.getAll('sizes').map(Number),
      allowedGrams: fd.getAll('grams').map(Number),
      allowedTypes: fd.getAll('types'),
      forbiddenProblems: fd.getAll('problems'),
      notes: fd.get('notes').trim()
    };

    if (!data.name || !data.code) {
      Toast.error('بيانات ناقصة', 'أدخل اسم الشركة والكود');
      return;
    }

    /* التحقق من تفرّد الكود */
    const existing = Storage.list('companies').find(c =>
      c.code === data.code && c.id !== editId
    );
    if (existing) {
      Toast.error('كود مكرر', `الشركة "${existing.name}" تستخدم الكود ${data.code} مسبقاً`);
      return;
    }

    if (editId) {
      Storage.update('companies', editId, data);
      Audit.log('update', 'company', editId, { notes: `تعديل الشركة ${data.name}` });
      Toast.success('تم', 'تم تعديل الشركة');
    } else {
      data.id = Utils.uid('c');
      data.createdAt = Utils.nowDateTime();
      Storage.insert('companies', data);
      Audit.log('create', 'company', data.id, { notes: `إضافة شركة ${data.name}` });
      Toast.success('تم', `تمت إضافة الشركة ${data.name}`);
    }

    Modal.close();
    App.navigate('companies');
  },

  view(id) {
    const c = Storage.find('companies', id);
    if (!c) return;

    /* عرض البكر المسموحة/الممنوعة لهذه الشركة */
    const coils = Storage.list('coils').filter(co => !co.archived && co.status === 'available');
    const allowedCoils = coils.filter(co => Inventory.isAllowedForCompany(co, c).allowed);
    const blockedCoils = coils.filter(co => !Inventory.isAllowedForCompany(co, c).allowed);

    const body = `
      <div class="grid-2 mb-3">
        <div>
          <table class="data-table">
            <tr><th>الاسم</th><td class="fw-600">${Utils.esc(c.name)}</td></tr>
            <tr><th>الكود</th><td>${Utils.esc(c.code)}</td></tr>
            <tr><th>أقصى وصلات</th><td><span class="badge ${c.maxJoints <= 3 ? 'badge-red' : 'badge-gold'}">${c.maxJoints}</span></td></tr>
            <tr><th>المقاسات المسموحة</th><td>${(c.allowedSizes || []).join('، ') || 'الكل'}</td></tr>
            <tr><th>الجرامات المسموحة</th><td>${(c.allowedGrams || []).join('، ') || 'الكل'}</td></tr>
            <tr><th>الأنواع المسموحة</th><td>${(c.allowedTypes || []).join('، ') || 'الكل'}</td></tr>
            <tr><th>المشاكل الممنوعة</th><td>${(c.forbiddenProblems || []).map(p => {
              const prob = Storage.find('problems', p);
              return prob ? Utils.esc(prob.name) : '';
            }).filter(Boolean).join('، ') || 'لا يوجد'}</td></tr>
            <tr><th>الحالة</th><td><span class="badge ${c.active ? 'badge-green' : 'badge-gray'}">${c.active ? 'نشطة' : 'متوقفة'}</span></td></tr>
            <tr><th>ملاحظات</th><td>${Utils.esc(c.notes) || '—'}</td></tr>
          </table>
        </div>
        <div>
          <h4 style="margin-bottom:8px;color:var(--c-navy)">ملخص القواعد</h4>
          <div class="alert alert-info">
            هذه الشركة تقبل بكرًا حتى <strong>${c.maxJoints} وصلات</strong> كحد أقصى.
            ${c.allowedSizes?.length ? `<br>المقاسات المقبولة: <strong>${c.allowedSizes.join('، ')}</strong>` : '<br>تقبل كل المقاسات'}
            ${c.allowedGrams?.length ? `<br>الجرامات المقبولة: <strong>${c.allowedGrams.join('، ')}</strong>` : ''}
            ${c.allowedTypes?.length ? `<br>الأنواع: <strong>${c.allowedTypes.join('، ')}</strong>` : ''}
          </div>
          <div class="alert alert-success">
            <strong>✓ متاحة للتحميل (${allowedCoils.length} بكرة)</strong>
          </div>
          <div class="alert alert-danger">
            <strong>✕ غير متاحة للتحميل (${blockedCoils.length} بكرة)</strong>
          </div>
        </div>
      </div>

      <h4 class="mb-2" style="color:var(--c-navy)">البكر المتاحة (${allowedCoils.length})</h4>
      <div class="table-wrap mb-3">
        <table class="data-table">
          <thead><tr><th>الكود</th><th>المقاس</th><th>الجرام</th><th>النوع</th><th>الوصلات</th><th>الوزن</th></tr></thead>
          <tbody>
            ${allowedCoils.slice(0, 20).map(co => `<tr>
              <td class="fw-600">${Utils.esc(co.code)}</td><td>${Utils.esc(co.size)}</td><td>${Utils.esc(co.gram)}</td>
              <td>${Utils.esc(co.type)}</td><td>${co.joints}</td><td>${Utils.formatNum(co.weight)} كجم</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <h4 class="mb-2" style="color:var(--c-navy)">البكر الممنوعة (${blockedCoils.length})</h4>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>الكود</th><th>المقاس</th><th>الوصلات</th><th>سبب المنع</th></tr></thead>
          <tbody>
            ${blockedCoils.slice(0, 20).map(co => {
              const check = Inventory.isAllowedForCompany(co, c);
              return `<tr>
                <td class="fw-600">${Utils.esc(co.code)}</td><td>${Utils.esc(co.size)}</td><td>${co.joints}</td>
                <td class="text-danger" style="font-size:11px">${Utils.esc(check.reason)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    const footer = `<button class="btn btn-ghost" onclick="Modal.close()">إغلاق</button>`;
    Modal.open(`الشركة ${c.name}`, body, footer, 'lg');
  },

  toggle(id) {
    const c = Storage.find('companies', id);
    if (!c) return;
    Modal.confirm(`${c.active ? 'إيقاف' : 'تنشيط'} الشركة ${c.name}؟`, () => {
      Storage.update('companies', id, { active: !c.active });
      Audit.log('update', 'company', id, {
        oldValue: c.active ? 'نشطة' : 'متوقفة',
        newValue: c.active ? 'متوقفة' : 'نشطة',
        notes: `${c.active ? 'إيقاف' : 'تنشيط'} الشركة ${c.name}`
      });
      Toast.success('تم', `تم ${c.active ? 'إيقاف' : 'تنشيط'} الشركة`);
      App.navigate('companies');
    });
  },

  /* ============ استيراد الشركات من ملف CSV / JSON ============ */

  /* أعمدة الـ CSV — بنفس الترتيب الذي يُصدّره القالب */
  CSV_HEADERS: ['الاسم', 'الكود', 'أقصى وصلات', 'المقاسات', 'الجرامات', 'الأنواع', 'المشاكل الممنوعة', 'الحالة', 'ملاحظات'],

  openImport() {
    const body = `
      <div class="alert alert-info">
        <strong>استيراد شركات من ملف Excel</strong>
        <p style="margin-top:6px;font-size:13px">
          الصيغ المدعومة: <code>XLSX</code> (Excel) و <code>CSV</code> و <code>JSON</code>.<br>
          ارفع الملف لمعاينة الشركات قبل الحفظ. ستظهر أي أخطاء تحقق سطراً بسطر.
        </p>
      </div>
      <div class="form-grid mb-3">
        <div class="form-group">
          <label>ملف الشركات</label>
          <input type="file" id="importFile" accept=".xlsx,.csv,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json" class="form-control" onchange="Companies.onFilePicked(event)">
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end">
          <button type="button" class="btn btn-outline" onclick="Companies.downloadTemplate()">⇩ تنزيل قالب Excel</button>
        </div>
      </div>
      <div id="importPreview"></div>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-primary" id="confirmImportBtn" onclick="Companies.confirmImport()" disabled>حفظ الشركات</button>
    `;
    Modal.open('استيراد شركات', body, footer, 'lg');
  },

  /* تنزيل قالب Excel (XLSX) — يستخدم SheetJS إن وُجد، وإلا CSV كاحتياط */
  downloadTemplate() {
    const headers = this.CSV_HEADERS;
    const sampleRows = [
      ['شركة A', 'A', 3, '190|220|240', '125|150', 'فلوت|تست معالج', 'قطع|تلسكوب', 'نشطة', 'عميل مميز'],
      ['شركة B', 'B', 5, '190', '125', 'فلوت', '', 'نشطة', ''],
      ['شركة C', 'C', 4, '', '', '', '', 'متوقفة', 'تقبل كل المقاسات']
    ];

    /* محاولة إنتاج XLSX عبر SheetJS إن وُجدت */
    if (typeof XLSX !== 'undefined' && XLSX.utils && XLSX.write) {
      try {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
        /* ضبط عرض الأعمدة لرؤية مريحة */
        ws['!cols'] = headers.map(() => ({ wch: 18 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'الشركات');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'companies-template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Toast.success('تم', 'تم تنزيل قالب Excel');
        return;
      } catch (e) {
        console.warn('XLSX template generation failed, falling back to CSV:', e);
      }
    }
    /* احتياط: CSV */
    const csv = Utils.arrayToCSV(sampleRows, headers);
    Utils.download('companies-template.csv', csv, 'text/csv');
    Toast.success('تم', 'تم تنزيل القالب (CSV)');
  },

  /* اختيار الملف → قراءة + تحويل + معاينة */
  onFilePicked(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('importPreview');
    const confirmBtn = document.getElementById('confirmImportBtn');
    if (!file) {
      preview.innerHTML = '';
      confirmBtn.disabled = true;
      return;
    }

    /* للـ XLSX: قراءة كـ ArrayBuffer ثم تحليل بـ SheetJS */
    const isXlsx = /\.xlsx$/i.test(file.name) ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (isXlsx) {
      this._readXlsx(file, preview, confirmBtn);
      return;
    }

    /* للـ CSV / JSON: قراءة كـ Text */
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      try {
        let companies = [];
        if (file.name.toLowerCase().endsWith('.json')) {
          companies = this._parseJson(content);
        } else {
          companies = this._parseCsv(content);
        }
        this._pendingImport = this._validateCompanies(companies);
        this._renderImportPreview();
      } catch (err) {
        preview.innerHTML = `<div class="alert alert-danger">فشل قراءة الملف: ${Utils.esc(err.message)}</div>`;
        confirmBtn.disabled = true;
        this._pendingImport = null;
      }
    };
    reader.onerror = () => {
      preview.innerHTML = `<div class="alert alert-danger">تعذّر قراءة الملف. حاول مرة أخرى.</div>`;
      confirmBtn.disabled = true;
    };
    reader.readAsText(file, 'utf-8');
  },

  /* قراءة XLSX عبر SheetJS: تحويل أول ورقة إلى مصفوفة كائنات */
  _readXlsx(file, preview, confirmBtn) {
    if (typeof XLSX === 'undefined' || !XLSX.read) {
      preview.innerHTML = `<div class="alert alert-danger">مكتبة قراءة Excel غير محمّلة. حمّل lib/xlsx.full.min.js.</div>`;
      confirmBtn.disabled = true;
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        /* تحويل الورقة لصفوف: header يفترض أن السطر الأول رؤوس أعمدة */
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
        const companies = rows.map(r => ({
          name: (r['الاسم'] || r['name'] || r['Name'] || '').toString().trim(),
          code: (r['الكود'] || r['code'] || r['Code'] || '').toString().trim().toUpperCase(),
          maxJoints: parseInt(r['أقصى وصلات'] || r['maxJoints'] || r['joints'] || 3),
          allowedSizes: this._splitMulti(r['المقاسات'] || r['allowedSizes'] || ''),
          allowedGrams: this._splitMulti(r['الجرامات'] || r['allowedGrams'] || '').map(Number).filter(n => !isNaN(n)),
          allowedTypes: this._splitMulti(r['الأنواع'] || r['allowedTypes'] || ''),
          forbiddenProblems: this._splitMulti(r['المشاكل الممنوعة'] || r['forbiddenProblems'] || ''),
          active: this._parseActive(r['الحالة'] !== undefined ? r['الحالة'] : (r['active'] !== undefined ? r['active'] : 'نشطة')),
          notes: (r['ملاحظات'] || r['notes'] || '').toString().trim()
        }));
        this._pendingImport = this._validateCompanies(companies);
        this._renderImportPreview();
      } catch (err) {
        preview.innerHTML = `<div class="alert alert-danger">فشل قراءة ملف Excel: ${Utils.esc(err.message)}</div>`;
        confirmBtn.disabled = true;
        this._pendingImport = null;
      }
    };
    reader.onerror = () => {
      preview.innerHTML = `<div class="alert alert-danger">تعذّر قراءة ملف Excel. حاول مرة أخرى.</div>`;
      confirmBtn.disabled = true;
    };
    reader.readAsArrayBuffer(file);
  },

  /* قراءة CSV: يدعم أول سطر كرأس إن وُجد (عربي أو إنجليزي) */
  _parseCsv(content) {
    const lines = content.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
    if (!lines.length) return [];

    /* كشف إن كان السطر الأول رؤوس أعمدة */
    const firstLine = lines[0];
    const firstCells = this._splitCsvLine(firstLine).map(c => c.trim());
    const isHeader = firstCells.some(c =>
      /^(الاسم|name|الكود|code|company|أقصى|joints|المقاسات|الجرامات|الأنواع|المشاكل|الحالة|ملاحظات)/i.test(c)
    );

    const startIdx = isHeader ? 1 : 0;
    const out = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cells = this._splitCsvLine(lines[i]);
      /* بناءً على ترتيب الـ CSV_HEADERS */
      out.push({
        name: (cells[0] || '').trim(),
        code: (cells[1] || '').trim().toUpperCase(),
        maxJoints: cells[2] ? parseInt(cells[2]) : 3,
        allowedSizes: this._splitMulti(cells[3]),
        allowedGrams: this._splitMulti(cells[4]).map(Number).filter(n => !isNaN(n)),
        allowedTypes: this._splitMulti(cells[5]),
        forbiddenProblems: this._splitMulti(cells[6]),
        active: this._parseActive(cells[7]),
        notes: (cells[8] || '').trim()
      });
    }
    return out;
  },

  /* قراءة JSON: يقبل مصفوفة شركات أو كائن { companies: [...] } */
  _parseJson(content) {
    const parsed = JSON.parse(content);
    const arr = Array.isArray(parsed) ? parsed : (parsed.companies || parsed.data || []);
    if (!Array.isArray(arr)) throw new Error('الملف لا يحتوي على مصفوفة شركات');
    /* تسوية المفاتيح العربية/الإنجليزية */
    return arr.map(c => ({
      name: (c.name || c['الاسم'] || '').trim(),
      code: (c.code || c['الكود'] || '').trim().toUpperCase(),
      maxJoints: c.maxJoints || c['أقصى وصلات'] || 3,
      allowedSizes: this._splitMulti((c.allowedSizes || c['المقاسات'] || []).join ? (c.allowedSizes || []).join('|') : (c.allowedSizes || '').toString()),
      allowedGrams: (c.allowedGrams || c['الجرامات'] || []).map(n => parseInt(n)).filter(n => !isNaN(n)),
      allowedTypes: c.allowedTypes || c['الأنواع'] || [],
      forbiddenProblems: c.forbiddenProblems || c['المشاكل الممنوعة'] || [],
      active: c.active !== undefined ? c.active : (c['الحالة'] ? this._parseActive(c['الحالة']) : true),
      notes: (c.notes || c['ملاحظات'] || '').trim()
    }));
  },

  /* فاصل خلايا CSV بسيط يحترم علامات الاقتباس المزدوجة */
  _splitCsvLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  },

  /* تقسيم قيمة مفصولة بـ | أو ، أو , */
  _splitMulti(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
    return String(val).split(/[|،,]/).map(s => s.trim()).filter(Boolean);
  },

  /* تفسير قيمة الحالة نصياً */
  _parseActive(val) {
    if (typeof val === 'boolean') return val;
    if (!val) return true;
    const s = String(val).trim().toLowerCase();
    if (['false', '0', 'متوقفة', 'موقوفة', 'مو قوف', 'inactive', 'disabled'].includes(s)) return false;
    return true;
  },

  /* تحقق من كل شركة: تطبيع القيم + كشف التكرار + كشف المشاكل غير الموجودة */
  _validateCompanies(items) {
    const existingCodes = new Set(Storage.list('companies').map(c => c.code));
    const seenCodes = new Set();
    const problems = Storage.list('problems');

    return items.map((item, idx) => {
      const row = idx + (item.__rowOffset || 0) + 1; /* رقم السطر للتقرير */
      const errors = [];

      if (!item.name) errors.push('الاسم مطلوب');
      if (!item.code) errors.push('الكود مطلوب');
      if (isNaN(item.maxJoints) || item.maxJoints < 0 || item.maxJoints > 99) {
        errors.push('أقصى وصلات غير صالح');
      }

      /* تكرار مع الكود بين الأسطر المستوردة */
      if (item.code && seenCodes.has(item.code)) {
        errors.push(`الكود ${item.code} مكرر داخل الملف`);
      }
      /* تكرار مع كود موجود بالفعل */
      if (item.code && existingCodes.has(item.code)) {
        errors.push(`الكود ${item.code} مستخدم مسبقاً في النظام`);
      }
      if (item.code) seenCodes.add(item.code);

      /* حل المشاكل الممنوعة من اسم إلى id */
      const resolvedProblems = (item.forbiddenProblems || []).map(pName => {
        const byId = problems.find(p => p.id === pName);
        if (byId) return pName;
        const byName = problems.find(p => p.name === pName);
        if (byName) return byName.id;
        errors.push(`المشكلة "${pName}" غير موجودة في النظام`);
        return null;
      }).filter(Boolean);

      return {
        ...item,
        forbiddenProblems: resolvedProblems,
        __row: row,
        __valid: errors.length === 0,
        __errors: errors
      };
    });
  },

  _renderImportPreview() {
    const preview = document.getElementById('importPreview');
    const confirmBtn = document.getElementById('confirmImportBtn');
    if (!this._pendingImport || !this._pendingImport.length) {
      preview.innerHTML = `<div class="alert alert-warning">لا توجد شركات في الملف. تأكد من صيغة الملف.</div>`;
      confirmBtn.disabled = true;
      return;
    }
    const valid = this._pendingImport.filter(c => c.__valid);
    const invalid = this._pendingImport.filter(c => !c.__valid);
    confirmBtn.disabled = valid.length === 0;

    let html = `
      <div class="grid-2 mb-3">
        <div class="alert alert-success"><strong>شركات صالحة:</strong> ${valid.length}</div>
        <div class="alert ${invalid.length ? 'alert-danger' : 'alert-info'}"><strong>شركات بها أخطاء:</strong> ${invalid.length}</div>
      </div>
    `;

    if (valid.length) {
      html += `<h4 class="mb-2" style="color:var(--c-green)">سيتم استيرادها</h4>`;
      html += `<div class="table-wrap mb-3"><table class="data-table"><thead><tr>
        <th>#</th><th>الاسم</th><th>الكود</th><th>أقصى وصلات</th><th>المقاسات</th><th>الجرامات</th><th>الأنواع</th><th>الحالة</th>
      </tr></thead><tbody>`;
      valid.forEach(c => {
        html += `<tr>
          <td>${c.__row}</td>
          <td class="fw-600">${Utils.esc(c.name)}</td>
          <td>${Utils.esc(c.code)}</td>
          <td>${c.maxJoints}</td>
          <td>${(c.allowedSizes || []).join('، ') || 'الكل'}</td>
          <td>${(c.allowedGrams || []).join('، ') || 'الكل'}</td>
          <td>${(c.allowedTypes || []).join('، ') || 'الكل'}</td>
          <td><span class="badge ${c.active ? 'badge-green' : 'badge-gray'}">${c.active ? 'نشطة' : 'متوقفة'}</span></td>
        </tr>`;
      });
      html += `</tbody></table></div>`;
    }

    if (invalid.length) {
      html += `<h4 class="mb-2" style="color:var(--c-red)">مرفوضة بسبب أخطاء</h4>`;
      html += `<div class="table-wrap"><table class="data-table"><thead><tr>
        <th>#</th><th>الاسم</th><th>الكود</th><th>الأخطاء</th>
      </tr></thead><tbody>`;
      invalid.forEach(c => {
        html += `<tr>
          <td>${c.__row}</td>
          <td>${Utils.esc(c.name || '—')}</td>
          <td>${Utils.esc(c.code || '—')}</td>
          <td class="text-danger" style="font-size:12px">${c.__errors.map(Utils.esc).join('؛ ')}</td>
        </tr>`;
      });
      html += `</tbody></table></div>`;
    }
    preview.innerHTML = html;
  },

  confirmImport() {
    if (!this._pendingImport) return;
    const valid = this._pendingImport.filter(c => c.__valid);
    if (!valid.length) {
      Toast.error('لا يوجد ما يُستورد', 'كل الصفوف بها أخطاء');
      return;
    }
    let added = 0;
    valid.forEach(c => {
      const item = {
        name: c.name,
        code: c.code,
        maxJoints: c.maxJoints,
        allowedSizes: c.allowedSizes,
        allowedGrams: c.allowedGrams,
        allowedTypes: c.allowedTypes,
        forbiddenProblems: c.forbiddenProblems,
        notes: c.notes,
        active: c.active,
        id: Utils.uid('c'),
        createdAt: Utils.nowDateTime()
      };
      Storage.insert('companies', item);
      Audit.log('create', 'company', item.id, { notes: `استيراد شركة ${item.name}` });
      added++;
    });

    const invalid = this._pendingImport.filter(c => !c.__valid).length;
    Modal.close();
    Toast.success('تم الاستيراد', `تمت إضافة ${added} شركة${invalid ? ` • ${invalid} مرفوضة` : ''}`);
    App.navigate('companies');
    this._pendingImport = null;
  }
};
