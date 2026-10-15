import React, { useState } from 'react';
import { X, Send, Sparkles, Image, MessageSquare, Mic, MapPin, CheckCircle2 } from 'lucide-react';
import { WhatsAppContact } from '../types/whatsapp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contacts: WhatsAppContact[];
  onMessageSent: () => void;
  defaultContactPhone?: string;
}

export const SimulatorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  contacts,
  onMessageSent,
  defaultContactPhone,
}) => {
  const [selectedContactPhone, setSelectedContactPhone] = useState<string>(
    defaultContactPhone || (contacts[0]?.phone || '+14155552671')
  );
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [messageType, setMessageType] = useState<'text' | 'image' | 'audio' | 'location'>('text');
  const [messageText, setMessageText] = useState('Hey there! Just checking in on the project status.');
  const [mediaCaption, setMediaCaption] = useState('Shared screenshot attachment');
  const [locationName, setLocationName] = useState('Market Street Tech Campus');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successStatus, setSuccessStatus] = useState(false);

  if (!isOpen) return null;

  const currentContact = contacts.find((c) => c.phone === selectedContactPhone);

  const presets = [
    {
      title: 'Project Update',
      type: 'text' as const,
      text: 'Just pushed the final revision to staging. Feel free to review whenever you have time!',
    },
    {
      title: 'Meeting Request',
      type: 'text' as const,
      text: 'Are you available for a quick 10-minute sync this afternoon around 3:30 PM?',
    },
    {
      title: 'Design Blueprint',
      type: 'image' as const,
      text: 'Here is the system architecture overview we discussed.',
      caption: 'System Architecture Blueprint V2',
    },
    {
      title: 'Voice Note',
      type: 'audio' as const,
      text: 'Voice message (0:24)',
    },
    {
      title: 'Office Location',
      type: 'location' as const,
      text: '📍 Market Street Tech Campus',
      location: 'Market Street Tech Campus',
    },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setMessageType(p.type);
    setMessageText(p.text);
    if (p.caption) setMediaCaption(p.caption);
    if (p.location) setLocationName(p.location);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessStatus(false);

    try {
      const payload: any = {
        type: messageType,
        text: messageText,
      };

      if (isCustom) {
        payload.senderName = customName || 'WhatsApp User';
        payload.phone = customPhone || '+15550001234';
      } else {
        payload.senderName = currentContact?.name || 'Contact';
        payload.phone = selectedContactPhone;
      }

      if (messageType === 'image') {
        payload.mediaCaption = mediaCaption || messageText;
        payload.mediaUrl = '/src/assets/images/mockup_project_diagram_1792083940690.jpg';
      } else if (messageType === 'location') {
        payload.locationName = locationName;
        payload.latitude = 37.7749;
        payload.longitude = -122.4194;
      }

      const res = await fetch('/api/simulate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessStatus(true);
        onMessageSent();
        setTimeout(() => {
          setSuccessStatus(false);
          onClose();
        }, 800);
      }
    } catch (err) {
      console.error('Failed to simulate incoming message:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1f2c34] text-slate-900 dark:text-[#e9edef] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111b21]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#00a884]/15 dark:bg-[#00a884]/25 flex items-center justify-center text-[#00a884]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Simulate Incoming WhatsApp Message</h2>
              <p className="text-xs text-slate-500 dark:text-[#8696a0]">Test real-time webhook ingestion and audio chime</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#e9edef] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Quick Presets */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8696a0] mb-2">
              Quick Templates
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-[#111b21] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-[#d1d7db] transition-colors border border-slate-200/60 dark:border-slate-700/60"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Sender Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8696a0]">
                Sender
              </label>
              <button
                type="button"
                onClick={() => setIsCustom(!isCustom)}
                className="text-[11px] text-[#00a884] hover:underline font-medium"
              >
                {isCustom ? '← Pick Existing Contact' : '+ New Phone Number'}
              </button>
            </div>

            {!isCustom ? (
              <select
                value={selectedContactPhone}
                onChange={(e) => setSelectedContactPhone(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#111b21] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-[#e9edef] focus:outline-none"
              >
                {contacts.map((c) => (
                  <option key={c.phone} value={c.phone}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Contact Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. David Vance"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-[#111b21] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-[#e9edef] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +14159876543"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-[#111b21] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 dark:text-[#e9edef] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Message Type Selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8696a0] mb-2">
              Message Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: 'text' as const, label: 'Text', icon: MessageSquare },
                { type: 'image' as const, label: 'Photo', icon: Image },
                { type: 'audio' as const, label: 'Voice Note', icon: Mic },
                { type: 'location' as const, label: 'Location', icon: MapPin },
              ].map((item) => {
                const Icon = item.icon;
                const active = messageType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setMessageType(item.type)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-colors gap-1.5 ${
                      active
                        ? 'border-[#00a884] bg-[#00a884]/10 text-[#00a884]'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111b21] text-slate-600 dark:text-[#8696a0] hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Content Fields */}
          {messageType === 'text' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8696a0] mb-1.5">
                Message Body
              </label>
              <textarea
                required
                rows={3}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type incoming WhatsApp message text..."
                className="w-full bg-slate-100 dark:bg-[#111b21] border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-800 dark:text-[#e9edef] focus:outline-none resize-none leading-relaxed"
              />
            </div>
          )}

          {messageType === 'image' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8696a0] mb-1.5">
                  Photo Caption
                </label>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  placeholder="e.g. Revised project schematic attachment"
                  className="w-full bg-slate-100 dark:bg-[#111b21] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-[#e9edef] focus:outline-none"
                />
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111b21] flex items-center gap-3">
                <img
                  src="/src/assets/images/mockup_project_diagram_1792083940690.jpg"
                  alt="Attachment preview"
                  className="w-12 h-12 object-cover rounded-md"
                />
                <div className="text-[11px] text-slate-500 dark:text-[#8696a0]">
                  <p className="font-medium text-slate-700 dark:text-[#e9edef]">High-res architecture blueprint</p>
                  <p>Included with Meta image change payload</p>
                </div>
              </div>
            </div>
          )}

          {messageType === 'audio' && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111b21] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                <Mic className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-800 dark:text-[#e9edef]">WhatsApp Voice Note (0:24)</p>
                <p className="text-[11px] text-slate-500 dark:text-[#8696a0]">Simulates incoming voice message audio note</p>
              </div>
            </div>
          )}

          {messageType === 'location' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8696a0] mb-1.5">
                Location Name
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Metropolitan Tech Plaza"
                className="w-full bg-slate-100 dark:bg-[#111b21] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-[#e9edef] focus:outline-none"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-[#8696a0] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {successStatus ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Delivered!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending...' : 'Send to Webhook'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
