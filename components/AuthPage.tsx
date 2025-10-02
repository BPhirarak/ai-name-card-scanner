import React, { useState } from 'react';
import { signIn, signUp, setCurrentUser } from '../services/authService';
import Spinner from './Spinner';

interface AuthPageProps {
  onAuthSuccess: (username: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(username, password);
        if (result.success) {
          // After successful sign up, switch to sign in
          setIsSignUp(false);
          setPassword('');
          setError('');
          alert('สร้างบัญชีสำเร็จ! กรุณาเข้าสู่ระบบ');
        } else {
          setError(result.message);
        }
      } else {
        const result = await signIn(username, password);
        if (result.success) {
          setCurrentUser(username);
          onAuthSuccess(username);
        } else {
          setError(result.message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Business Card Scanner
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {isSignUp ? 'สร้างบัญชีผู้ใช้ใหม่' : 'เข้าสู่ระบบ'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              ชื่อผู้ใช้
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="กรอกชื่อผู้ใช้"
              required
              minLength={3}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="กรอกรหัสผ่าน"
              required
              minLength={6}
              maxLength={12}
            />
            {isSignUp && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                รหัสผ่านต้องมี 6-12 ตัวอักษร ประกอบด้วยตัวอักษรและตัวเลขหรืออักขระพิเศษ
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Spinner />
                {isSignUp ? 'กำลังสร้างบัญชี...' : 'กำลังเข้าสู่ระบบ...'}
              </>
            ) : (
              isSignUp ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            {isSignUp ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สร้างบัญชีใหม่'}
          </button>
        </div>

        {!isSignUp && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
              💡 Admin: username = <span className="font-mono font-semibold">admin</span>, password = <span className="font-mono font-semibold">1234</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
