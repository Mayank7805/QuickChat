# Video Call Debugging Guide

## Recent Fixes Applied

### 1. **Video Toggle Fix**
   - Previously: Only enabled/disabled tracks without proper cleanup
   - Now: Completely stops and restarts video tracks with peer connection renegotiation
   - Uses `replaceTrack()` to update the peer connection without dropping the call

### 2. **Remote Stream Handling**
   - Added comprehensive logging for all remote tracks
   - Added multiple event listeners: `onCanPlay`, `onWaiting`, `onStalled`, `onSuspend`
   - Force reload with `load()` method when stream changes
   - Retry logic for autoplay failures

### 3. **Renegotiation Support**
   - Added `onnegotiationneeded` event handler
   - Automatically creates new offers when tracks change
   - Properly handles signaling state to avoid conflicts

### 4. **Enhanced Debugging**
   - Added emojis for easy log filtering:
     - 🎥 = Video/stream events
     - 📡 = Connection state
     - 🧊 = ICE connection
     - 🔄 = Renegotiation
   - Tracks video dimensions, ready state, and error codes

## Testing Steps

### Test 1: Basic Video Call
1. Open two browsers (Chrome recommended)
2. Login as different users (e.g., admin1 and admin)
3. Start a video call
4. **Expected Console Logs:**
   ```
   🎥 Received remote track: video readyState: live
   🎥 Track enabled: true
   🎥 Remote stream tracks: video:true, audio:true
   📡 Connection state: connected
   🎥 Remote video metadata loaded
   🎥 Remote video can play
   🎥 Remote video is playing
   ```
5. **Expected Result:** Both users see each other's video

### Test 2: Video Toggle
1. While on a call, click the video button to turn off camera
2. **Expected Console Logs:**
   ```
   🎥 Video disabled
   ```
3. Click video button again to turn on camera
4. **Expected Console Logs:**
   ```
   🎥 Restarting video track...
   🎥 Video track replaced in peer connection
   🔄 Negotiation needed - creating new offer
   🔄 Renegotiation offer sent
   🎥 Video enabled with new track
   ```
5. **Expected Result:** Remote user sees video turn off and back on

### Test 3: Remote Video Verification
1. On the **receiving** side, open DevTools Console
2. When remote video should appear, check for:
   - `🎥 Setting srcObject on remote video element`
   - `🎥 Remote video play succeeded`
   - Video element dimensions (should not be 0x0)
3. If no video appears, look for:
   - `🎥 Remote video error` - Check error code
   - `🎥 Autoplay blocked - user interaction needed` - Click video area
   - Missing track logs - Peer connection issue

## Common Issues & Solutions

### Issue 1: Remote Video Not Showing
**Symptoms:** Connection says "Connected" but remote video area is black/placeholder

**Check:**
```javascript
// In browser console, run:
document.querySelector('video').srcObject
// Should show a MediaStream with getTracks()

document.querySelector('video').readyState
// Should be 4 (HAVE_ENOUGH_DATA)
```

**Solutions:**
1. Click on the remote video area (autoplay might be blocked)
2. Check browser permissions: Settings → Site Settings → Camera & Microphone
3. Try Chrome/Edge (best WebRTC support)
4. Disable browser extensions that might block media

### Issue 2: Video Disappears After Toggle
**Symptoms:** After turning camera off/on, remote user can't see you

**Check Console For:**
- `🔄 Renegotiation offer sent` - Should appear after toggling
- `📞 Received webrtc_offer` - Should appear on remote side

**Solutions:**
1. Ensure both users are using the latest code
2. Check network connection (stable WiFi/Ethernet)
3. Try refreshing both browser windows

### Issue 3: Video Freezes
**Symptoms:** Video shows but doesn't update (frozen frame)

**Check Console For:**
- `🎥 Remote video stalled` or `🎥 Remote video waiting`
- `📡 Connection state: disconnected`

**Solutions:**
1. Check internet connection speed (need >1 Mbps)
2. Close other bandwidth-heavy applications
3. Try different STUN servers (already configured with Google's)

### Issue 4: Can't Hear Audio
**Symptoms:** Video works but no audio

**Check:**
1. Remote video element should have `muted={false}` (not muted)
2. Browser audio permissions granted
3. System volume not muted
4. Check DevTools: `remoteStream.getAudioTracks()[0].enabled` should be `true`

## Browser Console Commands

### Check Local Stream
```javascript
// Get all video elements
document.querySelectorAll('video')

// Check local video
const localVideo = document.querySelectorAll('video')[0]
console.log('Local stream:', localVideo.srcObject)
console.log('Local tracks:', localVideo.srcObject?.getTracks())
```

### Check Remote Stream
```javascript
// Check remote video (usually the second video element)
const remoteVideo = document.querySelectorAll('video')[1]
console.log('Remote stream:', remoteVideo.srcObject)
console.log('Remote tracks:', remoteVideo.srcObject?.getTracks())
console.log('Video dimensions:', remoteVideo.videoWidth, 'x', remoteVideo.videoHeight)
console.log('Ready state:', remoteVideo.readyState) // 4 = HAVE_ENOUGH_DATA
```

### Check Peer Connection
```javascript
// Note: You need to access the component's internal state
// Look for logs instead:
// Filter console by "📡" or "Connection state"
```

## Network Requirements

- **Minimum bandwidth:** 1 Mbps upload/download
- **Recommended:** 3+ Mbps for HD video
- **Latency:** <100ms for good quality
- **Ports:** Ensure UDP ports 3478-3479 are open (STUN)

## Browser Compatibility

| Browser | Video Call | Screen Share | Notes |
|---------|-----------|--------------|-------|
| Chrome 90+ | ✅ Excellent | ✅ | Best support |
| Edge 90+ | ✅ Excellent | ✅ | Chromium-based |
| Firefox 88+ | ✅ Good | ✅ | Good support |
| Safari 14+ | ⚠️ Limited | ⚠️ | Use Chrome if issues |
| Mobile Chrome | ✅ Good | ❌ | Works well |
| Mobile Safari | ⚠️ Limited | ❌ | iOS restrictions |

## Advanced Debugging

### Enable Verbose WebRTC Logging (Chrome)
1. Open new tab: `chrome://webrtc-internals/`
2. Start a video call
3. Watch the detailed WebRTC stats and events
4. Check for ICE candidate failures, packet loss, or connection issues

### Check Network Stats During Call
```javascript
// Get peer connection stats (if exposed)
// Look for these in the internals page:
// - bytesSent/bytesReceived
// - packetsLost
// - jitter
// - roundTripTime
```

## Contact & Support

If issues persist after trying these solutions:
1. Share the complete browser console output (with 🎥📡🔄 logs)
2. Include browser version and OS
3. Describe the exact steps to reproduce
4. Include screenshots if helpful
