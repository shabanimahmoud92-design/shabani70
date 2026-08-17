# لینک دائمی برنامه شیفت

## لینک پیشنهادی (دائمی — GitHub Pages)

کد شما روی GitHub است:  
https://github.com/shabanimahmoud92-design/shabani70

بعد از فعال‌سازی GitHub Pages، لینک ثابت این می‌شود:

**https://shabanimahmoud92-design.github.io/shabani70/**

### فعال‌سازی (یک‌بار)

1. بروید به: https://github.com/shabanimahmoud92-design/shabani70/settings/pages
2. **Build and deployment** → **Source**: `Deploy from a branch`
3. **Branch**: `main` — **Folder**: `/ (root)
4. **Save** بزنید
5. ۱–۳ دقیقه صبر کنید؛ صفحه سبز می‌شود و لینk بالا کار می‌کند

### اگر فایل `.nojekyll` را تازه اضافه کردید

در PowerShell:

```powershell
cd D:\Mahmoud\shift-management
git add .nojekyll SHARE.md
git commit -m "Enable GitHub Pages"
git push origin main
```

---

## روش سریع (موقت — Netlify Drop)

لینk قبلی (`cute-sundae-542ec5.netlify.app`) منقضی شده است.

1. دوبار کلیک روی `publish.bat` (یا بروید https://app.netlify.com/drop)
2. کل پوشه `D:\Mahmoud\shift-management` را بکشید داخل صفحه
3. لینk جدید `https://....netlify.app` می‌گیرید
4. **Claim this site** بزنید و با Netlify لاگین کنید تا لینk دائمی شود

---

## ورود به برنامه

| کاربر | رمز |
|-------|-----|
| admin | admin123 |
| hamed | hamed123 |
| mehdi | mehdi123 |

---

## توجه

- تعطیلی‌های شرکتی در مرورگر هر نفر (localStorage) ذخیره می‌شود.
- رمزها فقط سمت مرورگر هستند؛ برای محیط عمومی حساس مناسب نیست.
