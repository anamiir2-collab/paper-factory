/* ============================================
   auth.js - المصادقة والصلاحيات
   ============================================ */

const Auth = {
  currentUser() {
    const session = Storage.get('session');
    if (!session || !session.userId) return null;
    const user = Storage.find('users', session.userId);
    if (!user || !user.active) return null;
    return user;
  },

  login(username, password, remember = false) {
    const user = Storage.list('users').find(
      u => u.username === username && u.password === password && u.active
    );
    if (!user) return null;
    Storage.set('session', {
      userId: user.id,
      loginAt: Utils.nowDateTime(),
      remember
    });
    Audit.log('login', 'user', user.id, { notes: `دخول المستخدم ${user.name}` });
    return user;
  },

  logout() {
    const user = this.currentUser();
    if (user) {
      Audit.log('logout', 'user', user.id, { notes: `خروج المستخدم ${user.name}` });
    }
    Storage.remove('session');
  },

  /* التحقق من الصلاحية */
  can(route) {
    const user = this.currentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perms = Utils.PERMISSIONS[user.role] || [];
    return perms.includes(route);
  },

  /* التحقق من دور معين */
  isRole(...roles) {
    const user = this.currentUser();
    if (!user) return false;
    return roles.includes(user.role);
  },

  /* التحقق من المدير */
  isAdmin() {
    return this.currentUser()?.role === 'admin';
  },

  /* اسم الدور بالعربية */
  roleLabel(role) {
    return Utils.ROLES[role]?.label || role;
  },

  /* تغيير كلمة المرور */
  changePassword(userId, oldPassword, newPassword) {
    const user = Storage.find('users', userId);
    if (!user) throw new Error('المستخدم غير موجود');
    if (user.password !== oldPassword) throw new Error('كلمة المرور الحالية غير صحيحة');
    Storage.update('users', userId, { password: newPassword });
    Audit.log('update', 'user', userId, {
      oldValue: '***',
      newValue: '***',
      notes: 'تغيير كلمة المرور'
    });
    return true;
  },

  /* هل المستخدم نشط */
  isActive(userId) {
    const u = Storage.find('users', userId);
    return u && u.active;
  }
};
