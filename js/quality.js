/* ============================================
   quality.js - قسم الجودة + المواصفات + المراجعة
   ============================================ */

const Quality = {
  render(container) {
    container.innerHTML = `
      <div class="tabs">
        <button class="tab-btn active" data-tab="tests">اختبارات الجودة</button>
        <button class="tab-btn" data-tab="specs">مواصفات الجودة</button>
        <button class="tab-btn" data-tab="problems">المشاكل</button>
        <button class="tab-btn" data-tab="reviews">بكر تحتاج مراجعة</button>
      </div>

      <div class="tab-panel active" id="tab-tests"></div>
      <div class="tab-panel" id="tab-specs"></div>
      <div class="tab-panel" id="tab-problems"></div>
      <div class="tab-panel" id="tab-reviews"></div>
    `;

    /* ربط التبويبات */
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      });
    });

    this._renderTests();
    this._renderSpecs();
    this._renderProblems();
    this._renderReviews();
  },

  /* ============ اختبارات الجودة ============ */
  _renderTests() {
    const tests = Storage.list('qualityTests').slice().reverse();
    const container = document.getElementById('tab-tests');
    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header">
          <h3>✓ اختبارات الجودة</h3>
          ${Auth.can('quality') ? `<button class="btn btn-primary" onclick="Quality.openTestForm()">+ اختبار جديد</button>` : ''}
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>الرول</th><th>نوع البكرة</th><th>التاريخ</th><th>النتيجة</th><th>الفاحص</th><th></th></tr></thead>
              <tbody>
                ${tests.length === 0 ? `<tr><td colspan="6"><div class="empty-state"><p>لا توجد اختبارات. اضغط "+ اختبار جديد"</p></div></td></tr>` : ''}
                ${tests.map(t => {
                  const roll = Storage.find('rolls', t.rollId);
                  const user = Storage.find('users', t.inspector);
                  return `<tr>
                    <td class="fw-600">${Utils.esc(t.rollNumber)}</td>
                    <td>${Utils.esc(t.coilType)}</td>
                    <td>${Utils.formatDateAr(t.createdAt)}</td>
                    <td><span class="badge ${t.overallPass ? 'badge-green' : 'badge-red'}">${t.overallPass ? 'مطابق' : 'غير مطابق'}</span></td>
                    <td>${user ? Utils.esc(user.name) : '—'}</td>
                    <td><button class="btn btn-outline btn-sm" onclick="Quality.viewTest('${t.id}')">عرض</button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  openTestForm(rollId = null) {
    const rolls = Storage.list('rolls').filter(r => !r.archived);
    const rollOptions = rolls.map(r => {
      const hasTest = Storage.list('qualityTests').find(t => t.rollId === r.id);
      return `<option value="${r.id}" ${rollId === r.id ? 'selected' : ''}>${Utils.esc(r.rollNumber)} - ${Utils.esc(r.paperType)} ${Utils.esc(r.gram)} GSM</option>`;
    }).join('');

    const body = `
      <form id="qualityForm">
        <div class="form-grid mb-3">
          <div class="form-group">
            <label>الرول <span class="req">*</span></label>
            <select name="rollId" id="rollSelect" required class="form-control" onchange="Quality.onRollChange()">
              <option value="">اختر الرول...</option>
              ${rollOptions}
            </select>
          </div>
          <div class="form-group">
            <label>نوع البكرة <span class="req">*</span></label>
            <select name="coilType" required class="form-control" onchange="Quality.loadSpec()">
              <option value="">اختر النوع...</option>
              ${Utils.COIL_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="specHint" class="alert alert-info hidden"></div>
        <h4 class="mb-2 mt-3" style="color:var(--c-navy)">الاختبارات</h4>
        <div id="testsContainer"></div>
      </form>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-success" onclick="Quality.saveTest()">حفظ الاختبار</button>
    `;
    Modal.open('اختبار جودة جديد', body, footer, 'lg');

    this._renderTestRows();
    if (rollId) this.onRollChange();
  },

  onRollChange() {
    const rid = document.getElementById('rollSelect').value;
    if (!rid) return;
    const roll = Storage.find('rolls', rid);
    /* افتراض نوع البكرة حسب نوع الورق */
    const typeSelect = document.querySelector('select[name="coilType"]');
    if (typeSelect && !typeSelect.value) {
      typeSelect.value = roll.paperType === 'تست معالج' ? 'تست معالج' : 'فلوت';
    }
    this.loadSpec();
  },

  loadSpec() {
    const rid = document.getElementById('rollSelect').value;
    const type = document.querySelector('select[name="coilType"]').value;
    const hint = document.getElementById('specHint');
    if (!rid || !type) {
      hint.classList.add('hidden');
      this._renderTestRows();
      return;
    }
    const roll = Storage.find('rolls', rid);
    const specs = Storage.list('qualitySpecs').find(s =>
      s.paperType === type && s.gram == roll.gram
    );
    if (specs) {
      hint.classList.remove('hidden');
      hint.innerHTML = `<strong>الحدود التلقائية:</strong> تم تحميل المواصفات القياسية لنوع ${Utils.esc(type)} ${Utils.esc(roll.gram)} GSM. ستطبق تلقائياً عند الحفظ.`;
    } else {
      hint.classList.remove('hidden');
      hint.className = 'alert alert-warning';
      hint.innerHTML = `<strong>لا توجد مواصفات قياسية</strong> لهذا النوع/الجرام. أدخل القيم يدوياً.`;
    }
    this._renderTestRows(specs);
  },

  _renderTestRows(spec = null) {
    const tests = [
      { key: 'tensileMD', label: 'الشد الطولي', unit: 'kN/m' },
      { key: 'tensileCD', label: 'الشد العرضي', unit: 'kN/m' },
      { key: 'burst', label: 'الانفجار', unit: 'kPa' },
      { key: 'absorbency', label: 'التشرب', unit: 'g/m²' },
      { key: 'moisture', label: 'الرطوبة', unit: '%' },
      { key: 'sct', label: 'SCT', unit: 'kN/m' },
      { key: 'gram', label: 'الجرام', unit: 'g/m²' }
    ];
    const container = document.getElementById('testsContainer');
    container.innerHTML = `
      <table class="data-table">
        <thead><tr><th>الاختبار</th><th>القيمة</th><th>الوحدة</th><th>الأدنى</th><th>الأقصى</th><th>النتيجة</th></tr></thead>
        <tbody>
          ${tests.map(t => {
            const sp = spec && spec[t.key];
            const min = sp ? sp.min : '';
            const max = sp ? sp.max : '';
            const unit = sp ? sp.unit : t.unit;
            return `<tr>
              <td class="fw-600">${t.label}</td>
              <td><input type="number" step="0.01" name="${t.key}_value" class="form-control form-control-sm" oninput="Quality.checkRow('${t.key}')"></td>
              <td><input type="text" name="${t.key}_unit" value="${unit}" class="form-control form-control-sm" readonly></td>
              <td><input type="number" step="0.01" name="${t.key}_min" value="${min}" class="form-control form-control-sm" oninput="Quality.checkRow('${t.key}')"></td>
              <td><input type="number" step="0.01" name="${t.key}_max" value="${max}" class="form-control form-control-sm" oninput="Quality.checkRow('${t.key}')"></td>
              <td><span id="result_${t.key}" class="badge badge-gray">—</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  checkRow(key) {
    const val = parseFloat(document.querySelector(`input[name="${key}_value"]`).value);
    const min = parseFloat(document.querySelector(`input[name="${key}_min"]`).value);
    const max = parseFloat(document.querySelector(`input[name="${key}_max"]`).value);
    const resultEl = document.getElementById(`result_${key}`);
    if (isNaN(val)) {
      resultEl.className = 'badge badge-gray';
      resultEl.textContent = '—';
      return;
    }
    const inRange = (isNaN(min) || val >= min) && (isNaN(max) || val <= max);
    resultEl.className = `badge ${inRange ? 'badge-green' : 'badge-red'}`;
    resultEl.textContent = inRange ? 'مطابق' : 'غير مطابق';
  },

  saveTest() {
    const form = document.getElementById('qualityForm');
    const fd = new FormData(form);
    const rollId = fd.get('rollId');
    const coilType = fd.get('coilType');

    if (!rollId || !coilType) {
      Toast.error('بيانات ناقصة', 'اختر الرول ونوع البكرة');
      return;
    }

    const roll = Storage.find('rolls', rollId);
    const tests = {};
    const keys = ['tensileMD','tensileCD','burst','absorbency','moisture','sct','gram'];
    let allPass = true;
    keys.forEach(k => {
      const val = parseFloat(fd.get(`${k}_value`));
      const min = parseFloat(fd.get(`${k}_min`));
      const max = parseFloat(fd.get(`${k}_max`));
      const unit = fd.get(`${k}_unit`);
      if (!isNaN(val)) {
        const pass = (isNaN(min) || val >= min) && (isNaN(max) || val <= max);
        tests[k] = { value: val, min: isNaN(min) ? null : min, max: isNaN(max) ? null : max, unit, pass };
        if (!pass) allPass = false;
      }
    });

    if (Object.keys(tests).length === 0) {
      Toast.error('لا توجد قيم', 'أدخل قيمة واحدة على الأقل');
      return;
    }

    const user = Auth.currentUser();
    const test = {
      id: Utils.uid('qt'),
      rollId,
      rollNumber: roll.rollNumber,
      coilType,
      tests,
      overallPass: allPass,
      inspector: user.id,
      createdAt: Utils.nowDateTime()
    };
    Storage.insert('qualityTests', test);
    Storage.update('rolls', rollId, { status: 'in_quality' });
    Audit.log(allPass ? 'quality_pass' : 'quality_fail', 'qualityTest', test.id, {
      notes: `اختبار جودة للرول ${roll.rollNumber} - ${allPass ? 'مطابق' : 'غير مطابق'}`
    });

    Toast.success('تم الحفظ', `تم تسجيل اختبار الجودة - ${allPass ? 'مطابق' : 'غير مطابق'}`);
    Modal.close();
    this._renderTests();
    App.updateNotifBadge();
  },

  viewTest(id) {
    const t = Storage.find('qualityTests', id);
    if (!t) return;
    const user = Storage.find('users', t.inspector);
    const tests = [
      { key: 'tensileMD', label: 'الشد الطولي' },
      { key: 'tensileCD', label: 'الشد العرضي' },
      { key: 'burst', label: 'الانفجار' },
      { key: 'absorbency', label: 'التشرب' },
      { key: 'moisture', label: 'الرطوبة' },
      { key: 'sct', label: 'SCT' },
      { key: 'gram', label: 'الجرام' }
    ];
    const body = `
      <div class="mb-3">
        <span class="badge ${t.overallPass ? 'badge-green' : 'badge-red'}" style="font-size:14px;padding:6px 16px">
          ${t.overallPass ? '✓ مطابق' : '✕ غير مطابق'}
        </span>
      </div>
      <table class="data-table">
        <thead><tr><th>الاختبار</th><th>القيمة</th><th>الأدنى</th><th>الأقصى</th><th>النتيجة</th></tr></thead>
        <tbody>
          ${tests.map(item => {
            const tt = t.tests[item.key];
            if (!tt) return '';
            return `<tr>
              <td class="fw-600">${item.label}</td>
              <td>${tt.value} ${Utils.esc(tt.unit)}</td>
              <td>${tt.min ?? '—'}</td>
              <td>${tt.max ?? '—'}</td>
              <td><span class="badge ${tt.pass ? 'badge-green' : 'badge-red'}">${tt.pass ? 'مطابق' : 'غير مطابق'}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="text-muted mt-3" style="font-size:12px">
        الفاحص: ${user ? Utils.esc(user.name) : '—'} • التاريخ: ${Utils.formatDateAr(t.createdAt)}
      </div>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إغلاق</button>
    `;
    Modal.open(`اختبار الجودة - الرول ${t.rollNumber}`, body, footer, 'lg');
  },

  /* ============ مواصفات الجودة ============ */
  _renderSpecs() {
    const specs = Storage.list('qualitySpecs');
    const container = document.getElementById('tab-specs');
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>📋 مواصفات الجودة</h3>
          ${Auth.isAdmin() ? `<button class="btn btn-primary" onclick="Quality.openSpecForm()">+ مواصفات جديدة</button>` : ''}
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>نوع الورق</th><th>الجرام</th><th>الشد الطولي</th><th>الشد العرضي</th><th>الانفجار</th><th>التشرب</th><th>الرطوبة</th><th>SCT</th><th></th></tr></thead>
              <tbody>
                ${specs.length === 0 ? `<tr><td colspan="9"><div class="empty-state"><p>لا توجد مواصفات. اضغط "+ مواصفات جديدة"</p></div></td></tr>` : ''}
                ${specs.map(s => `
                  <tr>
                    <td class="fw-600">${Utils.esc(s.paperType)}</td>
                    <td>${Utils.esc(s.gram)} GSM</td>
                    <td>${s.tensileMD.min}-${s.tensileMD.max}</td>
                    <td>${s.tensileCD.min}-${s.tensileCD.max}</td>
                    <td>${s.burst.min}-${s.burst.max}</td>
                    <td>${s.absorbency.min}-${s.absorbency.max}</td>
                    <td>${s.moisture.min}-${s.moisture.max}</td>
                    <td>${s.sct.min}-${s.sct.max}</td>
                    <td>
                      ${Auth.isAdmin() ? `
                        <button class="btn btn-outline btn-sm" onclick="Quality.openSpecForm('${s.id}')">✎</button>
                        <button class="btn btn-ghost btn-sm" onclick="Quality.deleteSpec('${s.id}')">✕</button>
                      ` : '—'}
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

  openSpecForm(editId = null) {
    const edit = editId ? Storage.find('qualitySpecs', editId) : null;
    const settings = Storage.obj('settings');
    const types = settings.defaultPaperTypes || ['فلوت','تست معالج'];
    const grams = settings.defaultGrams || [125, 150, 175];

    const tests = [
      { key: 'tensileMD', label: 'الشد الطولي', unit: 'kN/m' },
      { key: 'tensileCD', label: 'الشد العرضي', unit: 'kN/m' },
      { key: 'burst', label: 'الانفجار', unit: 'kPa' },
      { key: 'absorbency', label: 'التشرب', unit: 'g/m²' },
      { key: 'moisture', label: 'الرطوبة', unit: '%' },
      { key: 'sct', label: 'SCT', unit: 'kN/m' },
      { key: 'gram', label: 'الجرام', unit: 'g/m²' }
    ];

    const body = `
      <form id="specForm">
        <div class="form-grid mb-3">
          <div class="form-group">
            <label>نوع الورق <span class="req">*</span></label>
            <select name="paperType" required class="form-control">
              ${types.map(t => `<option value="${Utils.esc(t)}" ${edit && edit.paperType === t ? 'selected' : ''}>${Utils.esc(t)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>الجرام <span class="req">*</span></label>
            <select name="gram" required class="form-control">
              ${grams.map(g => `<option value="${g}" ${edit && edit.gram == g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
          </div>
        </div>
        <h4 class="mb-2" style="color:var(--c-navy)">الحدود</h4>
        <table class="data-table">
          <thead><tr><th>الاختبار</th><th>الأدنى</th><th>الأقصى</th><th>الوحدة</th></tr></thead>
          <tbody>
            ${tests.map(t => {
              const sp = edit && edit[t.key];
              return `<tr>
                <td class="fw-600">${t.label}</td>
                <td><input type="number" step="0.01" name="${t.key}_min" value="${sp ? sp.min : ''}" class="form-control form-control-sm"></td>
                <td><input type="number" step="0.01" name="${t.key}_max" value="${sp ? sp.max : ''}" class="form-control form-control-sm"></td>
                <td><input type="text" name="${t.key}_unit" value="${sp ? Utils.esc(sp.unit) : t.unit}" class="form-control form-control-sm"></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </form>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-primary" onclick="Quality.saveSpec(${edit ? `'${edit.id}'` : 'null'})">حفظ</button>
    `;
    Modal.open(edit ? 'تعديل المواصفات' : 'مواصفات جديدة', body, footer, 'lg');
  },

  saveSpec(editId) {
    const form = document.getElementById('specForm');
    const fd = new FormData(form);
    const data = {
      paperType: fd.get('paperType'),
      gram: parseInt(fd.get('gram'))
    };
    const keys = ['tensileMD','tensileCD','burst','absorbency','moisture','sct','gram'];
    keys.forEach(k => {
      const min = parseFloat(fd.get(`${k}_min`));
      const max = parseFloat(fd.get(`${k}_max`));
      const unit = fd.get(`${k}_unit`);
      data[k] = {
        min: isNaN(min) ? null : min,
        max: isNaN(max) ? null : max,
        unit: unit || ''
      };
    });

    /* التحقق من التفرّد */
    const existing = Storage.list('qualitySpecs').find(s =>
      s.paperType === data.paperType && s.gram == data.gram && s.id !== editId
    );
    if (existing) {
      Toast.error('مكرر', 'توجد مواصفات لهذا النوع والجرام مسبقاً');
      return;
    }

    if (editId) {
      Storage.update('qualitySpecs', editId, data);
      Audit.log('update','qualitySpec', editId, { notes: 'تعديل مواصفات' });
      Toast.success('تم', 'تم تعديل المواصفات');
    } else {
      data.id = Utils.uid('qs');
      data.createdAt = Utils.nowDateTime();
      Storage.insert('qualitySpecs', data);
      Audit.log('create','qualitySpec', data.id, { notes: `مواصفات جديدة: ${data.paperType} ${data.gram}` });
      Toast.success('تم', 'تمت إضافة المواصفات');
    }
    Modal.close();
    this._renderSpecs();
  },

  deleteSpec(id) {
    Modal.confirm('حذف المواصفات؟', () => {
      Storage.delete('qualitySpecs', id);
      Audit.log('delete','qualitySpec', id, { notes: 'حذف مواصفات' });
      Toast.success('تم', 'تم الحذف');
      this._renderSpecs();
    });
  },

  /* ============ المشاكل ============ */
  _renderProblems() {
    const problems = Storage.list('problems');
    const container = document.getElementById('tab-problems');
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>⚠ قائمة المشاكل</h3>
          ${Auth.can('quality') ? `<button class="btn btn-primary" onclick="Quality.openProblemForm()">+ مشكلة جديدة</button>` : ''}
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>المشكلة</th><th>درجة الخطورة</th><th>مخصصة</th><th></th></tr></thead>
              <tbody>
                ${problems.map(p => {
                  const sev = Utils.SEVERITIES.find(s => s.value === p.severity) || Utils.SEVERITIES[1];
                  return `<tr>
                    <td class="fw-600">${Utils.esc(p.name)}</td>
                    <td><span class="badge ${sev.color}">${sev.label}</span></td>
                    <td>${p.isCustom ? 'نعم' : 'لا (افتراضية)'}</td>
                    <td>
                      ${Auth.can('quality') ? `
                        <button class="btn btn-outline btn-sm" onclick="Quality.openProblemForm('${p.id}')">✎</button>
                        ${p.isCustom ? `<button class="btn btn-ghost btn-sm" onclick="Quality.deleteProblem('${p.id}')">✕</button>` : ''}
                      ` : '—'}
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  openProblemForm(editId = null) {
    const edit = editId ? Storage.find('problems', editId) : null;
    const body = `
      <form id="problemForm">
        <div class="form-group">
          <label>اسم المشكلة <span class="req">*</span></label>
          <input type="text" name="name" required value="${edit ? Utils.esc(edit.name) : ''}" class="form-control" placeholder="مثال: عيب لف">
        </div>
        <div class="form-group">
          <label>درجة الخطورة <span class="req">*</span></label>
          <select name="severity" required class="form-control">
            ${Utils.SEVERITIES.map(s => `<option value="${s.value}" ${edit && edit.severity === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
      </form>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-primary" onclick="Quality.saveProblem(${edit ? `'${edit.id}'` : 'null'})">حفظ</button>
    `;
    Modal.open(edit ? 'تعديل مشكلة' : 'مشكلة جديدة', body, footer, 'sm');
  },

  saveProblem(editId) {
    const form = document.getElementById('problemForm');
    const fd = new FormData(form);
    const data = { name: fd.get('name'), severity: fd.get('severity'), isCustom: true };
    if (!data.name) return Toast.error('اسم مطلوب', 'أدخل اسم المشكلة');
    if (editId) {
      Storage.update('problems', editId, data);
      Audit.log('update','problem', editId, { notes: `تعديل مشكلة: ${data.name}` });
      Toast.success('تم', 'تم التعديل');
    } else {
      data.id = Utils.uid('p');
      Storage.insert('problems', data);
      Audit.log('create','problem', data.id, { notes: `إضافة مشكلة: ${data.name}` });
      Toast.success('تم', 'تمت الإضافة');
    }
    Modal.close();
    this._renderProblems();
  },

  deleteProblem(id) {
    Modal.confirm('حذف المشكلة؟', () => {
      /* فحص الاستخدام */
      const used = Storage.list('coils').find(c => c.problemId === id);
      if (used) {
        Toast.error('لا يمكن الحذف', 'هذه المشكلة مستخدمة في بكر موجودة');
        return;
      }
      Storage.delete('problems', id);
      Audit.log('delete','problem', id, { notes: 'حذف مشكلة' });
      Toast.success('تم', 'تم الحذف');
      this._renderProblems();
    });
  },

  /* ============ بكر تحتاج مراجعة ============ */
  _renderReviews() {
    const reviews = Storage.list('coils').filter(c => c.status === 'needs_review');
    const container = document.getElementById('tab-reviews');
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>↻ بكر تحتاج مراجعة الجودة (${reviews.length})</h3>
        </div>
        <div class="card-body" style="padding:0">
          ${reviews.length === 0 ? `<div class="empty-state"><div class="empty-icon">✓</div><p>لا توجد بكر تحتاج مراجعة</p></div>` : `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>الكود</th><th>المقاس</th><th>الجرام</th><th>الوصلات</th><th>المشكلة</th><th>الشركة</th><th>سبب الرفض</th><th>تاريخ الطلب</th><th></th></tr></thead>
                <tbody>
                  ${reviews.map(c => {
                    const company = c.reviewCompanyId ? Storage.find('companies', c.reviewCompanyId) : null;
                    return `<tr>
                      <td class="fw-600">${Utils.esc(c.code)}</td>
                      <td>${Utils.esc(c.size)}</td>
                      <td>${Utils.esc(c.gram)}</td>
                      <td>${Utils.esc(c.joints)}</td>
                      <td>${Utils.esc(c.problemName || '—')}</td>
                      <td>${company ? Utils.esc(company.name) : '—'}</td>
                      <td class="text-danger">${Utils.esc(c.reviewReason || '—')}</td>
                      <td>${c.reviewRequestedAt ? Utils.formatDateAr(c.reviewRequestedAt) : '—'}</td>
                      <td><button class="btn btn-primary btn-sm" onclick="Quality.reviewCoil('${c.id}')">مراجعة</button></td>
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

  reviewCoil(id) {
    const c = Storage.find('coils', id);
    if (!c) return;
    const company = c.reviewCompanyId ? Storage.find('companies', c.reviewCompanyId) : null;

    const body = `
      <div class="alert alert-info">
        <strong>البكرة:</strong> ${Utils.esc(c.code)} • ${Utils.esc(c.size)} • ${Utils.esc(c.gram)} GSM<br>
        <strong>المشكلة:</strong> ${Utils.esc(c.problemName || '—')} • الوصلات: ${c.joints}<br>
        <strong>الشركة المطلوبة:</strong> ${company ? Utils.esc(company.name) : '—'}<br>
        <strong>سبب الرفض:</strong> ${Utils.esc(c.reviewReason || '—')}<br>
        <strong>طلب المراجعة:</strong> ${c.reviewRequestedAt ? Utils.formatDateAr(c.reviewRequestedAt) : '—'} بواسطة ${Utils.esc(c.reviewRequestedBy || '—')}
      </div>
      <div class="form-group">
        <label>القرار <span class="req">*</span></label>
        <select id="reviewDecision" class="form-control">
          <option value="approve_exception">موافقة استثنائية (إبقاء متاحة للشركة المطلوبة)</option>
          <option value="reject">رفض نهائي</option>
          <option value="redirect">تحويل لشركة أخرى</option>
          <option value="keep_hold">إبقاء محجوزة للجودة</option>
        </select>
      </div>
      <div class="form-group">
        <label>سبب القرار <span class="req">*</span></label>
        <textarea id="reviewReason" rows="3" class="form-control" placeholder="سبب القرار..."></textarea>
      </div>
      <div class="form-group hidden" id="redirectCompanyGroup">
        <label>اختر الشركة البديلة</label>
        <select id="redirectCompany" class="form-control">
          ${Storage.list('companies').filter(co => co.active && co.id !== c.reviewCompanyId).map(co => `<option value="${co.id}">${Utils.esc(co.name)}</option>`).join('')}
        </select>
      </div>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-primary" onclick="Quality.saveReview('${id}')">حفظ القرار</button>
    `;
    Modal.open(`مراجعة البكرة ${c.code}`, body, footer, 'md');

    document.getElementById('reviewDecision').addEventListener('change', (e) => {
      document.getElementById('redirectCompanyGroup').classList.toggle('hidden', e.target.value !== 'redirect');
    });
  },

  saveReview(id) {
    const c = Storage.find('coils', id);
    if (!c) return;
    const decision = document.getElementById('reviewDecision').value;
    const reason = document.getElementById('reviewReason').value.trim();
    const redirectId = document.getElementById('redirectCompany').value;

    if (!reason) {
      Toast.error('سبب مطلوب', 'أدخل سبب القرار');
      return;
    }

    const user = Auth.currentUser();
    const review = {
      reviewDecision: decision,
      reviewReason: reason,
      reviewBy: user.name,
      reviewById: user.id,
      reviewDate: Utils.today(),
      reviewTime: Utils.now(),
      reviewAt: Utils.nowDateTime()
    };

    let newStatus;
    let notes;
    if (decision === 'approve_exception') {
      newStatus = 'available';
      review.allowedCompanyId = c.reviewCompanyId;
      notes = `موافقة استثنائية على ${c.code} للشركة ${Storage.find('companies', c.reviewCompanyId)?.name}`;
    } else if (decision === 'reject') {
      newStatus = 'rejected';
      notes = `رفض ${c.code}`;
    } else if (decision === 'redirect') {
      newStatus = 'available';
      review.allowedCompanyId = redirectId;
      notes = `تحويل ${c.code} للشركة ${Storage.find('companies', redirectId)?.name}`;
    } else {
      newStatus = 'quality_hold';
      notes = `إبقاء ${c.code} محجوزة للجودة`;
    }

    Storage.update('coils', id, {
      status: newStatus,
      ...review,
      reviewCompanyId: null,
      reviewReasonOriginal: c.reviewReason,
      reviewReason: reason
    });
    Audit.log('quality_review', 'coil', id, {
      oldValue: 'needs_review',
      newValue: newStatus,
      notes
    });

    Toast.success('تم', 'تم حفظ قرار المراجعة');
    Modal.close();
    this._renderReviews();
    Notifications.checkReviews();
    App.updateNotifBadge();
  }
};
