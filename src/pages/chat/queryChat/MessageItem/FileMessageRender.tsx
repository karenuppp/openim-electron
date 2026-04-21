import { MessageStatus } from "@openim/wasm-client-sdk";
import { Spin } from "antd";
import { FC } from "react";

import { feedbackToast } from "@/utils/common";
import { bytesToSize } from "@/utils/common";
import { IMessageItemProps } from ".";

const FileMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const fileElem = message.fileElem!;
  const fileName = fileElem.fileName || "未命名文件";
  const fileSize = fileElem.fileSize || 0;
  const localPath = fileElem.filePath || "";
  const remoteUrl = (fileElem as any).url || "";

  const isSending = message.status === MessageStatus.Sending;

  const handleOpenFile = async () => {
    // Electron: use shell.openPath to open local file
    if (window.electronAPI && localPath) {
      try {
        await window.electronAPI.ipcInvoke("open-file", localPath);
        return;
      } catch (e) {
        console.error("open-file failed", e);
      }
    }
    // Web: use URL if available
    if (remoteUrl) {
      window.open(remoteUrl, "_blank");
    } else {
      feedbackToast({ msg: "文件暂不支持预览" });
    }
  };

  return (
    <Spin spinning={isSending}>
      <div
        className="flex max-w-[280px] cursor-pointer items-center rounded-md border border-[var(--border-color)] bg-white px-3 py-3 hover:border-[var(--primary-color)]"
        onClick={handleOpenFile}
      >
        <div className="mr-3 flex h-10 w-10 items-center justify-center rounded bg-[var(--bg-primary)]">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
              stroke="var(--primary-color)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 2V8H20"
              stroke="var(--primary-color)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[var(--text-primary)]" title={fileName}>
            {fileName}
          </div>
          <div className="mt-0.5 text-xs text-[var(--sub-text)]">
            {bytesToSize(fileSize)}
          </div>
        </div>
        <div className="ml-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"
              stroke="var(--primary-color)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7 10L12 15L17 10"
              stroke="var(--primary-color)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 15V3"
              stroke="var(--primary-color)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </Spin>
  );
};

export default FileMessageRender;
