import { FC } from "react";
import { MessageType } from "@openim/wasm-client-sdk";

import { formatBr } from "@/utils/common";

import styles from "./message-item.module.scss";
import { IMessageItemProps } from ".";

const QuoteMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const quoteElem = message.quoteElem;
  const quotedMsg = quoteElem?.quoteMessage;

  const replyText = quoteElem?.text || message.textElem?.content || "";

  const renderQuotePreview = () => {
    if (!quotedMsg) return <span className="text-[var(--sub-text)]">[消息]</span>;

    switch (quotedMsg.contentType) {
      case MessageType.TextMessage:
        return <span className="truncate">{quotedMsg.textElem?.content || "[消息]"}</span>;
      case MessageType.PictureMessage:
        return <span className="text-[var(--sub-text)]">[图片]</span>;
      case MessageType.FileMessage:
        return <span className="text-[var(--sub-text)]">[文件] {quotedMsg.fileElem?.fileName || ""}</span>;
      default:
        return <span className="text-[var(--sub-text)]">[消息]</span>;
    }
  };

  return (
    <div className={styles.bubble}>
      {quotedMsg && (
        <div className="border-l-2 border-primary-color pl-2 mb-1.5 text-xs text-[var(--sub-text)]">
          <div className="font-medium">{quotedMsg.senderNickname || message.senderNickname || "未知"}</div>
          <div className="truncate opacity-80">{renderQuotePreview()}</div>
        </div>
      )}
      {replyText && (
        <div dangerouslySetInnerHTML={{ __html: formatBr(replyText) }}></div>
      )}
    </div>
  );
};

export default QuoteMessageRender;
