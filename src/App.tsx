import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import ChatTest from './pages/ChatTest';

type Page = 'login' | 'register' | 'chat' | 'test';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('test'); // Changed to show test
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      // setCurrentPage('chat'); // Commented out to show test
    }
  }, []);

  const handleLogin = (token: string, userData: any) => {
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
        return <Chat user={user} onLogout={handleLogout} />;
      default:
        return <Login onLogin={handleLogin} onSwitchToRegister={() => setCurrentPage('register')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {renderPage()}
      
      {/* Navigation for testing */}
      <div style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px', 
        display: 'flex', 
        gap: '10px' 
      }}>
        <button
          onClick={() => setCurrentPage('test')}
          style={{ 
            padding: '10px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px' 
          }}
        >
          Test Chat Buttons
        </button>
        <button
          onClick={() => setCurrentPage('login')}
          style={{ 
            padding: '10px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px' 
          }}
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}

export default App;