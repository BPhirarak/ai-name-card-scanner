# 🚀 Vercel Deployment Guide

## วิธีการ Deploy ขึ้น Vercel

### ขั้นตอนที่ 1: เตรียม Vercel Account

1. ไปที่ [vercel.com](https://vercel.com)
2. Sign up หรือ Login ด้วย GitHub account
3. เชื่อมต่อ GitHub account ของคุณ

### ขั้นตอนที่ 2: Import Project

1. ไปที่ [Vercel Dashboard](https://vercel.com/new)
2. คลิก "Add New..." → "Project"
3. เลือก repository: `BPhirarak/ai-name-card-scanner`
4. คลิก "Import"

### ขั้นตอนที่ 3: Configure Project

**Framework Preset**: Vite (จะถูกเลือกอัตโนมัติ)

**Build Settings**:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Root Directory**: `./` (ค่าเริ่มต้น)

### ขั้นตอนที่ 4: เพิ่ม Environment Variables

ในหน้า Configure Project, เลื่อนลงไปที่ "Environment Variables":

1. คลิก "Add" หรือ "Environment Variables"
2. เพิ่มตัวแปรต่อไปนี้:

```
Name: GEMINI_API_KEY
Value: [ใส่ Gemini API Key ของคุณ]
Environment: Production, Preview, Development (เลือกทั้งหมด)
```

**วิธีหา Gemini API Key**:
- ไปที่ [Google AI Studio](https://ai.google.dev/)
- Login ด้วย Google Account
- คลิก "Get API Key"
- สร้าง API Key ใหม่หรือใช้ที่มีอยู่

### ขั้นตอนที่ 5: Deploy

1. คลิกปุ่ม "Deploy"
2. รอให้ Vercel build และ deploy (ประมาณ 1-2 นาที)
3. เมื่อเสร็จแล้วจะได้ URL เช่น: `https://ai-name-card-scanner.vercel.app`

### ขั้นตอนที่ 6: ทดสอบ

1. เปิด URL ที่ได้
2. ทดสอบ Login ด้วย:
   - Username: `admin`
   - Password: `1234`
3. ทดสอบ scan business card

---

## 🔄 Auto Deployment

หลังจาก deploy ครั้งแรกแล้ว:
- ทุกครั้งที่ push code ขึ้น GitHub (branch `main`)
- Vercel จะ auto deploy ให้อัตโนมัติ
- ดูสถานะได้ที่ [Vercel Dashboard](https://vercel.com/dashboard)

---

## 🛠️ Custom Domain (Optional)

ถ้าต้องการใช้ domain ของตัวเอง:

1. ไปที่ Project Settings → Domains
2. คลิก "Add Domain"
3. ใส่ domain name (เช่น `namecard.yourdomain.com`)
4. ตั้งค่า DNS ตามที่ Vercel แนะนำ

---

## 📊 Monitoring

ดู deployment logs และ analytics:
- [Vercel Dashboard](https://vercel.com/dashboard)
- เลือก project `ai-name-card-scanner`
- ดู Deployments, Analytics, Logs

---

## ⚠️ Troubleshooting

### ปัญหา: Build Failed

**แก้ไข**:
1. ตรวจสอบ Environment Variables
2. ดู Build Logs ใน Vercel Dashboard
3. ทดสอบ build locally: `npm run build`

### ปัญหา: API Key ไม่ทำงาน

**แก้ไข**:
1. ตรวจสอบว่าใส่ `GEMINI_API_KEY` ถูกต้อง
2. ตรวจสอบว่า API Key ยังใช้งานได้
3. Redeploy project

### ปัญหา: 404 Error เมื่อ Refresh

**แก้ไข**: ไฟล์ `vercel.json` ได้ตั้งค่า rewrites ไว้แล้ว ถ้ายังมีปัญหา:
1. ตรวจสอบว่ามีไฟล์ `vercel.json` ใน root directory
2. Redeploy project

---

## 🔐 Security Notes

1. **ห้าม commit** `.env.local` ขึ้น GitHub
2. ใช้ Environment Variables ใน Vercel แทน
3. เปลี่ยน admin password หลัง deploy
4. ตั้งค่า Firebase Security Rules

---

## 📞 Support

หากมีปัญหา:
1. ดู [Vercel Documentation](https://vercel.com/docs)
2. ตรวจสอบ [GitHub Issues](https://github.com/BPhirarak/ai-name-card-scanner/issues)
3. ดู Vercel Deployment Logs

---

## ✅ Checklist

- [ ] Push code ขึ้น GitHub
- [ ] สร้าง Vercel account
- [ ] Import project จาก GitHub
- [ ] เพิ่ม GEMINI_API_KEY environment variable
- [ ] Deploy project
- [ ] ทดสอบ login และ scan card
- [ ] (Optional) ตั้งค่า custom domain
- [ ] เปลี่ยน admin password

---

**🎉 ยินดีด้วย! แอปของคุณพร้อมใช้งานแล้ว**
