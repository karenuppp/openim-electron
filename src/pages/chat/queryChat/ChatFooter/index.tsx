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


  useEffect(() => {
    if (prevConversationIDRef.current && currentConversationID && prevConversationIDRef.current !== currentConversationID) {
      setQuoteMessage(null);
    }
    prevConversationIDRef.current = currentConversationID;
  }, [currentConversationID, setQuoteMessage]);

  const onChange = (value: string) => {
    setHtml(value);
  };

  const enterToSend = async () => {
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
      console.log('[ChatFooter] Manually constructing quote message');
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
        <SendActionBar sendMessage={sendMessage} getImageMessage={getImageMessage} getImageMessageByPath={getImageMessageByPath} getFileMessage={getFileMessage} />

        {}
        {quoteMessage && (
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] px-3 py-1.5 bg-[var(--bg-primary)]">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[var(--sub-text)] truncate">
                引用 {quoteMessage.senderNickname}：{getMessagePreview(quoteMessage)}
              </div>
            </div>
            <Button
              size="small"
              type="text"
              onClick={() => setQuoteMessage(null)}
            >
              ✕
            </Button>
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
