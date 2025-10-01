import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';

interface IncomingCallProps {
  callerName: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCall: React.FC<IncomingCallProps> = ({
  callerName,
  callType,
  onAccept,
  onReject
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 animate-pulse">
        {/* Caller avatar */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 border-4 border-white/30">
            <span className="text-white text-5xl font-bold">
              {callerName.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Caller name */}
          <h2 className="text-white text-3xl font-bold mb-2 text-center">
            {callerName}
          </h2>

          {/* Call type */}
          <div className="flex items-center gap-2 mb-8">
            {callType === 'video' ? (
              <Video className="w-5 h-5 text-white" />
            ) : (
              <Phone className="w-5 h-5 text-white" />
            )}
            <p className="text-white text-lg">
              Incoming {callType} call...
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-6">
            {/* Reject button */}
            <button
              onClick={onReject}
              className="p-6 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-lg hover:scale-110 active:scale-95"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>

            {/* Accept button */}
            <button
              onClick={onAccept}
              className="p-6 rounded-full bg-green-500 hover:bg-green-600 transition-all shadow-lg hover:scale-110 active:scale-95"
            >
              <Phone className="w-8 h-8 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCall;
