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
          ${Auth.isAdmin() || Auth.can('sales') ? `<button class="btn btn-primary" onclick="Companies.openForm()">+ شركة جديدة</button>` : ''}
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
  }
};
