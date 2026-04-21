import { BrowserWindow, Menu, app, dialog, ipcMain, desktopCapturer, shell } from "electron";
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

let screenshotsInstance: Screenshots | null = null;

export const setIpcMainListener = () => {
  ipcMain.handle(IpcRenderToMain.clearSession, () => {
    clearCache();
  });

  // window manage
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

  // data transfer
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
    try {
      return await new Promise<string | null>((resolve, reject) => {
        if (screenshotsInstance) {
          screenshotsInstance.endCapture();
        }
        screenshotsInstance = new Screenshots();
        screenshotsInstance.on("ok", async (_, buffer: Buffer) => {
          try {
            const saveDir = global.pathConfig.sdkResourcesPath;
            if (!fs.existsSync(saveDir)) {
              fs.mkdirSync(saveDir, { recursive: true });
            }
            const filePath = path.join(saveDir, `screenshot_${Date.now()}.png`);
            await fs.promises.writeFile(filePath, buffer);
            screenshotsInstance?.endCapture();
            screenshotsInstance = null;
            resolve(filePath);
          } catch (e) {
            screenshotsInstance?.endCapture();
            screenshotsInstance = null;
            reject(e);
          }
        });
        screenshotsInstance.on("cancel", () => {
          screenshotsInstance?.endCapture();
          screenshotsInstance = null;
          resolve(null);
        });
        screenshotsInstance.startCapture();
      });
    } catch (e) {
      console.error("capture-screen failed", e);
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
