import { Friend, FriendRequest, Message, ChatData } from '../types';

const API_BASE_URL = 'http://localhost:5001/api';

interface APIOptions extends RequestInit {
  headers?: Record<string, string>;
}

// Helper function to make API calls
const apiCall = async <T>(endpoint: string, options: APIOptions = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: APIOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if it exists
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }
    
    return data as T;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API functions
interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface UserData {
  username: string;
  password: string;
  displayName?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

const authAPI = {
  register: async (userData: UserData): Promise<AuthResponse> => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  test: async (): Promise<{ status: string }> => {
    return apiCall('/test');
  }
};

// Messages API functions
interface MessageResponse {
  message: Message;
}

interface MessagesResponse {
  messages: Message[];
}

const messagesAPI = {
  getMessages: async (chatId: string): Promise<MessagesResponse> => {
    return apiCall(`/messages/${chatId}`);
  },

  sendMessage: async (messageData: { content: string; chatId: string }): Promise<MessageResponse> => {
    return apiCall('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  },

  deleteMessage: async (messageId: string): Promise<{ success: boolean }> => {
    return apiCall(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }
};

// Users API functions
interface UsersResponse {
  users: Friend[];
}

interface UserProfileResponse {
  user: Friend;
}

const usersAPI = {
  getUsers: async (): Promise<UsersResponse> => {
    return apiCall('/users');
  },

  getProfile: async (userId: string): Promise<UserProfileResponse> => {
    return apiCall(`/users/${userId}`);
  },

  updateProfile: async (userId: string, userData: Partial<Friend>): Promise<UserProfileResponse> => {
    return apiCall(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }
};

// API Interfaces
export interface ChatAPI {
  getChats(): Promise<ChatsResponse>;
  getChatMessages(chatId: string, page?: number): Promise<MessagesResponse>;
  createChat(friendId: string): Promise<ChatResponse>;
  sendMessage(chatId: string, content: string, type?: string): Promise<MessageResponse>;
}

export interface FriendsAPI {
  searchUsers(query: string): Promise<SearchUsersResponse>;
  sendFriendRequest(userId: string): Promise<{ success: boolean }>;
  acceptFriendRequest(userId: string): Promise<{ success: boolean }>;
  declineFriendRequest(userId: string): Promise<{ success: boolean }>;
  getFriendsList(): Promise<FriendsResponse>;
  removeFriend(userId: string): Promise<{ success: boolean }>;
}

// Friends API functions
interface FriendsResponse {
  friends: Friend[];
  pendingRequests: {
    received: FriendRequest[];
    sent: FriendRequest[];
  };
}

interface SearchUsersResponse {
  users: Friend[];
  status?: string;
}

const friendsAPI: FriendsAPI = {
  searchUsers: async (query: string): Promise<SearchUsersResponse> => {
    return apiCall<SearchUsersResponse>(`/friends/search?q=${encodeURIComponent(query)}`);
  },

  sendFriendRequest: async (userId: string): Promise<{ success: boolean }> => {
    return apiCall('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  acceptFriendRequest: async (userId: string): Promise<{ success: boolean }> => {
    return apiCall('/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  declineFriendRequest: async (userId: string): Promise<{ success: boolean }> => {
    return apiCall('/friends/decline', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  getFriendsList: async (): Promise<FriendsResponse> => {
    return apiCall('/friends/list');
  },

  removeFriend: async (userId: string): Promise<{ success: boolean }> => {
    return apiCall(`/friends/${userId}`, {
      method: 'DELETE',
    });
  }
};

// Chats API functions
interface ChatResponse {
  chat: ChatData;
}

interface ChatsResponse {
  chats: ChatData[];
}

const chatsAPI: ChatAPI = {
  createChat: async (friendId: string): Promise<ChatResponse> => {
    return apiCall('/chats/create', {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    });
  },

  getChats: async (): Promise<ChatsResponse> => {
    return apiCall('/chats/list');
  },

  getChatMessages: async (chatId: string, page = 1): Promise<MessagesResponse> => {
    return apiCall(`/chats/${chatId}/messages?page=${page}`);
  },

  sendMessage: async (chatId: string, content: string, type = 'text'): Promise<MessageResponse> => {
    return apiCall(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  }
};

// Export the API instances
const api = {
  auth: authAPI,
  messages: messagesAPI,
  users: usersAPI,
  friends: friendsAPI,
  chats: chatsAPI
};

export {
  friendsAPI,
  chatsAPI,
  authAPI,
  messagesAPI,
  usersAPI
};

export default api;