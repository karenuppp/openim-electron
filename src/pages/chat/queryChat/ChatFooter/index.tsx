import { useLatest } from "ahooks";
import { Button } from "antd";
import { t } from "i18next";
import { forwardRef, ForwardRefRenderFunction, memo, useRef, useState, useEffect } from "react";

import { MessageType, MessageItem } from "@openim/wasm-client-sdk";
import { IMSDK } from "@/layout/MainContentWrap";
import CKEditor, { CKEditorRef } from "@/components/CKEditor";
import { getCleanText } from "@/components/CKEditor/utils";
import i18n from "@/i18n";
import { feedbackToast } from "@/utils/common";
import { useChatStore } from "@/store/chat";
import { useConversationStore } from "@/store";

import SendActionBar from "./SendActionBar";
import { FileWithPath } from "./SendActionBar/useFileMessage";
import { useSendMessage } from "./useSendMessage";
import { useFileMessage } from "./SendActionBar/useFileMessage";

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
  const { getImageMessage, getFileMessage } = useFileMessage();
  const { sendMessage } = useSendMessage();
  const quoteMessage = useChatStore((s) => s.quoteMessage);
  const setQuoteMessage = useChatStore((s) => s.setQuoteMessage);

  // Track screenshot file paths for upload
  const [screenshotPaths, setScreenshotPaths] = useState<string[]>([]);

  const ckEditorRef = useRef<CKEditorRef>(null);

  useEffect(() => {
    if (prevConversationIDRef.current && currentConversationID && prevConversationIDRef.current !== currentConversationID) {
      setQuoteMessage(null);
      clearAll();
    }
    prevConversationIDRef.current = currentConversationID;
  }, [currentConversationID, setQuoteMessage]);

  // Extract all embedded images from CKEditor view DOM as File objects for upload
  const getAllImagesAsFiles = async (): Promise<File[]> => {
    const editorInstance = ckEditorRef.current?.editor;
    if (!editorInstance) return [];

    const files: File[] = [];
    try {
      const domRoot = editorInstance.editing.view.domRoot.element;
      if (!domRoot) return files;

      // Find all img elements in the CKEditor view DOM (AutoImage renders inline images as <img>)
      const imgElements = Array.from(domRoot.querySelectorAll("img")) as HTMLImageElement[];

      for (let i = 0; i < imgElements.length; i++) {
        const img = imgElements[i];
        let src = img.getAttribute("src") || "";

        // Skip external URLs, only handle data URLs (base64 images)
        if (!src.startsWith("data:")) continue;

        try {
          // Convert base64 data URL to File object
          const [header, data] = src.split(",");
          const mimeType = header.match(/:(.*?);/)?.[1] || "image/png";
          const byteString = atob(data);
          const ab = new ArrayBuffer(byteString.length);
          const ua = new Uint8Array(ab);
          for (let j = 0; j < byteString.length; j++) {
            ua[j] = byteString.charCodeAt(j);
          }

          const blob = new Blob([ab], { type: mimeType });
          files.push(new File([blob], `screenshot_${Date.now()}_${i}.png`, { type: mimeType }));
        } catch (e) {
          console.error("[getAllImagesAsFiles] failed:", e);
        }
      }
    } catch (e) {
      console.error("[getAllImagesAsFiles] error:", e);
    }
    return files;
  };

  const addScreenshotPath = (filePath: string) => {
    setScreenshotPaths(prev => [...prev, filePath]);
  };

  const clearAll = () => {
    setScreenshotPaths([]);
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

      // Load image as data URL and insert into CKEditor at cursor position
      const dataUrl = await window.electronAPI.ipcInvoke<string | null>("read-file-as-data-url", filePath);
      if (dataUrl && ckEditorRef.current) {
        ckEditorRef.current.insertImage(dataUrl);
        addScreenshotPath(filePath);
      } else {
        console.error("[screenshot] failed to read file as data URL");
      }
    } catch (e) {
      console.error("[screenshot] failed:", e);
    }
  };

  const sendAll = async () => {
    // Upload all images from CKEditor DOM (both screenshots and pasted images)
    const imageFiles = await getAllImagesAsFiles();

    for (const file of imageFiles) {
      console.log("[send] uploading screenshot:", file.name);
      try {
        const message = await getImageMessage(file as FileWithPath);
        sendMessage({ message });
      } catch (e) {
        console.error("[send] screenshot upload failed:", e);
        feedbackToast(t("placeholder.sendFailed") || "发送失败");
        return;
      }
    }

    const cleanText = getCleanText(latestHtml.current ?? '');

    if (!cleanText && imageFiles.length === 0) {
      // Nothing to send
      return;
    }

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

    clearAll();
    setHtml("");
    setQuoteMessage(null);
    sendMessage({ message });
  };

  const enterToSend = async () => {
    await sendAll();
  };

  const onChange = (value: string) => {
    // Sync screenshotPaths count with number of <img> tags in HTML
    const imgCount = (value.match(/<img[\s\S]*?>/gi) || []).length;
    setScreenshotPaths(prev => {
      if (prev.length === imgCount) return prev;
      if (imgCount < prev.length) return prev.slice(0, imgCount);
      // New images beyond tracked count — ignore (pasted URLs via AutoImage)
      return prev;
    });
    setHtml(value);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const message = isImage
        ? await getImageMessage(file as FileWithPath)
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
        <SendActionBar sendMessage={sendMessage} getImageMessage={getImageMessage} getFileMessage={getFileMessage} onScreenshotStart={onScreenshotStart} />

        {quoteMessage && (
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] px-3 py-1.5 bg-[var(--bg-primary)]">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[var(--sub-text)] truncate">
                引用 {quoteMessage.senderNickname}：{quoteMessage.textElem?.content || "[消息]"}
              </div>
            </div>
            <Button size="small" type="text" onClick={() => setQuoteMessage(null)}>✕</Button>
          </div>
        )}

        <div className="relative flex flex-1 flex-col overflow-hidden">
          <CKEditor ref={ckEditorRef} value={html} onEnter={enterToSend} onChange={onChange} placeholder={t("placeholder.chatInput") || "输入消息..."} />
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
