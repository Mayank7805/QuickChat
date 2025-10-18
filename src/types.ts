export interface Friend {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  status?: string;
}

export interface FriendRequest {
  _id: string;
  username: string;
  displayName: string;
}

export interface Message {
  _id: string;
  sender: string;
  content: string;
  timestamp: string;
  type?: string;
}

export interface ChatData {
  _id: string;
  participants: string[];
  messages: Message[];
  friend: Friend;
}