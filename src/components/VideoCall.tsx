import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface VideoCallProps {
  socket: Socket;
  userId: string;
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
        console.log('Received remote track:', event.track.kind);
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setCallStatus('connected');
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
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setCallStatus('connected');
        } else if (peerConnection.connectionState === 'failed' || 
                   peerConnection.connectionState === 'disconnected' ||
                   peerConnection.connectionState === 'closed') {
          handleEndCall();
        }
      };

      // If initiator, create and send offer
      if (isInitiator) {
        setCallStatus('ringing');
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit('webrtc_offer', {
          to: friendId,
          offer,
          callType,
          from: userId,
          fromName: friendName,
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

    // Handle incoming offer (receiver)
    socket.on('webrtc_offer', async (data: WebRTCOfferData) => {
      console.log('Received offer from:', data.from);
      if (data.to === userId && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );

          // Process queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) {
              await peerConnectionRef.current.addIceCandidate(candidate);
            }
          }

          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);

          socket.emit('webrtc_answer', {
            to: data.from,
            answer,
            chatId: data.chatId
          });

          setCallStatus('connected');
        } catch (err) {
          console.error('Error handling offer:', err);
          setError('Failed to establish connection.');
        }
      }
    });

    // Handle incoming answer (initiator)
    socket.on('webrtc_answer', async (data: WebRTCAnswerData) => {
      console.log('Received answer from:', data.from);
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'stable') {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );

          // Process queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) {
              await peerConnectionRef.current.addIceCandidate(candidate);
            }
          }

          setCallStatus('connected');
        } catch (err) {
          console.error('Error handling answer:', err);
        }
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
  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
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

      {/* Video containers */}
      <div className="flex-1 relative">
        {/* Remote video (full screen) */}
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
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
          )}
        </div>

        {/* Local video (picture-in-picture) */}
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
