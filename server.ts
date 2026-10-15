import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

// WhatsApp Meta Cloud API Configuration
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'whatsapp_webhook_token';

export interface WhatsAppMessage {
  id: string;
  from: string;
  senderName: string;
  timestamp: number; // Unix timestamp in seconds
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

// Storage path
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'whatsapp_store.json');

const INITIAL_CONTACTS: WhatsAppContact[] = [
  {
    phone: '+14155552671',
    name: 'Sarah Jenkins',
    avatarUrl: '/src/assets/images/contact_sarah_portrait_1792083939207.jpg',
    lastMessageTimestamp: Math.floor(Date.now() / 1000) - 180,
    lastMessageText: 'Sounds great! Looking forward to reviewing the deliverables.',
    unreadCount: 1,
  },
  {
    phone: '+442079460912',
    name: 'Marcus Vance',
    avatarUrl: '/src/assets/images/contact_marcus_portrait_1792083940491.jpg',
    lastMessageTimestamp: Math.floor(Date.now() / 1000) - 3600 * 2,
    lastMessageText: 'Here is the revised architecture blueprint diagram.',
    unreadCount: 2,
  },
  {
    phone: '+13125550143',
    name: 'TechLogistics Express',
    avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=TechLogistics',
    lastMessageTimestamp: Math.floor(Date.now() / 1000) - 3600 * 5,
    lastMessageText: 'Your shipment #WL-9042 is out for delivery today.',
    unreadCount: 0,
  },
  {
    phone: '+49301234567',
    name: 'Elena Rostova',
    avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=ElenaRostova',
    lastMessageTimestamp: Math.floor(Date.now() / 1000) - 86400,
    lastMessageText: 'Can you please confirm if the meeting link works?',
    unreadCount: 0,
  },
];

const INITIAL_MESSAGES: WhatsAppMessage[] = [
  {
    id: 'wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI1RjM1MzE2MEQ0MjM5RTEzOUEA',
    from: '+14155552671',
    senderName: 'Sarah Jenkins',
    timestamp: Math.floor(Date.now() / 1000) - 600,
    type: 'text',
    text: 'Hi there! We just finalized the quarterly campaign goals.',
    status: 'received',
  },
  {
    id: 'wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI2RjM1MzE2MEQ0MjM5RTEzOUEB',
    from: '+14155552671',
    senderName: 'Sarah Jenkins',
    timestamp: Math.floor(Date.now() / 1000) - 180,
    type: 'text',
    text: 'Sounds great! Looking forward to reviewing the deliverables.',
    status: 'received',
  },
  {
    id: 'wamid.HBgLNDQyMDc5NDYwOTEyFQIAEBI4QUExMjQzOTlFMTA2Mzc4OEMA',
    from: '+442079460912',
    senderName: 'Marcus Vance',
    timestamp: Math.floor(Date.now() / 1000) - 3600 * 3,
    type: 'text',
    text: 'Good morning! Quick question regarding the API rate limits on the new webhook cluster.',
    status: 'received',
  },
  {
    id: 'wamid.HBgLNDQyMDc5NDYwOTEyFQIAEBI5QUExMjQzOTlFMTA2Mzc4OEMA',
    from: '+442079460912',
    senderName: 'Marcus Vance',
    timestamp: Math.floor(Date.now() / 1000) - 3600 * 2,
    type: 'image',
    mediaUrl: '/src/assets/images/mockup_project_diagram_1792083940690.jpg',
    mediaCaption: 'Here is the revised architecture blueprint diagram.',
    text: 'Here is the revised architecture blueprint diagram.',
    status: 'received',
  },
  {
    id: 'wamid.HBgLMTMxMjU1NTAxNDMVAgARGBI4MTk0MDA2Q0Q0MjM5RTEzOUEA',
    from: '+13125550143',
    senderName: 'TechLogistics Express',
    timestamp: Math.floor(Date.now() / 1000) - 3600 * 5,
    type: 'text',
    text: 'Your shipment #WL-9042 is out for delivery today.',
    status: 'received',
  },
  {
    id: 'wamid.HBgLNDkzMDEyMzQ1NjcVFwAEBDIzQTA1MTI0Mzk5RTEwNjM3OUEB',
    from: '+49301234567',
    senderName: 'Elena Rostova',
    timestamp: Math.floor(Date.now() / 1000) - 86400,
    type: 'text',
    text: 'Can you please confirm if the meeting link works?',
    status: 'received',
  },
];

let contacts: WhatsAppContact[] = [...INITIAL_CONTACTS];
let messages: WhatsAppMessage[] = [...INITIAL_MESSAGES];
let webhookLogs: WebhookLog[] = [];
let isVerified = false;
let lastVerifiedAt: string | null = null;

// Initialize or load persistence
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (Array.isArray(data.contacts)) contacts = data.contacts;
      if (Array.isArray(data.messages)) messages = data.messages;
      if (Array.isArray(data.webhookLogs)) webhookLogs = data.webhookLogs;
      if (data.isVerified !== undefined) isVerified = data.isVerified;
      if (data.lastVerifiedAt !== undefined) lastVerifiedAt = data.lastVerifiedAt;
    }
  } catch (err) {
    console.error('Error loading whatsapp_store.json:', err);
  }
}

function saveData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          contacts,
          messages,
          webhookLogs: webhookLogs.slice(0, 50),
          isVerified,
          lastVerifiedAt,
        },
        null,
        2
      )
    );
  } catch (err) {
    console.error('Error saving whatsapp_store.json:', err);
  }
}

loadData();

// SSE clients management
const sseClients = new Set<Response>();

function broadcastSSE(event: { type: string; payload: any }) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Ingest helper
function ingestWhatsAppMessage(msg: WhatsAppMessage, senderContactName?: string) {
  // Check if duplicate message ID
  const existingIdx = messages.findIndex((m) => m.id === msg.id);
  if (existingIdx >= 0) {
    messages[existingIdx] = msg;
  } else {
    messages.push(msg);
  }

  // Find or create contact
  let contact = contacts.find((c) => c.phone === msg.from);
  const displayName = senderContactName || msg.senderName || msg.from;

  if (!contact) {
    contact = {
      phone: msg.from,
      name: displayName,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      lastMessageTimestamp: msg.timestamp,
      lastMessageText: msg.text || (msg.type === 'image' ? '📷 Photo' : msg.type === 'audio' ? '🎵 Audio note' : msg.type === 'location' ? '📍 Location' : 'Attachment'),
      unreadCount: 1,
    };
    contacts.unshift(contact);
  } else {
    contact.lastMessageTimestamp = msg.timestamp;
    contact.lastMessageText = msg.text || (msg.type === 'image' ? '📷 Photo' : msg.type === 'audio' ? '🎵 Audio note' : msg.type === 'location' ? '📍 Location' : 'Attachment');
    contact.unreadCount += 1;
    if (senderContactName && contact.name === contact.phone) {
      contact.name = senderContactName;
    }
    // Re-order contact to the top
    contacts = [contact, ...contacts.filter((c) => c.phone !== msg.from)];
  }

  saveData();

  broadcastSSE({
    type: 'NEW_MESSAGE',
    payload: {
      message: msg,
      contact,
    },
  });

  return { message: msg, contact };
}

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 1. Meta WhatsApp Webhook Verification GET
  // Meta sends hub.mode, hub.verify_token, and hub.challenge
  app.get('/api/webhook/whatsapp', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[Meta Webhook Verification] Mode:', mode, 'Token:', token);

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      isVerified = true;
      lastVerifiedAt = new Date().toISOString();
      saveData();
      broadcastSSE({
        type: 'WEBHOOK_VERIFIED',
        payload: { verifiedAt: lastVerifiedAt },
      });
      console.log('✅ Meta Webhook successfully verified with challenge:', challenge);
      return res.status(200).send(challenge);
    } else {
      console.warn('❌ Meta Webhook verification failed. Received token does not match.');
      return res.status(403).json({
        error: 'Verification token mismatch or invalid mode',
        expectedToken: VERIFY_TOKEN,
      });
    }
  });

  // 2. Meta WhatsApp Webhook Receiver POST
  // Ingests incoming notifications from WhatsApp Business Cloud API
  app.post('/api/webhook/whatsapp', (req: Request, res: Response) => {
    const body = req.body;
    console.log('[Meta Incoming Webhook POST]', JSON.stringify(body).slice(0, 300));

    // Meta expects a fast 200 OK
    res.status(200).send('EVENT_RECEIVED');

    try {
      // Validate Meta WhatsApp structure
      if (body.object === 'whatsapp_business_account' || body.entry) {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            const value = change.value;
            if (!value) continue;

            const contactsInfo = value.contacts || [];
            const incomingMessages = value.messages || [];

            for (const item of incomingMessages) {
              const fromPhone = item.from ? (item.from.startsWith('+') ? item.from : `+${item.from}`) : '+10000000000';
              const senderContact = contactsInfo.find((c: any) => c.wa_id === item.from || `+${c.wa_id}` === fromPhone);
              const senderName = senderContact?.profile?.name || fromPhone;

              let type: WhatsAppMessage['type'] = 'text';
              let textContent = '';
              let mediaUrl: string | undefined;
              let mediaCaption: string | undefined;
              let locationData: WhatsAppMessage['location'];

              if (item.type === 'text') {
                type = 'text';
                textContent = item.text?.body || '';
              } else if (item.type === 'image') {
                type = 'image';
                textContent = item.image?.caption || 'Photo';
                mediaCaption = item.image?.caption;
                // If Meta supplies a direct link or mock test image
                mediaUrl = item.image?.link || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
              } else if (item.type === 'audio') {
                type = 'audio';
                textContent = 'Voice message';
                mediaUrl = item.audio?.link || '';
              } else if (item.type === 'location') {
                type = 'location';
                textContent = item.location?.name ? `📍 ${item.location.name}` : '📍 Shared Location';
                locationData = {
                  latitude: item.location?.latitude || 0,
                  longitude: item.location?.longitude || 0,
                  name: item.location?.name,
                  address: item.location?.address,
                };
              } else if (item.type === 'reaction') {
                type = 'reaction';
                textContent = `Reacted ${item.reaction?.emoji || '👍'}`;
              } else {
                type = 'document';
                textContent = item.document?.filename || 'Document attachment';
                mediaCaption = item.document?.caption;
              }

              const parsedMsg: WhatsAppMessage = {
                id: item.id || `wamid.${Date.now()}`,
                from: fromPhone,
                senderName,
                timestamp: item.timestamp ? parseInt(item.timestamp, 10) : Math.floor(Date.now() / 1000),
                type,
                text: textContent,
                mediaUrl,
                mediaCaption,
                location: locationData,
                status: 'received',
              };

              ingestWhatsAppMessage(parsedMsg, senderContact?.profile?.name);

              // Record log
              webhookLogs.unshift({
                id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                timestamp: new Date().toISOString(),
                method: 'POST /api/webhook/whatsapp',
                senderPhone: fromPhone,
                summary: `Message from ${senderName}: ${textContent.slice(0, 40)}`,
                payload: body,
              });
            }
          }
        }
      } else {
        // Generic webhook payload or test payload
        webhookLogs.unshift({
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          method: 'POST /api/webhook/whatsapp (Generic)',
          summary: 'Received non-standard or ping payload',
          payload: body,
        });
      }
      saveData();
    } catch (err) {
      console.error('Error processing incoming WhatsApp webhook:', err);
    }
  });

  // 3. Webhook Info & Config API
  app.get('/api/webhook-info', (req: Request, res: Response) => {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;
    const webhookUrl = `${appUrl}/api/webhook/whatsapp`;

    res.json({
      webhookUrl,
      verifyToken: VERIFY_TOKEN,
      isVerified,
      lastVerifiedAt,
      totalMessages: messages.length,
      totalContacts: contacts.length,
      sampleCurlVerify: `curl -X GET "${webhookUrl}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=1158201444"`,
      sampleCurlPost: `curl -X POST "${webhookUrl}" -H "Content-Type: application/json" -d '{"object":"whatsapp_business_account","entry":[{"id":"1001","changes":[{"value":{"messaging_product":"whatsapp","contacts":[{"profile":{"name":"Alex Morgan"},"wa_id":"15551234567"}],"messages":[{"from":"15551234567","id":"wamid.test001","timestamp":"${Math.floor(Date.now() / 1000)}","text":{"body":"Hello from WhatsApp!"},"type":"text"}]},"field":"messages"}]}]}'`,
    });
  });

  // 4. Messages & Contacts API
  app.get('/api/messages', (req: Request, res: Response) => {
    res.json({
      contacts,
      messages,
      unreadTotal: contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    });
  });

  // 5. Mark messages from contact as read
  app.post('/api/messages/mark-read', (req: Request, res: Response) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone is required' });

    const contact = contacts.find((c) => c.phone === phone);
    if (contact) {
      contact.unreadCount = 0;
      saveData();
      broadcastSSE({
        type: 'CONTACT_READ',
        payload: { phone },
      });
    }

    res.json({ success: true, phone });
  });

  // 6. Interactive Message Simulator API
  app.post('/api/simulate-message', (req: Request, res: Response) => {
    const {
      senderName = 'Alex Mercer',
      phone = '+14159998877',
      type = 'text',
      text = 'Hey there! Just sending a quick test message from WhatsApp.',
      mediaUrl,
      mediaCaption,
      locationName,
      latitude = 37.7749,
      longitude = -122.4194,
    } = req.body;

    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    let locationData: WhatsAppMessage['location'];
    if (type === 'location') {
      locationData = {
        latitude: Number(latitude),
        longitude: Number(longitude),
        name: locationName || 'Market Street Hub, SF',
        address: 'Market St, San Francisco, CA',
      };
    }

    const newMsg: WhatsAppMessage = {
      id: `wamid.sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      from: formattedPhone,
      senderName,
      timestamp: Math.floor(Date.now() / 1000),
      type,
      text: type === 'location' ? `📍 ${locationName || 'Market Street Hub'}` : text,
      mediaUrl,
      mediaCaption,
      location: locationData,
      status: 'received',
    };

    const result = ingestWhatsAppMessage(newMsg, senderName);

    // Also record a log for the Payload Inspector
    webhookLogs.unshift({
      id: `log-sim-${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: 'SIMULATOR /api/simulate-message',
      senderPhone: formattedPhone,
      summary: `[Simulator] ${senderName}: ${(text || type).slice(0, 40)}`,
      payload: {
        simulator: true,
        message: newMsg,
      },
    });
    saveData();

    res.json({ success: true, ...result });
  });

  // 7. Reset Data to Sample State
  app.post('/api/reset-data', (req: Request, res: Response) => {
    contacts = [...INITIAL_CONTACTS];
    messages = [...INITIAL_MESSAGES];
    webhookLogs = [];
    isVerified = false;
    lastVerifiedAt = null;
    saveData();
    broadcastSSE({
      type: 'RESET_DATA',
      payload: { contacts, messages },
    });
    res.json({ success: true, contacts, messages });
  });

  // 8. Raw Webhook Logs API
  app.get('/api/logs', (req: Request, res: Response) => {
    res.json({ logs: webhookLogs });
  });

  // 9. Real-Time SSE Stream Endpoint
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Initial connection payload
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', payload: { isVerified, timestamp: Date.now() } })}\n\n`);

    sseClients.add(res);

    // Heartbeat ping every 25s
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // Vite middleware in dev or static serve in prod
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
