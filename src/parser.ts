import type { Badge, ChatMessage, TextPart, Thumbnail } from "./defs";

export default function parseAction(action: any): ChatMessage {
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
  const badges = (renderer.authorBadges ?? []).map((badge: any) => ({
    label: badge.liveChatAuthorBadgeRenderer.accessibility.accessibilityData.label,
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
}
