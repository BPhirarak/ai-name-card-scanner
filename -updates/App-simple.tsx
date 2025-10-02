import React, { useState } from 'react';
import Header from './components/Header';
import AddCard from './components/AddCard';
import CardList from './components/CardList';

type View = 'add' | 'list';

const App: React.FC = () => {
  const [view, setView] = useState<View>('add');

  return (
    <div className="min-h-screen font-sans">
      <Header activeView={view} setView={setView} />
      <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {view === 'add' && <AddCard />}
        {view === 'list' && <CardList />}
      </main>
    </div>
  );
};

export default App;