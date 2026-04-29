import { BrowserWindow, Menu, app, dialog, ipcMain, desktopCapturer, shell, globalShortcut } from "electron";
import axios from "axios";
import {
  clearCache,
  closeWindow,
  minimize,
  showWindow,
  splashEnd,
  updateMaximize,
} from "./windowManage";
import { t } from "i18next";
import { IpcRenderToMain } from "../constants";
import { getStore } from "./storeManage";
import { changeLanguage } from "../i18n";
import path from "path";
import fs from "fs";
import Screenshots from "electron-screenshots";

const store = getStore();

function getUniqueSavePath(originalPath: string): string {
  let counter = 0;
  let savePath = originalPath;
  const fileDir = path.dirname(originalPath);
  const fileName = path.basename(originalPath);
  const fileExt = path.extname(originalPath);
  const baseName = path.basename(fileName, fileExt);
  while (fs.existsSync(savePath)) {
    counter++;
    savePath = path.join(fileDir, `${baseName}(${counter})${fileExt}`);
  }
  return savePath;
}

let screenshotsInstance: Screenshots | null = null;

export const setIpcMainListener = () => {
  ipcMain.handle(IpcRenderToMain.clearSession, () => {
    clearCache();
  });


  ipcMain.handle("changeLanguage", (_, locale) => {
    store.set("language", locale);
    changeLanguage(locale).then(() => {
      app.relaunch();
      app.exit(0);
    });
  });
  ipcMain.handle("main-win-ready", () => {
    splashEnd();
  });
  ipcMain.handle(IpcRenderToMain.showMainWindow, () => {
    showWindow();
  });
  ipcMain.handle(IpcRenderToMain.minimizeWindow, () => {
    minimize();
  });
  ipcMain.handle(IpcRenderToMain.maxmizeWindow, () => {
    updateMaximize();
  });
  ipcMain.handle(IpcRenderToMain.closeWindow, () => {
    closeWindow();
  });
  ipcMain.handle(IpcRenderToMain.showMessageBox, (_, options) => {
    return dialog
      .showMessageBox(BrowserWindow.getFocusedWindow(), options)
      .then((res) => res.response);
  });


  ipcMain.handle(IpcRenderToMain.setKeyStore, (_, { key, data }) => {
    store.set(key, data);
  });
  ipcMain.handle(IpcRenderToMain.getKeyStore, (_, { key }) => {
    return store.get(key);
  });
  ipcMain.on(IpcRenderToMain.getKeyStoreSync, (e, { key }) => {
    e.returnValue = store.get(key);
  });
  ipcMain.handle(IpcRenderToMain.showInputContextMenu, () => {
    const menu = Menu.buildFromTemplate([
      {
        label: t("system.copy"),
        type: "normal",
        role: "copy",
        accelerator: "CommandOrControl+c",
      },
      {
        label: t("system.paste"),
        type: "normal",
        role: "paste",
        accelerator: "CommandOrControl+v",
      },
      {
        label: t("system.selectAll"),
        type: "normal",
        role: "selectAll",
        accelerator: "CommandOrControl+a",
      },
    ]);
    menu.popup({
      window: BrowserWindow.getFocusedWindow()!,
    });
  });
  ipcMain.handle(IpcRenderToMain.captureScreen, async () => {
    console.log("[IPC captureScreen] called, creating Screenshots instance");
    try {
      return await new Promise<string | null>((resolve, reject) => {
        if (screenshotsInstance) {
          screenshotsInstance.endCapture();
          screenshotsInstance = null;
        }
        screenshotsInstance = new Screenshots();
        screenshotsInstance.on("ok", async (_, buffer: Buffer) => {
          console.log("[IPC captureScreen] ok event fired, buffer length:", buffer.length);
          try {
            const saveDir = global.pathConfig.sdkResourcesPath;
            if (!fs.existsSync(saveDir)) {
              fs.mkdirSync(saveDir, { recursive: true });
            }
            const filePath = path.join(saveDir, `screenshot_${Date.now()}.png`);
            await fs.promises.writeFile(filePath, buffer);
            screenshotsInstance?.endCapture();
            screenshotsInstance = null;
            console.log("[IPC captureScreen] file saved to:", filePath);
            resolve(filePath);
          } catch (e) {
            screenshotsInstance?.endCapture();
            screenshotsInstance = null;
            console.error("[IPC captureScreen] write error:", e);
            reject(e);
          }
        });
        screenshotsInstance.on("cancel", () => {
          screenshotsInstance?.endCapture();
          screenshotsInstance = null;
          console.log("[IPC captureScreen] cancelled");
          resolve(null);
        });
        screenshotsInstance.startCapture();
        console.log("[IPC captureScreen] startCapture called");
      });
    } catch (e) {
      console.error("capture-screen failed:", e);
      return null;
    }
  });

  ipcMain.handle(IpcRenderToMain.captureScreenHide, async () => {
    console.log("[IPC captureScreenHide] called, hiding window then capturing");
    const win = BrowserWindow.getFocusedWindow();
    if (win && !win.isDestroyed()) {
      win.hide();
      await new Promise((r) => setTimeout(r, 500));
    }
    try {
      return await new Promise<string | null>((resolve, reject) => {
        if (screenshotsInstance) {
          screenshotsInstance.endCapture();
          screenshotsInstance = null;
        }
        screenshotsInstance = new Screenshots();
        screenshotsInstance.on("ok", async (_, buffer: Buffer) => {
          console.log("[IPC captureScreenHide] ok event fired, buffer length:", buffer.length);
          try {
            const saveDir = global.pathConfig.sdkResourcesPath;
            if (!fs.existsSync(saveDir)) {
              fs.mkdirSync(saveDir, { recursive: true });
            }
            const filePath = path.join(saveDir, `screenshot_${Date.now()}.png`);
            await fs.promises.writeFile(filePath, buffer);
            screenshotsInstance?.endCapture();
            screenshotsInstance = null;
            if (win && !win.isDestroyed()) {
              win.show();
            }
            console.log("[IPC captureScreenHide] file saved to:", filePath);
            resolve(filePath);
          } catch (e) {
            screenshotsInstance?.endCapture();
            screenshotsInstance = null;
            if (win && !win.isDestroyed()) {
              win.show();
            }
            console.error("[IPC captureScreenHide] write error:", e);
            reject(e);
          }
        });
        screenshotsInstance.on("cancel", () => {
          screenshotsInstance?.endCapture();
          screenshotsInstance = null;
          if (win && !win.isDestroyed()) {
            win.show();
          }
          console.log("[IPC captureScreenHide] cancelled");
          resolve(null);
        });
        screenshotsInstance.startCapture();
        console.log("[IPC captureScreenHide] startCapture called");
      });
    } catch (e) {
      console.error("capture-screen-hide failed:", e);
      if (win && !win.isDestroyed()) {
        win.show();
      }
      return null;
    }
  });

  ipcMain.handle(IpcRenderToMain.readFileAsDataUrl, async (_, filePath: string) => {
    try {
      const data = await fs.promises.readFile(filePath);
      const base64 = data.toString("base64");
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
      };
      const mime = mimeMap[ext] || "image/png";
      return `data:${mime};base64,${base64}`;
    } catch (e) {
      console.error("[IPC readFileAsDataUrl] error:", e);
      return null;
    }
  });

  ipcMain.handle(IpcRenderToMain.openFile, async (_, filePath: string) => {
    try {
      if (!filePath) return false;
      await shell.openPath(filePath);
      return true;
    } catch (e) {
      console.error("open-file failed", e);
      return false;
    }
  });


  ipcMain.handle("get-file-info", async (_, filePath: string) => {
    try {
      const stat = await fs.promises.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".svg": "image/svg+xml",
        ".mp4": "video/mp4",
        ".pdf": "application/pdf",
      };
      return {
        size: stat.size,
        mimeType: mimeMap[ext] || "application/octet-stream",
      };
    } catch (e) {
      console.error("get-file-info failed:", e);
      return null;
    }
  });

  ipcMain.handle(IpcRenderToMain.downloadFile, async (_, { url, fileName }: { url: string; fileName: string }) => {
    try {
      const saveDir = global.pathConfig.sdkResourcesPath;
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }
      const uniquePath = getUniqueSavePath(path.join(saveDir, fileName));
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data as ArrayBuffer);
      await fs.promises.writeFile(uniquePath, buffer);
      await shell.openPath(uniquePath);
      return uniquePath;
    } catch (e) {
      console.error("download-file failed", e);
      return null;
    }
  });

  ipcMain.on(IpcRenderToMain.getDataPath, (e, key: string) => {
    switch (key) {
      case "public":
        e.returnValue = global.pathConfig.publicPath;
        break;
      case "sdkResources":
        e.returnValue = global.pathConfig.sdkResourcesPath;
        break;
      case "logsPath":
        e.returnValue = global.pathConfig.logsPath;
        break;
      default:
        e.returnValue = global.pathConfig.publicPath;
        break;
    }
  });
};
