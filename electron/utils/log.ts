import log from "electron-log/main";
import { join } from "node:path";
import fs from "fs";

const getLogger = (logsPath: string) => {
  log.transports.file.level = "debug";
  log.transports.file.maxSize = 104857600;
  log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}";
  let date = new Date();


  log.transports.file.resolvePathFn = () => join(logsPath, `OpenIM.log`);
  log.initialize({ preload: true });
  return log.scope("ipcMain");
};

export { getLogger };
