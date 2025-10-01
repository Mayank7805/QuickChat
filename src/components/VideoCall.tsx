import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface VideoCallProps {
  socket: Socket;
  userId: string;
  userName: string;
  friendId: string;
  friendName: string;
  chatId: string;
  isInitiator: boolean;
  callType: 'audio' | 'video';
  onEndCall: () => void;
}

interface WebRTCOfferData {
  to: string;
  from: string;
  fromName: string;
  offer: RTCSessionDescriptionInit;
  callType: 'audio' | 'video';
  chatId: string;
}

interface WebRTCAnswerData {
  to: string;
  from?: string;
  answer: RTCSessionDescriptionInit;
  chatId: string;
}

interface WebRTCIceCandidateData {
  candidate: RTCIceCandidateInit;
}

interface WebRTCCallEndedData {
  chatId: string;
}

const VideoCall: React.FC<VideoCallProps> = ({
  socket,
  userId,
  userName,
  friendId,
  friendName,
  chatId,
  isInitiator,
  callType,
  onEndCall
}) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

  // WebRTC configuration with STUN servers
  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    setCallStatus('ended');
  }, [localStream]);

  // End call
  const handleEndCall = useCallback(() => {
    socket.emit('webrtc_call_ended', {
      to: friendId,
      chatId
    });
    cleanup();
    onEndCall();
  }, [socket, friendId, chatId, cleanup, onEndCall]);

  // Initialize media stream
  useEffect(() => {
    let mounted = true;

    const initializeMedia = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: callType === 'video' ? { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } : false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize peer connection after getting stream
        await initializePeerConnection(stream);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        if (mounted) {
          setError('Could not access camera/microphone. Please check permissions.');
          setCallStatus('ended');
        }
      }
    };

    initializeMedia();

    return () => {
      mounted = false;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callType]);

  // Ensure remote video/audio is playing when remoteStream changes
  useEffect(() => {
    if (!remoteStream) return;

    const videoTracks = remoteStream.getVideoTracks();
    const audioTracks = remoteStream.getAudioTracks();
    
    console.log('🎥 Remote stream changed:');
    console.log('  - Video tracks:', videoTracks.length, videoTracks.map(t => `enabled:${t.enabled}, state:${t.readyState}`));
    console.log('  - Audio tracks:', audioTracks.length, audioTracks.map(t => `enabled:${t.enabled}, state:${t.readyState}`));
    
    if (callType === 'video' && remoteVideoRef.current) {
      // For video calls, attach to video element
      remoteVideoRef.current.srcObject = remoteStream;
      
      // Force video element to load and play
      const playPromise = remoteVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('🎥 Remote video playing successfully');
        }).catch(err => {
          console.error('🎥 Error playing remote video:', err);
          // Auto-play might be blocked, user interaction required
          if (err.name === 'NotAllowedError') {
            console.log('🎥 Autoplay blocked - user interaction needed');
          }
        });
      }
    } else if (callType === 'audio' && remoteAudioRef.current) {
      // For audio calls, attach to audio element
      console.log('🎙️ Attaching remote stream to audio element');
      remoteAudioRef.current.srcObject = remoteStream;
      
      // Force audio element to load and play
      const playPromise = remoteAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('🎙️ Remote audio playing successfully');
        }).catch(err => {
          console.error('🎙️ Error playing remote audio:', err);
          if (err.name === 'NotAllowedError') {
            console.log('🎙️ Autoplay blocked - user interaction needed');
          }
        });
      }
    }
  }, [remoteStream, callType]);

  // Initialize peer connection
  const initializePeerConnection = async (stream: MediaStream) => {
    try {
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        console.log('🎥 Received remote track:', event.track.kind, 'readyState:', event.track.readyState);
        console.log('🎥 Track enabled:', event.track.enabled);
        console.log('🎥 Streams:', event.streams.length);
        
        if (event.streams && event.streams[0]) {
          const stream = event.streams[0];
          console.log('🎥 Remote stream tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', '));
          
          setRemoteStream(stream);
          
          if (callType === 'video' && remoteVideoRef.current) {
            console.log('🎥 Setting srcObject on remote video element');
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.load(); // Force reload
            
            // Ensure video plays
            remoteVideoRef.current.play().then(() => {
              console.log('🎥 Remote video play succeeded');
              setCallStatus('connected');
            }).catch(err => {
              console.error('🎥 Failed to play remote video:', err);
              // Try again after a short delay
              setTimeout(() => {
                remoteVideoRef.current?.play().catch(e => 
                  console.error('🎥 Retry play failed:', e)
                );
              }, 500);
            });
          } else if (callType === 'audio' && remoteAudioRef.current) {
            console.log('🎙️ Setting srcObject on remote audio element');
            remoteAudioRef.current.srcObject = stream;
            
            // Ensure audio plays
            remoteAudioRef.current.play().then(() => {
              console.log('🎙️ Remote audio play succeeded');
              setCallStatus('connected');
            }).catch(err => {
              console.error('🎙️ Failed to play remote audio:', err);
              // Try again after a short delay
              setTimeout(() => {
                remoteAudioRef.current?.play().catch(e => 
                  console.error('🎙️ Retry play failed:', e)
                );
              }, 500);
            });
          }
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          socket.emit('webrtc_ice_candidate', {
            to: friendId,
            candidate: event.candidate,
            chatId
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('📡 Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setCallStatus('connected');
        } else if (peerConnection.connectionState === 'failed' || 
                   peerConnection.connectionState === 'disconnected' ||
                   peerConnection.connectionState === 'closed') {
          handleEndCall();
        }
      };

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', peerConnection.iceConnectionState);
      };

      // Handle track negotiation
      peerConnection.onnegotiationneeded = async () => {
        try {
          console.log('🔄 Negotiation needed - creating new offer');
          if (peerConnection.signalingState !== 'stable') {
            console.log('🔄 Signaling state not stable, skipping negotiation');
            return;
          }
          
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          
          socket.emit('webrtc_offer', {
            to: friendId,
            offer,
            callType,
            from: userId,
            fromName: userName,
            chatId
          });
          console.log('🔄 Renegotiation offer sent');
        } catch (err) {
          console.error('🔄 Error during renegotiation:', err);
        }
      };

      // If initiator, create and send offer
      if (isInitiator) {
        setCallStatus('ringing');
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        console.log('Sending call offer to:', friendId, 'from:', userId, userName);
        socket.emit('webrtc_offer', {
          to: friendId,
          offer,
          callType,
          from: userId,
          fromName: userName,
          chatId
        });
      }
    } catch (err) {
      console.error('Error initializing peer connection:', err);
      setError('Failed to establish connection.');
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Handle call failed
    socket.on('call_failed', (data: { reason: string }) => {
      console.error('Call failed:', data.reason);
      setError(data.reason);
      setTimeout(() => {
        handleEndCall();
      }, 2000);
    });

    // Handle incoming offer (receiver)
    socket.on('webrtc_offer', async (data: WebRTCOfferData) => {
      console.log('📞 Received offer from:', data.from, data.fromName);
      console.log('📞 Current userId:', userId);
      console.log('📞 Peer connection exists:', !!peerConnectionRef.current);
      
      if (data.to === userId && peerConnectionRef.current) {
        try {
          console.log('📞 Setting remote description (offer)');
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );

          // Process queued ICE candidates
          console.log('📞 Processing queued ICE candidates:', iceCandidatesQueue.current.length);
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) {
              await peerConnectionRef.current.addIceCandidate(candidate);
            }
          }

          console.log('📞 Creating answer');
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);

          console.log('📞 Sending answer to:', data.from);
          socket.emit('webrtc_answer', {
            to: data.from,
            from: userId,
            answer,
            chatId: data.chatId
          });

          console.log('📞 Offer handled successfully');
          setCallStatus('connected');
        } catch (err) {
          console.error('❌ Error handling offer:', err);
          setError('Failed to establish connection.');
        }
      } else {
        console.log('⚠️ Ignoring offer - userId mismatch or no peer connection');
      }
    });

    // Handle incoming answer (initiator)
    socket.on('webrtc_answer', async (data: WebRTCAnswerData) => {
      console.log('📞 Received answer from:', data.from);
      console.log('📞 Signaling state:', peerConnectionRef.current?.signalingState);
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'stable') {
        try {
          console.log('📞 Setting remote description (answer)');
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );

          // Process queued ICE candidates
          console.log('📞 Processing queued ICE candidates:', iceCandidatesQueue.current.length);
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) {
              await peerConnectionRef.current.addIceCandidate(candidate);
            }
          }

          console.log('📞 Answer processed successfully');
          setCallStatus('connected');
        } catch (err) {
          console.error('❌ Error handling answer:', err);
        }
      } else {
        console.log('⚠️ Ignoring answer - signaling state:', peerConnectionRef.current?.signalingState);
      }
    });

    // Handle ICE candidates
    socket.on('webrtc_ice_candidate', async (data: WebRTCIceCandidateData) => {
      console.log('Received ICE candidate');
      if (peerConnectionRef.current) {
        try {
          const candidate = new RTCIceCandidate(data.candidate);
          
          if (peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(candidate);
          } else {
            // Queue the candidate if remote description is not set yet
            iceCandidatesQueue.current.push(candidate);
          }
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    // Handle call ended by remote peer
    socket.on('webrtc_call_ended', (data: WebRTCCallEndedData) => {
      if (data.chatId === chatId) {
        handleEndCall();
      }
    });

    return () => {
      socket.off('call_failed');
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('webrtc_call_ended');
    };
  }, [socket, userId, friendId, chatId, handleEndCall]);

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    if (!localStream || callType !== 'video' || !peerConnectionRef.current) return;

    try {
      if (!isVideoOff) {
        // Turning video OFF - disable tracks
        localStream.getVideoTracks().forEach(track => {
          track.enabled = false;
        });
        setIsVideoOff(true);
        console.log('🎥 Video disabled');
      } else {
        // Turning video ON - need to restart the track
        console.log('🎥 Restarting video track...');
        
        // Stop old video tracks
        localStream.getVideoTracks().forEach(track => track.stop());
        
        // Get new video track
        const newVideoStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        const newVideoTrack = newVideoStream.getVideoTracks()[0];
        
        // Replace the old video track in the peer connection
        const videoSender = peerConnectionRef.current.getSenders().find(
          sender => sender.track?.kind === 'video'
        );
        
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
          console.log('🎥 Video track replaced in peer connection');
        }
        
        // Add new video track to local stream
        localStream.addTrack(newVideoTrack);
        
        // Update local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        
        setIsVideoOff(false);
        console.log('🎥 Video enabled with new track');
      }
    } catch (err) {
      console.error('Error toggling video:', err);
      setError('Failed to toggle video');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-6 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-2xl font-semibold">{friendName}</h2>
            <p className="text-gray-300 text-sm mt-1">
              {callStatus === 'connecting' && 'Connecting...'}
              {callStatus === 'ringing' && 'Ringing...'}
              {callStatus === 'connected' && 'Connected'}
              {callStatus === 'ended' && 'Call Ended'}
            </p>
          </div>
          <button
            onClick={handleEndCall}
            className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-10">
          {error}
        </div>
      )}

      {/* Video/Audio containers */}
      <div className="flex-1 relative">
        {/* Remote video/audio display */}
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          {callType === 'video' ? (
            // Video call UI
            remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                controls={false}
                muted={false}
                className="w-full h-full object-cover"
                style={{ backgroundColor: '#000' }}
                onLoadedMetadata={() => {
                  console.log('🎥 Remote video metadata loaded');
                  console.log('  - Video dimensions:', remoteVideoRef.current?.videoWidth, 'x', remoteVideoRef.current?.videoHeight);
                  console.log('  - Ready state:', remoteVideoRef.current?.readyState);
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.play().catch(e => 
                      console.error('🎥 Play after metadata failed:', e)
                    );
                  }
                }}
                onCanPlay={() => {
                  console.log('🎥 Remote video can play');
                  remoteVideoRef.current?.play();
                }}
                onPlaying={() => console.log('🎥 Remote video is playing')}
                onWaiting={() => console.log('🎥 Remote video is waiting')}
                onStalled={() => console.log('🎥 Remote video stalled')}
                onSuspend={() => console.log('🎥 Remote video suspended')}
                onError={(e) => {
                  console.error('🎥 Remote video error:', e);
                  const video = e.currentTarget;
                  console.error('  - Error code:', video.error?.code);
                  console.error('  - Error message:', video.error?.message);
                }}
              />
            ) : (
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-4xl font-bold">
                    {friendName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-400 text-lg">Waiting for {friendName}...</p>
              </div>
            )
          ) : (
            // Audio call UI
            <div className="text-center">
              {/* Hidden audio element for audio calls */}
              {remoteStream && (
                <audio
                  ref={remoteAudioRef}
                  autoPlay
                  playsInline
                  className="hidden"
                  onLoadedMetadata={() => {
                    console.log('🎙️ Remote audio metadata loaded');
                    if (remoteAudioRef.current) {
                      remoteAudioRef.current.play().catch((e: Error) => 
                        console.error('🎙️ Play after metadata failed:', e)
                      );
                    }
                  }}
                  onPlaying={() => console.log('🎙️ Remote audio is playing')}
                  onError={(e) => {
                    console.error('🎙️ Remote audio error:', e);
                  }}
                />
              )}
              {/* Avatar display for audio call */}
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
                <span className="text-white text-6xl font-bold">
                  {friendName.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-white text-3xl font-semibold mb-2">{friendName}</h3>
              <p className="text-gray-400 text-xl">
                {callStatus === 'connecting' && 'Connecting...'}
                {callStatus === 'ringing' && 'Ringing...'}
                {callStatus === 'connected' && remoteStream ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    Voice call in progress
                  </span>
                ) : 'Connecting...'}
              </p>
            </div>
          )}
        </div>

        {/* Local video (picture-in-picture) - Only for video calls */}
        {callType === 'video' && (
          <div className="absolute top-24 right-6 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-xl border-2 border-gray-700 z-10">
            {!isVideoOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <VideoOff className="w-8 h-8 text-gray-500" />
              </div>
            )}
          </div>
        )}

        {/* Local audio indicator - For audio calls */}
        {callType === 'audio' && localStream && (
          <div className="absolute top-24 right-6 bg-gray-800/90 rounded-lg px-6 py-4 shadow-xl border-2 border-gray-700 z-10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-white text-sm font-medium">You</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8 z-10">
        <div className="flex items-center justify-center gap-6">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>

          {/* End call button */}
          <button
            onClick={handleEndCall}
            className="p-6 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-lg"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>

          {/* Video toggle button (only for video calls) */}
          {callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all ${
                isVideoOff
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 text-white" />
              ) : (
                <Video className="w-6 h-6 text-white" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
