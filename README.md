# نظام تسجيل الحضور بالـ QR

## التشغيل
1. أنشئ مشروع في supabase.com ثم شغّل محتوى `supabase/setup.sql` في SQL Editor.
2. من Authentication > Users أضف مستخدم (إيميل + باسورد) وفعّل Auto Confirm.
3. انسخ `.env.example` إلى ملف اسمه `.env` وحط بيانات مشروعك (من Project Settings > API).
4. في الترمنال داخل فولدر المشروع:
   npm install
   npm run dev
5. للموبايل: ارفع المشروع على Vercel وضيف المتغيرين VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY (الكاميرا محتاجة https).
