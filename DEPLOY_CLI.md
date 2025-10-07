# 🚀 Deploy ด้วย Vercel CLI

## ขั้นตอนการ Deploy (แบบง่าย)

### 1. Login เข้า Vercel

เปิด Terminal/Command Prompt แล้วรันคำสั่ง:

```bash
vercel login
```

- เลือก "Continue with GitHub" หรือ email ที่ใช้กับ Vercel
- Browser จะเปิดขึ้นมาให้ confirm
- กลับมาที่ Terminal จะเห็นข้อความ "Success!"

### 2. Deploy Project

```bash
vercel
```

ระบบจะถามคำถาม ให้ตอบดังนี้:

```
? Set up and deploy "~/ai-name-card-scanner"? [Y/n] 
→ กด Y (Enter)

? Which scope do you want to deploy to?
→ เลือก account ของคุณ (กด Enter)

? Link to existing project? [y/N]
→ กด N (Enter)

? What's your project's name? (ai-name-card-scanner)
→ กด Enter (ใช้ชื่อเดิม)

? In which directory is your code located? ./
→ กด Enter

Auto-detected Project Settings (Vite):
- Build Command: npm run build
- Output Directory: dist
- Development Command: npm run dev

? Want to modify these settings? [y/N]
→ กด N (Enter)
```

### 3. เพิ่ม Environment Variable

หลังจาก deploy สำเร็จ ให้เพิ่ม API Key:

```bash
vercel env add GEMINI_API_KEY
```

ระบบจะถาม:

```
? What's the value of GEMINI_API_KEY?
→ ใส่: AIzaSyCfHJqmycWIeixUdHWVjuNcjGp2oWr9MYI

? Add GEMINI_API_KEY to which Environments?
→ เลือก: Production, Preview, Development (กด Space เพื่อเลือก, Enter เพื่อยืนยัน)
```

### 4. Deploy ใหม่เพื่อใช้ Environment Variable

```bash
vercel --prod
```

### 5. เสร็จสิ้น! 🎉

ระบบจะแสดง URL เช่น:

```
✅ Production: https://ai-name-card-scanner.vercel.app
```

---

## คำสั่งที่ใช้บ่อย

```bash
# Deploy to preview (development)
vercel

# Deploy to production
vercel --prod

# ดู environment variables
vercel env ls

# ดู project list
vercel list

# ดู deployment logs
vercel logs

# เปิด project ใน browser
vercel open
```

---

## Troubleshooting

### ปัญหา: Command not found

**แก้ไข**: ติดตั้ง Vercel CLI ใหม่

```bash
npm install -g vercel
```

### ปัญหา: Build failed

**แก้ไข**: ทดสอบ build locally ก่อน

```bash
npm run build
```

### ปัญหา: API Key ไม่ทำงาน

**แก้ไข**: ตรวจสอบและเพิ่ม environment variable ใหม่

```bash
vercel env rm GEMINI_API_KEY
vercel env add GEMINI_API_KEY
vercel --prod
```

---

## 🔄 Auto Deploy จาก GitHub

หลังจาก deploy ด้วย CLI ครั้งแรก:

1. ไปที่ [Vercel Dashboard](https://vercel.com/dashboard)
2. เลือก project `ai-name-card-scanner`
3. ไปที่ Settings → Git
4. Connect กับ GitHub repository
5. ตั้งแต่นี้ทุกครั้งที่ push code จะ auto deploy

---

**เสร็จแล้ว!** คุณสามารถเปิด URL ที่ได้และทดสอบแอปได้เลย 🚀
