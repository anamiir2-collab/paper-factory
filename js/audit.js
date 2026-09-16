/* ============================================
   audit.js - سجل العمليات Audit Log
   ============================================ */

const Audit = {
  log(action, entity, entityId, details = {}) {
    const user = Auth.currentUser();
    const entry = {
      id: Utils.uid('au'),
      action,
      entity,
      entityId: entityId || null,
      user: user ? user.name : 'غير معروف',
      userId: user ? user.id : null,
      userRole: user ? user.role : null,
      date: Utils.today(),
      time: Utils.now(),
      oldValue: details.oldValue || null,
      newValue: details.newValue || null,
      reason: details.reason || '',
      notes: details.notes || '',
      createdAt: Utils.nowDateTime()
    };
    Storage.insert('auditLogs', entry);
    return entry;
  },

  list(filters = {}) {
    let logs = Storage.list('auditLogs').slice().reverse();
    if (filters.entity) logs = logs.filter(l => l.entity === filters.entity);
    if (filters.action) logs = logs.filter(l => l.action === filters.action);
    if (filters.userId) logs = logs.filter(l => l.userId === filters.userId);
    if (filters.dateFrom) logs = logs.filter(l => l.date >= filters.dateFrom);
    if (filters.dateTo) logs = logs.filter(l => l.date <= filters.dateTo);
    return logs;
  },

  /* عرض اسم العملية بالعربية */
  actionLabel(action) {
    const map = {
      create: 'إضافة',
      update: 'تعديل',
      delete: 'حذف',
      archive: 'أرشفة',
      reserve: 'حجز',
      dispatch: 'صرف',
      load: 'تحميل',
      quality_pass: 'قبول جودة',
      quality_fail: 'رفض جودة',
      quality_review: 'مراجعة جودة',
      quality_exception: 'موافقة استثنائية',
      status_change: 'تغيير حالة',
      login: 'تسجيل دخول',
      logout: 'تسجيل خروج',
      backup_export: 'تصدير نسخة احتياطية',
      backup_import: 'استيراد نسخة احتياطية'
    };
    return map[action] || action;
  },

  /* عرض اسم الكيان */
  entityLabel(entity) {
    const map = {
      user: 'مستخدم',
      roll: 'رول',
      coil: 'بكرة',
      qualityTest: 'اختبار جودة',
      qualitySpec: 'مواصفة جودة',
      problem: 'مشكلة',
      company: 'شركة',
      reservation: 'حجز',
      sale: 'صرف',
      shipment: 'تحميل',
      notification: 'تنبيه',
      setting: 'إعداد'
    };
    return map[entity] || entity;
  },

  /* تنسيق سجل للعرض */
  formatEntry(entry) {
    let text = `${this.actionLabel(entry.action)} ${this.entityLabel(entry.entity)}`;
    if (entry.entityId) text += ` #${entry.entityId}`;
    if (entry.oldValue !== null && entry.newValue !== null) {
      text += ` (من "${entry.oldValue}" إلى "${entry.newValue}")`;
    }
    if (entry.reason) text += ` - ${entry.reason}`;
    return text;
  }
};
