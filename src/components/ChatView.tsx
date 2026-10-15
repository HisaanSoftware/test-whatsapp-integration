import React, { useRef, useEffect } from 'react';
import { WhatsAppContact, WhatsAppMessage } from '../types/whatsapp';
import { MessageBubble } from './MessageBubble';
import { Lock, Sparkles, CheckCheck, ShieldCheck, Phone, Info } from 'lucide-react';

interface Props {
  contact: WhatsAppContact | null;
  messages: WhatsAppMessage[];
  isDark: boolean;
  onOpenSetup: () => void;
  onOpenSimulator: (phone?: string) => void;
  onMarkRead: (phone: string) => void;
}

export const ChatView: React.FC<Props> = ({
  contact,
  messages,
  isDark,
  onOpenSetup,
  onOpenSimulator,
  onMarkRead,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on messages update
  useEffect(() => {
    if (contact && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [contact, messages]);

  // Mark as read when opening contact if unread
  useEffect(() => {
    if (contact && contact.unreadCount > 0) {
      onMarkRead(contact.phone);
    }
  }, [contact?.phone]);

  if (!contact) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center select-none ${
        isDark ? 'whatsapp-chat-bg-dark text-[#8696a0]' : 'whatsapp-chat-bg-light text-slate-500'
      }`}>
        <div className="max-w-md flex flex-col items-center space-y-4">
          <div className="w-18 h-18 rounded-full bg-slate-200/50 dark:bg-slate-800/60 flex items-center justify-center text-[#00a884] mb-2 shadow-xs">
            <Lock className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-[#e9edef] tracking-tight">
            WhatsApp Web Message Viewer
          </h2>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-[#8696a0]">
            Monitor and list all incoming messages received on your WhatsApp number in real time without outbound messaging.
          </p>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={onOpenSetup}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Webhook Setup</span>
            </button>
            <button
              onClick={() => onOpenSimulator()}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-[#e9edef] hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-[#00a884]" />
              <span>Simulate Message</span>
            </button>
          </div>

          <div className="pt-8 text-[11px] text-slate-400 dark:text-[#8696a0] flex items-center gap-1.5 justify-center">
            <Lock className="w-3.5 h-3.5 text-[#00a884]" />
            <span>Official Meta WhatsApp Cloud API Webhook Integration</span>
          </div>
        </div>
      </div>
    );
  }

  // Filter messages for current contact
  const contactMessages = messages.filter((m) => m.from === contact.phone);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-[#0b141a]">
      {/* Chat Top Header */}
      <div className="h-16 px-4 bg-slate-50 dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={contact.avatarUrl}
            alt={contact.name}
            className="w-10 h-10 rounded-full object-cover bg-slate-200 dark:bg-slate-700 shrink-0"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                contact.name
              )}`;
            }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-[#e9edef] truncate">
                {contact.name}
              </h3>
              <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-[#8696a0] tabular-nums">
                ({contact.phone})
              </span>
            </div>
            <p className="text-[11px] text-[#00a884] dark:text-[#00a884] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]"></span>
              Incoming channel: Meta WhatsApp Cloud API
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onOpenSimulator(contact.phone)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200/80 dark:bg-slate-700/60 text-slate-700 dark:text-[#e9edef] hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
            title="Simulate incoming WhatsApp message from this contact"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00a884]" />
            <span className="hidden sm:inline">Simulate Incoming</span>
          </button>
          {contact.unreadCount > 0 && (
            <button
              onClick={() => onMarkRead(contact.phone)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#00a884] hover:bg-slate-200/80 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-1"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream Viewport with authentic WhatsApp background */}
      <div
        className={`flex-1 overflow-y-auto px-4 py-4 md:px-8 space-y-3 ${
          isDark ? 'whatsapp-chat-bg-dark' : 'whatsapp-chat-bg-light'
        }`}
      >
        {/* Date / Security Notice Banner */}
        <div className="flex justify-center my-2">
          <div className="px-3 py-1 rounded-lg bg-slate-200/80 dark:bg-[#182229]/90 text-slate-600 dark:text-[#8696a0] text-[11px] text-center max-w-sm shadow-xs border border-slate-300/40 dark:border-slate-800/60">
            Messages received via Meta WhatsApp Webhook are listed below in chronological order.
          </div>
        </div>

        {contactMessages.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 dark:text-[#8696a0]">
            No messages from this contact yet. Click "Simulate Incoming" to send a test message.
          </div>
        ) : (
          contactMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} showSenderName={false} />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pinned Read-Only Status Bar (no input bar as user requested no replies) */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-[#8696a0] shrink-0 gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#00a884] shrink-0" />
          <p className="text-[11px] md:text-xs">
            <span className="font-semibold text-slate-800 dark:text-[#e9edef]">Read-only WhatsApp Stream:</span>{' '}
            Replying is disabled as requested. Inbound messages received on your WhatsApp number appear here in real time.
          </p>
        </div>

        <button
          onClick={() => onOpenSimulator(contact.phone)}
          className="shrink-0 px-3 py-1.5 rounded-md bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Test Inbound</span>
        </button>
      </div>
    </div>
  );
};
