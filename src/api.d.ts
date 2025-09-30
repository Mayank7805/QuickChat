import { Friend, FriendRequest, Message, ChatData } from './types';

interface ChatAPI {
  getChats: () => Promise<{ chats: ChatData[] }>;
  getChatMessages: (chatId: string, page?: number) => Promise<{ messages: Message[] }>;
  createChat: (friendId: string) => Promise<{ chat: ChatData }>;
  sendMessage: (chatId: string, content: string, type?: string) => Promise<{ message: Message }>;
}

interface FriendsAPI {
  getFriendsList: () => Promise<{ 
    friends: Friend[],
    pendingRequests: { received: FriendRequest[], sent: FriendRequest[] }
  }>;
  searchUsers: (query: string) => Promise<{ users: Friend[] }>;
  sendFriendRequest: (userId: string) => Promise<void>;
  acceptFriendRequest: (userId: string) => Promise<void>;
  declineFriendRequest: (userId: string) => Promise<void>;
}

export {
  ChatAPI,
  FriendsAPI,
};
