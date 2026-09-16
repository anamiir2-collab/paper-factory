/* ============================================
   reports.js - نظام التقارير المتكامل
   ============================================ */

const Reports = {
  render(container) {
    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header">
          <h3>▤ التقارير</h3>
          <div class="actions">
            <button class="btn btn-outline" onclick="Reports.print()">🖨 طباعة</button>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid mb-3">
            <div class="form-group">
              <label>نوع التقرير <span class="req">*</span></label>
              <select id="repType" class="form-control" onchange="Reports.load()">
                <option value="production">تقرير الإنتاج</option>
                <option value="quality">تقرير الجودة</option>
                <option value="cutting">تقرير المقص</option>
                <option value="inventory">تقرير المخزن</option>
                <option value="sales">تقرير المبيعات (الصرف)</option>
                <option value="shipments">تقرير التحميل</option>
                <option value="problems">تقرير مشاكل الجودة</option>
                <option value="rejected">تقرير البكر المرفوضة</option>
                <option value="reviews">تقرير البكر تحتاج مراجعة</option>
                <option value="companies">تقرير الشركات</option>
                <option value="audit">سجل العمليات</option>
                <option value="shift12">تقرير 12 ساعة (الوردية الحالية)</option>
                <option value="shift24">تقرير 24 ساعة</option>
              </select>
            </div>
            <div class="form-group">
              <label>الفترة</label>
              <select id="repPeriod" class="form-control" onchange="Reports.togglePeriodInputs()">
                <option value="12h">12 ساعة (الوردية الحالية)</option>
                <option value="24h">24 ساعة</option>
                <option value="today">يومي</option>
                <option value="week">أسبوعي</option>
                <option value="month">شهري</option>
                <option value="custom">فترة مخصصة</option>
                <option value="all">الكل</option>
              </select>
            </div>
            <div class="form-group" id="dateFromGroup">
              <label>من تاريخ</label>
              <input type="date" id="repDateFrom" class="form-control">
            </div>
            <div class="form-group" id="dateToGroup">
              <label>إلى تاريخ</label>
              <input type="date" id="repDateTo" class="form-control">
            </div>
          </div>
          <button class="btn btn-primary" onclick="Reports.load()">📊 توليد التقرير</button>
          <button class="btn btn-outline" onclick="Reports.exportCSV()">💾 تصدير CSV</button>
        </div>
      </div>

      <div id="reportOutput">
        <div class="empty-state"><div class="empty-icon">▤</div><h4>اختر نوع التقرير</h4><p>اختر نوع التقرير والفترة ثم اضغط "توليد التقرير"</p></div>
      </div>
    `;

    this.togglePeriodInputs();
  },

  togglePeriodInputs() {
    const period = document.getElementById('repPeriod').value;
    const showDates = period === 'custom';
    document.getElementById('dateFromGroup').style.display = showDates ? '' : 'none';
    document.getElementById('dateToGroup').style.display = showDates ? '' : 'none';
  },

  _getDateRange() {
    const period = document.getElementById('repPeriod').value;
    const now = new Date();
    let start, end;
    switch (period) {
      case '12h':
        const shift = Utils.getShift12();
        start = shift.start; end = shift.end;
        break;
      case '24h':
        end = now;
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        end = now;
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        end = now;
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        const from = document.getElementById('repDateFrom').value;
        const to = document.getElementById('repDateTo').value;
        start = from ? new Date(from + 'T00:00:00') : new Date(0);
        end = to ? new Date(to + 'T23:59:59') : now;
        break;
      case 'all':
      default:
        start = new Date(0);
        end = now;
    }
    return { start, end, period };
  },

  _inRange(dateStr, start, end) {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      return d >= start && d <= end;
    } catch { return false; }
  },

  load() {
    const type = document.getElementById('repType').value;
    const { start, end, period } = this._getDateRange();
    const periodLabel = document.getElementById('repPeriod').options[document.getElementById('repPeriod').selectedIndex].text;

    const range = {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      startLabel: Utils.formatDateAr(start.toISOString().slice(0,10)),
      endLabel: Utils.formatDateAr(end.toISOString().slice(0,10)),
      periodLabel
    };

    let html = '';
    switch (type) {
      case 'production': html = this._rProduction(range); break;
      case 'quality': html = this._rQuality(range); break;
      case 'cutting': html = this._rCutting(range); break;
      case 'inventory': html = this._rInventory(range); break;
      case 'sales': html = this._rSales(range); break;
      case 'shipments': html = this._rShipments(range); break;
      case 'problems': html = this._rProblems(range); break;
      case 'rejected': html = this._rRejected(range); break;
      case 'reviews': html = this._rReviews(range); break;
      case 'companies': html = this._rCompanies(range); break;
      case 'audit': html = this._rAudit(range); break;
      case 'shift12':
      case 'shift24': html = this._rShift(range, type); break;
    }
    document.getElementById('reportOutput').innerHTML = html;
  },

  _header(title, range) {
    return `<div class="card mb-4">
      <div class="card-header">
        <h3>${title}</h3>
        <span class="text-muted">${range.periodLabel}: ${range.startLabel} - ${range.endLabel}</span>
      </div>
      <div class="card-body">`;
  },

  _footer() {
    return `</div></div>`;
  },

  _rProduction(range) {
    const rolls = Storage.list('rolls').filter(r =>
      this._inRange(r.date + 'T' + (r.time || '00:00'), new Date(range.startISO), new Date(range.endISO)) && !r.archived
    );
    const totalWeight = rolls.reduce((s, r) => s + (r.weight || 0), 0);
    const byType = {};
    const byGram = {};
    const byShift = { 'صباحية': 0, 'مسائية': 0 };
    rolls.forEach(r => {
      byType[r.paperType] = (byType[r.paperType] || 0) + 1;
      byGram[r.gram] = (byGram[r.gram] || 0) + 1;
      byShift[r.shift] = (byShift[r.shift] || 0) + 1;
    });

    let html = this._header('📊 تقرير الإنتاج', range);
    html += `
      <div class="stats-grid mb-4">
        <div class="stat-card is-blue"><div class="stat-icon">▦</div><div class="stat-label">عدد الرولات</div><div class="stat-value">${rolls.length}</div></div>
        <div class="stat-card is-green"><div class="stat-icon">⚖</div><div class="stat-label">إجمالي الوزن</div><div class="stat-value">${Utils.formatNum(totalWeight,1)}</div><div class="stat-foot">كجم</div></div>
        <div class="stat-card is-gold"><div class="stat-icon">☀</div><div class="stat-label">وردية صباحية</div><div class="stat-value">${byShift['صباحية']}</div></div>
        <div class="stat-card is-orange"><div class="stat-icon">☾</div><div class="stat-label">وردية مسائية</div><div class="stat-value">${byShift['مسائية']}</div></div>
      </div>
      <h4 class="mb-2">حسب نوع الورق</h4>
      <div class="table-wrap mb-3">
        <table class="data-table"><thead><tr><th>النوع</th><th>العدد</th><th>النسبة</th></tr></thead><tbody>
        ${Object.entries(byType).map(([t, n]) => `<tr><td class="fw-600">${Utils.esc(t)}</td><td>${n}</td><td>${rolls.length ? Math.round(n/rolls.length*100) : 0}%</td></tr>`).join('') || '<tr><td colspan="3">لا توجد بيانات</td></tr>'}
        </tbody></table>
      </div>
      <h4 class="mb-2">حسب الجرام</h4>
      <div class="table-wrap mb-3">
        <table class="data-table"><thead><tr><th>الجرام</th><th>العدد</th></tr></thead><tbody>
        ${Object.entries(byGram).map(([g, n]) => `<tr><td class="fw-600">${g} GSM</td><td>${n}</td></tr>`).join('') || '<tr><td colspan="2">لا توجد بيانات</td></tr>'}
        </tbody></table>
      </div>
      <h4 class="mb-2">تفاصيل الرولات</h4>
      <div class="table-wrap">
        <table class="data-table"><thead><tr><th>رقم الرول</th><th>التاريخ</th><th>الوردية</th><th>النوع</th><th>الجرام</th><th>الوزن</th><th>العرض</th></tr></thead><tbody>
        ${rolls.length === 0 ? '<tr><td colspan="7">لا توجد رولات في هذه الفترة</td></tr>' :
          rolls.map(r => `<tr><td class="fw-600">${Utils.esc(r.rollNumber)}</td><td>${Utils.formatDate(r.date)}</td><td>${Utils.esc(r.shift)}</td><td>${Utils.esc(r.paperType)}</td><td>${Utils.esc(r.gram)}</td><td>${Utils.formatNum(r.weight)}</td><td>${Utils.formatNum(r.width)}</td></tr>`).join('')}
        </tbody></table>
      </div>
    `;
    html += this._footer();
    return html;
  },

  _rQuality(range) {
    const tests = Storage.list('qualityTests').filter(t =>
      this._inRange(t.createdAt, new Date(range.startISO), new Date(range.endISO))
    );
    const passed = tests.filter(t => t.overallPass).length;
    const failed = tests.filter(t => !t.overallPass).length;

    let html = this._header('✓ تقرير الجودة', range);
    html += `
      <div class="stats-grid mb-4">
        <div class="stat-card is-blue"><div class="stat-icon">⊦</div><div class="stat-label">إجمالي الاختبارات</div><div class="stat-value">${tests.length}</div></div>
        <div class="stat-card is-green"><div class="stat-icon">✓</div><div class="stat-label">مطابق</div><div class="stat-value">${passed}</div></div>
        <div class="stat-card is-red"><div class="stat-icon">✕</div><div class="stat-label">غير مطابق</div><div class="stat-value">${failed}</div></div>
        <div class="stat-card is-gold"><div class="stat-icon">%</div><div class="stat-label">نسبة المطابقة</div><div class="stat-value">${tests.length ? Math.round(passed/tests.length*100) : 0}%</div></div>
      </div>
      <div class="table-wrap">
        <table class="data-table"><thead><tr><th>الرول</th><th>النوع</th><th>التاريخ</th><th>الفاحص</th><th>النتيجة</th></tr></thead><tbody>
        ${tests.length === 0 ? '<tr><td colspan="5">لا توجد اختبارات في هذه الفترة</td></tr>' :
          tests.map(t => {
            const user = Storage.find('users', t.inspector);
            return `<tr><td class="fw-600">${Utils.esc(t.rollNumber)}</td><td>${Utils.esc(t.coilType)}</td><td>${Utils.formatDateAr(t.createdAt)}</td><td>${user ? Utils.esc(user.name) : '—'}</td><td><span class="badge ${t.overallPass ? 'badge-green' : 'badge-red'}">${t.overallPass ? 'مطابق' : 'غير مطابق'}</span></td></tr>`;
          }).join('')}
        </tbody></table>
      </div>
    `;
    html += this._footer();
    return html;
  },

  _rCutting(range) {
    const cuts = Storage.list('cutRolls').filter(c =>
      this._inRange(c.createdAt, new Date(range.startISO), new Date(range.endISO))
    );
    const coils = [];
    cuts.forEach(c => coils.push(...c.coils.map(id => Storage.find('coils', id)).filter(Boolean)));
    const totalJoints = coils.reduce((s, c) => s + (c.joints || 0), 0);

    let html = this._header('✂ تقرير المقص', range);
    html += `
      <div class="stats-grid mb-4">
        <div class="stat-card is-blue"><div class="stat-icon">✂</div><div class="stat-label">عمليات القص</div><div class="stat-value">${cuts.length}</div></div>
        <div class="stat-card is-green"><div class="stat-icon">▦</div><div class="stat-label">البكر الناتجة</div><div class="stat-value">${coils.length}</div></div>
        <div class="stat-card is-gold"><div class="stat-icon">≡</div><div class="stat-label">إجمالي الوصلات</div><div class="stat-value">${totalJoints}</div></div>
        <div class="stat-card is-orange"><div class="stat-icon">⊘</div><div class="stat-label">متوسط الوصلات/بكرة</div><div class="stat-value">${coils.length ? (totalJoints/coils.length).toFixed(1) : 0}</div></div>
      </div>
      <div class="table-wrap">
        <table class="data-table"><thead><tr><th>الرول</th><th>عدد البكر</th><th>التاريخ</th><th>المنفذ</th></tr></thead><tbody>
        ${cuts.length === 0 ? '<tr><td colspan="4">لا توجد عمليات قص</td></tr>' :
          cuts.map(c => {
            const user = Storage.find('users', c.createdBy);
            return `<tr><td class="fw-600">${Utils.esc(c.rollNumber)}</td><td>${c.cutCount}</td><td>${Utils.formatDateAr(c.createdAt)}</td><td>${user ? Utils.esc(user.name) : '—'}</td></tr>`;
          }).join('')}
        </tbody></table>
      </div>
    `;
    html += this._footer();
    return html;
  },

  _rInventory(range) {
    const coils = Storage.list('coils').filter(c => !c.archived);
    const totalWeight = coils.reduce((s, c) => s + (c.weight || 0), 0);
    const available = coils.filter(c => c.status === 'available');
    const reserved = coils.filter(c => c.status === 'reserved');
    const dispatched = coils.filter(c => c.status === 'dispatched');
    const loaded = coils.filter(c => c.status === 'loaded');
    const rejected = coils.filter(c => c.status === 'rejected');

    let html = this._header('▦ تقرير المخزن', range);
    html += `
      <div class="stats-grid mb-4">
        <div class="stat-card is-blue"><div class="stat-icon">▦</div><div class="stat-label">إجمالي البكر</div><div class="stat-value">${coils.length}</div></div>
        <div class="stat-card is-green"><div class="stat-icon">✓</div><div class="stat-label">متاحة</div><div class="stat-value">${available.length}</div></div>
        <div class="stat-card is-gold"><div class="stat-icon">$</div><div class="stat-label">محجوزة</div><div class="stat-value">${reserved.length}</div></div>
        <div class="stat-card is-orange"><div class="stat-icon">→</div><div class="stat-label">مصروفة</div><div class="stat-value">${dispatched.length}</div></div>
        <div class="stat-card is-gray"><div class="stat-icon">▦</div><div class="stat-label">محملة</div><div class="stat-value">${loaded.length}</div></div>
        <div class="stat-card is-red"><div class="stat-icon">✕</div><div class="stat-label">مرفوضة</div><div class="stat-value">${rejected.length}</div></div>
        <div class="stat-card is-blue"><div class="stat-icon">⚖</div><div class="stat-label">إجمالي الوزن</div><div class="stat-value">${Utils.formatNum(totalWeight,1)}</div><div class="stat-foot">كجم</div></div>
      </div>
      <div class="table-wrap">
        <table class="data-table"><thead><tr><th>الكود</th><th>المقاس</th><th>الجرام</th><th>النوع</th><th>الوزن</th><th>الوصلات</th><th>الحالة</th><th>المشكلة</th></tr></thead><tbody>
        ${coils.length === 0 ? '<tr><td colspan="8">لا توجد بكر</td></tr>' :
          coils.map(c => {
            const st = Utils.COIL_STATUS[c.status] || {};
            return `<tr><td class="fw-600">${Utils.esc(c.code)}</td><td>${Utils.esc(c.size)}</td><td>${Utils.esc(c.gram)}</td><td>${Utils.esc(c.type)}</td><td>${Utils.formatNum(c.weight)}</td><td>${c.joints}</td><td><span class="badge ${st.badge}">${st.label}</span></td><td>${c.problemId && c.problemId !== 'p_none' ? Utils.esc(c.problemName) : '—'}</td></tr>`;
          }).join('')}
        </tbody></table>
      </div>
    `;
    html += this._footer();
    return html;
  },

  _rSales(range) {
    const sales = Storage.list('sales').filter(s =>
      this._inRange(s.date + 'T' + (s.time || '00:00'), new Date(range.startISO), new Date(range.endISO))
    );
    const byCompany = {};
    sales.forEach(s => byCompany[s.companyName] = (byCompany[s.companyName] || 0) + 1);

    let html = this._header('$ تقرير المبيعات (الصرف)', range);
    html += `
      <div class="stats-grid mb-4">
        <div class="stat-card is-blue"><div class="stat-icon">$</div><div class="stat-label">عدد المصروفات</div><div class="stat-value">${sales.length}</div></div>
        <div class="stat-card is-green"><div class="stat-icon">▣</div><div class="stat-label">عدد الشركات</div><div class="stat-value">${Object.keys(byCompany).length}</div></div>
      </div>
      <h4 class="mb-2">حسب الشركة</h4>
      <div class="table-wrap mb-3">
        <table class="data-table"><thead><tr><th>الشركة</th><th>عدد البكر</th></tr></thead><tbody>
        ${Object.entries(byCompany).map(([c, n]) => `<tr><td class="fw-600">${Utils.esc(c)}</td><td>${n}</td></tr>`).join('') || '<tr><td colspan="2">لا توجد بيانات</td></tr>'}
        </tbody></table>
      </div>
      <h4 class="mb-2">تفاصيل المصروفات</h4>
      <div class="table-wrap">
        <table class="data-table"><thead><tr><th>البكرة</th><th>الشركة</th><th>الموظف</th><th>التاريخ</th><th>الوقت</th></tr></thead><tbody>
        ${sales.length === 0 ? '<tr><td colspan="5">لا توجد مصروفات</td></tr>' :
          sales.map(s => `<tr><td class="fw-600">${Utils.esc(s.coilCode)}</td><td>${Utils.esc(s.companyName)}</td><td>${Utils.esc(s.employee)}</td><td>${Utils.formatDate(s.date)}</td><td>${Utils.esc(s.time)}</td></tr>`).join('')}
        </tbody></table>
      </div>
    `;
    html += this._footer();
    return html;
  },

  _rShipments(range) {
    const shipments = Storage.list('shipments').filter(s =>
      this._inRange(s.date + 'T' + (s.time || '00:00'), new Date(range.startISO), new Date(range.endISO))
    );
    const totalWeight = shipments.reduce((s, sh) => s + (sh.totalWeight || 0), 0);
    const totalCoils = shipments.reduce((s, sh) => s + sh.coilCount, 0);

    let html = this._header('🚚 تقرير التحميل', range);
    html += `
      <div class="stats-grid mb-4">
        <div class="stat-card is-blue"><div class="stat-icon">🚚</div><div class="stat-label">عدد الشحنات</div><div class="stat-value">${shipments.length}</div></div>
        <div class="stat-card is-green"><div class="stat-icon">▦</div><div class="stat-label">إجمالي البكر</div><div class="stat-value">${totalCoils}</div></div>
        <div class="stat-card is-gold"><div class="stat-icon">⚖</div><div class="stat-label">إجمالي الوزن</div><div class="stat-value">${Utils.formatNum(totalWeight,1)}</div><div class="stat-foot">كجم</div></div>
      </div>
      <div class="table-wrap">
        <table class="data-table"><thead><tr><th>أمر التحميل</th><th>الشركة</th><th>التاريخ</th><th>السيارة</th><th>السائق</th><th>عدد البكر</th><th>الوزن</th></tr></thead><tbody>
        ${shipments.length === 0 ? '<tr><td colspan="7">لا توجد شحنات</td></tr>' :
          shipments.map(s => `<tr><td class="fw-600">${Utils.esc(s.orderNumber)}</td><td>${Utils.esc(s.companyName)}</td><td>${Utils.formatDate(s.date)} ${s.time}</td><td>${Utils.esc(s.vehicle)}</td><td>${Utils.esc(s.driver)}</td><td>${s.coilCount}</td><td>${Utils.formatNum(s.totalWeight,1)} كجم</td></tr>`).join('')}
        </tbody></table>
      </div>
    `;
    html += this._footer();
    return html;
  },

  _rProblems(range) {
    const coils = Storage.list('coils').filter(c =>
      this._inRange(c.createdAt, new Date(range.startISO), new Date(range.endISO)) && !c.archived &&
      c.problemId && c.problemId !== 'p_none'
    );
    const counts = {};
    coils.forEach(c => {
      const name = c.problemName || 'غير محدد';
      counts[name] = (counts[name] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    let html = this._header('⚠ تقرير مشاكل الجودة', range);
    html += `
      <div class="stats-grid mb-4">
        <div class="stat-card is-red"><div class="stat-icon">⚠</div><div class="stat-label">بكر بمشاكل</div><div class="stat-value">${coils.length}</div></div>
        <div class="stat-card is-orange"><div class="stat-icon">▦</div><div class="stat-label">أنواع المشاكل</div><div class="stat-value">${sorted.length}</div></div>
      </div>
      <h4 class="mb-2">تكرار المشاكل</h4>
      <div class="table-wrap mb-3">
        <table class="data-table"><thead><tr><th>المشكلة</th><th>العدد</th><th>النسبة</th></tr></thead><tbody>
        ${sorted.length === 0 ? '<tr><td colspan="3">لا توجد مشاكل مسجلة</td></tr>' :
          sorted.map(([n, c]) => `<tr><td class="fw-600">${Utils.esc(n)}</td><td>${c}</td><td>${coils.length ? Math.round(c/coils.length*100) : 0}%</td></tr>`).join('')}
        </tbody></table>
      </div>
      <h4 class="mb-2">البكر بمشاكل</h4>
      <div class="table-wrap">
        <table class="data-table"><thead><tr><th>الكود</th><th>المقاس</th><th>المشكلة</th><th>الخطورة</th><th>الوصلات</th></tr></thead><tbody>
        ${coils.length === 0 ? '<tr><td colspan="5">لا توجد بكر بمشاكل</td></tr>' :
          coils.map(c => {
            const sev = Utils.SEVERITIES.find(s => s.value === c.severity) || {};
            return `<tr><td class="fw-600">${Utils.esc(c.code)}</td><td>${Utils.esc(c.size)}</td><td>${Utils.esc(c.problemName)}</td><td><span class="badge ${sev.color}">${sev.label}</span></td><td>${c.joints}</td></tr>`;
          }).join('')}
        </tbody></table>
      </div>
    `;
    html += this._footer();
    return html;
  },

  _rRejected(range) {
    const rejected = Storage.list('coils').filter(c =>
      c.status === 'rejected' && this._inRange(c.createdAt, new Date(range.startISO), new Date(range.endISO))
    );
    let html = this._header('✕ تقرير البكر المرفوضة', range);
    html += `
      <div class="stats-grid mb-4">
        <div class="stat-card is-red"><div class="stat-icon">✕</div><div class="stat-label">إجمالي المرفوضة</div><div class="stat-value">${rejected.length}</div></div>
        <div class="stat-card is-blue"><div class="stat-icon">⚖</div><div class="stat-label">إجمالي الوزن المرفوض</div><div class="stat-value">${Utils.formatNum(rejected.reduce((s,c)=>s+(c.weight||0),0),1)}</div><div class="stat-foot">كجم</div></div>
      </div>
      <div class="table-wrap">
        <table class="data-table"><thead><tr><th>الكود</th><th>المقاس</th><th>المشكلة</th><th>سبب الرفض</th><th>تاريخ المراجعة</th></tr></thead><tbody>
        ${rejected.length === 0 ? '<tr><td colspan="5">لا توجد بكر مرفوضة</td></tr>' :
          rejected.map(c => `<tr><td class="fw-600">${Utils.esc(c.code)}</td><td>${Utils.esc(c.size)}</td><td>${Utils.esc(c.problemName || '—')}</td><td class="text-danger">${Utils.esc(c.reviewReason || c.stocktakeNote || '—')}</td><td>${c.reviewAt ? Utils.formatDateAr(c.reviewAt) : '—'}</td></tr>`).join('')}
        </tbody></table>
      </div>
    `;
    html += this._footer();
    return html;
  },

  _rReviews(range) {
    const reviews = Storage.list('coils').filter(c =>
      (c.status === 'needs_review' || c.reviewDecision) &&
      this._inRange(c.reviewRequestedAt || c.createdAt, new Date(range.startISO), new Date(range.endISO))
    );
    let html = this._header('↻ تقرير البكر تحتاج مراجعة', range);
    html += `
      <div class="stats-grid mb-4">
        <div class="stat-card is-gold"><div class="stat-icon">↻</div><div class="stat-label">إجمالي طلبات المراجعة</div><div class="stat-value">${reviews.length}</div></div>
        <div class="stat-card is-orange"><div class="stat-icon">∅</div><div class="stat-label">بانتظار القرار</div><div class="stat-value">${reviews.filter(r => r.status === 'needs_review').length}</div></div>
        <div class="stat-card is-green"><div class="stat-icon">✓</div><div class="stat-label">تم البت</div><div class="stat-value">${reviews.filter(r => r.reviewDecision).length}</div></div>
      </div>
      <div class="table-wrap">
        <table class="data-table"><thead><tr><th>الكود</th><th>الشركة</th><th>سبب الرفض</th><th>القرار</th><th>تاريخ الطلب</th></tr></thead><tbody>
        ${reviews.length === 0 ? '<tr><td colspan="5">لا توجد طلبات مراجعة</td></tr>' :
          reviews.map(c => {
            const co = c.reviewCompanyId ? Storage.find('companies', c.reviewCompanyId) : null;
            const decisionLabel = c.reviewDecision ? {
              approve_exception: 'موافقة استثنائية',
              reject: 'رفض نهائي',
              redirect: 'تحويل لشركة أخرى',
              keep_hold: 'إبقاء محجوزة'
            }[c.reviewDecision] : 'بانتظار القرار';
            return `<tr><td class="fw-600">${Utils.esc(c.code)}</td><td>${co ? Utils.esc(co.name) : '—'}</td><td class="text-danger" style="font-size:11px">${Utils.esc(c.reviewReason || '—')}</td><td>${decisionLabel}</td><td>${c.reviewRequestedAt ? Utils.formatDateAr(c.reviewRequestedAt) : '—'}</td></tr>`;
          }).join('')}
        </tbody></table>
      </div>
    `;
    html += this._footer();
    return html;
  },

  _rCompanies(range) {
    const companies = Storage.list('companies');
    let html = this._header('▣ تقرير الشركات', range);
    html += `
      <div class="table-wrap">
        <table class="data-table"><thead><tr><th>الشركة</th><th>الكود</th><th>أقصى وصلات</th><th>المقاسات</th><th>الجرامات</th><th>المشاكل الممنوعة</th><th>الحالة</th><th>المتاحة لها</th></tr></thead><tbody>
        ${companies.map(c => {
          const available = Storage.list('coils').filter(co => !co.archived && co.status === 'available' && Inventory.isAllowedForCompany(co, c).allowed).length;
          return `<tr><td class="fw-600">${Utils.esc(c.name)}</td><td>${Utils.esc(c.code)}</td><td>${c.maxJoints}</td><td>${(c.allowedSizes||[]).join('، ')}</td><td>${(c.allowedGrams||[]).join('، ')}</td><td>${(c.forbiddenProblems||[]).map(p => {
            const prob = Storage.find('problems', p);
            return prob ? Utils.esc(prob.name) : '';
          }).filter(Boolean).join('، ') || '—'}</td><td><span class="badge ${c.active ? 'badge-green' : 'badge-gray'}">${c.active ? 'نشطة' : 'متوقفة'}</span></td><td>${available} بكرة</td></tr>`;
        }).join('')}
        </tbody></table>
      </div>
    `;
    html += this._footer();
    return html;
  },

  _rAudit(range) {
    const logs = Audit.list().filter(l =>
      this._inRange(l.date + 'T' + (l.time || '00:00'), new Date(range.startISO), new Date(range.endISO))
    );
    let html = this._header('📝 سجل العمليات', range);
    html += `
      <div class="stats-grid mb-4">
        <div class="stat-card is-blue"><div class="stat-icon">📝</div><div class="stat-label">إجمالي العمليات</div><div class="stat-value">${logs.length}</div></div>
      </div>
      <div class="table-wrap">
        <table class="data-table"><thead><tr><th>العملية</th><th>الكيان</th><th>المستخدم</th><th>التاريخ</th><th>الوقت</th><th>التفاصيل</th></tr></thead><tbody>
        ${logs.length === 0 ? '<tr><td colspan="6">لا توجد عمليات في هذه الفترة</td></tr>' :
          logs.map(l => `<tr><td><span class="badge badge-blue">${Audit.actionLabel(l.action)}</span></td><td>${Audit.entityLabel(l.entity)}</td><td>${Utils.esc(l.user)}</td><td>${Utils.formatDate(l.date)}</td><td>${l.time}</td><td class="text-muted" style="font-size:11px">${Utils.esc(l.notes || '')}</td></tr>`).join('')}
        </tbody></table>
      </div>
    `;
    html += this._footer();
    return html;
  },

  _rShift(range, type) {
    const is12 = type === 'shift12';
    const shift = Utils.getShift12();
    let actualStart, actualEnd;
    if (is12) {
      actualStart = shift.start;
      actualEnd = shift.end;
    } else {
      /* 24h: من بداية الوردية السابقة */
      actualEnd = shift.end;
      actualStart = new Date(shift.start.getTime() - 12 * 60 * 60 * 1000);
    }
    const startISO = actualStart.toISOString();
    const endISO = actualEnd.toISOString();

    const rolls = Storage.list('rolls').filter(r => {
      const d = new Date(`${r.date}T${r.time || '00:00'}:00`);
      return d >= actualStart && d <= actualEnd && !r.archived;
    });
    const coils = Storage.list('coils').filter(c => {
      const d = new Date(c.createdAt);
      return d >= actualStart && d <= actualEnd && !c.archived;
    });
    const tests = Storage.list('qualityTests').filter(t => {
      const d = new Date(t.createdAt);
      return d >= actualStart && d <= actualEnd;
    });
    const sales = Storage.list('sales').filter(s => {
      const d = new Date(`${s.date}T${s.time || '00:00'}:00`);
      return d >= actualStart && d <= actualEnd;
    });
    const shipments = Storage.list('shipments').filter(s => {
      const d = new Date(`${s.date}T${s.time || '00:00'}:00`);
      return d >= actualStart && d <= actualEnd;
    });

    const totalWeight = rolls.reduce((s, r) => s + (r.weight || 0), 0);
    const coilWeight = coils.reduce((s, c) => s + (c.weight || 0), 0);
    const passed = tests.filter(t => t.overallPass).length;
    const failed = tests.length - passed;

    const range2 = {
      ...range,
      startISO, endISO,
      startLabel: Utils.formatDateAr(actualStart.toISOString().slice(0,10)) + ' ' + actualStart.toTimeString().slice(0,5),
      endLabel: Utils.formatDateAr(actualEnd.toISOString().slice(0,10)) + ' ' + actualEnd.toTimeString().slice(0,5),
      periodLabel: is12 ? `12 ساعة (وردية ${shift.label})` : '24 ساعة (ورديتان)'
    };

    let html = this._header(`⏱ تقرير ${is12 ? '12' : '24'} ساعة`, range2);
    html += `
      <div class="alert alert-info mb-3">
        <strong>الفترة:</strong> ${range2.startLabel} ← ${range2.endLabel}<br>
        <strong>الوردية:</strong> ${shift.label}
      </div>
      <div class="stats-grid mb-4">
        <div class="stat-card is-blue"><div class="stat-icon">⚙</div><div class="stat-label">الرولات</div><div class="stat-value">${rolls.length}</div></div>
        <div class="stat-card is-green"><div class="stat-icon">▦</div><div class="stat-label">البكر الناتجة</div><div class="stat-value">${coils.length}</div></div>
        <div class="stat-card is-gold"><div class="stat-icon">⚖</div><div class="stat-label">إجمالي الوزن</div><div class="stat-value">${Utils.formatNum(totalWeight+coilWeight,1)}</div><div class="stat-foot">كجم</div></div>
        <div class="stat-card is-green"><div class="stat-icon">✓</div><div class="stat-label">مطابق</div><div class="stat-value">${passed}</div></div>
        <div class="stat-card is-red"><div class="stat-icon">✕</div><div class="stat-label">غير مطابق</div><div class="stat-value">${failed}</div></div>
        <div class="stat-card is-gold"><div class="stat-icon">$</div><div class="stat-label">بكر محجوزة</div><div class="stat-value">${coils.filter(c => c.status === 'reserved').length}</div></div>
        <div class="stat-card is-orange"><div class="stat-icon">→</div><div class="stat-label">بكر مصروفة</div><div class="stat-value">${sales.length}</div></div>
        <div class="stat-card is-gray"><div class="stat-icon">🚚</div><div class="stat-label">شحنات</div><div class="stat-value">${shipments.length}</div></div>
      </div>
      <h4 class="mb-2">ملخص المقاسات والجرامات</h4>
      <div class="grid-2 mb-3">
        <div class="table-wrap">
          <table class="data-table"><thead><tr><th>المقاس</th><th>عدد البكر</th></tr></thead><tbody>
          ${Object.entries(coils.reduce((a,c)=>{a[c.size]=(a[c.size]||0)+1;return a;},{})).map(([s,n])=>`<tr><td>${s}</td><td>${n}</td></tr>`).join('') || '<tr><td colspan="2">لا يوجد</td></tr>'}
          </tbody></table>
        </div>
        <div class="table-wrap">
          <table class="data-table"><thead><tr><th>الجرام</th><th>عدد البكر</th></tr></thead><tbody>
          ${Object.entries(coils.reduce((a,c)=>{a[c.gram]=(a[c.gram]||0)+1;return a;},{})).map(([s,n])=>`<tr><td>${s}</td><td>${n}</td></tr>`).join('') || '<tr><td colspan="2">لا يوجد</td></tr>'}
          </tbody></table>
        </div>
      </div>
      <h4 class="mb-2">أنواع الورق</h4>
      <div class="table-wrap">
        <table class="data-table"><thead><tr><th>النوع</th><th>عدد البكر</th></tr></thead><tbody>
        ${Object.entries(coils.reduce((a,c)=>{a[c.type]=(a[c.type]||0)+1;return a;},{})).map(([s,n])=>`<tr><td>${Utils.esc(s)}</td><td>${n}</td></tr>`).join('') || '<tr><td colspan="2">لا يوجد</td></tr>'}
        </tbody></table>
      </div>
    `;
    html += this._footer();
    return html;
  },

  print() {
    if (!document.getElementById('reportOutput').innerHTML.includes('card')) {
      Toast.warning('لا يوجد تقرير', 'قم بتوليد التقرير أولاً');
      return;
    }
    window.print();
  },

  exportCSV() {
    const type = document.getElementById('repType').value;
    const { start, end } = this._getDateRange();
    let rows = [];
    let headers = [];

    switch (type) {
      case 'production':
        headers = ['رقم الرول','التاريخ','الوقت','الوردية','نوع الورق','الجرام','الوزن','العرض','الحالة'];
        rows = Storage.list('rolls').filter(r =>
          this._inRange(r.date + 'T' + (r.time || '00:00'), start, end) && !r.archived
        ).map(r => [r.rollNumber, r.date, r.time, r.shift, r.paperType, r.gram, r.weight, r.width, r.status]);
        break;
      case 'quality':
        headers = ['الرول','النوع','التاريخ','النتيجة'];
        rows = Storage.list('qualityTests').filter(t =>
          this._inRange(t.createdAt, start, end)
        ).map(t => [t.rollNumber, t.coilType, t.createdAt, t.overallPass ? 'مطابق' : 'غير مطابق']);
        break;
      case 'cutting':
        headers = ['الرول','عدد البكر','التاريخ'];
        rows = Storage.list('cutRolls').filter(c =>
          this._inRange(c.createdAt, start, end)
        ).map(c => [c.rollNumber, c.cutCount, c.createdAt]);
        break;
      case 'inventory':
        headers = ['الكود','الرول الأم','المقاس','الجرام','النوع','الوزن','الوصلات','الحالة','المشكلة'];
        rows = Storage.list('coils').filter(c => !c.archived).map(c =>
          [c.code, c.parentRollNumber, c.size, c.gram, c.type, c.weight, c.joints,
           Utils.COIL_STATUS[c.status]?.label || c.status, c.problemName]);
        break;
      case 'sales':
        headers = ['البكرة','الشركة','الموظف','التاريخ','الوقت','ملاحظات'];
        rows = Storage.list('sales').filter(s =>
          this._inRange(s.date + 'T' + (s.time || '00:00'), start, end)
        ).map(s => [s.coilCode, s.companyName, s.employee, s.date, s.time, s.notes]);
        break;
      case 'shipments':
        headers = ['أمر التحميل','الشركة','التاريخ','الوقت','السيارة','السائق','عدد البكر','الوزن'];
        rows = Storage.list('shipments').filter(s =>
          this._inRange(s.date + 'T' + (s.time || '00:00'), start, end)
        ).map(s => [s.orderNumber, s.companyName, s.date, s.time, s.vehicle, s.driver, s.coilCount, s.totalWeight]);
        break;
      case 'audit':
        headers = ['العملية','الكيان','المستخدم','التاريخ','الوقت','تفاصيل'];
        rows = Audit.list().filter(l =>
          this._inRange(l.date + 'T' + (l.time || '00:00'), start, end)
        ).map(l => [Audit.actionLabel(l.action), Audit.entityLabel(l.entity), l.user, l.date, l.time, l.notes]);
        break;
      default:
        headers = ['لا يوجد تصدير لهذا النوع'];
        rows = [];
    }

    const csv = Utils.arrayToCSV(rows, headers);
    const filename = `report_${type}_${Utils.today()}.csv`;
    Utils.download(filename, csv, 'text/csv');
    Toast.success('تم التصدير', `تم تصدير التقرير (${rows.length} سجل)`);
  }
};
