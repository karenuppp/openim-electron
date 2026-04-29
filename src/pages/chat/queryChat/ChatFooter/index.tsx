import { useLatest } from "ahooks";
import { Button } from "antd";
import { t } from "i18next";
import { forwardRef, ForwardRefRenderFunction, memo, useRef, useState, useEffect } from "react";

import "./ScreenshotPreview.scss";

import { MessageType, MessageItem } from "@openim/wasm-client-sdk";
import { IMSDK } from "@/layout/MainContentWrap";
import CKEditor from "@/components/CKEditor";
import { getCleanText, getMessagePreview } from "@/components/CKEditor/utils";
import i18n from "@/i18n";
import { feedbackToast } from "@/utils/common";
import { useChatStore } from "@/store/chat";
import { useConversationStore } from "@/store";

import SendActionBar from "./SendActionBar";
import { useFileMessage, FileWithPath } from "./SendActionBar/useFileMessage";
import { useSendMessage } from "./useSendMessage";

const sendActions = [
  { label: t("placeholder.sendWithEnter"), key: "enter" },
  { label: t("placeholder.sendWithShiftEnter"), key: "enterwithshift" },
];

i18n.on("languageChanged", () => {
  sendActions[0].label = t("placeholder.sendWithEnter");
  sendActions[1].label = t("placeholder.sendWithShiftEnter");
});

const ChatFooter: ForwardRefRenderFunction<unknown, unknown> = (_, ref) => {
  const [html, setHtml] = useState("");
  const latestHtml = useLatest(html);

  const currentConversationID = useConversationStore((s) => s.currentConversation?.conversationID);
  const prevConversationIDRef = useRef<string | undefined>(currentConversationID);
  const { getImageMessage, getImageMessageByPath, getFileMessage } = useFileMessage();
  const { sendMessage } = useSendMessage();
  const quoteMessage = useChatStore((s) => s.quoteMessage);
  const setQuoteMessage = useChatStore((s) => s.setQuoteMessage);
  const setQuoteFallback = useChatStore((s) => s.setQuoteFallback);

  // Pending screenshot file paths (for sending via getImageMessageByPath)
  const [pendingScreenshotPaths, setPendingScreenshotPaths] = useState<string[]>([]);
  const [sendingScreenshot, setSendingScreenshot] = useState(false);

  useEffect(() => {
    if (prevConversationIDRef.current && currentConversationID && prevConversationIDRef.current !== currentConversationID) {
      setQuoteMessage(null);
      clearPendingScreenshots();
    }
    prevConversationIDRef.current = currentConversationID;
  }, [currentConversationID, setQuoteMessage]);

  const extractScreenshotPathsFromHtml = (htmlContent: string): string[] => {
    const results: string[] = [];
    const imgRegex = /<img[^>]+class=["'][^"']*screenshot-preview-img[^"']*["'][^>]+data-src="([^"]+)"/gi;
    let match;
    while ((match = imgRegex.exec(htmlContent)) !== null) {
      results.push(match[1]); // data-src holds the pending screenshot path
    }
    return results;
  };

  const clearPendingScreenshots = () => {
    setPendingScreenshotPaths([]);
    // Remove all screenshot image tags from HTML content
    const cleaned = html.replace(/<p>\s*<img[^>]*class=["'][^"']*screenshot-preview-img[^"']*["'][^>]*\/?>\s*<\/p>/gi, "");
    if (cleaned !== html) {
      setHtml(cleaned.trim());
    }
  };

  const onScreenshotStart = async (hideWindow: boolean) => {
    if (!window.electronAPI) {
      console.error("[screenshot] no electronAPI");
      return;
    }
    try {
      const channel = hideWindow ? "capture-screen-hide" : "capture-screen";
      const filePath = await window.electronAPI.ipcInvoke<string | null>(channel);
      if (!filePath) return;

      // Load image as data URL for preview display
      const dataUrl = await window.electronAPI.ipcInvoke<string | null>("read-file-as-data-url", filePath);
      if (dataUrl) {
        setPendingScreenshotPaths(prev => [...prev, filePath]);

        // Insert screenshot inline in CKEditor with data-src holding the file path for sending
        const imgHtml = `<img class="screenshot-preview-img" src="${dataUrl}" data-src="${filePath}" />`;
        
        if (html.trim()) {
          setHtml(html + "\n\n" + imgHtml);
        } else {
          setHtml(imgHtml);
        }
      } else {
        console.error("[screenshot] failed to read file as data URL");
      }
    } catch (e) {
      console.error("[screenshot] failed:", e);
    }
  };

  const sendScreenshotsFromEditor = async () => {
    if (!html.trim()) return;
    
    // Extract all screenshot image paths from the HTML content
    const screenshotPaths = extractScreenshotPathsFromHtml(html);
    if (screenshotPaths.length === 0) return false; // no screenshots in editor

    setSendingScreenshot(true);
    try {
      for (const filePath of screenshotPaths) {
        const message = await getImageMessageByPath(filePath, `screenshot_${Date.now()}.png`);
        console.log("[screenshot] sending:", message?.clientMsgID);
        await sendMessage({ message });
      }

      // Remove all screenshot images from HTML after successful send
      const cleanedHtml = html.replace(/<img[^>]*class=["'][^"']*screenshot-preview-img[^"']*["'][^>]*\/?>/gi, "").trim();
      setHtml(cleanedHtml);
      setPendingScreenshotPaths([]);
      
      return true; // sent screenshots
    } catch (e) {
      console.error("[screenshot] send failed:", e);
      feedbackToast({ msg: t("placeholder.sendFailed") || "发送失败" });
      setSendingScreenshot(false);
      return false;
    }
  };

  const onChange = (value: string) => {
    setHtml(value);
  };

  const enterToSend = async () => {
    // If there are pending screenshots in editor, send them first (with text if any)
    if (html.includes('screenshot-preview-img') && !sendingScreenshot) {
      await sendScreenshotsFromEditor();
      // After sending screenshot, still send text if there is any remaining
      const cleanText = getCleanText(latestHtml.current ?? '');
      if (!cleanText) return;
    }

    const cleanText = getCleanText(latestHtml.current ?? '');
    if (!cleanText) return;

    let message: MessageItem;
    if (quoteMessage) {
      const original = quoteMessage as MessageItem;
      setQuoteFallback({
        clientMsgID: original.clientMsgID,
        serverMsgID: original.serverMsgID,
        createTime: original.createTime,
        sendTime: original.sendTime,
        sessionType: original.sessionType,
        sendID: original.sendID,
        recvID: original.recvID,
        msgFrom: original.msgFrom,
        contentType: original.contentType,
        senderPlatformID: original.senderPlatformID,
        senderNickname: original.senderNickname || '',
        senderFaceUrl: original.senderFaceUrl || '',
        groupID: original.groupID || '',
        content: original.content || '',
        seq: original.seq,
        isRead: original.isRead,
        status: original.status,
        textElem: original.textElem || undefined,
        pictureElem: original.pictureElem || undefined,
        soundElem: original.soundElem || undefined,
        videoElem: original.videoElem || undefined,
        fileElem: original.fileElem || undefined,
        mergeElem: original.mergeElem || undefined,
        atTextElem: original.atTextElem || undefined,
        faceElem: original.faceElem || undefined,
        locationElem: original.locationElem || undefined,
        customElem: original.customElem || undefined,
      });

      const textResult = await IMSDK.createTextMessage(cleanText);
      message = textResult.data as MessageItem;
      (message as any).contentType = MessageType.QuoteMessage;
      const quoteMsg = { ...original } as MessageItem;
      (message as any).quoteElem = {
        text: cleanText,
        quoteMessage: quoteMsg,
      };
    } else {
      message = (await IMSDK.createTextMessage(cleanText)).data;
    }
    setHtml("");
    setQuoteMessage(null);
    sendMessage({ message });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const message = isImage
        ? await getImageMessage(file)
        : await getFileMessage(file as FileWithPath);
      sendMessage({ message });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <footer className="relative h-full bg-white py-px" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="flex h-full flex-col border-t border-t-[var(--gap-text)]">
        <SendActionBar sendMessage={sendMessage} getImageMessage={getImageMessage} getImageMessageByPath={getImageMessageByPath} getFileMessage={getFileMessage} onScreenshotStart={onScreenshotStart} />

        {quoteMessage && (
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] px-3 py-1.5 bg-[var(--bg-primary)]">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[var(--sub-text)] truncate">
                引用 {quoteMessage.senderNickname}：{getMessagePreview(quoteMessage)}
              </div>
            </div>
            <Button size="small" type="text" onClick={() => setQuoteMessage(null)}>✕</Button>
          </div>
        )}

        <div className="relative flex flex-1 flex-col overflow-hidden">
          <CKEditor value={html} onEnter={enterToSend} onChange={onChange} />
          <div className="flex items-center justify-end py-2 pr-3">
            <Button className="w-fit px-6 py-1" type="primary" onClick={enterToSend}>
              {t("placeholder.send")}
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default memo(forwardRef(ChatFooter));
