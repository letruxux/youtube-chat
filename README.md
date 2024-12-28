# @letruxux/youtube-chat

Zero dependencies, lightweight package to fetch YouTube live chat messages with no API key.
Supports both history fetching and realtime messages (with polling).

## Installation

```bash
npm install @letruxux/youtube-chat
bun add @letruxux/youtube-chat
pnpm add @letruxux/youtube-chat
yarn add @letruxux/youtube-chat
```

## Usage

```js
import {
  ChatListener,
  getYouTubeLiveVideoId,
  fetchChatMessages,
} from "@letruxux/youtube-chat";
```

### ChatListener

```js
const livestreamId = await getYouTubeLiveVideoId("lofigirl");
const listener = new ChatListener(livestreamId, {
  /* config */
});

listener.onMessage((message) => {
  console.log(`${message.author}: ${message.msg}`);
});

listener.start();
```

### Types

```ts
interface ChatMessage {
  /** The text content of the chat message */
  msg: string;
  /** The username/display name of the message author */
  author: string;
  /** Unique identifier for the chat message */
  id: string;
}

interface ChatListenerOptions {
  /** Polling interval in milliseconds (default: 1000) */
  interval?: number;
  /** Custom fetch options for API requests */
  fetchOptions?: RequestInit;
  /** Enable dynamic polling intervals based on message activity (default: false) */
  dynamicPolling?: boolean;
  /** Maximum polling interval in milliseconds when using dynamic polling (default: 5000) */
  maxInterval?: number;
  /** Maximum number of message IDs to store in memory (default: 100) */
  maxStoredIds?: number;
}
```
