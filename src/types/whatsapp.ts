export interface WhatsAppMessage {
  id: string;
  from: string;
  senderName: string;
  timestamp: number;
  type: 'text' | 'image' | 'audio' | 'document' | 'location' | 'reaction';
  text?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  filename?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  reaction?: {
    messageId: string;
    emoji: string;
  };
  status?: 'received' | 'read';
}

export interface WhatsAppContact {
  phone: string;
  name: string;
  avatarUrl: string;
  lastMessageTimestamp: number;
  lastMessageText: string;
  unreadCount: number;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  method: string;
  senderPhone?: string;
  summary: string;
  payload: any;
}

export interface ConnectedBusinessAccount {
  wabaId: string;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  connectedAt: string;
}

export interface MetaSignupConfig {
  configured: boolean;
  appId: string;
  configId: string;
  graphVersion: string;
  missing: string[];
}

export interface WebhookInfo {
  webhookUrl: string;
  verifyToken: string;
  isVerified: boolean;
  lastVerifiedAt: string | null;
  totalMessages: number;
  totalContacts: number;
  sampleCurlVerify: string;
  sampleCurlPost: string;
}
