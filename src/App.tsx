/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  ShieldCheck,
  QrCode,
  Sparkles,
  FileJson,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  RotateCcw,
  Radio,
  ArrowLeft,
  X,
} from 'lucide-react';
import { ConnectedBusinessAccount, WhatsAppContact, WhatsAppMessage, WebhookInfo } from './types/whatsapp';
import { ContactItem } from './components/ContactItem';
import { ChatView } from './components/ChatView';
import { WebhookSetupModal } from './components/WebhookSetupModal';
import { ConnectBusinessModal } from './components/ConnectBusinessModal';
import { SimulatorModal } from './components/SimulatorModal';
import { PayloadInspectorModal } from './components/PayloadInspectorModal';
import { playWhatsAppChime } from './utils/audio';

export default function App() {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [selectedContactPhone, setSelectedContactPhone] = useState<string | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [isDark, setIsDark] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedBusinessAccount[]>([]);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [simulatorContactPhone, setSimulatorContactPhone] = useState<string | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(false);

  // Sync dark class on document element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Initial data fetch
  const fetchData = async () => {
    try {
      const [msgRes, infoRes, accountsRes] = await Promise.all([
        fetch('/api/messages'),
        fetch('/api/webhook-info'),
        fetch('/api/connected-accounts'),
      ]);

      if (msgRes.ok) {
        const data = await msgRes.json();
        setContacts(data.contacts || []);
        setMessages(data.messages || []);
        if (data.contacts?.length > 0 && !selectedContactPhone) {
          setSelectedContactPhone(data.contacts[0].phone);
        }
      }

      if (infoRes.ok) {
        const info = await infoRes.json();
        setWebhookInfo(info);
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setConnectedAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Error fetching initial WhatsApp data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-Time Server-Sent Events (SSE) Listener
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'CONNECTED') {
          setIsConnected(true);
        } else if (data.type === 'NEW_MESSAGE') {
          const { message, contact } = data.payload;

          setMessages((prev) => {
            const exists = prev.some((m) => m.id === message.id);
            if (exists) return prev.map((m) => (m.id === message.id ? message : m));
            return [...prev, message];
          });

          setContacts((prev) => {
            const filtered = prev.filter((c) => c.phone !== contact.phone);
            return [contact, ...filtered];
          });

          // Play incoming WhatsApp notification sound chime
          playWhatsAppChime(soundEnabled);
        } else if (data.type === 'ACCOUNT_CONNECTED') {
          setConnectedAccounts(data.payload.accounts || []);
        } else if (data.type === 'WEBHOOK_VERIFIED') {
          setWebhookInfo((prev) => (prev ? { ...prev, isVerified: true, lastVerifiedAt: data.payload.verifiedAt } : null));
        } else if (data.type === 'CONTACT_READ') {
          setContacts((prev) =>
            prev.map((c) => (c.phone === data.payload.phone ? { ...c, unreadCount: 0 } : c))
          );
        } else if (data.type === 'RESET_DATA') {
          setContacts(data.payload.contacts);
          setMessages(data.payload.messages);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [soundEnabled]);

  const handleMarkRead = async (phone: string) => {
    try {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      setContacts((prev) =>
        prev.map((c) => (c.phone === phone ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  };

  const handleResetData = async () => {
    if (confirm('Reset messages and contacts to initial demo state?')) {
      try {
        await fetch('/api/reset-data', { method: 'POST' });
        fetchData();
      } catch (err) {
        console.error('Failed to reset data:', err);
      }
    }
  };

  const handleOpenSimulator = (phone?: string) => {
    setSimulatorContactPhone(phone);
    setIsSimulatorOpen(true);
  };

  // Filter contacts by search query & filter tabs
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.lastMessageText && c.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (filterType === 'unread') return c.unreadCount > 0;
      return true;
    });
  }, [contacts, searchQuery, filterType]);

  const totalUnreadCount = useMemo(() => {
    return contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [contacts]);

  const selectedContact = useMemo(() => {
    return contacts.find((c) => c.phone === selectedContactPhone) || null;
  }, [contacts, selectedContactPhone]);

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${
      isDark ? 'dark bg-[#111b21] text-[#e9edef]' : 'bg-[#f0f2f5] text-slate-900'
    }`}>
      {/* Top Application Bar */}
      <header className="h-14 px-4 bg-white dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 z-20 shadow-xs">
        {/* Left: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00a884] flex items-center justify-center text-white shadow-xs">
            <MessageSquare className="w-4 h-4 fill-current" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm md:text-base tracking-tight text-slate-900 dark:text-[#e9edef]">
              WhatsApp Message Viewer
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-[#111b21] text-slate-600 dark:text-[#8696a0] border border-slate-200/60 dark:border-slate-700/60 tabular-nums">
              <Radio className={`w-2.5 h-2.5 ${isConnected ? 'text-[#00a884]' : 'text-slate-400'}`} />
              {isConnected ? 'Live Webhook Stream' : 'Connecting'}
            </span>
          </div>
        </div>

        {/* Right: Functional Action Controls */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={() => setIsConnectOpen(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#00a884] hover:bg-[#008f6f] text-white transition-colors flex items-center gap-1.5 shadow-xs"
            title="Connect a WhatsApp Business account by scanning Meta’s QR code"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Connect Business</span>
            {connectedAccounts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-white"></span>
            )}
          </button>

          {/* Webhook Configuration Button */}
          <button
            onClick={() => setIsSetupOpen(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-[#d1d7db] hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
            title="Configure Meta WhatsApp Cloud API Webhook"
          >
            <ShieldCheck className="w-4 h-4 text-[#00a884]" />
            <span className="hidden md:inline">Webhook Setup</span>
            {webhookInfo?.isVerified && (
              <span className="w-2 h-2 rounded-full bg-[#00a884]"></span>
            )}
          </button>

          {/* Simulate Incoming Message Button */}
          <button
            onClick={() => handleOpenSimulator()}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-[#d1d7db] hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
            title="Simulate incoming WhatsApp message"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Simulate Message</span>
          </button>

          {/* Raw Payload Inspector Button */}
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="p-2 rounded-lg text-slate-600 dark:text-[#8696a0] hover:bg-slate-100 dark:hover:bg-[#111b21] hover:text-slate-900 dark:hover:text-[#e9edef] transition-colors"
            title="Inspect incoming webhook payloads"
          >
            <FileJson className="w-4 h-4" />
          </button>

          {/* Sound Chime Toggle */}
          <button
            onClick={() => {
              const nextState = !soundEnabled;
              setSoundEnabled(nextState);
              if (nextState) playWhatsAppChime(true);
            }}
            className="p-2 rounded-lg text-slate-600 dark:text-[#8696a0] hover:bg-slate-100 dark:hover:bg-[#111b21] hover:text-slate-900 dark:hover:text-[#e9edef] transition-colors"
            title={soundEnabled ? 'Mute incoming message chime' : 'Enable incoming message chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00a884]" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg text-slate-600 dark:text-[#8696a0] hover:bg-slate-100 dark:hover:bg-[#111b21] hover:text-slate-900 dark:hover:text-[#e9edef] transition-colors"
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={handleResetData}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#8696a0] transition-colors"
            title="Reset to sample messages"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Contacts & Conversations Sidebar */}
        <aside
          className={`w-full md:w-[380px] lg:w-[420px] bg-white dark:bg-[#111b21] border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 ${
            selectedContactPhone ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Sidebar Top: Search & Filter Tabs */}
          <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-[#111b21]">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-[#8696a0]" />
              <input
                type="text"
                placeholder="Search contacts or messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#202c33] border border-transparent dark:border-slate-700/60 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-[#e9edef] placeholder-slate-400 dark:placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter segmented buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-[#00a884] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#202c33] text-slate-600 dark:text-[#8696a0] hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                All Chats
              </button>
              <button
                onClick={() => setFilterType('unread')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filterType === 'unread'
                    ? 'bg-[#00a884] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#202c33] text-slate-600 dark:text-[#8696a0] hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>Unread</span>
                {totalUnreadCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
                      filterType === 'unread'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#00a884] text-white'
                    }`}
                  >
                    {totalUnreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Contacts Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/50 dark:divide-slate-800/30">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-[#8696a0]">
                {searchQuery ? 'No conversations found matching your search.' : 'No messages received yet.'}
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <ContactItem
                  key={contact.phone}
                  contact={contact}
                  isSelected={contact.phone === selectedContactPhone}
                  onClick={() => setSelectedContactPhone(contact.phone)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Right Column: Chat View */}
        <main
          className={`flex-1 flex flex-col h-full overflow-hidden ${
            !selectedContactPhone ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Mobile Back Button when chat is open */}
          {selectedContact && (
            <div className="md:hidden h-10 px-3 bg-slate-200 dark:bg-[#182229] border-b border-slate-300 dark:border-slate-800 flex items-center">
              <button
                onClick={() => setSelectedContactPhone(null)}
                className="flex items-center gap-1 text-xs font-medium text-[#00a884] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Conversations</span>
              </button>
            </div>
          )}

          <ChatView
            contact={selectedContact}
            messages={messages}
            isDark={isDark}
            onOpenSetup={() => setIsSetupOpen(true)}
            onOpenSimulator={(phone) => handleOpenSimulator(phone)}
            onMarkRead={handleMarkRead}
          />
        </main>
      </div>

      {/* Modals and Drawers */}
      <ConnectBusinessModal
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        onConnected={setConnectedAccounts}
      />

      <WebhookSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        info={webhookInfo}
      />

      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        contacts={contacts}
        defaultContactPhone={simulatorContactPhone}
        onMessageSent={() => {
          fetchData();
        }}
      />

      <PayloadInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />
    </div>
  );
}
