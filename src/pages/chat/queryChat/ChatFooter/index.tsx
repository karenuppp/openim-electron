import { useLatest } from "ahooks";
import { Button } from "antd";
import { t } from "i18next";
import { forwardRef, ForwardRefRenderFunction, memo, useRef, useState, useEffect } from "react";

import { MessageType, MessageItem } from "@openim/wasm-client-sdk";
import { IMSDK } from "@/utils/imSDK";
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
  const { getImageMessage, getImageMessageByPath, getFileMessage } = useFileMessage();
  const { sendMessage } = useSendMessage();
  const quoteMessage = useChatStore((s) => s.quoteMessage);
  const setQuoteMessage = useChatStore((s) => s.setQuoteMessage);

  const [screenshotPaths, setScreenshotPaths] = useState<string[]>([]);
  const [draggedFiles, setDraggedFiles] = useState<FileWithPath[]>([]);

  const ckEditorRef = useRef<CKEditorRef>(null);

  useEffect(() => {
    if (prevConversationIDRef.current && currentConversationID && prevConversationIDRef.current !== currentConversationID) {
      setQuoteMessage(null);
      clearAll();
    }
    prevConversationIDRef.current = currentConversationID;
  }, [currentConversationID, setQuoteMessage]);

  const getAllImagesAsFiles = async (): Promise<File[]> => {
    const editorInstance = ckEditorRef.current?.editor;
    if (!editorInstance) return [];

    const files: File[] = [];

    const convertDataUrlToFile = (src: string, index: number): boolean => {
      if (!src.startsWith("data:")) return false;
      try {
        const [header, data] = src.split(",");
        const mimeType = header.match(/:(.*?);/)?.[1] || "image/png";
        const byteString = atob(data);
        const ab = new ArrayBuffer(byteString.length);
        const ua = new Uint8Array(ab);
        for (let j = 0; j < byteString.length; j++) {
          ua[j] = byteString.charCodeAt(j);
        }
        const blob = new Blob([ab], { type: mimeType });
        files.push(new File([blob], `screenshot_${Date.now()}_${index}.png`, { type: mimeType }));
        return true;
      } catch (e) {
        return false;
      }
    };

    let totalFound = 0;

    try {
      editorInstance.model.change((writer) => {
        const root = editorInstance.model.document.getRoot();
        if (!root) return [];

        const traverse = (node: any): number => {
          let count = 0;
          if (node.name === "imageInline") {
            const src = node.getAttribute("src");
            if (typeof src === "string" && convertDataUrlToFile(src, ++totalFound)) {
              count++;
            }
          }
          if (node.$is("element") && !node.is("$text")) {
            for (const child of node.getChildren()) {
              count += traverse(child);
            }
          }
          return count;
        };

        let modelTotal = 0;
        for (const child of root.getChildren()) {
          modelTotal += traverse(child);
        }
        return [];
      });
    } catch (e) {
    }

    try {
      const domRoot = editorInstance.editing.view.domRoot?.element;
      if (domRoot) {
        const imgElements = Array.from(domRoot.querySelectorAll("img")) as HTMLImageElement[];
        for (let i = 0; i < imgElements.length; i++) {
          const src = imgElements[i].getAttribute("src") || "";
          if (!src.startsWith("data:")) continue;
          const exists = files.some(f => f.name.includes(src.substring(0, 50)));
          if (!exists && convertDataUrlToFile(src, ++totalFound)) {
          }
        }
      } else {
      }
    } catch (e) {
          }

    if (totalFound === 0) {
      try {
        const html = editorInstance.getData();
        const imgRegex = /<img[^>]+src=["'](data:[^"']+)["'][^>]*>/gi;
        let match;
        while ((match = imgRegex.exec(html)) !== null) {
          const src = match[1];
          if (convertDataUrlToFile(src, ++totalFound)) {
          }
        }
        if (totalFound === 0) {
        }
      } catch (e) {
      }
    }

    if (totalFound > 0) {
    } else {
      try {
        editorInstance.model.change((writer) => {
          const root = editorInstance.model.document.getRoot();
          if (root) {
            const dump = Array.from(root.getChildren()).map(c => ({ name: c.name, isText: c.is("$text") }));
          }
        });
      } catch {}
    }

    return files;
  };

  const addScreenshotPath = (filePath: string) => {
    setScreenshotPaths(prev => [...prev, filePath]);
  };

  const clearAll = () => {
    setScreenshotPaths([]);
    setDraggedFiles([]);
  };

  const onScreenshotStart = async (hideWindow: boolean) => {
    if (!window.electronAPI) {
      return;
    }
    try {
      const channel = hideWindow ? "capture-screen-hide" : "capture-screen";
      const filePath = await window.electronAPI.ipcInvoke<string | null>(channel);
      if (!filePath) return;


      const dataUrl = await window.electronAPI.ipcInvoke<string | null>("read-file-as-data-url", filePath);
      if (dataUrl && ckEditorRef.current) {
        ckEditorRef.current.insertImage(dataUrl);
        addScreenshotPath(filePath);
      } else {
      }
    } catch (e) {
    }
  };

  const sendAll = async () => {
    const currentDraggedFiles = draggedFiles;
    setDraggedFiles([]);

    // Send dragged files first (before processing text/image)
    for (const file of currentDraggedFiles) {
      try {
        const message = file.type.startsWith("image/")
          ? await getImageMessage(file)
          : await getFileMessage(file);
        sendMessage({ message });
      } catch (e) {
        feedbackToast(t("placeholder.sendFailed") || "发送失败");
        return;
      }
    }

    const imageFiles = await getAllImagesAsFiles();
    const screenshotFilePaths = screenshotPaths;

    const usePathFallback = imageFiles.length === 0 && screenshotFilePaths.length > 0;
    if (usePathFallback) {
    }

    const imageList = usePathFallback ? screenshotFilePaths : imageFiles;

    for (const file of imageList) {
      try {
        const message = typeof file === "string"
          ? await getImageMessageByPath(file, `screenshot_${Date.now()}.png`)
          : await getImageMessage(file as FileWithPath);
        sendMessage({ message });
      } catch (e) {
        feedbackToast(t("placeholder.sendFailed") || "发送失败");
        return;
      }
    }

    const cleanText = getCleanText(latestHtml.current ?? '');

    if (!cleanText && imageList.length > 0) {
      clearAll();
      setHtml("");
      setQuoteMessage(null);
      return;
    }

    if (!cleanText && imageList.length === 0 && currentDraggedFiles.length === 0) {
      return;
    }

    // Only dragged files (already sent above), no text or images
    if (!cleanText && imageList.length === 0 && currentDraggedFiles.length > 0) {
      clearAll();
      setHtml("");
      setQuoteMessage(null);
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
    const imgCount = (value.match(/<img[\s\S]*?>/gi) || []).length;
    setScreenshotPaths(prev => {
      if (prev.length === imgCount) return prev;
      if (imgCount < prev.length) return prev.slice(0, imgCount);
      return prev;
    });
    setHtml(value);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const imageFiles: FileWithPath[] = [];
    const otherFiles: FileWithPath[] = [];

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        imageFiles.push(file as FileWithPath);
      } else {
        otherFiles.push(file as FileWithPath);
      }
    }

    for (const file of imageFiles) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl && ckEditorRef.current) {
          ckEditorRef.current.insertImage(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }

    if (otherFiles.length > 0) {
      setDraggedFiles(prev => [...prev, ...otherFiles]);
      feedbackToast(`${otherFiles.length} 个文件已添加到待发送列表`);
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
          <CKEditor ref={ckEditorRef} value={html} onEnter={enterToSend} onChange={onChange} />
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
