import { MessageItem, MessageType } from "@openim/wasm-client-sdk";

export const replaceEmoji2Str = (text: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");

  const emojiEls: HTMLImageElement[] = Array.from(doc.querySelectorAll(".emojione"));
  emojiEls.map((face) => {

    const escapedOut = face.outerHTML.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    text = text.replace(new RegExp(escapedOut, "g"), face.alt);
  });
  return text;
};

export const getCleanText = (html: string) => {
  let text = replaceEmoji2Str(html);
  text = text.replace(/<\/p><p>/g, "\n");
  text = text.replace(/<br\s*[/]?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = convertChar(text);
  text = decodeHtmlEntities(text);
  return text.trim();
};

let textAreaDom: HTMLTextAreaElement | null = null;
const decodeHtmlEntities = (text: string) => {
  if (!textAreaDom) {
    textAreaDom = document.createElement("textarea");
  }
  textAreaDom.innerHTML = text;
  return textAreaDom.value;
};

export const convertChar = (text: string) => text.replace(/&nbsp;/gi, " ");

export const getCleanTextExceptImg = (html: string) => {
  html = replaceEmoji2Str(html);

  const regP = /<\/p><p>/g;
  html = html.replace(regP, "</p><br><p>");

  const regBr = /<br\s*\/?>/gi;
  html = html.replace(regBr, "\n");

  const regWithoutHtmlExceptImg = /<(?!img\s*\/?)[^>]+>/gi;
  return html.replace(regWithoutHtmlExceptImg, "");
};

export const getMessagePreview = (msg: MessageItem): string => {
  switch (msg.contentType) {
    case MessageType.TextMessage:
      return msg.textElem?.content || "[消息]";
    case MessageType.PictureMessage:
      return "[图片]";
    case MessageType.FileMessage:
      return `[文件] ${msg.fileElem?.fileName || ""}`;
    case MessageType.VoiceMessage:
      return "[语音]";
    case MessageType.VideoMessage:
      return "[视频]";
    case MessageType.LocationMessage:
      return "[位置]";
    case MessageType.MergeMessage:
      return "[聊天记录]";
    case MessageType.CardMessage:
      return "[名片]";
    default:
      return "[消息]";
  }
};

export const getQuoteMessageContent = (msg: MessageItem): string => {
  return JSON.stringify({
    sendID: msg.sendID,
    senderNickname: msg.senderNickname,
    senderFaceUrl: msg.senderFaceUrl,
    sessionType: msg.sessionType,
    contentType: msg.contentType,
    content: msg.content,
    textElem: msg.textElem,
    pictureElem: msg.pictureElem,
    fileElem: msg.fileElem,
    soundElem: msg.soundElem,
    videoElem: msg.videoElem,
  });
};

export const getQuoteMessageObject = (msg: MessageItem): Partial<MessageItem> => {
  return {
    sendID: msg.sendID,
    senderNickname: msg.senderNickname,
    senderFaceUrl: msg.senderFaceUrl,
    sessionType: msg.sessionType,
    contentType: msg.contentType,
    content: msg.content,
    textElem: msg.textElem,
    pictureElem: msg.pictureElem,
    fileElem: msg.fileElem,
    soundElem: msg.soundElem,
    videoElem: msg.videoElem,
  };
};
