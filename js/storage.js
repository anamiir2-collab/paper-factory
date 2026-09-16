/* ============================================
   storage.js - إدارة التخزين المحلي
   ============================================ */

const Storage = {
  PREFIX: 'pf_', // paper factory
  KEYS: {
    users: 'users',
    rolls: 'rolls',
    qualityTests: 'qualityTests',
    qualitySpecs: 'qualitySpecs',
    cutRolls: 'cutRolls',
    coils: 'coils',
    problems: 'problems',
    companies: 'companies',
    inventory: 'inventory', // مشتقة من coils
    reservations: 'reservations',
    sales: 'sales',
    shipments: 'shipments',
    auditLogs: 'auditLogs',
    notifications: 'notifications',
    settings: 'settings',
    session: 'session'
  },

  /* قراءة مفتاح */
  get(key) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Storage get error:', e);
      return null;
    }
  },

  /* كتابة مفتاح */
  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  },

  /* حذف مفتاح */
  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  /* هل القائمة فارغة؟ */
  isEmpty(key) {
    const v = this.get(key);
    return !v || (Array.isArray(v) && v.length === 0) ||
      (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
  },

  /* قراءة قائمة */
  list(key) {
    const v = this.get(key);
    return Array.isArray(v) ? v : [];
  },

  /* قراءة كائن */
  obj(key) {
    return this.get(key) || {};
  },

  /* إضافة عنصر لقائمة */
  insert(key, item) {
    const list = this.list(key);
    if (!item.id) item.id = Utils.uid();
    if (!item.createdAt) item.createdAt = Utils.nowDateTime();
    list.push(item);
    this.set(key, list);
    return item;
  },

  /* تحديث عنصر */
  update(key, id, updates) {
    const list = this.list(key);
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates, updatedAt: Utils.nowDateTime() };
    this.set(key, list);
    return list[idx];
  },

  /* حذف عنصر */
  delete(key, id) {
    const list = this.list(key);
    const filtered = list.filter(x => x.id !== id);
    this.set(key, filtered);
    return filtered.length !== list.length;
  },

  /* بحث عنصر */
  find(key, id) {
    return this.list(key).find(x => x.id === id);
  },

  /* بحث مخصص */
  filter(key, predicate) {
    return this.list(key).filter(predicate);
  },

  /* تصدير كامل */
  exportAll() {
    const data = {};
    Object.values(this.KEYS).forEach(k => {
      data[k] = this.get(k);
    });
    return {
      version: '1.0',
      exportedAt: Utils.nowDateTime(),
      data
    };
  },

  /* استيراد كامل */
  importAll(jsonObj, replace = true) {
    if (!jsonObj || !jsonObj.data) throw new Error('ملف غير صالح');
    const data = jsonObj.data;
    Object.keys(data).forEach(k => {
      if (replace || !this.get(k)) {
        this.set(k, data[k]);
      }
    });
    return true;
  },

  /* تهيئة البيانات الافتراضية */
  initDemo() {
    if (!this.get('initialized')) {
      this._seedUsers();
      this._seedSettings();
      this._seedProblems();
      this._seedCompanies();
      this._seedQualitySpecs();
      this._seedRolls();
      this.set('initialized', true);
    }
  },

  /* بيانات المستخدمين التجريبية */
  _seedUsers() {
    const users = [
      {
        id: 'u_admin', name: 'المدير العام', username: 'admin',
        password: 'admin123', role: 'admin', active: true,
        createdAt: Utils.nowDateTime()
      },
      {
        id: 'u_quality', name: 'مسؤول الجودة', username: 'quality',
        password: 'quality123', role: 'quality', active: true,
        createdAt: Utils.nowDateTime()
      },
      {
        id: 'u_prod', name: 'مسؤول الإنتاج', username: 'prod',
        password: 'prod123', role: 'production', active: true,
        createdAt: Utils.nowDateTime()
      },
      {
        id: 'u_store', name: 'مسؤول المخزن', username: 'store',
        password: 'store123', role: 'inventory', active: true,
        createdAt: Utils.nowDateTime()
      },
      {
        id: 'u_sales', name: 'مسؤول المبيعات', username: 'sales',
        password: 'sales123', role: 'sales', active: true,
        createdAt: Utils.nowDateTime()
      }
    ];
    this.set('users', users);
  },

  /* إعدادات النظام */
  _seedSettings() {
    const settings = {
      companyName: 'مصنع الورق المتحد',
      workDayStart: '08:00',
      lowStockThreshold: 10,
      defaultGrams: [125, 150, 175],
      defaultSizes: [190, 220, 240],
      defaultPaperTypes: ['فلوت', 'تست معالج'],
      currency: 'ج.م',
      logo: ''
    };
    this.set('settings', settings);
  },

  /* قائمة المشاكل */
  _seedProblems() {
    this.set('problems', Utils.DEFAULT_PROBLEMS.map(p => ({ ...p, isCustom: false })));
  },

  /* الشركات التجريبية */
  _seedCompanies() {
    const companies = [
      {
        id: 'c_cpack', name: 'C-PACK', code: 'CPK',
        maxJoints: 3,
        allowedSizes: [190, 220, 240],
        allowedGrams: [125, 150],
        allowedTypes: ['فلوت'],
        forbiddenProblems: ['p_cut', 'p_telescope', 'p_surface'],
        notes: 'شركة تغليف صينية - تشترط جودة عالية',
        active: true,
        createdAt: Utils.nowDateTime()
      },
      {
        id: 'c_misr', name: 'مصر للكرتون', code: 'MSR',
        maxJoints: 5,
        allowedSizes: [190, 220, 240, 260],
        allowedGrams: [125, 150, 175],
        allowedTypes: ['فلوت', 'تست معالج'],
        forbiddenProblems: ['p_cut'],
        notes: 'تقبل تشكيلة واسعة',
        active: true,
        createdAt: Utils.nowDateTime()
      },
      {
        id: 'c_packpro', name: 'PackPro', code: 'PP',
        maxJoints: 2,
        allowedSizes: [190, 220],
        allowedGrams: [125],
        allowedTypes: ['فلوت'],
        forbiddenProblems: ['p_cut', 'p_telescope', 'p_wrinkle'],
        notes: 'متطلبة جداً',
        active: true,
        createdAt: Utils.nowDateTime()
      }
    ];
    this.set('companies', companies);
  },

  /* مواصفات الجودة التجريبية */
  _seedQualitySpecs() {
    const specs = [
      {
        id: 'qs_f125', paperType: 'فلوت', gram: 125,
        tensileMD: { min: 4.5, max: 7.0, unit: 'kN/m' },
        tensileCD: { min: 2.0, max: 4.0, unit: 'kN/m' },
        burst: { min: 250, max: 450, unit: 'kPa' },
        absorbency: { min: 110, max: 145, unit: 'g/m²' },
        moisture: { min: 7, max: 10, unit: '%' },
        sct: { min: 1.8, max: 3.5, unit: 'kN/m' },
        gram: { min: 122, max: 128, unit: 'g/m²' },
        createdAt: Utils.nowDateTime()
      },
      {
        id: 'qs_t125', paperType: 'تست معالج', gram: 125,
        tensileMD: { min: 5.5, max: 8.0, unit: 'kN/m' },
        tensileCD: { min: 2.5, max: 4.5, unit: 'kN/m' },
        burst: { min: 300, max: 500, unit: 'kPa' },
        absorbency: { min: 110, max: 145, unit: 'g/m²' },
        moisture: { min: 6.5, max: 9.5, unit: '%' },
        sct: { min: 2.0, max: 3.8, unit: 'kN/m' },
        gram: { min: 122, max: 128, unit: 'g/m²' },
        createdAt: Utils.nowDateTime()
      }
    ];
    this.set('qualitySpecs', specs);
  },

  /* رول تجريبي + بكر */
  _seedRolls() {
    const today = Utils.today();
    const time = Utils.now();
    const rolls = [
      {
        id: 'r_13626',
        rollNumber: '13626',
        date: today,
        time: '09:15',
        shift: 'صباحية',
        paperType: 'فلوت',
        gram: 125,
        weight: 1850,
        width: 2400,
        notes: 'إنتاج تجريبي',
        status: 'cut',
        archived: false,
        createdAt: `${today} 09:15`,
        createdBy: 'u_prod'
      }
    ];
    this.set('rolls', rolls);

    /* اختبار جودة للرول 13626 */
    const qualityTests = [
      {
        id: 'qt_13626',
        rollId: 'r_13626',
        rollNumber: '13626',
        coilType: 'فلوت',
        tests: {
          tensileMD: { value: 5.8, min: 4.5, max: 7.0, unit: 'kN/m', pass: true },
          tensileCD: { value: 3.1, min: 2.0, max: 4.0, unit: 'kN/m', pass: true },
          burst: { value: 360, min: 250, max: 450, unit: 'kPa', pass: true },
          absorbency: { value: 128, min: 110, max: 145, unit: 'g/m²', pass: true },
          moisture: { value: 8.5, min: 7, max: 10, unit: '%', pass: true },
          sct: { value: 2.4, min: 1.8, max: 3.5, unit: 'kN/m', pass: true },
          gram: { value: 125, min: 122, max: 128, unit: 'g/m²', pass: true }
        },
        overallPass: true,
        inspector: 'u_quality',
        createdAt: `${today} 10:30`
      }
    ];
    this.set('qualityTests', qualityTests);

    /* البكر الناتجة من قص الرول 13626 */
    const coils = [
      {
        id: 'co_13626_1',
        parentRollId: 'r_13626',
        parentRollNumber: '13626',
        code: '13626/1',
        size: 190,
        gram: 125,
        type: 'فلوت',
        weight: 450,
        joints: 2,
        problemId: 'p_none',
        problemName: 'لا توجد مشكلة',
        severity: 'low',
        notes: '',
        status: 'available',
        archived: false,
        companyId: null,
        createdAt: `${today} 11:00`,
        createdBy: 'u_prod'
      },
      {
        id: 'co_13626_2',
        parentRollId: 'r_13626',
        parentRollNumber: '13626',
        code: '13626/2',
        size: 190,
        gram: 125,
        type: 'فلوت',
        weight: 460,
        joints: 4,
        problemId: 'p_extra_joints',
        problemName: 'زيادة وصلات',
        severity: 'medium',
        notes: 'زيادة وصلات بسبب قطع في الإنتاج',
        status: 'available',
        archived: false,
        companyId: null,
        createdAt: `${today} 11:05`,
        createdBy: 'u_prod'
      },
      {
        id: 'co_13626_3',
        parentRollId: 'r_13626',
        parentRollNumber: '13626',
        code: '13626/3',
        size: 220,
        gram: 125,
        type: 'فلوت',
        weight: 480,
        joints: 1,
        problemId: 'p_none',
        problemName: 'لا توجد مشكلة',
        severity: 'low',
        notes: '',
        status: 'available',
        archived: false,
        companyId: null,
        createdAt: `${today} 11:10`,
        createdBy: 'u_prod'
      },
      {
        id: 'co_13626_4',
        parentRollId: 'r_13626',
        parentRollNumber: '13626',
        code: '13626/4',
        size: 240,
        gram: 125,
        type: 'فلوت',
        weight: 470,
        joints: 0,
        problemId: 'p_none',
        problemName: 'لا توجد مشكلة',
        severity: 'low',
        notes: '',
        status: 'available',
        archived: false,
        companyId: null,
        createdAt: `${today} 11:15`,
        createdBy: 'u_prod'
      }
    ];
    this.set('coils', coils);

    /* سجل القص */
    const cutRolls = [
      {
        id: 'cr_13626',
        rollId: 'r_13626',
        rollNumber: '13626',
        cutCount: 4,
        coils: ['co_13626_1', 'co_13626_2', 'co_13626_3', 'co_13626_4'],
        createdAt: `${today} 11:00`,
        createdBy: 'u_prod'
      }
    ];
    this.set('cutRolls', cutRolls);

    this.set('reservations', []);
    this.set('sales', []);
    this.set('shipments', []);
    this.set('auditLogs', []);
    this.set('notifications', []);
  }
};
