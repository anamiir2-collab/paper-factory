# 🏭 نظام إدارة مصنع الورق

نظام إدارة متكامل لمصنع ورق، مبني بـ HTML5 + CSS3 + JavaScript Vanilla، يعمل بالكامل في المتصفح بدون أي Backend.

## ✨ المميزات الرئيسية

- **تتبع كامل من الرول حتى التحميل**: الإنتاج → الجودة → المقص → المخزن → المبيعات → التحميل
- **نظام صلاحيات خماسي**: مدير، جودة، إنتاج، مخزن، مبيعات
- **تحقق تلقائي من شروط الشركات** مع رفض/قبول لكل شركة على حدة
- **اختبارات جودة مع مواصفات قابلة للتعديل** (شد طولي/عرضي، انفجار، تشرب، رطوبة، SCT، جرام)
- **نظام طلبات مراجعة الجودة** للبكر غير المطابقة
- **تقارير 12/24 ساعة** مبنية على بداية يوم العمل (قابلة للتعديل)
- **سجل عمليات Audit Log** كامل لكل تعديل
- **تصدير CSV + طباعة A4** لكل التقارير
- **نسخ احتياطي JSON** للاستيراد/التصدير
- **RTL بالكامل** بالعربية مع خط Cairo
- **Responsive** يعمل على الموبايل والكمبيوتر

## 🚀 طريقة التشغيل

### الطريقة 1: فتح مباشر
1. فك ضغط الملفات في مجلد
2. افتح `index.html` في المتصفح (Chrome / Firefox / Edge)

### الطريقة 2: رفع على GitHub Pages
1. ارفع المجلد إلى مستودع GitHub
2. اذهب إلى Settings → Pages
3. اختر Branch: `main` ومجلد `/root`
4. سيكون الرابط: `https://<username>.github.io/<repo>/`

### الطريقة 3: خادم محلي (موصى به للتطوير)
```bash
cd paper-factory
python3 -m http.server 8000
# افتح http://localhost:8000
```

## 🔑 بيانات الدخول التجريبية

| الدور | اسم المستخدم | كلمة المرور | الصلاحيات |
|------|--------------|------------|----------|
| المدير | `admin` | `admin123` | كل الصلاحيات |
| الجودة | `quality` | `quality123` | الجودة + المقص + المخزن + التقارير |
| الإنتاج | `prod` | `prod123` | الإنتاج + المقص + التقارير |
| المخزن | `store` | `store123` | المخزن + التقارير |
| المبيعات | `sales` | `sales123` | المبيعات + الشركات + التقارير |

## 📋 الأقسام الرئيسية

### 1. الرئيسية (Dashboard)
- بطاقات إحصائية (إنتاج اليوم، البكر، المحجوزة، المصروفة، المرفوضة، تحتاج مراجعة)
- رسم بياني للإنتاج آخر 7 أيام
- رسم بياني للبكر المقبولة/المرفوضة
- أكثر مشاكل الجودة تكراراً
- آخر العمليات وسجل التنبيهات
- إحصائيات الوردية الحالية

### 2. الإنتاج
- إضافة/تعديل/أرشفة الرولات
- بيانات: رقم الرول (Unique)، تاريخ، وقت، وردية، نوع الورق، جرام، وزن، عرض، ملاحظات
- إرسال الرول للمقص

### 3. الجودة
**أربع تبويبات:**
- **اختبارات الجودة**: 7 اختبارات (شد طولي/عرضي، انفجار، تشرب، رطوبة، SCT، جرام) مع حد أدنى/أقصى ونتيجة تلقائية (مطابق ✅ / غير مطابق ❌)
- **مواصفات الجودة**: حدود قابلة للتعديل لكل نوع/جرام
- **المشاكل**: قائمة 12 مشكلة جاهزة + إضافة مخصصة مع درجة خطورة (منخفضة/متوسطة/عالية)
- **بكر تحتاج مراجعة**: عرض البكر المرفوضة مع قرارات (موافقة استثنائية/رفض/تحويل/إبقاء محجوزة)

### 4. المقص
- اختيار رول + عدد البكر الناتجة
- توليد تلقائي للأكواد (مثال: 13626/1, 13626/2, ...)
- لكل بكرة: كود، مقاس، جرام، نوع، وزن، عدد وصلات، مشكلة، ملاحظات

### 5. المخزن
- جدول كل البكر مع حالاتها (متاحة/محجوزة/مصروفة/مرفوضة/محجوزة للجودة/تحتاج مراجعة/محملة)
- فلترة بحسب الحالة/النوع/المقاس
- إحصائيات (عدد، وزن)
- جرد المخزن (تحديد مفقود/تالف)
- صفحة تفاصيل البكرة مع Timeline كامل

### 6. المبيعات
**أربع تبويبات:**
- **البيع**: اختيار شركة → عرض البكر المسموحة/الممنوعة مع أسباب المنع
- **الحجوزات**: عرض/إلغاء الحجوزات
- **المصروفات**: عرض البكر المصروفة
- **التحميل**: تجهيز شحنة (رقم أمر، شركة، سيارة، سائق، بكر)

### 7. الشركات
- إضافة/تعديل شركة
- تحديد: أقصى عدد وصلات، المقاسات المسموحة، الجرامات، الأنواع، المشاكل الممنوعة
- صفحة تفصيلية: عرض البكر المسموحة/الممنوعة لكل شركة

### 8. التقارير
13 نوع تقرير:
- الإنتاج، الجودة، المقص، المخزن، المبيعات، التحميل
- مشاكل الجودة، البكر المرفوضة، تحتاج مراجعة، الشركات
- سجل العمليات
- **تقرير 12 ساعة (الوردية الحالية)**
- **تقرير 24 ساعة (ورديتان)**

فلاتر الفترة: 12h / 24h / يومي / أسبوعي / شهري / مخصص / الكل

أزرار: **طباعة A4** و **تصدير CSV**

### 9. البحث
بحث عام بـ:
- رقم الرول
- كود البكرة
- اسم الشركة

### 10. التنبيهات
- مخزون منخفض لمقاس معين
- بكر تحتاج مراجعة جودة
- بكر غير مسموحة لشركة

### 11. المستخدمون
- إضافة/تعديل/إيقاف/تنشيط المستخدمين
- عرض صلاحيات كل دور

### 12. إدارة النظام
- **عام**: اسم الشركة، بداية يوم العمل، حد التنبيه، العملة
- **القيم الافتراضية**: المقاسات، الجرامات، الأنواع
- **النسخ الاحتياطي**: تصدير/استيراد JSON
- **سجل العمليات**: آخر 100 عملية

## 📖 شرح العمليات الأساسية

### إضافة مستخدم
1. سجّل دخول كمدير
2. اذهب إلى: المستخدمون
3. اضغط "+ مستخدم جديد"
4. أدخل: الاسم، اسم المستخدم، كلمة المرور، الدور، الحالة
5. اضغط "حفظ"

### إضافة شركة
1. اذهب إلى: الشركات
2. اضغط "+ شركة جديدة"
3. أدخل: الاسم، الكود، أقصى عدد وصلات
4. اختر المقاسات/الجرامات/الأنواع المسموحة
5. اختر المشاكل الممنوعة
6. اضغط "حفظ"

### إضافة مواصفات الجودة
1. اذهب إلى: الجودة → تبويب "مواصفات الجودة"
2. اضغط "+ مواصفات جديدة"
3. اختر نوع الورق + الجرام
4. أدخل الحدود (أدنى/أقصى) لكل اختبار من السبعة
5. اضغط "حفظ"

### تسجيل رول
1. اذهب إلى: الإنتاج
2. اضغط "+ إضافة رول"
3. أدخل: رقم الرول (Unique)، التاريخ، الوقت، الوردية، نوع الورق، الجرام، الوزن، العرض
4. اضغط "حفظ الرول"

### تسجيل اختبار جودة
1. اذهب إلى: الجودة → تبويب "اختبارات الجودة"
2. اضغط "+ اختبار جديد"
3. اختر الرول + نوع البكرة (تست/فلوت)
4. أدخل القيم، سيتم تلقائياً تحميل الحدود من المواصفات
5. النتيجة (مطابق/غير مطابق) تُحسب تلقائياً
6. اضغط "حفظ الاختبار"

### قص الرول
1. اذهب إلى: المقص
2. اختر رولاً جاهزاً → اضغط "✂ قص"
3. أدخل عدد البكر الناتجة
4. ستظهر نماذج إدخال لكل بكرة (الكود يُولّد تلقائياً: الرول/رقم)
5. لكل بكرة: مقاس، جرام، نوع، وزن، عدد وصلات، مشكلة، ملاحظات
6. اضغط "حفظ القص"

### إدخال المخزن
- تتم تلقائياً عند حفظ القص
- كل بكر تدخل بحالة "متاحة"
- اذهب إلى: المخزن لمتابعتها

### البيع والصرف
1. اذهب إلى: المبيعات → تبويب "البيع"
2. اختر شركة → ستظهر البكر المسموحة/الممنوعة
3. للبكرة المتاحة: اضغط "حجز"
4. ادخل ملاحظات (الموظف والتاريخ تلقائيون)
5. اضغط "حجز البكرة" → الحالة = "محجوزة"
6. للبكرة المحجوزة: اضغط "صرف"
7. سيتم فحص كامل (وجود، حالة، جودة، شركة، وصلات، حجز سابق)
8. اضغط "تأكيد الصرف" → الحالة = "مصروفة"

### التحميل
1. اذهب إلى: المبيعات → تبويب "التحميل" أو من تبويب "المصروفات"
2. اضغط "+ تجهيز شحنة تحميل"
3. أدخل: رقم أمر التحميل، الشركة، التاريخ، السيارة، السائق
4. اختر البكر (يمكن اختيار عدة)
5. اضغط "تأكيد التحميل" → حالة البكر = "تم تحميلها"
6. يتم تسجيل الشحنة مع إجمالي الوزن والمقاسات

### عمل التقارير
1. اذهب إلى: التقارير
2. اختر نوع التقرير
3. اختر الفترة (12h / 24h / يومي / أسبوعي / شهري / مخصص)
4. اضغط "📊 توليد التقرير"
5. للتصدير: اضغط "💾 تصدير CSV"
6. للطباعة: اضغط "🖨 طباعة" (مُنسّق لـ A4)

### طلب مراجعة الجودة
عند محاولة تحميل بكرة غير مسموحة لشركة:
1. اضغط "طلب مراجعة الجودة"
2. أضف ملاحظات (اختياري)
3. اضغط "إرسال طلب المراجعة"
4. البكرة تنتقل إلى حالة "تحتاج مراجعة"
5. مسؤول الجودة يراجع في: الجودة → تبويب "بكر تحتاج مراجعة"
6. يختار: موافقة استثنائية / رفض / تحويل لشركة أخرى / إبقاء محجوزة
7. يُسجّل القرار مع السبب والتاريخ والاسم

### النسخ الاحتياطي
1. اذهب إلى: إدارة النظام → تبويب "النسخ الاحتياطي"
2. **للتصدير**: اضغط "💾 تصدير البيانات" (ينزل ملف JSON)
3. **للاستيراد**:
   - اختر ملف JSON
   - اضغط "📂 استيراد البيانات"
   - أكد الاستبدال
   - سيتم إعادة تحميل الصفحة

## 🎨 التصميم

- **النمط**: Industrial / Factory Management
- **الألوان**:
  - أبيض/رمادي فاتح للخلفية
  - كحلي (#1e3a5f) للنصوص الأساسية والشريط الجانبي
  - أزرق (#2563eb) للروابط والأزرار الرئيسية
  - أخضر (#16a34a) للقبول
  - أحمر (#dc2626) للرفض
  - ذهبي (#d4a017) للتنبيهات
- **الخط**: Cairo (من Google Fonts)
- **الاتجاه**: RTL بالكامل

## 📁 هيكل الملفات

```
paper-factory/
├── index.html
├── css/
│   ├── style.css          (الأنماط الأساسية)
│   └── responsive.css     (التكيف مع الشاشات)
├── js/
│   ├── app.js             (الموجه الرئيسي + Modal + Toast)
│   ├── auth.js            (المصادقة والصلاحيات)
│   ├── audit.js           (سجل العمليات)
│   ├── dashboard.js       (الصفحة الرئيسية)
│   ├── production.js      (قسم الإنتاج)
│   ├── quality.js         (الجودة + المواصفات + المشاكل + المراجعة)
│   ├── cutting.js         (المقص)
│   ├── inventory.js       (المخزن + التفاصيل)
│   ├── companies.js       (الشركات)
│   ├── sales.js           (الحجز + الصرف + التحميل)
│   ├── reports.js         (التقارير)
│   ├── users.js           (المستخدمون + الإعدادات)
│   ├── notifications.js   (مركز التنبيهات)
│   ├── storage.js         (LocalStorage wrapper + البيانات التجريبية)
│   └── utils.js           (أدوات مساعدة)
├── assets/
└── README.md
```

## 🔐 الأمان

رغم أن النظام يعمل محلياً، تم تطبيق الصلاحيات داخل JavaScript:
- المبيعات لا تستطيع تعديل بيانات الجودة
- المخزن لا يستطيع تعديل نتائج الاختبارات
- الإنتاج لا يستطيع تغيير قرار الجودة
- المدير فقط يستطيع إدارة المستخدمين وقواعد الشركات

## 💾 البيانات

يتم حفظ كل البيانات في `LocalStorage` تحت مفتاح `pf_*`:
- `pf_users` - المستخدمون
- `pf_rolls` - الرولات
- `pf_qualityTests` - اختبارات الجودة
- `pf_qualitySpecs` - المواصفات
- `pf_coils` - البكر
- `pf_cutRolls` - سجل القص
- `pf_problems` - المشاكل
- `pf_companies` - الشركات
- `pf_reservations` - الحجوزات
- `pf_sales` - المصروفات
- `pf_shipments` - الشحنات
- `pf_auditLogs` - سجل العمليات
- `pf_notifications` - التنبيهات
- `pf_settings` - الإعدادات
- `pf_session` - الجلسة الحالية
- `pf_initialized` - علم التهيئة

  flowchart TD

subgraph group_shell["Browser Shell"]
  node_entry["Static browser entry<br/>HTML entry<br/>[index.html]"]
  node_app["Application shell<br/>SPA router<br/>[app.js]"]
  node_auth["Session and roles<br/>client auth<br/>[auth.js]"]
  node_users["Users and administration<br/>admin module<br/>[users.js]"]
  node_styles["RTL responsive UI<br/>CSS<br/>[responsive.css]"]
  node_storage[("LocalStorage state<br/>browser persistence<br/>[storage.js]")]
end

subgraph group_operations["Material Operations"]
  node_production["Roll production<br/>production module<br/>[production.js]"]
  node_quality["Quality and review<br/>quality module<br/>[quality.js]"]
  node_cutting["Cutting<br/>conversion module<br/>[cutting.js]"]
  node_inventory["Coil inventory<br/>inventory module<br/>[inventory.js]"]
end

subgraph group_commercial["Commercial Flow"]
  node_companies["Customer acceptance rules<br/>eligibility rules<br/>[companies.js]"]
  node_sales["Sales and shipment<br/>commercial module<br/>[sales.js]"]
end

subgraph group_oversight["Oversight"]
  node_dashboard["Operations dashboard<br/>[dashboard.js]"]
  node_reports["Reports and export<br/>reporting module<br/>[reports.js]"]
  node_audit["Audit log<br/>audit module<br/>[audit.js]"]
  node_notifications["Operational alerts<br/>notification module<br/>[notifications.js]"]
end

node_entry -->|"loads"| node_app
node_entry -->|"styles"| node_styles
node_app -->|"establishes session"| node_auth
node_auth -.->|"gates admin actions"| node_users
node_app -->|"navigates"| node_production
node_app -->|"navigates"| node_quality
node_app -->|"navigates"| node_sales
node_users -->|"manages local data"| node_storage
node_production -->|"produced rolls"| node_quality
node_quality -->|"eligible rolls"| node_cutting
node_cutting -->|"creates available coils"| node_inventory
node_quality -->|"review and disposition"| node_inventory
node_companies -->|"acceptance rules"| node_sales
node_inventory -->|"available coils"| node_sales
node_sales -->|"reserved, issued, loaded"| node_inventory
node_production -.->|"persists records"| node_storage
node_quality -.->|"persists tests and rules"| node_storage
node_inventory -.->|"persists coil status"| node_storage
node_sales -.->|"persists sales and shipments"| node_storage
node_storage -->|"current metrics"| node_dashboard
node_storage -->|"operational history"| node_reports
node_storage -->|"change records"| node_audit
node_storage -->|"alert conditions"| node_notifications

click node_entry "https://github.com/anamiir2-collab/paper-factory/blob/main/index.html"
click node_app "https://github.com/anamiir2-collab/paper-factory/blob/main/js/app.js"
click node_auth "https://github.com/anamiir2-collab/paper-factory/blob/main/js/auth.js"
click node_users "https://github.com/anamiir2-collab/paper-factory/blob/main/js/users.js"
click node_styles "https://github.com/anamiir2-collab/paper-factory/blob/main/css/responsive.css"
click node_storage "https://github.com/anamiir2-collab/paper-factory/blob/main/js/storage.js"
click node_production "https://github.com/anamiir2-collab/paper-factory/blob/main/js/production.js"
click node_quality "https://github.com/anamiir2-collab/paper-factory/blob/main/js/quality.js"
click node_cutting "https://github.com/anamiir2-collab/paper-factory/blob/main/js/cutting.js"
click node_inventory "https://github.com/anamiir2-collab/paper-factory/blob/main/js/inventory.js"
click node_companies "https://github.com/anamiir2-collab/paper-factory/blob/main/js/companies.js"
click node_sales "https://github.com/anamiir2-collab/paper-factory/blob/main/js/sales.js"
click node_dashboard "https://github.com/anamiir2-collab/paper-factory/blob/main/js/dashboard.js"
click node_reports "https://github.com/anamiir2-collab/paper-factory/blob/main/js/reports.js"
click node_audit "https://github.com/anamiir2-collab/paper-factory/blob/main/js/audit.js"
click node_notifications "https://github.com/anamiir2-collab/paper-factory/blob/main/js/notifications.js"

classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a
class node_entry,node_app,node_auth,node_users,node_styles,node_storage toneBlue
class node_production,node_quality,node_cutting,node_inventory toneAmber
class node_companies,node_sales toneMint
class node_dashboard,node_reports,node_audit,node_notifications toneRose

## 🧪 البيانات التجريبية

عند أول تشغيل، يُحمّل النظام بيانات تجريبية:
- 5 مستخدمين (لكل دور)
- 3 شركات (C-PACK, مصر للكرتون, PackPro)
- 2 مواصفات جودة (فلوت + تست 125 GSM)
- 12 مشكلة جاهزة
- 1 رول (13626) مع اختبار جودة مطابق
- 4 بكر (13626/1, 2, 3, 4):
  - 13626/1: مقاس 190، 2 وصلات (✓ لكل الشركات)
  - 13626/2: مقاس 190، 4 وصلات (✗ C-PACK, ✗ PackPro, ✓ مصر للكرتون)
  - 13626/3: مقاس 220، 1 وصلة (✓ لكل الشركات)
  - 13626/4: مقاس 240، 0 وصلات (✓ لكل الشركات)

## 📌 ملاحظات

- النسخة الأولى بدون Backend — كل البيانات في المتصفح
- للاستخدام بين أجهزة متعددة، استخدم النسخ الاحتياطي/الاستيراد
- يعمل بشكل أفضل في Chrome / Edge / Firefox الحديثة
- لا يدعم Internet Explorer

## 🛣 خارطة الطريق المستقبلية (اختياري)

- إضافة Backend (Node.js + Express أو PHP) لمزامنة البيانات
- مصادقة JWT
- API REST كامل
- رفع مرفقات (صور البكر، فيديوهات الفحص)
- طباعة باركود للبكر
- نظام تنبيهات بريد إلكتروني
- تطبيق موبايل (PWA)

## 📞 الدعم

للاستفسارات أو طلبات الميزات، يُرجى التواصل مع المطور.

---

**الإصدار:** 1.0  
**التاريخ:** سبتمبر 2026  
**الترخيص:** مخصص لمصنع الورق
