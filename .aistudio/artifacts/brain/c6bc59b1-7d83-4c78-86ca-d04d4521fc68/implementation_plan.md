# WhatsApp Web Message Viewer & Meta Cloud API Receiver

A dedicated, real-time web application to receive and view incoming WhatsApp messages in an authentic WhatsApp Web split-pane interface powered by the official Meta WhatsApp Cloud API webhook architecture.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during the clarification interview:
> - **Integration Method**: Meta WhatsApp Cloud API webhook receiver with automatic token verification and payload parsing.
> - **Visual Interface**: Authentic WhatsApp Web style split-column layout (contacts and recent chats on left, active message stream on right).
> - **Real-Time Delivery**: Real-time live stream using Server-Sent Events (SSE) with unread badge counters and a synthetic Web Audio chime.
> - **Read-Only Scope**: The app focuses strictly on receiving, parsing, and displaying messages without outbound replying, matching the user's explicit requirement.

---

### 1. Overview & Core Concept

- **What It Does**: Provides a production-grade webhook receiver for Meta WhatsApp Cloud API that ingests incoming WhatsApp messages (text, images, documents, audio, locations, and reactions), parses the nested payload, stores message history, and broadcasts updates instantly to a WhatsApp Web replica interface.
- **Target Audience & Purpose**: WhatsApp number owners, developers, and businesses wanting a clean, distraction-free desktop screen to monitor received WhatsApp messages without needing a full customer-support reply engine.
- **Key Value**: Instant visibility of incoming customer and personal messages with zero delay, accompanied by an interactive webhook configuration guide, live payload inspector, and instant test simulator for offline or pre-Meta verification.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Chat Exploration & Reading**: The user sees their chat list sorted by latest received message. Clicking any contact opens the conversation thread with WhatsApp doodle wallpaper, speech bubbles, media previews, and message metadata (sender name, phone number, timestamp).
2. **Real-Time Message Ingestion**: When a WhatsApp message arrives at the webhook endpoint, the chat list re-orders, an unread counter badge increases, a gentle WhatsApp incoming chime plays, and if the chat is open, the message smoothly slides into view.
3. **Webhook Setup & Verification**: A dedicated "Webhook Setup" modal displays the exact Webhook Callback URL (`${APP_URL}/api/webhook/whatsapp`), the configurable Verify Token (`whatsapp_webhook_token`), and step-by-step Meta App Dashboard setup instructions.
4. **Interactive Message Simulator**: A built-in test panel allows generating realistic test messages (text, image, audio, location) from any phone number to verify real-time streaming and layout responsiveness before configuring Meta.
5. **Payload Inspector**: A secondary drawer allows reviewing raw incoming Meta JSON payloads for debugging and compliance.

#### Visual Identity & Theme
- **Aesthetic Direction**: Authentic, clean WhatsApp Web design language. Minimalist, high contrast, distraction-free.
- **Color Palette**:
  - Dominant Neutral: Crisp dark-neutral canvas `#111b21` (dark theme default) with soft white text `#e9edef`, and crisp light theme toggle (`#f0f2f5` background, `#111b21` text).
  - Brand Accent: WhatsApp signature emerald green `#00a884` / `#25d366` for active tabs, unread badges, and verified badges.
  - Surface Contrast: Chat bubble incoming `#202c33` (dark) / `#ffffff` (light); sidebar `#111b21` (dark) / `#ffffff` (light).
- **Typography & Hierarchy**:
  - Display and Sans: `Plus Jakarta Sans` and system font fallback.
  - Data & Timestamps: `tabular-nums font-mono` for time indicators (e.g. `10:14 AM`), phone numbers, and webhook logs.
- **Component Styling & Layout**:
  - Full-viewport desktop presence (no shrunken cards).
  - Left pane: 380px fixed width with search bar, unread filter toggle, and contact cards.
  - Right pane: Flex-1 message viewport with persistent contact header, WhatsApp doodle background, and pinned read-only banner.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Meta Cloud API Webhook Protocol**
  - *Chosen Approach*: Implement standard Meta webhook verification (`GET /api/webhook/whatsapp` returning `hub.challenge` when `hub.verify_token` matches) and payload receiver (`POST /api/webhook/whatsapp`).
  - *Why*: Direct compatibility with official Meta WhatsApp Business API Cloud accounts.
  - *Alternatives Considered*: WhatsApp Web QR code scraping (violates Meta TOS, fragile session drops).
- **Decision 2: Server-Sent Events (SSE) for Real-Time Streaming**
  - *Chosen Approach*: Native SSE stream (`GET /api/events`) over HTTP.
  - *Why*: Ultra-reliable, zero extra WebSocket port complexity in containerized Cloud Run environments, instant auto-reconnect.
- **Decision 3: Server-Authoritative File Persistence & Seed Messages**
  - *Chosen Approach*: Server maintains a persistent JSON store (`data/messages.json`) initialized with realistic demo contacts and messages, ensuring the web app is immediately functional on first launch.
- **Decision 4: Built-in Message Simulation Tool**
  - *Chosen Approach*: Provide a built-in "Simulate WhatsApp Message" drawer that feeds standard Meta-format payloads to the webhook handler.
  - *Why*: Enables immediate testing and demonstration even before the user finishes configuring their Meta App Dashboard.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Frontend                        │
│   ┌─────────────────────┐       ┌───────────────────────┐   │
│   │   Left Sidebar      │       │     Right Chat View   │   │
│   │ · Contacts List     │       │ · Chat Header         │   │
│   │ · Search & Filters  │  ──►  │ · Message Bubble List │   │
│   │ · Webhook Config    │       │ · Media Viewer        │   │
│   │ · Test Simulator    │       │ · Read-Only Banner    │   │
│   └─────────────────────┘       └───────────────────────┘   │
└──────────────┬──────────────────────────────▲───────────────┘
               │                              │
               │ HTTP API & Webhooks          │ Server-Sent Events
               ▼                              │
┌─────────────────────────────────────────────────────────────┐
│                  Express Node.js Server                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routes:                                             │   │
│  │  · GET  /api/webhook/whatsapp (Meta Verification)   │   │
│  │  · POST /api/webhook/whatsapp (Incoming Messages)   │   │
│  │  · GET  /api/messages         (Message History)     │   │
│  │  · POST /api/simulate-message (Test Ingestion)      │   │
│  │  · GET  /api/events           (SSE Stream)          │   │
│  │  · GET  /api/logs             (Raw Payload Logs)    │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                               │
│                             ▼                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Data Storage: data/messages.json & Memory Cache     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Core Data Entities
```typescript
interface WhatsAppMessage {
  id: string;
  from: string; // phone number (e.g. +14155552671)
  senderName: string;
  timestamp: number; // Unix timestamp in seconds
  type: 'text' | 'image' | 'audio' | 'document' | 'location' | 'reaction';
  text?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  location?: { latitude: number; longitude: number; name?: string };
  rawPayloadId?: string;
}

interface WhatsAppContact {
  phone: string;
  name: string;
  avatarUrl: string;
  lastMessage?: WhatsAppMessage;
  unreadCount: number;
}
```

#### Verification & Execution Steps
1. Configure full-stack server (`server.ts`) with Express, SSE broadcaster, Meta webhook endpoints, and data persistence.
2. Build WhatsApp Web frontend with two-column split layout, search filter, responsive conversation view, media previews, audio chime, and test message modal.
3. Verify compilation with `compile_applet` and test webhook endpoints.
