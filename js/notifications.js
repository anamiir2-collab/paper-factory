/* ============================================
   notifications.js - مركز التنبيهات
   ============================================ */

const Notifications = {
  /* إنشاء تنبيه */
  add(type, title, message, relatedId = null, relatedType = null) {
    const notif = {
      id: Utils.uid('n'),
      type, // warning, info, danger, success
      title,
      message,
      relatedId,
      relatedType,
      read: false,
      createdAt: Utils.nowDateTime()
    };
    Storage.insert('notifications', notif);
    App.updateNotifBadge();
    return notif;
  },

  /* كل التنبيهات */
  list(filters = {}) {
    let list = Storage.list('notifications').slice().reverse();
    if (filters.unreadOnly) list = list.filter(n => !n.read);
    if (filters.type) list = list.filter(n => n.type === filters.type);
    return list;
  },

  /* عدد غير المقروءة */
  unreadCount() {
    return Storage.list('notifications').filter(n => !n.read).length;
  },

  /* تعليم كمقروء */
  markRead(id) {
    Storage.update('notifications', id, { read: true });
    App.updateNotifBadge();
  },

  /* تعليم الكل كمقروء */
  markAllRead() {
    const list = Storage.list('notifications');
    list.forEach(n => { n.read = true; });
    Storage.set('notifications', list);
    App.updateNotifBadge();
  },

  /* حذف تنبيه */
  delete(id) {
    Storage.delete('notifications', id);
    App.updateNotifBadge();
  },

  /* فحص المخزون المنخفض */
  checkLowStock() {
    const settings = Storage.obj('settings');
    const threshold = settings.lowStockThreshold || 10;
    const coils = Storage.list('coils').filter(c => c.status === 'available' && !c.archived);
    const sizeGroups = {};
    coils.forEach(c => {
      const key = `size_${c.size}`;
      sizeGroups[key] = (sizeGroups[key] || 0) + 1;
    });
    Object.keys(sizeGroups).forEach(key => {
      const size = key.replace('size_', '');
      if (sizeGroups[key] < threshold) {
        const exists = Storage.list('notifications').find(n =>
          n.type === 'warning' && n.relatedId === `size_${size}` && !n.read
        );
        if (!exists) {
          this.add('warning', 'مخزون منخفض',
            `المخزون من مقاس ${size} أقل من الحد المحدد (${sizeGroups[key]} فقط)`,
            `size_${size}`, 'inventory');
        }
      }
    });
  },

  /* فحص البكر التي تحتاج مراجعة */
  checkReviews() {
    const needReview = Storage.list('coils').filter(c => c.status === 'needs_review');
    if (needReview.length > 0) {
      const exists = Storage.list('notifications').find(n =>
        n.title === 'بكر تحتاج مراجعة' && !n.read
      );
      if (!exists) {
        this.add('warning', 'بكر تحتاج مراجعة',
          `يوجد ${needReview.length} بكرة تحتاج مراجعة جودة`,
          null, 'quality');
      }
    }
  },

  /* أيقونة النوع */
  typeIcon(type) {
    const icons = { warning: '⚠', info: 'ⓘ', danger: '✖', success: '✓' };
    return icons[type] || 'ⓘ';
  }
};
