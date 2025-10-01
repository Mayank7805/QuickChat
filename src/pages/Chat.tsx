import React, { useState, useEffect, useRef } from 'react';
import { LogOut, MessageCircle, Users, Search, UserPlus, Check, X, Bell, Send, ArrowLeft } from 'lucide-react';
import { friendsAPI, chatsAPI } from '../api/index';
import { io, Socket } from 'socket.io-client';
import { Friend, FriendRequest, Message, ChatData } from '../types';



interface User {
  id: string;
  username: string;
  displayName: string;
}

interface ChatProps {
  user: User;
  onLogout: () => void;
}

const Chat: React.FC<ChatProps> = ({ user, onLogout }) => {
  type ViewType = 'chats' | 'friends' | 'search' | 'messaging';
  const [activeView, setActiveView] = useState<ViewType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<{received: FriendRequest[], sent: FriendRequest[]}>({
    received: [],
    sent: []
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Chat states
  const [activeChat, setActiveChat] = useState<ChatData | null>(null);
  const [chats, setChats] = useState<ChatData[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Unread messages tracking: { chatId: count }
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});

  useEffect(() => {
    loadFriends();
    loadChats();
  }, []);

  useEffect(() => {
    const cleanupSocket = initializeSocket();
    return () => {
      cleanupSocket();
    };
  // Socket initialization should only happen once when the component mounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChats = async () => {
    try {
      const response = await chatsAPI.getChats();
      console.log('Loaded chats:', response);
      
      // Remove duplicates based on chat ID AND friend ID (double protection)
      const uniqueChats = response.chats?.filter((chat: ChatData, index: number, self: ChatData[]) => {
        // First filter by chat ID
        const firstIndexById = self.findIndex((c) => c._id === chat._id);
        if (index !== firstIndexById) return false;
        
        // Second filter by friend ID (in case same friend has multiple chats)
        const firstIndexByFriend = self.findIndex((c) => c.friend._id === chat.friend._id);
        return index === firstIndexByFriend;
      }) || [];
      
      console.log('Unique chats after filtering:', uniqueChats);
      setChats(uniqueChats);
    } catch (error: unknown) {
      console.error('Error loading chats:', error instanceof Error ? error.message : String(error));
      setNotifications(prev => [...prev, 'Failed to load chats']);
    }
  };

  const initializeSocket = () => {
    const newSocket = io('http://localhost:5001', {
      auth: { token: localStorage.getItem('token') }
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('user_join', user.id);
    });

    newSocket.on('friend_request_received', (data) => {
      setNotifications(prev => [...prev, `${data.from.displayName} sent you a friend request`]);
      loadFriends();
    });

    newSocket.on('friend_request_accepted', (data) => {
      setNotifications(prev => [...prev, `${data.from.displayName} accepted your friend request`]);
      loadFriends();
    });

    newSocket.on('new_message', (data) => {
      console.log('New message received:', data);
      
      // Get sender information
      const senderId = data.message.sender;
      const senderName = data.senderName || 'Someone';
      
      // Only add the message if it's not already in the messages array
      setMessages(prev => {
        const messageExists = prev.some(msg => msg._id === data.message._id);
        if (!messageExists) {
          return [...prev, {
            ...data.message,
            // Ensure timestamp is a valid ISO string
            timestamp: data.message.timestamp || new Date().toISOString()
          }];
        }
        return prev;
      });
      
      // Update unread count if message is not from current user and not in active chat
      if (senderId !== user.id) {
        const chatId = data.chatId || data.message.chat;
        
        // Check if this message is in the currently active chat
        setActiveChat(currentActiveChat => {
          if (currentActiveChat && currentActiveChat._id === chatId) {
            // User is viewing this chat, just scroll to bottom
            scrollToBottom();
            return currentActiveChat;
          } else {
            // User is not viewing this chat, increment unread count
            setUnreadMessages(prev => ({
              ...prev,
              [chatId]: (prev[chatId] || 0) + 1
            }));
            
            // Show notification
            setNotifications(prev => [...prev, `New message from ${senderName}`]);
            
            // Update the chat's last message in the chats list
            setChats(prevChats => {
              return prevChats.map(chat => {
                if (chat._id === chatId) {
                  return {
                    ...chat,
                    lastMessage: data.message
                  };
                }
                return chat;
              });
            });
            
            return currentActiveChat;
          }
        });
      } else {
        scrollToBottom();
      }
    });

    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startChat = async (friend: Friend) => {
    try {
      // First check if chat already exists in the chats list
      const existingChat = chats.find(chat => 
        chat.friend._id === friend._id
      );
      
      if (existingChat) {
        // Chat already exists, just open it
        console.log('Opening existing chat:', existingChat);
        
        // Clear unread messages for this chat
        setUnreadMessages(prev => {
          const updated = { ...prev };
          delete updated[existingChat._id];
          return updated;
        });
        
        setActiveChat(existingChat);
        setActiveView('messaging');
        
        // Load messages for this chat
        const messagesResponse = await chatsAPI.getChatMessages(existingChat._id);
        setMessages(messagesResponse.messages || []);
        
        setTimeout(scrollToBottom, 100);
        return;
      }
      
      // Create new chat if it doesn't exist
      const response = await chatsAPI.createChat(friend._id);
      console.log('Chat created:', response);
      
      const chatData: ChatData = {
        _id: response.chat._id,
        participants: response.chat.participants,
        messages: [],
        friend: friend
      };
      
      // Reload chats to get fresh list from server (removes duplicates)
      await loadChats();
      
      // Clear unread messages for this chat
      setUnreadMessages(prev => {
        const updated = { ...prev };
        delete updated[chatData._id];
        return updated;
      });
      
      setActiveChat(chatData);
      setActiveView('messaging');
      
      // Load messages for this chat (will be empty for new chat)
      const messagesResponse = await chatsAPI.getChatMessages(response.chat._id);
      setMessages(messagesResponse.messages || []);
      
      setTimeout(scrollToBottom, 100);
    } catch (error: unknown) {
      console.error('Error starting chat:', error);
      const errorMessage = typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message?: string }).message
        : 'Failed to start chat';
      setNotifications(prev => [...prev, errorMessage || 'Failed to start chat']);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeChat) return;

    try {
      const response = await chatsAPI.sendMessage(activeChat._id, messageInput.trim(), 'text');
      
      // Add message to local state immediately for better UX
      const newMessage: Message = {
        _id: response.message._id,
        sender: user.id,
        content: messageInput.trim(),
        timestamp: response.message.timestamp || new Date().toISOString(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessageInput('');
      
      // Emit to socket for real-time delivery
      if (socket) {
        socket.emit('send_message', {
          chatId: activeChat._id,
          message: newMessage,
          recipientId: activeChat.friend._id
        });
      }
      
      scrollToBottom();
    } catch (error: unknown) {
      const errorMessage = typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message?: string }).message
        : 'Failed to send message';
      setNotifications(prev => [...prev, errorMessage || 'Failed to send message']);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const loadFriends = async () => {
    try {
      const response = await friendsAPI.getFriendsList();
      console.log('Friends response:', response);
      setFriends(response.friends || []);
      setFriendRequests(response.pendingRequests || { received: [], sent: [] });
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await friendsAPI.searchUsers(query);
      setSearchResults(response.users || []);
    } catch (error: unknown) {
      console.error('Error searching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      await friendsAPI.sendFriendRequest(userId);
      setNotifications(prev => [...prev, 'Friend request sent!']);
      loadFriends();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send friend request';
      setNotifications(prev => [...prev, errorMessage]);
    }
  };

  const acceptFriendRequest = async (userId: string) => {
    try {
      await friendsAPI.acceptFriendRequest(userId);
      setNotifications(prev => [...prev, 'Friend request accepted!']);
      loadFriends();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept friend request';
      setNotifications(prev => [...prev, errorMessage]);
    }
  };

  const declineFriendRequest = async (userId: string) => {
    try {
      await friendsAPI.declineFriendRequest(userId);
      loadFriends();
    } catch (error: unknown) {
      console.error('Error declining friend request:', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">QuickChat</h1>
            <button onClick={onLogout} className="p-2 hover:bg-gray-100 rounded-full text-red-500">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold">
              {user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{user.displayName || user.username}</h3>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>
          </div>

          <div className="flex space-x-1">
            {[
              { key: 'chats', label: 'Chats', icon: MessageCircle },
              { key: 'friends', label: 'Friends', icon: Users },
              { key: 'search', label: 'Search', icon: Search }
            ].map(({ key, label, icon: Icon }) => {
              // Calculate total unread messages
              const totalUnread = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);
              const showBadge = key === 'chats' && totalUnread > 0;
              
              return (
                <button
                  key={key}
                  onClick={() => setActiveView(key as ViewType)}
                  className={`relative flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === key ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            {notifications.slice(-2).map((notification, index) => (
              <div key={index} className="flex items-center space-x-2 bg-blue-50 p-2 rounded-lg mb-2">
                <Bell className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-blue-700">{notification}</span>
                <button 
                  onClick={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
                  className="ml-auto text-blue-500 hover:text-blue-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {activeView === 'friends' && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-4">Friends ({friends.length})</h2>
              
              {friendRequests.received && friendRequests.received.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-700 mb-2">Friend Requests ({friendRequests.received.length})</h3>
                  {friendRequests.received.map((request) => (
                    <div key={request._id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                          {request.displayName?.[0]?.toUpperCase() || request.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{request.displayName || request.username}</p>
                          <p className="text-sm text-gray-500">@{request.username}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => acceptFriendRequest(request._id)}
                          className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 transition-colors"
                        >
                          <Check className="h-4 w-4" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => declineFriendRequest(request._id)}
                          className="flex items-center space-x-1 bg-red-500 text-white px-3 py-1 rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {friends.map((friend) => (
                  <div key={friend._id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold">
                          {friend.displayName?.[0]?.toUpperCase() || friend.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{friend.displayName || friend.username}</p>
                        <p className="text-sm text-gray-500">@{friend.username} • {friend.status === 'online' ? 'Online' : 'Offline'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => startChat(friend)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Chat
                    </button>
                  </div>
                ))}
              </div>
              
              {friends.length === 0 && (!friendRequests.received || friendRequests.received.length === 0) && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No friends yet!</p>
                  <p className="text-sm text-gray-400">Use the search tab to find people</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'search' && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-4">Find Friends</h2>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by username or display name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {isLoading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              )}

              <div className="space-y-2">
                {searchResults.map((result) => {
                  const isAlreadyFriend = friends.some(friend => friend._id === result._id);
                  const requestSent = friendRequests.sent && friendRequests.sent.some(req => req._id === result._id);
                  const requestReceived = friendRequests.received && friendRequests.received.some(req => req._id === result._id);
                  
                  return (
                    <div key={result._id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold">
                          {result.displayName?.[0]?.toUpperCase() || result.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{result.displayName || result.username}</p>
                          <p className="text-sm text-gray-500">@{result.username}</p>
                        </div>
                      </div>
                      <div>
                        {isAlreadyFriend ? (
                          <span className="text-green-600 font-medium">✓ Friends</span>
                        ) : requestSent ? (
                          <span className="text-yellow-600 font-medium">Request Sent</span>
                        ) : requestReceived ? (
                          <span className="text-blue-600 font-medium">Wants to be Friends</span>
                        ) : (
                          <button
                            onClick={() => sendFriendRequest(result._id)}
                            className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
                          >
                            <UserPlus className="h-4 w-4" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {searchQuery && !isLoading && searchResults.length === 0 && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No users found matching "{searchQuery}"</p>
                </div>
              )}
              
              {!searchQuery && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">Find new friends</p>
                  <p className="text-sm text-gray-400">Enter a username or display name to search</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'chats' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Your Chats ({chats.length})</h2>
                <button
                  onClick={() => loadChats()}
                  className="text-sm text-blue-600 hover:text-blue-700"
                  title="Refresh chats"
                >
                  Refresh
                </button>
              </div>
              {chats.length > 0 ? (
                <div className="space-y-2">
                  {chats.map((chat) => {
                    const unreadCount = unreadMessages[chat._id] || 0;
                    
                    return (
                      <div
                        key={chat._id}
                        onClick={() => {
                          // Clear unread messages for this chat
                          setUnreadMessages(prev => {
                            const updated = { ...prev };
                            delete updated[chat._id];
                            return updated;
                          });
                          
                          setActiveChat(chat);
                          setActiveView('messaging');
                          chatsAPI.getChatMessages(chat._id)
                            .then((response: { messages: Message[] }) => {
                              setMessages(response.messages || []);
                              setTimeout(scrollToBottom, 100);
                            })
                            .catch((error) => {
                              console.error('Error loading messages:', error);
                              setNotifications(prev => [...prev, 'Failed to load messages']);
                            });
                        }}
                        className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                          unreadCount > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold">
                            {chat.friend.displayName?.[0]?.toUpperCase() || chat.friend.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${chat.friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-900'}`}>
                              {chat.friend.displayName || chat.friend.username}
                            </p>
                            {unreadCount > 0 && (
                              <span className="text-xs font-semibold text-red-500">
                                {unreadCount} new
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {unreadCount > 0 ? 'New messages' : 'Click to open chat'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No chats yet!</p>
                  <p className="text-sm text-gray-400 mb-4">Start a conversation by clicking "Chat" on a friend</p>
                  <button
                    onClick={() => setActiveView('friends')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Go to Friends
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50">
        {activeView === 'messaging' && activeChat ? (
          <>
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-3">
              <button
                onClick={() => {
                  setActiveView('chats');
                  setActiveChat(null);
                  setMessages([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold">
                  {activeChat.friend.displayName?.[0]?.toUpperCase() || activeChat.friend.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${activeChat.friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              </div>
              <div>
                <p className="font-medium text-gray-900">{activeChat.friend.displayName || activeChat.friend.username}</p>
                <p className="text-sm text-gray-500">@{activeChat.friend.username}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isSentByMe = message.sender === user.id;
                return (
                  <div key={message._id} className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] break-words rounded-lg px-4 py-2 ${isSentByMe ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}>
                      <p>{message.content}</p>
                      <p className={`text-xs mt-1 ${isSentByMe ? 'text-blue-100' : 'text-gray-400'}`}>
                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">Welcome to QuickChat</h2>
              <p className="text-gray-500 mb-6">Enhanced chat application with real-time friend system</p>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Working Features</h3>
                <div className="space-y-2 text-left">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">Real-time friend requests</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">Live notifications</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">User search & discovery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;