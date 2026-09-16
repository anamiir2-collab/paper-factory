/* ============================================
   dashboard.js - الصفحة الرئيسية Dashboard
   ============================================ */

const Dashboard = {
  render(container) {
    container.innerHTML = `
      <div class="stats-grid" id="statsGrid"></div>

      <div class="grid-2 mb-4">
        <div class="chart-container">
          <div class="chart-title">📊 الإنتاج آخر 7 أيام</div>
          <div class="bar-chart" id="prodChart"></div>
        </div>
        <div class="chart-container">
          <div class="chart-title">✓ البكر المقبولة vs المرفوضة</div>
          <div class="bar-chart" id="qualityChart"></div>
        </div>
      </div>

      <div class="grid-2 mb-4">
        <div class="chart-container">
          <div class="chart-title">⚠ أكثر مشاكل الجودة تكراراً</div>
          <div class="hbar-chart" id="problemsChart"></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>آخر العمليات</h3></div>
          <div class="card-body" id="recentActivity" style="padding:0"></div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header">
          <h3>⚠ التنبيهات المهمة</h3>
          <button class="btn btn-outline btn-sm" onclick="App.navigate('notifications')">عرض الكل</button>
        </div>
        <div class="card-body" id="dashboardAlerts"></div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>⏱ إنتاج الوردية الحالية</h3>
          <span id="shiftInfo" class="badge badge-blue"></span>
        </div>
        <div class="card-body" id="shiftStats"></div>
      </div>
    `;

    this._renderStats();
    this._renderCharts();
    this._renderRecentActivity();
    this._renderAlerts();
    this._renderShiftStats();
  },

  _renderStats() {
    const today = Utils.today();
    const rolls = Storage.list('rolls');
    const coils = Storage.list('coils').filter(c => !c.archived);

    const todayRolls = rolls.filter(r => r.date === today);
    const availableCoils = coils.filter(c => c.status === 'available');
    const reservedCoils = coils.filter(c => c.status === 'reserved');
    const dispatchedToday = Storage.list('sales').filter(s => s.date === today);
    const rejectedCoils = coils.filter(c => c.status === 'rejected');
    const needsReview = coils.filter(c => c.status === 'needs_review');

    const stats = [
      { label: 'إنتاج اليوم', value: todayRolls.length, foot: 'رول', icon: '⚙', color: 'is-blue' },
      { label: 'عدد الرولات الكلي', value: rolls.filter(r => !r.archived).length, foot: 'رول', icon: '▦', color: 'is-blue' },
      { label: 'البكر الجاهزة', value: availableCoils.length, foot: 'بكرة متاحة', icon: '✓', color: 'is-green' },
      { label: 'البكر بالمخزن', value: coils.filter(c => ['available','reserved','needs_review','quality_hold'].includes(c.status)).length, foot: 'بكرة', icon: '▦', color: 'is-blue' },
      { label: 'البكر المحجوزة', value: reservedCoils.length, foot: 'بانتظار الصرف', icon: '$', color: 'is-gold' },
      { label: 'تم صرفها اليوم', value: dispatchedToday.length, foot: 'بكرة', icon: '→', color: 'is-orange' },
      { label: 'البكر المرفوضة', value: rejectedCoils.length, foot: 'مرفوضة جودياً', icon: '✕', color: 'is-red' },
      { label: 'تحتاج مراجعة', value: needsReview.length, foot: 'تحتاج قرار جودة', icon: '!', color: 'is-gold' }
    ];

    document.getElementById('statsGrid').innerHTML = stats.map(s => `
      <div class="stat-card ${s.color}">
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${Utils.formatNum(s.value)}</div>
        <div class="stat-foot">${s.foot}</div>
      </div>
    `).join('');
  },

  _renderCharts() {
    /* رسم الإنتاج آخر 7 أيام */
    const prodChart = document.getElementById('prodChart');
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const count = Storage.list('rolls').filter(r => r.date === dateStr && !r.archived).length;
      days.push({ label: d.toLocaleDateString('ar-EG', { weekday: 'short' }), value: count });
    }
    const maxProd = Math.max(...days.map(d => d.value), 1);
    prodChart.innerHTML = days.map(d => {
      const height = (d.value / maxProd) * 100;
      return `<div class="bar-col">
        <div class="bar" style="height:${height}%">
          <span class="bar-value">${d.value}</span>
        </div>
        <div class="bar-label">${d.label}</div>
      </div>`;
    }).join('');

    /* رسم مقبولة vs مرفوضة */
    const qc = document.getElementById('qualityChart');
    const tests = Storage.list('qualityTests');
    const passed = tests.filter(t => t.overallPass).length;
    const failed = tests.filter(t => t.overallPass === false).length;
    const maxQ = Math.max(passed, failed, 1);
    qc.innerHTML = `
      <div class="bar-col">
        <div class="bar is-green" style="height:${(passed/maxQ)*100}%">
          <span class="bar-value">${passed}</span>
        </div>
        <div class="bar-label">مقبولة</div>
      </div>
      <div class="bar-col">
        <div class="bar is-red" style="height:${(failed/maxQ)*100}%">
          <span class="bar-value">${failed}</span>
        </div>
        <div class="bar-label">مرفوضة</div>
      </div>
    `;

    /* رسم أكثر المشاكل تكراراً */
    const problemsChart = document.getElementById('problemsChart');
    const coils = Storage.list('coils').filter(c => c.problemId && c.problemId !== 'p_none');
    const counts = {};
    coils.forEach(c => {
      const name = c.problemName || 'غير محدد';
      counts[name] = (counts[name] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxCount = sorted.length ? sorted[0][1] : 1;
    if (!sorted.length) {
      problemsChart.innerHTML = '<div class="empty-state" style="padding:20px"><p>لا توجد مشاكل مسجلة</p></div>';
    } else {
      problemsChart.innerHTML = sorted.map(([name, count]) => `
        <div class="hbar-row">
          <div class="hbar-label">${Utils.esc(name)}</div>
          <div class="hbar-track"><div class="hbar-fill" style="width:${(count/maxCount)*100}%"></div></div>
          <div class="hbar-value">${count}</div>
        </div>
      `).join('');
    }
  },

  _renderRecentActivity() {
    const logs = Audit.list().slice(0, 8);
    const container = document.getElementById('recentActivity');
    if (!logs.length) {
      container.innerHTML = '<div class="empty-state"><p>لا توجد عمليات حديثة</p></div>';
      return;
    }
    container.innerHTML = '<ul style="padding:8px 0">' + logs.map(l => `
      <li style="padding:8px 20px;border-bottom:1px solid var(--c-gray-100);font-size:12px">
        <div class="fw-600">${Utils.esc(Audit.formatEntry(l))}</div>
        <div class="text-muted" style="font-size:11px">${Utils.esc(l.user)} • ${Utils.formatDate(l.date)} ${l.time}</div>
      </li>
    `).join('') + '</ul>';
  },

  _renderAlerts() {
    const notifs = Notifications.list({ unreadOnly: true }).slice(0, 5);
    const container = document.getElementById('dashboardAlerts');
    if (!notifs.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">✓</div><p>لا توجد تنبيهات</p></div>';
      return;
    }
    container.innerHTML = notifs.map(n => {
      const alertClass = n.type === 'warning' ? 'alert-warning' :
        n.type === 'danger' ? 'alert-danger' :
          n.type === 'success' ? 'alert-success' : 'alert-info';
      return `<div class="alert ${alertClass}">
        <div>${Notifications.typeIcon(n.type)}</div>
        <div>
          <div class="fw-600">${Utils.esc(n.title)}</div>
          <div style="font-size:12px">${Utils.esc(n.message)}</div>
        </div>
      </div>`;
    }).join('');
  },

  _renderShiftStats() {
    const shift = Utils.getShift12();
    document.getElementById('shiftInfo').textContent = `وردية ${shift.label} (${Utils.formatDate(shift.start.toISOString())})`;

    /* إنتاج الوردية الحالية */
    const startISO = shift.start.toISOString();
    const endISO = shift.end.toISOString();
    const shiftRolls = Storage.list('rolls').filter(r => {
      const d = new Date(`${r.date}T${r.time}:00`).toISOString();
      return d >= startISO && d <= endISO && !r.archived;
    });
    const shiftCoils = Storage.list('coils').filter(c => {
      const d = new Date(c.createdAt).toISOString();
      return d >= startISO && d <= endISO && !c.archived;
    });
    const shiftSales = Storage.list('sales').filter(s => {
      const d = new Date(`${s.date}T${s.time}:00`).toISOString();
      return d >= startISO && d <= endISO;
    });

    document.getElementById('shiftStats').innerHTML = `
      <div class="grid-3">
        <div class="stat-card">
          <div class="stat-label">رولات الوردية</div>
          <div class="stat-value">${shiftRolls.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">بكر منتجة</div>
          <div class="stat-value">${shiftCoils.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">تم صرفها</div>
          <div class="stat-value">${shiftSales.length}</div>
        </div>
      </div>
      <div class="text-muted mt-2" style="font-size:11px">
        بداية الوردية: ${Utils.formatDateAr(startISO.slice(0,10))} ${shift.start.toTimeString().slice(0,5)} -
        نهايتها: ${Utils.formatDateAr(endISO.slice(0,10))} ${shift.end.toTimeString().slice(0,5)}
      </div>
    `;
  }
};
