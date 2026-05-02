import { getWithRenderProcess } from "@openim/electron-client-sdk/lib/render";

const { instance } = getWithRenderProcess({
  wasmConfig: {
    coreWasmPath: "./openIM.wasm",
    sqlWasmPath: `/sql-wasm.wasm`,
  },
});
const openIMSDK = instance;

export const IMSDK = openIMSDK;
