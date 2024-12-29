import type { ChatMessage, ChatListenerOptions } from "./defs";
import { fetchChatMessages } from "./youtube";

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
