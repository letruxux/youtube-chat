import type { ChatMessage } from "./defs";
import parseAction from "./parser";

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
          return parseAction(action);
        } catch (e) {
          // console.error(e);
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
