import { MessageStatus } from "@openim/wasm-client-sdk";
import { Spin } from "antd";
import { FC, useMemo } from "react";

import { feedbackToast } from "@/utils/common";
import { bytesToSize } from "@/utils/common";
import { IMessageItemProps } from ".";

function getFileTypeIcon(fileType: string): string {
  if (fileType.startsWith("image/")) return "image";
  if (fileType.startsWith("video/")) return "video";
  if (fileType.startsWith("audio/")) return "audio";
  if (
    fileType === "application/pdf" ||
    fileType.includes("pdf")
  )
    return "pdf";
  if (
    fileType.includes("word") ||
    fileType.includes("document") ||
    fileType.includes("application/msword") ||
    fileType.includes("application/vnd.openxmlformats")
  )
    return "doc";
  if (
    fileType.includes("sheet") ||
    fileType.includes("excel") ||
    fileType.includes("csv")
  )
    return "excel";
  if (
    fileType.includes("presentation") ||
    fileType.includes("powerpoint") ||
    fileType.includes("ppt")
  )
    return "ppt";
  if (
    fileType.includes("zip") ||
    fileType.includes("rar") ||
    fileType.includes("7z") ||
    fileType.includes("tar") ||
    fileType.includes("gzip")
  )
    return "zip";
  if (
    fileType.includes("text/") ||
    fileType === "application/json" ||
    fileType === "application/xml" ||
    fileType === "text/plain"
  )
    return "text";
  return "file";
}

const FileMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const fileElem = message.fileElem!;
  const fileName = fileElem.fileName || "未命名文件";
  const fileSize = fileElem.fileSize || 0;
  const localPath = fileElem.filePath || "";
  const remoteUrl = (fileElem as any).sourceUrl || "";

  const isSending = message.status === MessageStatus.Sending;

  const fileType = useMemo(
    () => (fileElem as any).fileType || "",
    [fileElem]
  );
  const iconKey = getFileTypeIcon(fileType);

  const handleOpenFile = async () => {

    if (remoteUrl) {
      console.log("[FileMessageRender] remoteUrl:", remoteUrl);
      console.log("[FileMessageRender] electronAPI:", !!window.electronAPI);
      try {
        if (window.electronAPI) {

          feedbackToast({ msg: "正在下载文件..." });
          console.log("[FileMessageRender] calling download-file IPC...");
          const savedPath = await window.electronAPI.ipcInvoke("download-file", {
            url: remoteUrl,
            fileName: fileName,
          });
          console.log("[FileMessageRender] download-file returned:", savedPath);
          if (savedPath) return;
        }

        console.log("[FileMessageRender] falling back to window.open");
        window.open(remoteUrl, "_blank");
      } catch (e) {
        console.error("[FileMessageRender] download-file failed:", e);
        feedbackToast({ msg: "文件下载失败" });
      }
      return;
    }

    if (window.electronAPI && localPath) {
      try {
        await window.electronAPI.ipcInvoke("open-file", localPath);
        return;
      } catch (e) {
        console.error("open-file failed", e);
      }
    }

    feedbackToast({ msg: "文件暂不支持预览" });
  };

  return (
    <Spin spinning={isSending}>
      <div
        className="flex max-w-[280px] cursor-pointer items-center rounded-md border border-[var(--border-color)] bg-white px-3 py-3 hover:border-[var(--primary-color)]"
        onClick={handleOpenFile}
      >
        <div className="mr-3 flex h-10 w-10 items-center justify-center rounded bg-[var(--bg-primary)]">
          <FileTypeIcon iconKey={iconKey} />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-sm font-medium text-[var(--text-primary)]"
            title={fileName}
          >
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

const icons: Record<string, FC> = {
  file: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V8H20" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  image: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--primary-color)" strokeWidth="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="var(--primary-color)" />
      <path d="M21 15L16 10L9 17" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  video: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="5,3 19,12 5,21" fill="var(--primary-color)" stroke="var(--primary-color)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  audio: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 18V5L21 3V16" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" stroke="var(--primary-color)" strokeWidth="2" />
      <circle cx="18" cy="16" r="3" stroke="var(--primary-color)" strokeWidth="2" />
    </svg>
  ),
  pdf: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="#E53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V8H20" stroke="#E53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="7" y="17" fontSize="6" fill="#E53935" fontWeight="bold">PDF</text>
    </svg>
  ),
  doc: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="#1E88E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V8H20" stroke="#1E88E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="7" y="17" fontSize="5" fill="#1E88E5" fontWeight="bold">DOC</text>
    </svg>
  ),
  excel: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="#43A047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V8H20" stroke="#43A047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="6" y="17" fontSize="5" fill="#43A047" fontWeight="bold">XLS</text>
    </svg>
  ),
  ppt: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="#FB8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V8H20" stroke="#FB8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="6" y="17" fontSize="5" fill="#FB8C00" fontWeight="bold">PPT</text>
    </svg>
  ),
  zip: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="#8E24AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V8H20" stroke="#8E24AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13L12 16L15 13" stroke="#8E24AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  text: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V8H20" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="15" x2="14" y2="15" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

function FileTypeIcon({ iconKey }: { iconKey: string }) {
  const Icon = icons[iconKey] || icons.file;
  return <Icon />;
}

export default FileMessageRender;
