# OpenCorp-Base

OpenIM PC Client - Enterprise instant messaging desktop application built with Electron, React, and OpenIM SDK.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Electron | 22.3.27 |
| Framework | React | 18.2.0 |
| Build Tool | Vite | 4.5.14 |
| UI Library | Ant Design | 5.10.0 |
| State Management | Zustand | 4.3.3 |
| IM SDK | @openim/electron-client-sdk + wasm-client-sdk | 3.8.3-patch.10 |
| Data Fetching | React Query | 3.39.3 |
| Routing | React Router DOM | 6.11.1 |
| Styles | Tailwind CSS + SCSS | 3.2.7 |
| Editor | CKEditor 5 | 43.0.0 |
| Video/Audio | LiveKit Client | 2.7.0 |
| Player | XGPlayer | 3.0.5 |
| Virtual Scroll | React Virtuoso | 4.3.8 |
| i18n | i18next + react-i18next | 22.5.0 / 12.3.1 |

## Project Structure

```
openim-electron-demo/
├── electron/                    # Electron main process code
│   ├── main/                    # Main entry points & management modules
│   │   ├── index.ts            # App initialization, lifecycle hooks
│   │   ├── windowManage.ts     # BrowserWindow creation & management
│   │   ├── menuManage.ts       # Application menu (macOS dock bar)
│   │   ├── trayManage.ts       # System tray icon
│   │   ├── ipcHandlerManage.ts # IPC handlers (renderer <-> main bridge)
│   │   ├── appManage.ts        # App-level settings, single-instance guard
│   │   ├── shortcutManage.ts   # Global keyboard shortcuts
│   │   └── storeManage.ts      # Persisted app state (electron-store)
│   ├── preload/                 # Preload script (contextBridge exposure)
│   │   └── index.ts            # Expose electronAPI to renderer
│   ├── utils/                   # Electron utilities
│   │   ├── imsdk.ts            # WASM SDK initialization wrapper
│   │   ├── log.ts              # electron-log configuration
│   │   └── index.ts            # Platform detection, isProd/isDev helpers
│   ├── constants/               # App constants (paths, keys)
│   └── i18n/                    # Electron-side internationalization
│       ├── index.ts
│       └── resources/
├── src/                         # React renderer process code
│   ├── api/                     # REST API layer (business backend)
│   │   ├── login.ts            # Auth: register, login, password reset
│   │   ├── imApi.ts            # IM-specific business APIs
│   │   ├── errorHandle.ts      # Axios error interceptor & toast
│   │   └── typings.d.ts        # API type definitions
│   ├── layout/                  # Top-level layout components
│   │   ├── MainContentWrap.tsx # SDK init, auth guard, root outlet
│   │   ├── MainContentLayout.tsx# 3-column sidebar + content layout
│   │   ├── LeftNavBar/         # Navigation bar (settings, profile)
│   │   ├── TopSearchBar/       # Search user/group modal
│   │   └── useGlobalEvents.tsx # IM WebSocket event listeners (20+ handlers)
│   ├── pages/                   # Page components by feature
│   │   ├── login/              # Login/Register/Modify password forms
│   │   ├── chat/               # Messaging module
│   │   │   ├── ConversationSider/  # Conversation list sidebar
│   │   │   └── queryChat/        # Active chat view
│   │   │       ├── ChatContent.tsx   # Message list (virtual scroll)
│   │   │       ├── ChatFooter/         # Input area + send actions
│   │   │       ├── ChatHeader/         # Conversation info header
│   │   │       ├── GroupSetting/       # Group admin settings
│   │   │       ├── SingleSetting/      # Single chat settings
│   │   │       ├── MessageItem/        # Per-message renderers (12+ types)
│   │   │       └── useHistoryMessageList.tsx  # Message CRUD + virtual list state
│   │   ├── contact/            # Contacts module
│   │   │   ├── ContactSider.tsx          # Friend/group tabs
│   │   │   ├── myFriends/index.tsx       # Friends list with alphabet index
│   │   │   ├── myGroups/index.tsx        # Groups list
│   │   │   ├── newFriends/index.tsx      # Pending friend requests
│   │   │   └── groupNotifications/       # Pending group join requests
│   │   └── common/             # Shared modals (not page-specific)
│   │       ├── UserCardModal/        # User profile card
│   │       ├── GroupCardModal/       # Group info modal
│   │       ├── ChooseModal/          # Multi-select picker
│   │       └── RtcCallModal/         # Audio/video call UI (LiveKit)
│   ├── store/                   # Zustand stores
│   │   ├── user.ts             # Auth state, self-info, app settings
│   │   ├── conversation.ts     # Conversation list + current chat context
│   │   ├── contact.ts          # Friends, groups, blacklists, applications
│   │   ├── chat.ts             # Quote message state (quoteMessage/quoteFallback)
│   │   └── type.d.ts           # Store interface definitions
│   ├── components/             # Reusable UI components
│   │   ├── CKEditor/           # Rich text editor with custom plugins
│   │   ├── OIMAvatar/          # Avatar component with fallbacks
│   │   ├── DraggableModalWrap/ # Modal wrapper (react-draggable)
│   │   ├── EditableContent/    # Inline editable text
│   │   ├── SettingRow/         # Settings row item
│   │   └── WindowControlBar/   # Custom window controls (macOS traffic lights)
│   ├── routes/                  # React Router configuration
│   │   ├── index.tsx           # Hash-based router with lazy-loaded pages
│   │   ├── ContactRoutes.ts    # Contact sub-routes
│   │   └── GlobalErrorElement.tsx  # Error boundary for route errors
│   ├── hooks/                   # Custom React hooks
│   │   ├── useConversationToggle.ts   # Conversation switching logic
│   │   ├── useCurrentMemberRole.ts    # Group member role check
│   │   ├── useGroupMembers.ts         # Group members list fetcher
│   │   └── useOverlayVisible.ts       # Modal overlay state management
│   ├── utils/                   # Utility functions
│   │   ├── request.ts          # Axios instance with interceptors
│   │   ├── storage.ts          # LocalStorage wrappers (IM token, profile)
│   │   ├── events.ts           # mitt event emitter for cross-component communication
│   │   ├── imCommon.ts         # IM SDK helper: initStore, logout handlers
│   │   ├── common.ts           # Toast, format helpers
│   │   ├── pinyin.ts           # Chinese pinyin sorting/lookup
│   │   ├── contactsFormat.ts   # Contact data formatting utilities
│   │   └── avatar.ts           # Avatar generation/fetching
│   ├── constants/               # App-wide constants
│   │   ├── index.ts            # CustomType enum for custom messages
│   │   ├── im.ts               # IM-related constant values
│   │   └── errcode.ts          # Error code mappings
│   ├── i18n/                    # Internationalization resources
│   │   ├── index.ts            # i18next configuration + language detector
│   │   └── resources/          # Translation files (en.json, zh.json)
│   ├── styles/                  # Global SCSS modules
│   │   ├── global.scss         # Tailwind directives + CSS variables
│   │   ├── antd.scss           # Ant Design theme overrides
│   │   └── svg.scss            # SVG icon utilities
│   ├── config/index.ts          # Environment configuration loader
│   ├── App.tsx                  # Root component (Providers: Query, Router, ConfigProvider)
│   ├── main.tsx                 # React DOM render entry point
│   ├── AntdGlobalComp.tsx       # Global Ant Design components (Modal, message, etc.)
│   └── types/                   # TypeScript type declarations
│       ├── globalExpose.d.ts    # Window.electronAPI interface definition
│       ├── common.d.ts          # Shared utility types
│       └── vite-env.d.ts        # Vite env type augmentations
├── public/                      # Static assets served to renderer
│   ├── openIM.wasm             # OpenIM WASM SDK core binary
│   ├── sql-wasm.wasm           # SQLite WASM for local message DB
│   ├── wasm_exec.js            # Go WASM runtime bridge (go1.20)
│   └── emojis.json             # Emoji picker data
├── e2e/                         # Playwright end-to-end tests
├── vite.config.ts               # Vite + Electron plugin configuration
├── tsconfig.json                # TypeScript compiler options
├── package.json                 # Dependencies & scripts
└── .gitignore                   # Git ignore rules
```

## Architecture Overview

### Process Model

```
┌─────────────────────────────────────────────────┐
│                  Main Process                    │
│  (Node.js + Electron)                           │
│  ┌──────────┬────────────┬──────────────────┐   │
│  │ WindowMgr│ Menu/Tray  │ IPC Handlers     │   │
│  │ Shortcut │ App State  │ Store Management │   │
│  └──────────┴────────────┴──────────────────┘   │
└─────────────────────┬───────────────────────────┘
                      │ IPC (contextBridge)
                      ▼
┌─────────────────────────────────────────────────┐
│              Renderer Process                    │
│  (React + Vite HMR + Web Worker)                │
│  ┌──────────────────────────────────────────┐   │
│  │           React Application               │   │
│  │  ┌─────────┬──────────┬──────────────┐   │   │
│  │  │ Login   │ Chat     │ Contact      │   │   │
│  │  │ Routes  │ Routes   │ Routes       │   │   │
│  │  └─────────┴──────────┴──────────────┘   │   │
│  │  Zustand Stores: user, conversation,     │   │
│  │    contact, chat                         │   │
│  │  React Query for REST API calls          │   │
│  └──────────────────────────────────────────┘   │
│                      │                          │
│         ┌────────────▼────────────┐             │
│         │     OpenIM WASM SDK      │             │
│         │  (WebAssembly + Go)      │             │
│         │  - WebSocket conn        │             │
│         │  - Local SQLite DB       │             │
│         │  - Message encryption    │             │
│         └─────────────────────────┘             │
└─────────────────────────────────────────────────┘
```

### Data Flow

1. **Auth**: User logs in via REST API → receives `chatToken` + `imToken` + `userID` → stored in LocalStorage
2. **IM Init**: WASM SDK loads `openIM.wasm` + `sql-wasm.wasm` → connects to OpenIM WebSocket server → auto-syncs messages/contacts/conversations
3. **State Management**: Zustand stores hold client-side state; React Query caches REST API responses
4. **Real-time Events**: IM SDK emits 20+ WebSocket callbacks (new message, contact update, group change, etc.) → `useGlobalEvents.tsx` routes events to respective stores via mitt event emitter
5. **Message Send**: Create message → optimistic UI push → send via WASM SDK → server response merges into store

## Changelog

### 2025-05-03
- **Moved file preview to top of input**: Dragged file/images pill list now displays between the quote message bar and CKEditor (instead of below CKEditor), styled consistently with the quote message (`border-b`, `bg-[var(--bg-primary)]`, matching padding).
- **Added image drag preview in input**: Dragged images now also show in the file preview area (previously only non-image files appeared). Images and files are displayed in separate groups with per-item remove buttons.
- **Added image/file count feedback toast**: When dragging multiple files/images, shows a toast with the total count (e.g. "3 个文件已添加到待发送列表") to confirm they were queued.
- **Fixed drag-and-drop file/image handling**:
  - **Files now show in input area**: Dropped non-image files display a pill-shaped file list between CKEditor and the send button, with a remove (x) button per file.
  - **Images properly send**: Previously, dragged images went through File → data: URL → File roundtrip (insert into CKEditor, then extract back). The reconstructed File has no `path` property, so `resolveFilePath` fails on Electron. Now keeps the original File object for sending alongside the CKEditor preview.
  - **Fixed image not sending when text is present**: Rewrote `sendAll` with clean branching logic — files, images, and text all send in order regardless of which combination is present.
  - **Fixed drag-and-drop files sending immediately**: Dragging files/images into the chat input now queues them instead of sending instantly. Images are inserted into CKEditor (same as screenshot behavior), other files show in a file list. All items send only when the send button is clicked.
- **Fixed empty message bubble on screenshot-only send**: When taking a screenshot and sending without typing any text, the app was sending an extra empty text message bubble after the image. Now correctly skips the text message when there are images but no text content.

### 2025-05-02
- **Fixed Windows packaging crash**: Replaced `axios` with Node.js built-in `https`/`http` in main process (`electron/main/ipcHandlerManage.ts`). The `downloadFile` IPC handler previously used `axios.get()`, which caused `Cannot find module 'axios'` errors in packaged Windows builds. Now uses native `https.get()` / `http.get()` instead — zero external dependencies needed at runtime.

### Key Files

| File | Responsibility |
|------|---------------|
| `electron/main/index.ts` | Electron app bootstrap, single-instance guard, lifecycle hooks |
| `src/layout/MainContentWrap.tsx` | Root layout: IM SDK init, auth guard, userClick global handler |
| `src/layout/useGlobalEvents.tsx` | All 20+ IM WebSocket event handlers → store updates |
| `src/pages/chat/queryChat/useHistoryMessageList.tsx` | Message list virtual scroll state, push/update/revoke message operations |
| `src/store/` | Zustand stores: user auth, conversation list, contacts, quote state |
| `src/api/login.ts` | Business REST API hooks: register, login, password, user profile CRUD |

## Features

### Authentication & Account Management

- **Login**: Username + phone number with area code → verifies against business backend → obtains IM token for OpenIM SDK
- **Registration**: Phone verification code flow → creates account on business backend + registers with OpenIM
- **Password Management**: Reset password via SMS, change existing password after login
- **Session Persistence**: Tokens stored in LocalStorage; auto-login on app restart

### Messaging

- **Real-time Chat**: WebSocket-based message delivery with offline sync
- **Message Types Supported** (12+ types):
  - Text messages (plain + rich text via CKEditor)
  - Picture messages (upload, preview, resize)
  - Voice messages (record, play, waveform)
  - Video messages (preview, playback via XGPlayer)
  - File messages (drag-drop upload, download with progress)
  - At messages (@mentions in groups with user list)
  - Merge messages (multi-message thread view)
  - Card messages (user/group profile cards)
  - Location messages (map integration placeholder)
  - Custom messages (extensible payload for calls, reactions, etc.)
  - Typing indicator (real-time typing status)
  - Quote messages (reply with nested original message preview)
  - Face/emoji messages (custom emoji picker with twemoji)

- **Quote Messages**: Click any message to quote → shows quoted content in input → sends as new message with nested `quoteElem` containing full original message metadata
- **Screenshot Capture** (WeChat-style): Click screenshot icon in toolbar → choose capture mode → image is inserted inline at cursor position in CKEditor → user can backspace to delete or type additional text around the image → Click Send button sends both images and text together. Images extracted from CKEditor DOM as File objects for IMSDK upload. Uses model-level insertImage with multi-method fallback chain.

### Conversation Management

- **Conversation List**: Scrollable list of all chats with unread badges, last message preview
- **Auto-scroll**: New messages auto-scroll to bottom; user can manually scroll up for history
- **Pagination**: Virtual scrolling via react-virtuoso loads 20 messages per page on demand
- **Unread Count**: Badge counter synced from OpenIM server

### Contacts & Social

- **Friends List**: Alphabet-indexed friend list with search, add/remove friend operations
- **Groups List**: Joined groups with member count and last activity
- **Friend Requests**: Pending incoming/outgoing friend application management
- **Group Invitations**: Pending group join requests approval/rejection
- **Blacklist**: Block/unblock users; blocked users excluded from message sync

### Group Management

- **Group Settings**: Modify group name, avatar, announcement, member permissions
- **Member Management**: View/add/remove members, promote/demote admins
- **Role-based Access**: Owner/Admin/Normal member roles with different permission levels
- **Group Notifications**: System messages for join/leave/admin changes/dismissal

### Audio/Video Calls

- **LiveKit Integration**: Real-time audio/video calling via LiveKit WebRTC platform
- **Call UI**: Full-screen call modal with participant grid, camera/mic/screen share controls
- **Call Navigation**: Dedicated route `/chat/:conversationID/call` for persistent call state

### User Profile & Settings

- **Profile Card**: View/edit own profile (nickname, avatar, gender, birthdate)
- **App Settings**: Language toggle (zh-CN/en-US), close-to-minimize vs quit behavior
- **Personalization**: Avatar upload with automatic resizing via react-image-file-resizer

### System Integration

- **Native Window Controls**: Custom title bar with macOS traffic light buttons (minimize, maximize, close)
- **System Tray**: Minimized app lives in system tray; right-click for quick actions
- **Global Shortcuts**: Keyboard shortcuts defined via electron shortcut module
- **Auto-updater**: electron-updater integration for silent background updates
- **Logging**: Structured logging to `userData/OpenIMData/logs` via electron-log

### Internationalization

- **Locale Support**: Chinese (zh-CN) and English (en-US) with runtime switching
- **Translation Files**: JSON-based resources in `src/i18n/resources/` and `electron/i18n/resources/`
- **Language Detection**: Auto-detect browser/system language via i18next-browser-languagedetector

## API Endpoints

All REST APIs are prefixed with the base URL from `VITE_CHAT_URL` environment variable. Authentication token passed in `Authorization` header (or custom `token` header).

### Account Management (`/account/*`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/account/code/send` | Send SMS verification code | No |
| POST | `/account/code/verify` | Verify SMS code | No |
| POST | `/account/register` | Register new account | No |
| POST | `/account/login` | Login with credentials | No |
| POST | `/account/password/reset` | Reset password via SMS | No |
| POST | `/account/password/change` | Change existing password | Yes |

### User Management (`/user/*`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/user/find/full` | Get user profiles by userID list | Yes |
| POST | `/user/search/full` | Search users by keyword | Yes |
| POST | `/user/update` | Update own profile (nickname, avatar, etc.) | Yes |

### Request Payload Examples

**Login:**
```json
{
  "userID": "username",
  "password": "hashed_password",
  "phoneNumber": "13800138000",
  "areaCode": "+86",
  "platform": 4
}
```

**Register:**
```json
{
  "userID": "new_user",
  "password": "hashed_password",
  "user": {
    "nickname": "New User",
    "phoneNumber": "13800138000",
    "areaCode": "+86"
  },
  "platform": 4
}
```

**Update Profile:**
```json
{
  "userID": "current_user_id",
  "nickname": "Updated Name",
  "faceURL": "https://example.com/avatar.png",
  "gender": 1,
  "birth": 946684800,
  "allowAddFriend": 2,
  "allowBeep": 2,
  "allowVibration": 2,
  "globalRecvMsgOpt": 0
}
```

## Development Guide

### Prerequisites

- Node.js >= 16.0.0 (recommended: 18.x LTS)
- npm >= 8.0.0
- macOS / Linux / Windows

### Setup & Run

```bash
# Install dependencies
npm install

# Start development server + Electron app
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run E2E tests (requires `npm run pree2e` first)
npm run e2e

# Lint & format code
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix fixable issues
npm run format      # Prettier formatting
```

### Environment Variables

Create `.env.development` or `.env.production`:

```env
VITE_API_URL=https://api.example.com          # Business backend API base URL
VITE_WS_URL=wss://ws.example.com              # OpenIM WebSocket server URL
VITE_CHAT_URL=https://chat-api.example.com    # Chat-related REST API base URL (reuses VITE_API_URL)
```

### Build Configuration

- **Builder**: Vite 4 + `vite-electron-plugin` for Electron integration
- **Bundler**: esbuild for JavaScript/TypeScript, Sass for styles
- **Minification**: Terser (configured in vite.config.ts with console.log removal)
- **Output**: 
  - Renderer: `dist/` (static assets for Electron BrowserWindow)
  - Main process: `dist-electron/` (compiled TypeScript from `electron/`)

### Code Conventions

- **Linting**: ESLint + Prettier + TypeScript ESLint plugin
- **Commit Hooks**: Husky + lint-staged (auto-format on commit) + Commitlint (conventional commits)
- **Style**: Tailwind CSS utility classes preferred; SCSS modules for component-specific styles
- **Imports**: Absolute imports via `@/` alias pointing to `src/`; simple-import-sort plugin enforces ordering

### Electron-Specific Notes

- **Security**: `contextIsolation: true`, `nodeIntegration: false` — all Node.js access must go through preload bridge (`electronAPI`)
- **WASM Bridge**: OpenIM SDK runs in WebAssembly; WASM files served from `public/`; Go runtime loaded via `wasm_exec.js`
- **Storage Paths** (macOS): 
  - App data: `~/Library/Application Support/OpenCorp-Base/`
  - Logs: `~/Library/Application Support/OpenCorp-Base/OpenIMData/logs/`
  - SDK resources (SQLite DB, uploaded files): `~/Library/Application Support/OpenCorp-Base/sdkResources/`

### Known Technical Decisions

1. **Quote Message Construction**: Bypasses WASM SDK's `createAdvancedQuoteMessage` due to Electron contextIsolation JSON serialization issues. Instead creates a text message via `createTextMessage`, then manually sets `contentType=114` (QuoteMessage) + attaches complete `quoteElem` object directly in JavaScript before sending.

2. **Hash-based Routing**: Uses `createHashRouter` instead of `createBrowserRouter` to avoid server-side routing configuration requirements; compatible with Electron file:// protocol.

3. **Lazy-loaded Routes**: All major pages (Chat, Contact, Login) loaded via React Router v6 lazy() pattern for reduced initial bundle size.

4. **State Co-location**: Zustand stores hold all mutable state; React Query only caches REST API responses. No Redux or other global state libraries used.

5. **Screenshot → Image Upload Pipeline**: Screenshots are saved to disk then inserted into CKEditor as inline base64 images via model writer. On send, images are extracted from CKEditor model/DOM (3 strategy fallback) and uploaded via `IMSDK.uploadFile` + `createImageMessageByURL`. A `screenshotPaths` fallback state tracks file paths for direct upload when CKEditor extraction fails.

## Testing

### End-to-End Tests

Uses Playwright with Chromium (Electron's embedded browser). Test specs in `e2e/`. Run via:

```bash
npm run pree2e    # Build first
npm run e2e       # Execute tests
```

## Release

Packaged with electron-builder. Configuration in `package.json` under `build` field (or separate config file). Supports macOS DMG, Windows NSIS installer, and Linux AppImage/DEB/RPM formats. Auto-update via electron-updater with configurable update server URL.
