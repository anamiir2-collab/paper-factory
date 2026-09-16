/* ============================================
   cutting.js - قسم المقص (قص الرول إلى بكر)
   ============================================ */

const Cutting = {
  render(container) {
    const readyRolls = Storage.list('rolls').filter(r =>
      ['in_cutting', 'in_quality', 'new'].includes(r.status) && !r.archived
    );
    const cutRecords = Storage.list('cutRolls').slice().reverse();

    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header">
          <h3>✂ الرولات الجاهزة للقص</h3>
          ${Auth.can('production') ? `<button class="btn btn-primary" onclick="Cutting.openCutForm()">+ بدء قص جديد</button>` : ''}
        </div>
        <div class="card-body" style="padding:0">
          ${readyRolls.length === 0 ? `<div class="empty-state"><div class="empty-icon">∅</div><p>لا توجد رولات جاهزة للقص</p></div>` : `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>رقم الرول</th><th>التاريخ</th><th>الوردية</th><th>النوع</th><th>الجرام</th><th>الوزن</th><th>الحالة</th><th></th></tr></thead>
                <tbody>
                  ${readyRolls.map(r => {
                    const st = Utils.ROLL_STATUS[r.status] || {};
                    return `<tr>
                      <td class="fw-600">${Utils.esc(r.rollNumber)}</td>
                      <td>${Utils.formatDate(r.date)}</td>
                      <td>${Utils.esc(r.shift)}</td>
                      <td>${Utils.esc(r.paperType)}</td>
                      <td>${Utils.esc(r.gram)} GSM</td>
                      <td>${Utils.formatNum(r.weight)} كجم</td>
                      <td><span class="badge ${st.badge}">${st.label}</span></td>
                      <td><button class="btn btn-primary btn-sm" onclick="Cutting.openCutForm('${r.id}')">✂ قص</button></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>📋 سجل عمليات القص (${cutRecords.length})</h3></div>
        <div class="card-body" style="padding:0">
          ${cutRecords.length === 0 ? `<div class="empty-state"><p>لا توجد عمليات قص بعد</p></div>` : `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>الرول</th><th>عدد البكر</th><th>التاريخ</th><th>المنفذ</th><th></th></tr></thead>
                <tbody>
                  ${cutRecords.map(c => {
                    const roll = Storage.find('rolls', c.rollId);
                    const user = Storage.find('users', c.createdBy);
                    return `<tr>
                      <td class="fw-600">${Utils.esc(roll ? roll.rollNumber : c.rollNumber)}</td>
                      <td>${c.cutCount}</td>
                      <td>${Utils.formatDateAr(c.createdAt)}</td>
                      <td>${user ? Utils.esc(user.name) : '—'}</td>
                      <td><button class="btn btn-outline btn-sm" onclick="Cutting.viewCut('${c.id}')">عرض البكر</button></td>
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

  openCutForm(rollId = null) {
    const rolls = Storage.list('rolls').filter(r =>
      ['new', 'in_quality', 'in_cutting'].includes(r.status) && !r.archived
    );
    if (!rolls.length) {
      Toast.info('لا يوجد', 'لا توجد رولات جديدة للقص');
      return;
    }

    const body = `
      <form id="cutForm">
        <div class="form-grid mb-3">
          <div class="form-group">
            <label>الرول <span class="req">*</span></label>
            <select name="rollId" id="cutRollId" required class="form-control" onchange="Cutting.onCutRollChange()">
              <option value="">اختر الرول...</option>
              ${rolls.map(r => `<option value="${r.id}" ${rollId === r.id ? 'selected' : ''}>${Utils.esc(r.rollNumber)} - ${Utils.esc(r.paperType)} ${Utils.esc(r.gram)} GSM</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>عدد البكر الناتجة <span class="req">*</span></label>
            <input type="number" name="cutCount" id="cutCount" min="1" max="20" required value="4" class="form-control" oninput="Cutting.generateCoilRows()">
          </div>
        </div>
        <div id="coilRowsContainer"></div>
      </form>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>
      <button class="btn btn-success" onclick="Cutting.saveCut()">حفظ القص</button>
    `;
    Modal.open('✂ قص رول إلى بكر', body, footer, 'lg');

    if (rollId) this.onCutRollChange();
    else this.generateCoilRows();
  },

  onCutRollChange() {
    const rid = document.getElementById('cutRollId').value;
    if (!rid) return;
    const roll = Storage.find('rolls', rid);
    /* تحديث القيم الافتراضية للبكر */
    this.generateCoilRows();
    /* تعبئة نوع وجرام البكر تلقائياً */
    setTimeout(() => {
      document.querySelectorAll('.coil-row').forEach(row => {
        const typeSel = row.querySelector('select[name$="_type"]');
        const gramSel = row.querySelector('select[name$="_gram"]');
        if (typeSel) typeSel.value = roll.paperType;
        if (gramSel) gramSel.value = roll.gram;
      });
    }, 50);
  },

  generateCoilRows() {
    const count = parseInt(document.getElementById('cutCount').value) || 0;
    const container = document.getElementById('coilRowsContainer');
    if (count <= 0) {
      container.innerHTML = '<div class="alert alert-warning">أدخل عدداً صحيحاً</div>';
      return;
    }

    const problems = Storage.list('problems');
    const settings = Storage.obj('settings');
    const sizes = settings.defaultSizes || [190, 220, 240];
    const grams = settings.defaultGrams || [125, 150, 175];
    const types = settings.defaultPaperTypes || ['فلوت', 'تست معالج'];

    let html = '<div class="alert alert-info">كل بكرة تحصل على كود تلقائي بالشكل: رقم_الرول/رقم_البكرة</div>';
    html += '<div style="max-height:400px;overflow-y:auto;border:1px solid var(--c-border);border-radius:8px">';
    for (let i = 1; i <= count; i++) {
      html += `
        <div class="coil-row" style="padding:10px;border-bottom:1px solid var(--c-gray-100)">
          <div class="fw-600 mb-2" style="color:var(--c-blue)">البكرة ${i}</div>
          <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(110px, 1fr))">
            <div class="form-group">
              <label>الكود <span class="req">*</span></label>
              <input type="text" name="coil_${i}_code" required class="form-control form-control-sm" value="">
              <div class="form-hint">مثال: /${i}</div>
            </div>
            <div class="form-group">
              <label>المقاس <span class="req">*</span></label>
              <select name="coil_${i}_size" class="form-control form-control-sm">
                ${sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>الجرام <span class="req">*</span></label>
              <select name="coil_${i}_gram" class="form-control form-control-sm">
                ${grams.map(g => `<option value="${g}">${g}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>النوع <span class="req">*</span></label>
              <select name="coil_${i}_type" class="form-control form-control-sm">
                ${types.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>الوزن (كجم)</label>
              <input type="number" step="0.1" name="coil_${i}_weight" class="form-control form-control-sm" value="0">
            </div>
            <div class="form-group">
              <label>عدد الوصلات <span class="req">*</span></label>
              <input type="number" min="0" name="coil_${i}_joints" required class="form-control form-control-sm" value="0">
            </div>
            <div class="form-group" style="grid-column: span 2">
              <label>المشكلة</label>
              <select name="coil_${i}_problem" class="form-control form-control-sm" onchange="Cutting.onProblemChange(${i})">
                ${problems.map(p => `<option value="${p.id}" data-severity="${p.severity}" data-name="${Utils.esc(p.name)}">${Utils.esc(p.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="grid-column: span 2">
              <label>ملاحظات</label>
              <input type="text" name="coil_${i}_notes" class="form-control form-control-sm" placeholder="ملاحظات البكرة...">
            </div>
          </div>
        </div>
      `;
    }
    html += '</div>';
    container.innerHTML = html;

    /* تعبئة أكواد تلقائية */
    const rid = document.getElementById('cutRollId').value;
    if (rid) {
      const roll = Storage.find('rolls', rid);
      for (let i = 1; i <= count; i++) {
        const codeInput = document.querySelector(`input[name="coil_${i}_code"]`);
        if (codeInput && !codeInput.value) {
          codeInput.value = `${roll.rollNumber}/${i}`;
        }
      }
      /* تعبئة النوع والجرام تلقائياً */
      document.querySelectorAll('.coil-row').forEach(row => {
        const typeSel = row.querySelector('select[name$="_type"]');
        const gramSel = row.querySelector('select[name$="_gram"]');
        if (typeSel) typeSel.value = roll.paperType;
        if (gramSel) gramSel.value = roll.gram;
      });
    }
  },

  onProblemChange(idx) {
    /* حفظ قيمة الخطورة مع المشكلة - يمكن إضافة منطق لاحق */
  },

  saveCut() {
    const form = document.getElementById('cutForm');
    const fd = new FormData(form);
    const rollId = fd.get('rollId');
    const cutCount = parseInt(fd.get('cutCount'));

    if (!rollId) return Toast.error('بيانات ناقصة', 'اختر الرول');
    if (!cutCount || cutCount < 1) return Toast.error('عدد غير صحيح', 'أدخل عدد البكر');

    const roll = Storage.find('rolls', rollId);
    if (!roll) return Toast.error('خطأ', 'الرول غير موجود');

    /* التحقق من تفرّد الأكواد */
    const codes = [];
    for (let i = 1; i <= cutCount; i++) {
      const code = fd.get(`coil_${i}_code`);
      if (!code) return Toast.error('كود ناقص', `أدخل كود البكرة ${i}`);
      if (codes.includes(code)) return Toast.error('كود مكرر', `البكرة ${i} تحمل كوداً مكرراً: ${code}`);
      /* تحقق من عدم وجود الكود مسبقاً */
      const exists = Storage.list('coils').find(c => c.code === code);
      if (exists) return Toast.error('كود موجود', `البكرة ${code} موجودة مسبقاً`);
      codes.push(code);
    }

    const user = Auth.currentUser();
    const newCoils = [];
    const coilIds = [];
    const problems = Storage.list('problems');

    for (let i = 1; i <= cutCount; i++) {
      const code = fd.get(`coil_${i}_code`);
      const size = parseInt(fd.get(`coil_${i}_size`));
      const gram = parseInt(fd.get(`coil_${i}_gram`));
      const type = fd.get(`coil_${i}_type`);
      const weight = parseFloat(fd.get(`coil_${i}_weight`)) || 0;
      const joints = parseInt(fd.get(`coil_${i}_joints`)) || 0;
      const problemId = fd.get(`coil_${i}_problem`);
      const notes = fd.get(`coil_${i}_notes`);

      const problem = problems.find(p => p.id === problemId);
      const coil = {
        id: Utils.uid('co'),
        parentRollId: rollId,
        parentRollNumber: roll.rollNumber,
        code,
        size,
        gram,
        type,
        weight,
        joints,
        problemId,
        problemName: problem ? problem.name : '',
        severity: problem ? problem.severity : 'low',
        notes,
        status: 'available',
        archived: false,
        companyId: null,
        createdAt: Utils.nowDateTime(),
        createdBy: user.id
      };
      Storage.insert('coils', coil);
      newCoils.push(coil);
      coilIds.push(coil.id);

      Audit.log('create', 'coil', coil.id, {
        notes: `إنشاء البكرة ${coil.code} من الرول ${roll.rollNumber} (${joints} وصلات)`
      });
    }

    /* سجل القص */
    const cutRecord = {
      id: Utils.uid('cr'),
      rollId,
      rollNumber: roll.rollNumber,
      cutCount,
      coils: coilIds,
      createdAt: Utils.nowDateTime(),
      createdBy: user.id
    };
    Storage.insert('cutRolls', cutRecord);

    /* تحديث حالة الرول */
    Storage.update('rolls', rollId, { status: 'cut' });
    Audit.log('status_change', 'roll', rollId, {
      oldValue: roll.status,
      newValue: 'cut',
      notes: `تم قص الرول ${roll.rollNumber} إلى ${cutCount} بكرة`
    });

    /* تنبيهات */
    Notifications.checkLowStock();

    Toast.success('تم القص', `تم إنشاء ${cutCount} بكرة من الرول ${roll.rollNumber}`);
    Modal.close();
    App.navigate('cutting');
    App.updateNotifBadge();
  },

  viewCut(id) {
    const c = Storage.find('cutRolls', id);
    if (!c) return;
    const coils = c.coils.map(cid => Storage.find('coils', cid)).filter(Boolean);
    const body = `
      <div class="mb-3">
        <strong>الرول:</strong> ${Utils.esc(c.rollNumber)} •
        <strong>عدد البكر:</strong> ${c.cutCount} •
        <strong>التاريخ:</strong> ${Utils.formatDateAr(c.createdAt)}
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>الكود</th><th>المقاس</th><th>الجرام</th><th>النوع</th><th>الوزن</th><th>الوصلات</th><th>المشكلة</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            ${coils.map(coil => {
              const st = Utils.COIL_STATUS[coil.status] || {};
              return `<tr>
                <td class="fw-600">${Utils.esc(coil.code)}</td>
                <td>${Utils.esc(coil.size)}</td>
                <td>${Utils.esc(coil.gram)}</td>
                <td>${Utils.esc(coil.type)}</td>
                <td>${Utils.formatNum(coil.weight)} كجم</td>
                <td>${coil.joints}</td>
                <td>${Utils.esc(coil.problemName || '—')}</td>
                <td><span class="badge ${st.badge}">${st.label}</span></td>
                <td><button class="btn btn-outline btn-sm" onclick="Modal.close(); Inventory.viewCoil('${coil.id}')">تفاصيل</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    const footer = `<button class="btn btn-ghost" onclick="Modal.close()">إغلاق</button>`;
    Modal.open(`سجل قص الرول ${c.rollNumber}`, body, footer, 'lg');
  }
};
