/* ============================================
   utils.js - أدوات مساعدة عامة
   ============================================ */

const Utils = {
  /* توليد معرّف فريد */
  uid(prefix = '') {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    return prefix ? `${prefix}_${ts}${rand}` : `${ts}${rand}`;
  },

  /* تنسيق التاريخ YYYY-MM-DD */
  today() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  /* تنسيق الوقت HH:MM */
  now() {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  },

  /* التاريخ والوقت معاً */
  nowDateTime() {
    return `${this.today()} ${this.now()}`;
  },

  /* تنسيق التاريخ للعرض العربي */
  formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch { return dateStr; }
  },

  /* تنسيق التاريخ بالعربية */
  formatDateAr(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return dateStr; }
  },

  /* فرق بالساعات بين تاريخين */
  hoursBetween(d1, d2) {
    const diff = Math.abs(new Date(d2) - new Date(d1));
    return diff / (1000 * 60 * 60);
  },

  /* تحويل نص تاريخ لـ ISO */
  toISO(dateStr, timeStr = '00:00') {
    if (!dateStr) return '';
    return new Date(`${dateStr}T${timeStr}:00`).toISOString();
  },

  /* تنسيق رقم */
  formatNum(n, decimals = 0) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    return Number(n).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  /* التحقق من قيمة رقمية */
  isNum(v) {
    return !isNaN(parseFloat(v)) && isFinite(v);
  },

  /* تحويل نص لرقم */
  toNum(v, def = 0) {
    const n = parseFloat(v);
    return isNaN(n) ? def : n;
  },

  /* هل القيمة ضمن النطاق؟ */
  inRange(val, min, max) {
    const v = parseFloat(val);
    if (isNaN(v)) return false;
    if (min !== null && min !== '' && !isNaN(parseFloat(min)) && v < parseFloat(min)) return false;
    if (max !== null && max !== '' && !isNaN(parseFloat(max)) && v > parseFloat(max)) return false;
    return true;
  },

  /* ترميز HTML للأمان */
  esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /* قص النص */
  truncate(str, len = 50) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
  },

  /* هل اليوم ضمن آخر 24 ساعة؟ */
  isLast24h(dateStr) {
    if (!dateStr) return false;
    const past = new Date(dateStr);
    const now = new Date();
    return (now - past) <= 24 * 60 * 60 * 1000;
  },

  /* هل ضمن اليوم الحالي؟ */
  isToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const t = new Date();
    return d.getDate() === t.getDate() &&
           d.getMonth() === t.getMonth() &&
           d.getFullYear() === t.getFullYear();
  },

  /* بداية يوم العمل (القابلة للتعديل) */
  workDayStart() {
    const settings = Storage.get('settings') || {};
    return settings.workDayStart || '08:00';
  },

  /* حساب فترة 12 ساعة (صباحية/مسائية) للتاريخ المعطى */
  getShift12(date = new Date()) {
    const [startH, startM] = this.workDayStart().split(':').map(Number);
    const start = new Date(date);
    start.setHours(startH, startM, 0, 0);
    if (date < start) {
      // قبل بداية اليوم = فترة أمس المسائية
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() - 1);
      return {
        label: 'مسائية (ليلية)',
        start: dayStart,
        end: start,
        period: 'night'
      };
    }
    const midEnd = new Date(start);
    midEnd.setHours(midEnd.getHours() + 12);
    if (date < midEnd) {
      return {
        label: 'صباحية',
        start: start,
        end: midEnd,
        period: 'day'
      };
    }
    const nextStart = new Date(start);
    nextStart.setDate(nextStart.getDate() + 1);
    return {
      label: 'مسائية (ليلية)',
      start: midEnd,
      end: nextStart,
      period: 'night'
    };
  },

  /* فلترة ضمن فترة */
  inPeriod(dateStr, startISO, endISO) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (startISO && d < new Date(startISO)) return false;
    if (endISO && d > new Date(endISO)) return false;
    return true;
  },

  /* حساب آخر X ساعة */
  lastXHours(h) {
    const end = new Date();
    const start = new Date(end.getTime() - h * 60 * 60 * 1000);
    return { start, end };
  },

  /* آخر X يوم */
  lastXDays(d) {
    const end = new Date();
    const start = new Date(end.getTime() - d * 24 * 60 * 60 * 1000);
    return { start, end };
  },

  /* اسم الوردية بناءً على الوقت */
  getShiftName(time) {
    const t = time || this.now();
    const h = parseInt(t.split(':')[0]);
    if (h >= 8 && h < 20) return 'صباحية';
    return 'مسائية';
  },

  /* CSV Escape */
  csvEscape(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  },

  /* تنزيل ملف */
  download(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type: type + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /* تحويل Array إلى CSV */
  arrayToCSV(rows, headers) {
    const lines = [];
    if (headers) lines.push(headers.map(this.csvEscape).join(','));
    rows.forEach(row => {
      const arr = Array.isArray(row) ? row : headers.map(h => row[h] || '');
      lines.push(arr.map(v => this.csvEscape(v)).join(','));
    });
    return '\ufeff' + lines.join('\n'); // BOM for Excel
  },

  /* debounce */
  debounce(fn, wait = 300) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  },

  /* خريطة الورديات */
  SHIFTS: ['صباحية', 'مسائية'],

  /* أنواع البكر */
  COIL_TYPES: ['فلوت', 'تست معالج'],

  /* درجات الخطورة */
  SEVERITIES: [
    { value: 'low', label: 'منخفضة', color: 'badge-green' },
    { value: 'medium', label: 'متوسطة', color: 'badge-gold' },
    { value: 'high', label: 'عالية', color: 'badge-red' }
  ],

  /* حالات البكرة */
  COIL_STATUS: {
    available: { label: 'متاحة', badge: 'badge-green' },
    reserved: { label: 'محجوزة', badge: 'badge-blue' },
    dispatched: { label: 'مصروفة', badge: 'badge-gold' },
    rejected: { label: 'مرفوضة', badge: 'badge-red' },
    quality_hold: { label: 'محجوزة للجودة', badge: 'badge-orange' },
    needs_review: { label: 'تحتاج مراجعة', badge: 'badge-gold' },
    loaded: { label: 'تم تحميلها', badge: 'badge-gray' },
    archived: { label: 'مؤرشفة', badge: 'badge-gray' }
  },

  /* حالات الرول */
  ROLL_STATUS: {
    new: { label: 'جديد', badge: 'badge-blue' },
    in_quality: { label: 'بالجودة', badge: 'badge-gold' },
    in_cutting: { label: 'بالمقص', badge: 'badge-orange' },
    cut: { label: 'تم قصه', badge: 'badge-green' },
    archived: { label: 'مؤرشف', badge: 'badge-gray' }
  },

  /* الأدوار */
  ROLES: {
    admin: { label: 'مدير', icon: '★' },
    quality: { label: 'مسؤول جودة', icon: '✓' },
    production: { label: 'إنتاج', icon: '⚙' },
    inventory: { label: 'مخزن', icon: '▦' },
    sales: { label: 'مبيعات', icon: '$' }
  },

  /* صلاحيات كل دور */
  PERMISSIONS: {
    admin: ['dashboard','production','quality','cutting','inventory','sales','companies','reports','search','notifications','users','settings'],
    quality: ['dashboard','quality','cutting','inventory','reports','search','notifications'],
    production: ['dashboard','production','cutting','reports','search','notifications'],
    inventory: ['dashboard','inventory','reports','search','notifications'],
    sales: ['dashboard','sales','companies','reports','search','notifications']
  },

  /* قائمة المشاكل الافتراضية */
  DEFAULT_PROBLEMS: [
    { id: 'p_none', name: 'لا توجد مشكلة', severity: 'low' },
    { id: 'p_extra_joints', name: 'زيادة وصلات', severity: 'medium' },
    { id: 'p_less_joints', name: 'نقص وصلات', severity: 'low' },
    { id: 'p_cut', name: 'قطع', severity: 'high' },
    { id: 'p_wrinkle', name: 'تجعيدة', severity: 'medium' },
    { id: 'p_gram_diff', name: 'اختلاف جرام', severity: 'medium' },
    { id: 'p_size_diff', name: 'اختلاف مقاس', severity: 'medium' },
    { id: 'p_moisture', name: 'رطوبة', severity: 'medium' },
    { id: 'p_surface', name: 'عيب سطح', severity: 'high' },
    { id: 'p_telescope', name: 'تلسكوب', severity: 'high' },
    { id: 'p_wrap', name: 'مشكلة لف', severity: 'medium' },
    { id: 'p_other', name: 'مشكلة أخرى', severity: 'medium' }
  ]
};
