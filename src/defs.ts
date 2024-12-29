export interface ChatMessage {
  /** The text content of the chat message */
  text: string;
  /** The username/display name of the message author */
  author: string;
  /** Avatar thumbnails for the message author */
  authorThumbnails: Thumbnail[];
  /** Unique identifier for the author's channel */
  authorId: string;
  /** Unique identifier for the chat message */
  id: string;
  /** User badges (verified, owner, etc.) */
  badges: Badge[];
  /** Date of when the message was sent */
  timestamp: Date;
  /** All parts of text (emojis and text are separated)  */
  textParts: TextPart[];
}

export interface ChatListenerOptions {
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

/**
 * Represents a thumbnail image for a user's profile or badge
 */
export interface Thumbnail {
  /** Width of the thumbnail in pixels */
  width: number;
  /** Height of the thumbnail in pixels */
  height: number;
  /** URL of the thumbnail image */
  url: string;
}

/**
 * Represents a badge displayed next to a user's name in chat
 */
export interface Badge {
  /** Text identifier for the badge type */
  text: string;
  /** Thumbnail image data for the badge */
  value: Thumbnail;
}

export type TextPart =
  | {
      text: string;
    }
  | {
      url: string;
      alt: string;
      isCustomEmoji: boolean;
      emojiText: string;
    };
