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
  console.log(`${message.author}: ${message.text}`);
});

listener.start();
```

### Types

[Check the definitions file.](./src/defs.ts)
