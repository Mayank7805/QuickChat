// api/index.js
const API_BASE_URL = 'http://localhost:5001/api';

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if it exists
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API functions
export const authAPI = {
  register: async (userData) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  login: async (credentials) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // Test server connection
  test: async () => {
    return apiCall('/test');
  }
};

// Messages API functions
export const messagesAPI = {
  // Get all messages for a chat
  getMessages: async (chatId) => {
    return apiCall(`/messages/${chatId}`);
  },

  // Send a new message
  sendMessage: async (messageData) => {
    return apiCall('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  },

  // Delete a message
  deleteMessage: async (messageId) => {
    return apiCall(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }
};

// Users API functions  
export const usersAPI = {
  // Get all users
  getUsers: async () => {
    return apiCall('/users');
  },

  // Get user profile
  getProfile: async (userId) => {
    return apiCall(`/users/${userId}`);
  },

  // Update user profile
  updateProfile: async (userId, userData) => {
    return apiCall(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }
};

// Friends API functions
export const friendsAPI = {
  // Search users by username or display name
  searchUsers: async (query) => {
    return apiCall(`/friends/search?q=${encodeURIComponent(query)}`);
  },

  // Send friend request
  sendFriendRequest: async (userId) => {
    return apiCall('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  // Accept friend request
  acceptFriendRequest: async (userId) => {
    return apiCall('/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  // Decline friend request
  declineFriendRequest: async (userId) => {
    return apiCall('/friends/decline', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  // Get friends list and pending requests
  getFriendsList: async () => {
    return apiCall('/friends/list');
  },

  // Remove friend
  removeFriend: async (userId) => {
    return apiCall(`/friends/${userId}`, {
      method: 'DELETE',
    });
  }
};

// Chats API functions
export const chatsAPI = {
  // Create or get chat with a friend
  createChat: async (friendId) => {
    return apiCall('/chats/create', {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    });
  },

  // Get user's chats
  getChats: async () => {
    return apiCall('/chats/list');
  },

  // Get messages for a chat
  getChatMessages: async (chatId, page = 1) => {
    return apiCall(`/chats/${chatId}/messages?page=${page}`);
  },

  // Send message to chat
  sendMessage: async (chatId, content, type = 'text') => {
    return apiCall(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  }
};

// Export everything as default for convenience
export default {
  auth: authAPI,
  messages: messagesAPI,
  users: usersAPI,
  friends: friendsAPI,
  chats: chatsAPI,
};