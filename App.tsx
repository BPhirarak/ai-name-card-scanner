import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AddCard from './components/AddCard';
import CardList from './components/CardList';
import AuthPage from './components/AuthPage';
import { getCurrentUser, initializeAdminUser } from './services/authService';

type View = 'add' | 'list';

const App: React.FC = () => {
  const [view, setView] = useState<View>('add');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize admin user and check for existing session
    const initialize = async () => {
      await initializeAdminUser();
      const user = getCurrentUser();
      setCurrentUser(user);
      setIsInitialized(true);
    };
    initialize();
  }, []);

  const handleAuthSuccess = (username: string) => {
    setCurrentUser(username);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen font-sans">
      <Header activeView={view} setView={setView} currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
      <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {view === 'add' && <AddCard currentUser={currentUser} />}
        {view === 'list' && <CardList currentUser={currentUser} />}
      </main>
    </div>
  );
};

export default App;