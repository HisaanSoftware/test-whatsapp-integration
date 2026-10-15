import React from 'react';
import { WhatsAppContact } from '../types/whatsapp';

interface Props {
  contact: WhatsAppContact;
  isSelected: boolean;
  onClick: () => void;
}

export const ContactItem: React.FC<Props> = ({ contact, isSelected, onClick }) => {
  const formatTimestamp = (epochSeconds: number) => {
    if (!epochSeconds) return '';
    const now = new Date();
    const date = new Date(epochSeconds * 1000);

    const isToday = now.toDateString() === date.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === date.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors relative border-b border-slate-100/60 dark:border-slate-800/40 ${
        isSelected
          ? 'bg-slate-200/80 dark:bg-[#2a3942]'
          : 'hover:bg-slate-100/60 dark:hover:bg-[#202c33]/70'
      }`}
    >
      {/* Contact Avatar */}
      <div className="relative shrink-0">
        <img
          src={contact.avatarUrl}
          alt={contact.name}
          className="w-12 h-12 rounded-full object-cover bg-slate-200 dark:bg-[#111b21]"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              contact.name
            )}`;
          }}
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-semibold text-xs md:text-sm text-slate-900 dark:text-[#e9edef] truncate">
            {contact.name}
          </span>
          <span className="text-[11px] font-mono text-slate-400 dark:text-[#8696a0] tabular-nums shrink-0">
            {formatTimestamp(contact.lastMessageTimestamp)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-[#8696a0] truncate leading-tight">
            {contact.lastMessageText || 'No messages yet'}
          </p>

          {contact.unreadCount > 0 && (
            <span className="shrink-0 min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-[#00a884] text-white text-[11px] font-bold font-mono tabular-nums shadow-xs">
              {contact.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
