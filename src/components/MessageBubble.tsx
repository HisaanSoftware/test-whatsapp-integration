import React, { useState } from 'react';
import { WhatsAppMessage } from '../types/whatsapp';
import { Play, Pause, MapPin, FileText, ExternalLink, X } from 'lucide-react';

interface Props {
  message: WhatsAppMessage;
  showSenderName?: boolean;
}

export const MessageBubble: React.FC<Props> = ({ message, showSenderName = true }) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);

  const formatTime = (epochSeconds: number) => {
    const d = new Date(epochSeconds * 1000);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <>
      <div className="flex flex-col items-start mb-2 group">
        <div className="relative max-w-[85%] md:max-w-[70%] rounded-lg px-3 py-2 text-xs md:text-sm bg-white dark:bg-[#202c33] text-slate-900 dark:text-[#e9edef] shadow-xs border border-slate-200/50 dark:border-slate-800/50">
          {/* Subtle Speech Bubble Tail */}
          <div className="absolute top-0 -left-1.5 w-2 h-2.5 overflow-hidden">
            <svg viewBox="0 0 8 10" className="w-2 h-2.5 fill-white dark:fill-[#202c33]">
              <path d="M8,0 C8,4 0,0 0,0 L8,10 Z" />
            </svg>
          </div>

          {/* Sender Name in distinct WhatsApp accent */}
          {showSenderName && (
            <div className="font-semibold text-xs text-[#00a884] dark:text-[#53bdeb] mb-1 leading-tight">
              {message.senderName || message.from}
            </div>
          )}

          {/* Content: Photo / Image */}
          {message.type === 'image' && (
            <div className="space-y-1.5 mb-1">
              {message.mediaUrl && (
                <div
                  onClick={() => setShowImageLightbox(true)}
                  className="relative rounded-md overflow-hidden cursor-pointer group/img max-h-72 bg-slate-100 dark:bg-[#111b21]"
                >
                  <img
                    src={message.mediaUrl}
                    alt={message.mediaCaption || 'Shared photo'}
                    className="w-full h-auto object-cover rounded-md group-hover/img:scale-102 transition-transform duration-200"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover/img:opacity-100 text-[10px] text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs transition-opacity">
                      Click to expand
                    </span>
                  </div>
                </div>
              )}
              {message.mediaCaption && (
                <p className="text-slate-800 dark:text-[#e9edef] whitespace-pre-wrap leading-relaxed mt-1">
                  {message.mediaCaption}
                </p>
              )}
            </div>
          )}

          {/* Content: Voice Note / Audio */}
          {message.type === 'audio' && (
            <div className="flex items-center gap-3 my-1 p-2 rounded-lg bg-slate-50 dark:bg-[#111b21]/70 border border-slate-200/50 dark:border-slate-800/60 min-w-[220px]">
              <button
                type="button"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0 hover:bg-[#008f6f] transition-colors"
              >
                {isPlayingAudio ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <div className="flex-1 space-y-1">
                {/* Simulated waveform bars */}
                <div className="flex items-center gap-0.5 h-4">
                  {[4, 9, 14, 8, 12, 16, 7, 13, 10, 15, 6, 12, 14, 8, 11, 7, 10, 5].map((h, i) => (
                    <div
                      key={i}
                      className={`w-0.5 rounded-full transition-all ${
                        isPlayingAudio && i % 3 === 0
                          ? 'bg-[#00a884] animate-pulse'
                          : 'bg-slate-300 dark:bg-[#8696a0]'
                      }`}
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-[#8696a0] font-mono tabular-nums">
                  <span>{isPlayingAudio ? '0:07' : '0:24'}</span>
                  <span>Voice Note</span>
                </div>
              </div>
            </div>
          )}

          {/* Content: Location */}
          {message.type === 'location' && message.location && (
            <div className="my-1 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#111b21]">
              <div className="p-2.5 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs text-slate-900 dark:text-[#e9edef] truncate">
                    {message.location.name || 'Shared Location'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[#8696a0] truncate">
                    {message.location.address || `${message.location.latitude.toFixed(4)}, ${message.location.longitude.toFixed(4)}`}
                  </p>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${message.location.latitude},${message.location.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="block text-center py-1.5 px-3 bg-slate-100 dark:bg-[#1f2c34] text-[11px] font-medium text-[#00a884] hover:underline border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center gap-1"
              >
                <span>View on Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Content: Document */}
          {message.type === 'document' && (
            <div className="flex items-center gap-3 my-1 p-2.5 rounded-lg bg-slate-50 dark:bg-[#111b21] border border-slate-200/60 dark:border-slate-700/60 min-w-[200px]">
              <div className="w-8 h-8 rounded-md bg-[#00a884]/15 text-[#00a884] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs text-slate-900 dark:text-[#e9edef] truncate">
                  {message.filename || 'Document.pdf'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-[#8696a0]">PDF Attachment</p>
              </div>
            </div>
          )}

          {/* Content: Regular Text (when not image/audio/location/document) */}
          {message.type === 'text' && (
            <p className="text-slate-800 dark:text-[#e9edef] whitespace-pre-wrap leading-relaxed break-words">
              {message.text}
            </p>
          )}

          {/* Bottom Timestamp & Status */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-mono text-slate-400 dark:text-[#8696a0] tabular-nums select-none">
            <span>{formatTime(message.timestamp)}</span>
            <span className="text-[9px] text-[#00a884]">✓✓</span>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Photo */}
      {showImageLightbox && message.mediaUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setShowImageLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setShowImageLightbox(false)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={message.mediaUrl}
              alt={message.mediaCaption || 'Full view'}
              className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl"
            />
            {message.mediaCaption && (
              <p className="text-white text-xs mt-3 bg-black/60 px-4 py-1.5 rounded-full">
                {message.mediaCaption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
