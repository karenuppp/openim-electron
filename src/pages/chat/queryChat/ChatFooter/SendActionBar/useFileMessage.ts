import { MessageItem } from "@openim/wasm-client-sdk";
import { v4 as uuidV4 } from "uuid";

import { IMSDK } from "@/layout/MainContentWrap";
import { base64toFile, canSendImageTypeList } from "@/utils/common";

export interface FileWithPath extends File {
  path?: string;
}

async function resolveFilePath(file: FileWithPath): Promise<{
  resolvedPath: string;
  resolvedName: string;
  resolvedType: string;
  resolvedSize: number;
}> {
  const name = file.name || "file";
  const type = file.type || "application/octet-stream";
  const size = file.size || 0;

  if (file.path) {
    return { resolvedPath: file.path, resolvedName: name, resolvedType: type, resolvedSize: size };
  }


  if (window.electronAPI) {
    const savedPath = await window.electronAPI.saveFileToDisk({ file, sync: true });
    return { resolvedPath: savedPath, resolvedName: name, resolvedType: type, resolvedSize: size };
  }


  return { resolvedPath: "", resolvedName: name, resolvedType: type, resolvedSize: size };
}

const getPicInfoFromFile = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const _URL = window.URL || window.webkitURL;
    const img = new Image();
    img.onload = function () {
      resolve({ width: img.width, height: img.height });
      _URL.revokeObjectURL(img.src);
    };
    img.onerror = function () {
      resolve({ width: 0, height: 0 });
    };
    img.src = _URL.createObjectURL(file);
  });

const getPicInfoFromPath = (filePath: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    if (!window.electronAPI) {
      resolve({ width: 0, height: 0 });
      return;
    }

    window.electronAPI
      .ipcInvoke("read-file-as-data-url", filePath)
      .then((dataUrl: unknown) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = dataUrl as string;
      })
      .catch(() => resolve({ width: 0, height: 0 }));
  });
};

export function useFileMessage() {
  const getImageMessage = async (file: FileWithPath) => {
    if (window.electronAPI) {
      const { resolvedPath, resolvedType, resolvedSize } = await resolveFilePath(file);

      let width = 0;
      let height = 0;
      try {
        const dims = await getPicInfoFromFile(file);
        width = dims.width;
        height = dims.height;
      } catch {

        const dims = await getPicInfoFromPath(resolvedPath);
        width = dims.width;
        height = dims.height;
      }
      const uuid = uuidV4();
      const { data: uploadResult } = await IMSDK.uploadFile({
        filepath: resolvedPath,
        name: file.name,
        uuid,
        contentType: resolvedType,
      });
      const serverUrl = uploadResult.url;


      const baseInfo = {
        uuid,
        type: resolvedType,
        size: resolvedSize,
        width,
        height,
        url: serverUrl,
      };


      return (
        await IMSDK.createImageMessageByURL({
          sourcePicture: baseInfo,
          bigPicture: baseInfo,
          snapshotPicture: baseInfo,
          sourcePath: resolvedPath,
        })
      ).data;
    }

    const { width, height } = await getPicInfoFromFile(file);
    const baseInfo = {
      uuid: uuidV4(),
      type: file.type,
      size: file.size,
      width,
      height,
      url: URL.createObjectURL(file),
    };
    const options = {
      sourcePicture: baseInfo,
      bigPicture: baseInfo,
      snapshotPicture: baseInfo,
      sourcePath: "",
      file,
    };
    return (await IMSDK.createImageMessageByFile(options)).data;
  };


  const getImageMessageByPath = async (filePath: string, fileName: string) => {
    if (!window.electronAPI) {
      throw new Error("getImageMessageByPath requires Electron API");
    }


    const fileInfo = await window.electronAPI.ipcInvoke("get-file-info", filePath);

    const uuid = uuidV4();
    const { width, height } = await getPicInfoFromPath(filePath);
    const fileInfoTyped = fileInfo as { mimeType?: string; size?: number } | null;
    const resolvedType = fileInfoTyped?.mimeType || "image/png";
    const resolvedSize = fileInfoTyped?.size || 0;


    const { data: uploadResult } = await IMSDK.uploadFile({
      filepath: filePath,
      name: fileName,
      uuid,
      contentType: resolvedType,
    });
    const serverUrl = uploadResult.url;

    const baseInfo = {
      uuid,
      type: resolvedType,
      size: resolvedSize,
      width,
      height,
      url: serverUrl,
    };

    return (
      await IMSDK.createImageMessageByURL({
        sourcePicture: baseInfo,
        bigPicture: baseInfo,
        snapshotPicture: baseInfo,
        sourcePath: filePath,
      })
    ).data;
  };

  const getFileMessage = async (file: FileWithPath) => {
    const { resolvedPath, resolvedName, resolvedType, resolvedSize } = await resolveFilePath(file);
    if (window.electronAPI) {
      const uuid = uuidV4();


      const { data: uploadResult } = await IMSDK.uploadFile({
        filepath: resolvedPath,
        name: resolvedName,
        uuid,
        contentType: resolvedType,
      });


      return (
        await IMSDK.createFileMessageByURL({
          filePath: resolvedPath,
          fileName: resolvedName,
          uuid,
          sourceUrl: uploadResult.url,
          fileSize: resolvedSize,
          fileType: resolvedType,
        })
      ).data;
    }
    return (
      await IMSDK.createFileMessage({
        filePath: resolvedPath,
        fileName: resolvedName,
      })
    ).data;
  };

  return {
    getImageMessage,
    getImageMessageByPath,
    getFileMessage,
  };
}
