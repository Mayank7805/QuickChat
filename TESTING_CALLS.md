# Testing Voice & Video Calls Guide

## ✅ Fixed Issues

The calling feature has been improved with the following fixes:

### 1. **Proper Caller Identification**
- ✅ Caller's name is now correctly sent with the call
- ✅ Recipient sees the actual caller's name in incoming call modal
- ✅ Added `userName` parameter to pass current user's display name

### 2. **Enhanced Server-Side Signaling**
- ✅ Detailed logging for debugging call flow
- ✅ Online users tracking verification
- ✅ Call failure notification when recipient is offline
- ✅ Proper routing of WebRTC signals (offer, answer, ICE candidates)

### 3. **Improved Client-Side Handling**
- ✅ Added call_failed event listener
- ✅ Better error messages when connection fails
- ✅ Proper cleanup of event listeners
- ✅ Enhanced logging for debugging

## 🧪 How to Test the Calling Feature

### Prerequisites
1. Open **TWO different browsers** (e.g., Chrome and Firefox) OR
2. Open **TWO incognito/private windows** in the same browser OR
3. Use **TWO different devices**

### Step-by-Step Testing

#### Setup (Do this in BOTH browsers):

1. **Register Two Accounts**
   - Browser 1: Register as "User1" (email: user1@test.com)
   - Browser 2: Register as "User2" (email: user2@test.com)

2. **Add Each Other as Friends**
   - In Browser 1: Search for "User2" and send friend request
   - In Browser 2: Accept the friend request from "User1"

3. **Verify Connection**
   - Both users should see each other in friends list
   - Check that online status indicators are green

#### Test Voice Call:

1. **Browser 1 (Caller):**
   - Click on "User2" to open chat
   - Click the **phone icon (📞)** in the chat header
   - You should see "Ringing..." status

2. **Browser 2 (Receiver):**
   - You should see a **pop-up modal** with:
     - "User1" as caller name
     - "Incoming audio call..." message
     - Accept (green) and Reject (red) buttons

3. **Accept the Call:**
   - Click the **green Accept button** in Browser 2
   - Both browsers should show "Connected" status
   - Test microphone by speaking

4. **During Call:**
   - Test **Mute/Unmute** button (microphone icon)
   - Verify audio quality
   - End call using red phone button

5. **Verify Call History:**
   - Check chat for call messages:
     - "📞 Voice call started" with timestamp
     - "📞 Voice call ended" with timestamp

#### Test Video Call:

1. **Browser 1 (Caller):**
   - Click on "User2" to open chat
   - Click the **video icon (📹)** in the chat header
   - You should see "Ringing..." status

2. **Browser 2 (Receiver):**
   - You should see a **pop-up modal** with:
     - "User1" as caller name
     - "Incoming video call..." message
     - Video camera icon
     - Accept and Reject buttons

3. **Accept the Call:**
   - Click Accept button
   - **Grant camera and microphone permissions** when prompted
   - Both browsers should show video feed

4. **During Video Call:**
   - Verify you can see the other person's video (full screen)
   - Verify your own video (small picture-in-picture)
   - Test controls:
     - **Mute button** - Toggle microphone
     - **Video button** - Turn camera on/off
     - **End call button** - Hang up

5. **Verify Call History:**
   - Check chat for:
     - "📹 Video call started"
     - "📹 Video call ended"

## 🐛 Troubleshooting

### Issue: No incoming call notification appears

**Check:**
1. Open **Browser Console** (F12) in both browsers
2. Look for:
   ```
   📞 WebRTC offer from [userId] ([userName]) to [friendId]
   ✅ Sending offer to recipient socket: [socketId]
   ```
3. In receiver browser, look for:
   ```
   Received offer from: [userId] [userName]
   Incoming call from: [userId]
   ```

**Solutions:**
- Ensure both users are **online** (green dot)
- Refresh both browser pages
- Re-login if necessary
- Check that MongoDB is running
- Verify Socket.IO connection in console

### Issue: Call connects but no audio/video

**Check:**
1. Browser permissions for camera/microphone
2. Click the **camera icon** in browser address bar
3. Allow permissions for localhost:5173

**Solutions:**
- Go to browser Settings → Privacy → Camera/Microphone
- Ensure localhost is allowed
- Try a different browser
- Check if camera/mic is being used by another app

### Issue: Connection fails or drops

**Check Server Logs:**
```
📞 WebRTC offer from...
📞 ICE candidate from...
📞 WebRTC answer from...
```

**Solutions:**
- Check internet connection
- Ensure firewall isn't blocking WebRTC
- Try disabling browser extensions
- Check NAT/router settings

### Issue: "User is offline" error

**Check:**
1. Server console shows online users:
   ```
   Online users: [ 'userId1', 'userId2' ]
   ```
2. Recipient has green online indicator

**Solutions:**
- Ensure recipient is logged in
- Check Socket.IO connection
- Refresh recipient's browser
- Check server logs for user_join event

## 📊 Expected Console Logs

### Successful Call Flow:

**Caller Browser:**
```
Sending call offer to: [friendId] from: [userId] [userName]
```

**Server:**
```
📞 WebRTC offer from [userId] ([userName]) to [friendId]
   Call type: audio
   Online users: [ 'userId1', 'userId2' ]
   ✅ Sending offer to recipient socket: [socketId]
📞 WebRTC answer from [friendId] to [userId]
   ✅ Sending answer to caller socket: [socketId]
📞 ICE candidate from [userId] to [friendId]
📞 ICE candidate from [friendId] to [userId]
```

**Receiver Browser:**
```
Received offer from: [userId] [userName]
Incoming call from: [userId]
Sending answer to: [userId]
Connection state: connected
```

## ✅ Success Criteria

A successful call should:
- ✅ Show incoming call modal on receiver's screen
- ✅ Display correct caller name
- ✅ Allow accept/reject actions
- ✅ Establish audio/video connection
- ✅ Show "Connected" status on both ends
- ✅ Allow mute/unmute controls
- ✅ Show local and remote video (for video calls)
- ✅ Log call events in chat history
- ✅ Clean disconnect when call ends

## 🔍 Debug Mode

To see detailed logs:

1. **Open Browser Console** (F12)
2. **Look for these key events:**
   - Socket connection
   - User join events
   - WebRTC offer/answer
   - ICE candidates
   - Connection state changes

3. **Check Server Terminal** for:
   - User online status
   - WebRTC signaling messages
   - Socket routing confirmation

## 📞 Support

If issues persist:
1. Check all console logs in both browsers
2. Verify server terminal output
3. Ensure MongoDB is running
4. Try with fresh user accounts
5. Test in different browsers

---

**Happy Testing! 🎉**
