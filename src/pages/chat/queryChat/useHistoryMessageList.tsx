import { MessageItem, ViewType } from "@openim/wasm-client-sdk";
import { useLatest, useRequest } from "ahooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { IMSDK } from "@/layout/MainContentWrap";
import emitter, { emit } from "@/utils/events";
import { useChatStore } from "@/store/chat";

import { VirtuosoHandle } from "react-virtuoso";
import { getVirtuosoRef } from "./virtuosoRef";

const START_INDEX = 10000;
const SPLIT_COUNT = 20;

export function useHistoryMessageList() {
  const { conversationID } = useParams();
  const [loadState, setLoadState] = useState({
    initLoading: true,
    hasMoreOld: true,
    messageList: [] as MessageItem[],
    firstItemIndex: START_INDEX,
  });
  const latestLoadState = useLatest(loadState);


  const loadStateRef = useRef(loadState);
  loadStateRef.current = loadState;


  const pendingJumpRef = useRef<string | null>(null);

  useEffect(() => {
    pendingJumpRef.current = null;
    loadHistoryMessages();
    return () => {
      setLoadState(() => ({
        initLoading: true,
        hasMoreOld: true,
        messageList: [] as MessageItem[],
        firstItemIndex: START_INDEX,
      }));
    };
  }, [conversationID]);

  useEffect(() => {
    const pushNewMessage = (message: MessageItem) => {
      if (
        latestLoadState.current?.messageList.find(
          (item) => item.clientMsgID === message.clientMsgID,
        )
      ) {
        return;
      }
      setLoadState((preState) => ({
        ...preState,
        messageList: [...preState.messageList, message],
      }));
    };
    const updateOneMessage = (message: MessageItem) => {
      setLoadState((preState) => {
        const tmpList = [...preState.messageList];
        const idx = tmpList.findIndex((msg) => msg.clientMsgID === message.clientMsgID);
        if (idx < 0) {
          return preState;
        }








        const optimistic = tmpList[idx];
        const merged = { ...optimistic, ...message };

        if (message.contentType === 114 ) {




          const fallbackMsg = useChatStore.getState().quoteFallback;
          if (fallbackMsg) {
            merged.quoteElem = {
              text: message.quoteElem?.text || optimistic.quoteElem?.text || "",
              quoteMessage: fallbackMsg as MessageItem,
            };

            useChatStore.getState().setQuoteFallback(null);
          } else if (!message.quoteElem?.quoteMessage && optimistic.quoteElem?.quoteMessage) {

            merged.quoteElem = optimistic.quoteElem;
          }
        }

        tmpList[idx] = merged;
        return {
          ...preState,
          messageList: tmpList,
        };
      });
    };
    const revokeMessage = (clientMsgID: string) => {
      setLoadState((preState) => ({
        ...preState,
        messageList: preState.messageList.filter(
          (msg) => msg.clientMsgID !== clientMsgID,
        ),
      }));
    };
    emitter.on("PUSH_NEW_MSG", pushNewMessage);
    emitter.on("UPDATE_ONE_MSG", updateOneMessage);
    emitter.on("MSG_REVOKED", revokeMessage);
    return () => {
      emitter.off("PUSH_NEW_MSG", pushNewMessage);
      emitter.off("UPDATE_ONE_MSG", updateOneMessage);
      emitter.off("MSG_REVOKED", revokeMessage);
    };
  }, []);

  const loadHistoryMessages = () => getMoreOldMessages(false);

  const { loading: moreOldLoading, runAsync: getMoreOldMessages } = useRequest(
    async (loadMore = true) => {
      const reqConversationID = conversationID;
      const { data } = await IMSDK.getAdvancedHistoryMessageList({
        count: SPLIT_COUNT,
        startClientMsgID: loadMore
          ? (latestLoadState.current?.messageList[0]?.clientMsgID ?? '')
          : "",
        conversationID: conversationID ?? "",
        viewType: ViewType.History,
      });
      if (conversationID !== reqConversationID) return;
      const oldMessageList = latestLoadState.current?.messageList ?? [];
      setTimeout(() => {
        setLoadState((preState) => {
          const newMessageList = [...data.messageList, ...(loadMore ? preState.messageList : [])];
          return {
            ...preState,
            initLoading: false,
            hasMoreOld: !data.isEnd,
            messageList: newMessageList,
            firstItemIndex: preState.firstItemIndex - data.messageList.length,
          };
        });


        resolvePendingJump(pendingJumpRef, [...data.messageList, ...oldMessageList], virtuosoHandle);
      }, 0);
    },
    {
      manual: true,
    },
  );



  const resolvePendingJump = (
    pendingRef: React.MutableRefObject<string | null>,
    msgList: MessageItem[],
    vHandle: VirtuosoHandle | null,
  ) => {
    const target = pendingRef.current;
    if (!target) return;


    let retries = 0;
    const maxRetries = 3;
    const tryScroll = () => {
      const idx = msgList.findIndex((m) => m.clientMsgID === target);
      if (idx < 0) {
        pendingRef.current = null;
        return;
      }
      if (vHandle) {
        pendingRef.current = null;
        vHandle.scrollToIndex({
          index: idx,
          align: "center",
          behavior: "smooth",
        });
      } else if (++retries <= maxRetries) {
        setTimeout(tryScroll, 200 * retries);
      } else {
        pendingRef.current = null;
      }
    };
    tryScroll();
  };


  const virtuosoHandle = getVirtuosoRef();


  const jumpToMessage = useCallback((clientMsgID: string) => {

    const ls = loadStateRef.current;


    const idx = ls.messageList.findIndex(
      (m) => m.clientMsgID === clientMsgID,
    );
    if (idx >= 0) {
      setTimeout(() => {
        virtuosoHandle?.scrollToIndex({
          index: idx,
          align: "center",
          behavior: "smooth",
        });
      }, 100);
      return;
    }


    if (ls.hasMoreOld) {
      pendingJumpRef.current = clientMsgID;
      if (!moreOldLoading) {
        getMoreOldMessages(true).catch(() => {
          if (pendingJumpRef.current === clientMsgID) {
            pendingJumpRef.current = null;
          }
        });
      }
    } else {

      pendingJumpRef.current = null;
    }
  }, [moreOldLoading, getMoreOldMessages]);

  return {
    SPLIT_COUNT,
    loadState,
    latestLoadState,
    conversationID,
    moreOldLoading,
    getMoreOldMessages,
    jumpToMessage,
  };
}

export const pushNewMessage = (message: MessageItem) => emit("PUSH_NEW_MSG", message);
export const updateOneMessage = (message: MessageItem) =>
  emit("UPDATE_ONE_MSG", message);
