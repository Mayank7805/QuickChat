# Voice & Video Call Feature

## Overview
QuickChat now supports real-time voice and video calls using WebRTC technology. You can make peer-to-peer audio and video calls with your friends directly from the chat interface.

## Features

### Voice Calls 📞
- High-quality audio communication
- Mute/unmute microphone
- Real-time connection status
- Background operation support

### Video Calls 📹
- HD video quality (up to 1280x720)
- Picture-in-picture local video view
- Toggle camera on/off
- Mute/unmute audio
- Mirrored self-view

### Call History 💬
- Automatic call logging in chat
- Shows when calls start: "📞 Voice call started" or "📹 Video call started"
- Shows when calls end: "📞 Voice call ended" or "📹 Video call ended"
- Timestamps for all call events
- Centered display in chat (different from regular messages)

## How to Use

### Making a Call

1. **Start a Chat**
   - Open a chat with any friend from your friends list

2. **Initiate Call**
   - Click the **phone icon** (📞) in the chat header for voice call
   - Click the **video icon** (📹) in the chat header for video call

3. **Wait for Response**
   - The call will ring on the recipient's end
   - Wait for them to accept or reject

### Receiving a Call

1. **Incoming Call Notification**
   - A fullscreen modal will appear showing:
     - Caller's name and avatar
     - Call type (audio/video)
   
2. **Accept or Reject**
   - Click the **green phone icon** to accept
   - Click the **red phone icon** to reject

### During a Call

#### Controls Available:

1. **Mute/Unmute** (🎤)
   - Click the microphone button to toggle your audio
   - Red = muted, Gray = unmuted

2. **Video On/Off** (📹) - Video calls only
   - Click the video button to toggle your camera
   - Red = camera off, Gray = camera on

3. **End Call** (📞❌)
   - Click the large red button at the bottom center
   - Or click the X button in the top-right corner

#### Call Status Indicators:
- **Connecting...** - Establishing connection
- **Ringing...** - Waiting for other person to answer
- **Connected** - Call is active
- **Call Ended** - Call has been terminated

## Technical Details

### WebRTC Configuration
- Uses Google STUN servers for NAT traversal
- Peer-to-peer connection (no media server required)
- Automatic ICE candidate gathering
- Support for both audio and video streams

### Video Quality
- **Resolution**: Up to 1280x720 (720p HD)
- **Frame Rate**: Adaptive based on connection
- **Codec**: Browser default (typically VP8/VP9 or H.264)

### Browser Requirements
- Modern browsers with WebRTC support:
  - Chrome 56+
  - Firefox 44+
  - Safari 11+
  - Edge 79+

### Permissions Required
- **Microphone** access for audio calls
- **Camera + Microphone** access for video calls

## Troubleshooting

### Call Not Connecting?
1. Check if both users are online
2. Verify microphone/camera permissions
3. Try refreshing the page
4. Check your internet connection

### No Audio/Video?
1. Grant browser permissions for camera/microphone
2. Check if devices are properly connected
3. Try a different browser
4. Verify device is not being used by another application

### Poor Quality?
1. Check internet connection speed
2. Close other bandwidth-heavy applications
3. Move closer to WiFi router
4. Consider using audio-only call

## Privacy & Security

- All calls are peer-to-peer (direct connection between users)
- Media streams are encrypted using DTLS-SRTP
- No call recording or monitoring
- Calls end immediately when either user hangs up

## Future Enhancements

Planned features:
- Group voice/video calls
- Screen sharing
- Call history
- Background blur for video
- Noise cancellation
- Call quality indicators
- Recording functionality

## Support

If you encounter any issues with the calling feature:
1. Check browser console for errors
2. Verify both users have stable internet
3. Ensure latest browser version
4. Report bugs with details of the issue

---

**Note**: The calling feature requires both users to be online and connected to the chat server. Calls will automatically end if either user loses connection.
