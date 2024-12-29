import type {
  Badge,
  ChatListenerOptions,
  ChatMessage,
  TextPart,
  Thumbnail,
} from "./defs";

/**
 * Validates if a message object has all required properties with correct types
 * @param message - The message object to validate
 * @returns Whether the message is valid
 */
function validateMessage(message: ChatMessage): boolean {
  if (!message) return false;
  if (typeof message.text !== "string" || message.text.length === 0) return false;
  if (typeof message.author !== "string" || message.author.length === 0) return false;
  if (typeof message.id !== "string" || message.id.length === 0) return false;
  return true;
}

/**
 * Fetches chat messages from a YouTube video
 * @param videoId - The YouTube video ID
 * @param fetchOptions - Optional fetch configuration
 * @returns Array of chat messages
 */
export async function fetchChatMessages(
  videoId: string,
  fetchOptions: RequestInit = {}
): Promise<ChatMessage[]> {
  const response = await fetch(
    `https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`,
    {
      method: "GET",
      ...fetchOptions,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
        ...(fetchOptions.headers ?? {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch chat messages for video ${videoId}`);
  }

  try {
    const html = await response.text();
    const fixed = html.split('window["ytInitialData"] = ')[1].split('"}};')[0] + '"}}';
    const data = JSON.parse(fixed);

    const actions = data.contents.liveChatRenderer.actions;
    const messages = actions
      .map((action: any): ChatMessage | null => {
        try {
          const renderer = action.addChatItemAction.item.liveChatTextMessageRenderer;

          const msg = renderer.message.runs
            .map((run: any) => {
              if (run.text) {
                return run.text.trim();
              }

              if (run.emoji) {
                // You can choose to return either the emoji label or first shortcut
                return run.emoji.image?.accessibility?.accessibilityData?.label
                  ? ":" + run.emoji.image?.accessibility?.accessibilityData?.label + ":"
                  : run.emoji.shortcuts?.[1] || run.emoji.shortcuts?.[0] || "";
              }
              return "";
            })
            .join(" ");
          const thumbnails = renderer.authorPhoto.thumbnails as Thumbnail[];
          const author = renderer.authorName.simpleText;
          const id = renderer.id;
          const badges = renderer.authorBadges.map((badge: any) => ({
            label:
              badge.liveChatAuthorBadgeRenderer.accessibility.accessibilityData.label,
            text: badge.liveChatAuthorBadgeRenderer.icon.iconType,
          })) as Badge[];
          const authorId = renderer.authorExternalChannelId;
          const timestamp = new Date(parseInt(renderer.timestampUsec) / 1000);
          const textParts = renderer.message.runs.map((run: any) => {
            if (run.text) {
              return run;
            }

            const thumbnail = run.emoji.image.thumbnails.shift();
            const isCustomEmoji = Boolean(run.emoji.isCustomEmoji);
            const shortcut = run.emoji.shortcuts ? run.emoji.shortcuts[0] : "";
            return {
              url: thumbnail ? thumbnail.url : "",
              alt: shortcut,
              isCustomEmoji: isCustomEmoji,
              emojiText: isCustomEmoji ? shortcut : run.emoji.emojiId,
            };
          }) as TextPart[];

          return {
            text: msg,
            author,
            id,
            authorThumbnails: thumbnails,
            badges,
            authorId,
            timestamp,
            textParts,
          };
        } catch {
          return null;
        }
      })
      .filter(validateMessage);

    return messages;
  } catch (e) {
    console.error(e);
    throw new Error(`Failed to parse chat messages for video ${videoId}`);
  }
}

/**
 * Class to handle real-time YouTube chat message listening
 */
export class ChatListener {
  private videoId: string;
  private interval: number;
  private fetchOptions: RequestInit;
  private dynamicPolling: boolean;
  private maxInterval: number;
  private maxStoredIds: number;
  private isListening: boolean;
  private seenMessages: Set<string>;
  private callbacks: Set<(message: ChatMessage) => void>;
  private currentInterval: number;
  private timeoutId?: ReturnType<typeof setTimeout>;

  /**
   * Creates a new ChatListener instance
   * @param videoId - The YouTube video ID to listen to
   * @param options - Configuration options
   */
  constructor(videoId: string, options: ChatListenerOptions = {}) {
    this.videoId = videoId;
    this.interval = options.interval || 1000;
    this.fetchOptions = options.fetchOptions || {};
    this.dynamicPolling = options.dynamicPolling || false;
    this.maxInterval = options.maxInterval || 5000;
    this.maxStoredIds = options.maxStoredIds || 100;
    this.isListening = false;
    this.seenMessages = new Set<string>();
    this.callbacks = new Set();
    this.currentInterval = this.interval;
  }

  /**
   * Adds a callback function to handle new messages
   * @param callback - Function to call with new messages
   */
  onMessage(callback: (message: ChatMessage) => void): void {
    this.callbacks.add(callback);
  }

  /**
   * Starts listening for chat messages
   */
  start(): void {
    if (this.isListening) return;
    this.isListening = true;
    this._poll();
  }

  /**
   * Stops listening for chat messages
   */
  stop(): void {
    this.isListening = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  /**
   * Toggles dynamic polling on/off
   * @param enabled - Whether to enable dynamic polling
   */
  setDynamicPolling(enabled: boolean): void {
    this.dynamicPolling = enabled;
    this.currentInterval = this.interval;
  }

  /**
   * Internal polling method
   * @private
   */
  private async _poll(): Promise<void> {
    if (!this.isListening) return;

    try {
      const messages = await fetchChatMessages(this.videoId, this.fetchOptions);
      const newMessages = messages.filter((msg) => !this.seenMessages.has(msg.id));

      newMessages.forEach((msg) => {
        if (this.seenMessages.size > this.maxStoredIds) {
          const iterator = this.seenMessages.values();
          const next = iterator.next();
          if (next.value) this.seenMessages.delete(next.value);
        }
        this.seenMessages.add(msg.id);
        this.callbacks.forEach((callback) => callback(msg));
      });

      if (this.dynamicPolling) {
        this.currentInterval =
          newMessages.length > 0
            ? this.interval
            : Math.min(this.currentInterval * 1.5, this.maxInterval);
      } else {
        this.currentInterval = this.interval;
      }
    } catch (error) {
      console.error("Error fetching chat messages:", error);
    }

    this.timeoutId = setTimeout(() => this._poll(), this.currentInterval);
  }
}

/**
 * Fetches the live video ID from a YouTube handle
 * @param handle - The YouTube channel handle
 * @returns The live video ID if found, otherwise null
 */
export async function getYouTubeLiveVideoId(handle: string): Promise<string | null> {
  try {
    const response = await fetch(`https://www.youtube.com/@${handle}/live`);
    const html = await response.text();

    // Direct regex patterns to find video ID
    const patterns = [
      /\"videoId\":\"([a-zA-Z0-9_-]{11})\"/,
      /watch\?v=([a-zA-Z0-9_-]{11})/,
      /embed\/([a-zA-Z0-9_-]{11})/,
      /youtu.be\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        console.log(`Live Video ID: ${match[1]}`);
        return match[1];
      }
    }

    console.log("No live video found.");
    return null;
  } catch (error) {
    console.error("Error fetching the page:", error);
    return null;
  }
}
