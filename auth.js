/*
 * تنظیمات احراز هویت برنامهٔ محلی
 * توجه: این برنامه استاتیک است و این اطلاعات در مرورگر قابل مشاهده‌اند.
 */
window.AUTH_CONFIG = Object.freeze({
  sessionKey: "shift-management:auth:v1",
  accounts: Object.freeze({
    admin: Object.freeze({
      username: "admin",
      password: "admin123",
      displayName: "محمود شعبانی",
      role: "admin",
      roleLabel: "مدیر",
    }),
    hamed: Object.freeze({
      username: "hamed",
      password: "hamed123",
      displayName: "حامد مقدسی",
      role: "viewer",
      roleLabel: "مشاهده‌گر",
      personId: "hamed",
    }),
    mehdi: Object.freeze({
      username: "mehdi",
      password: "mehdi123",
      displayName: "مهدی ارجمندزاده",
      role: "viewer",
      roleLabel: "مشاهده‌گر",
      personId: "mehdi",
    }),
  }),
});
