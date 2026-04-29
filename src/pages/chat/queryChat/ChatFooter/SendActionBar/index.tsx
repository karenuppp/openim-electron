import { MessageItem } from "@openim/wasm-client-sdk";
import { Popover, PopoverProps, Upload } from "antd";
import { TooltipPlacement } from "antd/es/tooltip";
import clsx from "clsx";
import i18n, { t } from "i18next";
import { UploadRequestOption } from "rc-upload/lib/interface";
import { memo, ReactNode, useState } from "react";
import React from "react";

import image from "@/assets/images/chatFooter/image.png";
import rtc from "@/assets/images/chatFooter/rtc.png";
import fileIcon from "@/assets/images/chatFooter/file.png";
import cut from "@/assets/images/chatFooter/cut.png";

import { SendMessageParams } from "../useSendMessage";
import CallPopContent from "./CallPopContent";
import { useConversationStore } from "@/store";

const sendActionList = [
  {
    title: t("placeholder.image"),
    icon: image,
    key: "image",
    accept: "image/*",
    comp: null,
    placement: undefined,
  },
  {
    title: t("placeholder.file"),
    icon: fileIcon,
    key: "file",
    accept: "*",
    comp: null,
    placement: undefined,
  },
  {
    title: t("placeholder.screenshot"),
    icon: cut,
    key: "screenshot",
    accept: undefined,
    comp: null,
    placement: undefined,
  },
  {
    title: t("placeholder.call"),
    icon: rtc,
    key: "rtc",
    accept: undefined,
    comp: <CallPopContent />,
    placement: "top",
  },
];

i18n.on("languageChanged", () => {
  sendActionList[0].title = t("placeholder.image");
  sendActionList[1].title = t("placeholder.file");
  sendActionList[2].title = t("placeholder.screenshot");
  sendActionList[3].title = t("placeholder.call");
});

const SendActionBar = ({
  sendMessage,
  getImageMessage,
  getFileMessage,
  onScreenshotStart,
}: {
  sendMessage: (params: SendMessageParams) => Promise<void>;
  getImageMessage: (file: File) => Promise<MessageItem>;
  getFileMessage: (file: File) => Promise<MessageItem>;
  onScreenshotStart: (hideWindow: boolean) => void;
}) => {
  const [visibleState, setVisibleState] = useState(false);
  const [screenshotPopVisible, setScreenshotPopVisible] = useState(false);
  const isGroupSession = useConversationStore(
    (state) => !!state.currentConversation?.groupID,
  );

  const closePop = () => setVisibleState(false);

  const imageHandle = async (options: UploadRequestOption) => {
    const message = await getImageMessage(options.file as File);
    sendMessage({ message });
  };

  const fileHandle = async (options: UploadRequestOption) => {
    const message = await getFileMessage(options.file as File);
    sendMessage({ message });
  };

  const handleScreenshotDirect = () => {
    setScreenshotPopVisible(false);
    onScreenshotStart(false);
  };

  const handleScreenshotHideWindow = () => {
    setScreenshotPopVisible(false);
    onScreenshotStart(true);
  };

  const screenshotContent = (
    <div className="flex flex-col">
      <div
        className="cursor-pointer px-3 py-2 text-sm hover:bg-[var(--bg-primary)] rounded"
        onClick={handleScreenshotDirect}
      >
        {t("placeholder.screenshot")}
      </div>
      <div
        className="cursor-pointer px-3 py-2 text-sm hover:bg-[var(--bg-primary)] rounded"
        onClick={handleScreenshotHideWindow}
      >
        {t("placeholder.screenshotHideWindow")}
      </div>
    </div>
  );

  return (
    <div className="flex items-center px-4.5 pt-2">
      {sendActionList.map((action) => {
        if (action.key === "rtc" && isGroupSession) {
          return null;
        }
        const popProps: PopoverProps = {
          placement: action.placement as TooltipPlacement,
          content:
            action.comp &&
            React.cloneElement(action.comp as React.ReactElement, {
              closePop,
            }),
          title: null,
          arrow: false,
          trigger: "click",

          open: action.comp ? visibleState : false,
          onOpenChange: (visible) => setVisibleState(visible),
        };

        return (
          <ActionWrap
            popProps={popProps}
            key={action.key}
            accept={action.accept}
            imageHandle={imageHandle}
            fileHandle={fileHandle}
            screenshotContent={screenshotContent}
            screenshotPopVisible={screenshotPopVisible}
            setScreenshotPopVisible={setScreenshotPopVisible}
            actionKey={action.key}
          >
            <div
              className={clsx("flex cursor-pointer items-center last:mr-0", {
                "mr-5": !action.accept,
              })}
            >
              <img src={action.icon} width={20} alt={action.title} />
            </div>
          </ActionWrap>
        );
      })}
    </div>
  );
};

export default memo(SendActionBar);

const ActionWrap = ({
  accept,
  popProps,
  children,
  imageHandle,
  fileHandle,
  screenshotContent,
  screenshotPopVisible,
  setScreenshotPopVisible,
  actionKey,
}: {
  accept?: string;
  children: ReactNode;
  popProps?: PopoverProps;
  imageHandle: (options: UploadRequestOption) => void;
  fileHandle: (options: UploadRequestOption) => void;
  screenshotContent?: ReactNode;
  screenshotPopVisible?: boolean;
  setScreenshotPopVisible?: (v: boolean) => void;
  actionKey?: string;
}) => {
  if (actionKey === "screenshot") {
    return (
      <Popover
        content={screenshotContent}
        title={null}
        arrow={false}
        trigger="click"
        open={screenshotPopVisible}
        onOpenChange={(visible) => setScreenshotPopVisible?.(visible)}
        placement="top"
      >
        <div className="mr-5 flex cursor-pointer">
          {children}
        </div>
      </Popover>
    );
  }
  if (accept) {
    const handle = actionKey === "file" ? fileHandle : imageHandle;
    return (
      <Upload showUploadList={false} customRequest={handle} accept={accept} multiple className="mr-5 flex">
        {children}
      </Upload>
    );
  }
  return <Popover {...popProps}>{children}</Popover>;
};
