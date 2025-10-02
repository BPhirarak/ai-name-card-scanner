# AI Name Card Scanner 📇

AI-powered business card scanner with OCR capabilities using Google Gemini AI. Scan, digitize, and manage your business card contacts effortlessly.

## Features ✨

- 📸 **Camera & Upload Support** - Capture business cards directly or upload existing images
- 🤖 **AI-Powered OCR** - Automatic text extraction using Google Gemini 2.5 Flash
- 🌐 **Multi-language Support** - Supports Thai and English text
- 💾 **Firebase Integration** - Real-time database with image storage
- 👥 **User Management** - Simple authentication system with user-specific data
- 🔍 **Search & Filter** - Search by name/company and filter by user
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack 🛠️

- **Frontend**: React 19 + TypeScript + Vite
- **AI**: Google Gemini AI (@google/genai)
- **Database**: Firebase Realtime Database
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Run Locally 🚀

**Prerequisites:** Node.js (v18 or higher)

1. Clone the repository:
   ```bash
   git clone https://github.com/BPhirarak/ai-name-card-scanner.git
   cd ai-name-card-scanner
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deploy to Vercel 🌐

### Option 1: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/new)
3. Import your GitHub repository
4. Add environment variable:
   - `GEMINI_API_KEY` = your Gemini API key
5. Click "Deploy"

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Add environment variable
vercel env add GEMINI_API_KEY

# Deploy to production
vercel --prod
```

## Default Login 🔐

- **Admin Account**:
  - Username: `admin`
  - Password: `1234`

- **New Users**: Click "สร้างบัญชีใหม่" (Create Account) to register

## Usage 📖

1. **Sign In/Sign Up** - Login with admin account or create a new user
2. **Add Card** - Upload or capture a business card image
3. **Process** - AI will automatically extract contact information
4. **Edit & Save** - Review and edit the extracted data before saving
5. **View Cards** - Browse all saved contacts with search and filter options

## Firebase Configuration 🔥

The app uses Firebase Realtime Database. The configuration is already set up in `services/firebase.ts`. If you want to use your own Firebase project:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Realtime Database
3. Update the config in `services/firebase.ts`

## Project Structure 📁

```
ai-name-card-scanner/
├── components/          # React components
│   ├── AddCard.tsx     # Card scanning interface
│   ├── CardList.tsx    # Contact list view
│   ├── CardItem.tsx    # Individual card display
│   ├── AuthPage.tsx    # Login/Signup page
│   └── Header.tsx      # Navigation header
├── services/           # Business logic
│   ├── authService.ts  # Authentication
│   ├── firebase.ts     # Firebase setup
│   ├── geminiService.ts # AI integration
│   └── contactService.ts # Contact CRUD
├── types.ts            # TypeScript types
└── App.tsx             # Main app component
```

## Environment Variables 🔐

Required environment variables:

- `GEMINI_API_KEY` - Your Google Gemini API key ([Get it here](https://ai.google.dev/))

## License 📄

MIT License

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## Support 💬

For issues and questions, please open an issue on GitHub.
