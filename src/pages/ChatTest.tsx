import React, { useState } from 'react';

const ChatTest = () => {
  const [message, setMessage] = useState('');

  const testChatButton = (friendName: string) => {
    setMessage(`🎉 SUCCESS! Chat button clicked for ${friendName}!`);
    alert(`✅ WORKING! You clicked Chat for ${friendName}!\n\n🎯 The button is functional!\n📱 Ready for messaging!`);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>💬 Chat Button Test</h1>
      
      {message && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb',
          borderRadius: '5px',
          margin: '20px 0',
          color: '#155724'
        }}>
          {message}
        </div>
      )}
      
      <h2>👥 Your Friends</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div>
            <strong>Alice</strong>
            <div style={{ color: '#28a745', fontSize: '14px' }}>● online</div>
          </div>
          <button
            onClick={() => testChatButton('Alice')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            💬 Start Chat
          </button>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div>
            <strong>Bob</strong>
            <div style={{ color: '#28a745', fontSize: '14px' }}>● online</div>
          </div>
          <button
            onClick={() => testChatButton('Bob')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            💬 Start Chat
          </button>
        </div>
      </div>
      
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '5px'
      }}>
        <h3>🎯 Test Instructions:</h3>
        <p>1. Click any "💬 Start Chat" button above</p>
        <p>2. You'll see a popup showing the button works</p>
        <p>3. A success message will appear on this page</p>
        <p><strong>✅ This proves the chat buttons are clickable and working!</strong></p>
      </div>
    </div>
  );
};

export default ChatTest;