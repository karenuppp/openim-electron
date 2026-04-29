import { useLatest } from "ahooks";
import { Button } from "antd";
import { t } from "i18next";
import { forwardRef, ForwardRefRenderFunction, memo, useRef, useState, useEffect } from "react";

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

interface ScreenshotPreview {
  dataUrl: string;
  filePath: string;
}

const ChatFooter: ForwardRefRenderFunction<unknown, unknown> = (_, ref) => {
  const [html, setHtml] = useState("");
  const latestHtml = useLatest(html);

  const currentConversationID = useConversationStore((s) => s.currentConversation?.conversationID);
  const prevConversationIDRef = useRef<string | undefined>(currentConversationID);
  const { getImageMessage, getImageMessageByPath, getFileMessage } = useFileMessage();
  const { sendMessage } = useSendMessage();
  const quoteMessage = useChatStore((s) => s.quoteMessage);
  const setQuoteMessage = useChatStore((s) => s.setQuoteMessage);

  // Screenshot previews stored separately from CKEditor HTML
  const [screenshotPreviews, setScreenshotPreviews] = useState<ScreenshotPreview[]>([]);
  const [sendingScreenshot, setSendingScreenshot] = useState(false);

  useEffect(() => {
    if (prevConversationIDRef.current && currentConversationID && prevConversationIDRef.current !== currentConversationID) {
      setQuoteMessage(null);
      clearScreenshots();
    }
    prevConversationIDRef.current = currentConversationID;
  }, [currentConversationID, setQuoteMessage]);

  const addScreenshotPreview = (dataUrl: string, filePath: string) => {
    setScreenshotPreviews(prev => [...prev, { dataUrl, filePath }]);
  };

  const removeScreenshotPreview = (index: number) => {
    setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearScreenshots = () => {
    setScreenshotPreviews([]);
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

      // Load image as data URL for preview display (kept outside CKEditor)
      const dataUrl = await window.electronAPI.ipcInvoke<string | null>("read-file-as-data-url", filePath);
      if (dataUrl) {
        addScreenshotPreview(dataUrl, filePath);
      } else {
        console.error("[screenshot] failed to read file as data URL");
      }
    } catch (e) {
      console.error("[screenshot] failed:", e);
    }
  };

  const sendScreenshots = async () => {
    if (screenshotPreviews.length === 0) return false;

    setSendingScreenshot(true);
    try {
      for (const preview of screenshotPreviews) {
        console.log("[screenshot] sending:", preview.filePath);
        const message = await getImageMessageByPath(preview.filePath, `screenshot_${Date.now()}.png`);
        await sendMessage({ message });
      }

      // Clear all screenshots after successful send
      setScreenshotPreviews([]);
      
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
    // Send screenshots first if any exist
    if (screenshotPreviews.length > 0 && !sendingScreenshot) {
      await sendScreenshots();
    }

    const cleanText = getCleanText(latestHtml.current ?? '');
    
    // If we just sent screenshots and there's no text, don't do anything else
    if (!cleanText) return;

    let message: MessageItem;
    if (quoteMessage) {
      const original = quoteMessage as MessageItem;
      
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

        {/* Screenshot preview row — rendered separately from CKEditor */}
        {screenshotPreviews.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
            <span className="text-xs text-[var(--sub-text)]">{t("placeholder.screenshotPreview")}</span>
            {screenshotPreviews.map((preview, index) => (
              <div key={index} className="relative group inline-block rounded-lg overflow-hidden border border-[var(--border-color)]">
                <img 
                  src={preview.dataUrl} 
                  alt="screenshot" 
                  className="max-w-[120px] max-h-[80px] object-contain" 
                />
                <button
                  onClick={() => removeScreenshotPreview(index)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                >
                  ✕
                </button>
              </div>
            ))}
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
