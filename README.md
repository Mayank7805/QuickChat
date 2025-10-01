# QuickChat 💬

A modern, real-time chat application with voice and video calling capabilities built with React, Node.js, Socket.IO, and WebRTC.

![QuickChat](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.3.1-blue.svg)

## ✨ Features

### 💬 Messaging
- **Real-time messaging** with Socket.IO
- **Instant delivery** and notifications
- **Message persistence** with MongoDB
- **Chat history** with previous conversations
- **Message timestamps** with readable format
- **Typing indicators** (coming soon)
- **Message reactions** (coming soon)

### 👥 Friends & Social
- **Friend requests** system
- **User search** by username or display name
- **Friend list** with online/offline status
- **Status indicators** (online, offline, last seen)
- **Friend management** (add, accept, remove)

### 📞 Voice & Video Calls
- **HD Video calls** (up to 1280x720)
- **Voice calls** with crystal clear audio
- **WebRTC peer-to-peer** connection
- **Call controls**: Mute/unmute, video on/off
- **Incoming call notifications** with accept/reject
- **Call history** logged in chat
- **Picture-in-picture** local video view
- **Connection status** indicators
- **STUN server** integration for NAT traversal

### 👤 User Profiles
- **Profile pictures** with upload support
- **Display name** customization
- **Avatar storage** with base64 encoding
- **Profile editing** modal
- **User authentication** with JWT

### 🔔 Notifications
- **Unread message badges** on chat list
- **Friend request alerts**
- **New message notifications**
- **Real-time updates** across all devices

### 🎨 UI/UX
- **Modern design** with Tailwind CSS
- **Responsive layout** for all screen sizes
- **Smooth animations** and transitions
- **Intuitive interface** with clear navigation
- **Beautiful gradients** and color schemes
- **Dark mode ready** (coming soon)

## 🚀 Tech Stack

### Frontend
- **React 18.3.1** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.IO Client** - Real-time communication
- **Lucide React** - Beautiful icons
- **WebRTC** - Peer-to-peer calling

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - WebSocket library
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **dotenv** - Environment configuration

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16.0.0 or higher)
- **npm** or **yarn**
- **MongoDB** (local or Atlas cloud)
- **Git**

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/Mayank7805/QuickChat.git
cd QuickChat
```

### 2. Install dependencies

#### Backend
```bash
cd server
npm install
```

#### Frontend
```bash
cd ..
npm install
```

### 3. Environment Configuration

Create a `.env` file in the `server` directory:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/quickchat
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/quickchat

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# CORS Configuration (optional)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 4. Start MongoDB

If using local MongoDB:

```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

Or use MongoDB Atlas cloud database.

### 5. Run the application

#### Start Backend Server
```bash
cd server
npm start
# or
node index.cjs
```

The server will start on `http://localhost:5001`

#### Start Frontend Development Server
```bash
cd ..
npm run dev
```

The frontend will start on `http://localhost:5173`

## 📱 Usage

### Getting Started

1. **Register an Account**
   - Open `http://localhost:5173`
   - Click "Register" and create your account
   - Enter username, email, and password

2. **Add Friends**
   - Use the search feature to find users
   - Send friend requests
   - Accept incoming friend requests

3. **Start Chatting**
   - Click on a friend to open chat
   - Type your message and press Enter or click Send
   - Messages appear in real-time

4. **Make Calls**
   - Open a chat with your friend
   - Click the **phone icon** (📞) for voice call
   - Click the **video icon** (📹) for video call
   - Accept/reject incoming calls

5. **Update Profile**
   - Click on your profile picture
   - Upload a new avatar (max 5MB)
   - Edit your display name
   - Save changes

## 🎮 Controls & Shortcuts

### Chat Interface
- **Enter** - Send message
- **Escape** - Close modals
- Click chat - Open conversation
- Click back arrow - Return to chat list

### During Calls
- **Microphone button** - Mute/unmute audio
- **Video button** - Toggle camera on/off
- **Red phone button** - End call
- **X button** - Close call screen

## 📁 Project Structure

```
QuickChat/
├── server/                    # Backend code
│   ├── models/               # Mongoose models
│   │   ├── User.js          # User schema
│   │   ├── Message.js       # Message schema
│   │   └── Chat.js          # Chat schema
│   ├── routes/              # API routes
│   │   ├── auth.js          # Authentication routes
│   │   ├── users.js         # User management
│   │   ├── messages.js      # Message handling
│   │   ├── chats.js         # Chat operations
│   │   └── friends.js       # Friend system
│   ├── middleware/          # Custom middleware
│   │   └── auth.js          # JWT verification
│   ├── index.cjs            # Server entry point
│   └── package.json         # Backend dependencies
│
├── src/                      # Frontend code
│   ├── components/          # React components
│   │   ├── VideoCall.tsx    # Video/audio call interface
│   │   └── IncomingCall.tsx # Incoming call modal
│   ├── pages/               # Page components
│   │   ├── Login.tsx        # Login page
│   │   ├── Register.tsx     # Registration page
│   │   ├── Chat.tsx         # Main chat interface
│   │   └── Profile.tsx      # Profile editing
│   ├── api/                 # API client
│   │   └── index.ts         # API functions
│   ├── types.ts             # TypeScript interfaces
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
│
├── CALLING_FEATURE.md        # Call feature documentation
├── README.md                 # This file
├── package.json              # Frontend dependencies
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
└── tsconfig.json            # TypeScript config
```

## 🔧 Configuration

### Frontend Configuration

**Vite Config** (`vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5001'
    }
  }
})
```

### Backend Configuration

**Server Ports**:
- Backend: `5001`
- Frontend: `5173`

**CORS Origins**: Configure in `server/index.cjs`
```javascript
cors: {
  origin: ['http://localhost:5173'],
  credentials: true
}
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Friend search and requests
- [ ] Real-time messaging
- [ ] Message persistence
- [ ] Voice call initiation
- [ ] Video call with camera/mic
- [ ] Profile picture upload
- [ ] Notification badges
- [ ] Online/offline status

### Browser Compatibility

Tested on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

## 🔐 Security Features

- **Password hashing** with bcrypt
- **JWT authentication** for API routes
- **Protected WebSocket** connections
- **Input validation** on all forms
- **XSS protection** with React
- **CORS configuration** for API security
- **Encrypted media streams** (DTLS-SRTP) for calls

## 🐛 Known Issues & Limitations

- Call feature requires HTTPS in production for WebRTC
- Large file uploads (>5MB) not supported for avatars
- Group calls not yet implemented
- Screen sharing coming soon
- Call quality depends on internet connection

## 🚧 Roadmap

### Version 1.1
- [ ] Group chats
- [ ] File sharing
- [ ] Message editing/deletion
- [ ] Typing indicators
- [ ] Read receipts

### Version 1.2
- [ ] Group video calls
- [ ] Screen sharing
- [ ] Call recording
- [ ] Voice messages
- [ ] Message reactions

### Version 2.0
- [ ] End-to-end encryption
- [ ] Dark mode
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)
- [ ] Push notifications

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for frontend code
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful commit messages
- Add comments for complex logic

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Mayank**
- GitHub: [@Mayank7805](https://github.com/Mayank7805)
- Repository: [QuickChat](https://github.com/Mayank7805/QuickChat)

## 🙏 Acknowledgments

- [Socket.IO](https://socket.io/) - Real-time communication
- [WebRTC](https://webrtc.org/) - Peer-to-peer calling
- [Tailwind CSS](https://tailwindcss.com/) - UI styling
- [Lucide](https://lucide.dev/) - Beautiful icons
- [MongoDB](https://www.mongodb.com/) - Database
- [React](https://react.dev/) - UI library

## 📞 Support

For support, questions, or feedback:

- Open an issue on [GitHub Issues](https://github.com/Mayank7805/QuickChat/issues)
- Check the [CALLING_FEATURE.md](CALLING_FEATURE.md) for call feature documentation

## 📸 Screenshots

### Chat Interface
![Chat Interface](screenshots/chat.png)

### Video Call
![Video Call](screenshots/video-call.png)

### Profile Settings
![Profile](screenshots/profile.png)

---

**Made with ❤️ by Mayank**

*Happy Chatting! 💬📞📹*
