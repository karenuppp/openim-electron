import { MessageItem } from "@openim/wasm-client-sdk";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { FC } from "react";

import { IMSDK } from "@/layout/MainContentWrap";
import { feedbackToast } from "@/utils/common";
import { useConversationStore, useUserStore } from "@/store";
import { useChatStore } from "@/store/chat";
import { emit } from "@/utils/events";

interface MessageContextMenuProps {
  message: MessageItem;
  children: React.ReactNode;
}

const MessageContextMenu: FC<MessageContextMenuProps> = ({
  message,
  children,
}) => {
  const conversationID = useConversationStore(
    (s) => s.currentConversation?.conversationID,
  );
  const selfUserID = useUserStore((s) => s.selfInfo.userID);
  const setQuoteMessage = useChatStore((s) => s.setQuoteMessage);

  const handleRevoke = async () => {
    try {
      await IMSDK.revokeMessage({
        conversationID: conversationID ?? "",
        clientMsgID: message.clientMsgID,
      });
      emit("MSG_REVOKED", message.clientMsgID);
      feedbackToast({ msg: "已撤回" });
    } catch (e) {
      console.error("revoke failed", e);
      feedbackToast({ msg: "撤回失败" });
    }
  };

  const handleQuote = () => {
    setQuoteMessage(message);
  };

  const isSender = message.sendID === selfUserID;

  const items: MenuProps["items"] = [
    { key: "quote", label: "引用", onClick: handleQuote },
    ...(isSender
      ? [{ key: "revoke", label: "撤回", onClick: handleRevoke }]
      : []),
  ];

  return (
    <Dropdown menu={{ items }} trigger={["contextMenu"]}>
      {children}
    </Dropdown>
  );
};

export default MessageContextMenu;
