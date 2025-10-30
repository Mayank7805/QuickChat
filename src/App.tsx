import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import ChatTest from './pages/ChatTest';

type Page = 'home' | 'login' | 'register' | 'chat' | 'test';

interface User {
  id: string;
  username: string;
  displayName: string;
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setCurrentPage('chat');
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setCurrentPage('chat');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('login');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onGetStarted={() => setCurrentPage('login')} />;
      case 'test':
        return <ChatTest />;
      case 'login':
        return (
          <Login 
            onLogin={handleLogin}
            onSwitchToRegister={() => setCurrentPage('register')}
          />
        );
      case 'register':
        return (
          <Register 
            onRegister={handleLogin}
            onSwitchToLogin={() => setCurrentPage('login')}
          />
        );
      case 'chat':
        return user ? <Chat user={user} onLogout={handleLogout} /> : <Home onGetStarted={() => setCurrentPage('login')} />;
      default:
        return <Home onGetStarted={() => setCurrentPage('login')} />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderPage()}
    </div>
  );
}

export default App;