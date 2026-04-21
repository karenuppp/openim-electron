# 文件发送与截图功能

## 修改概述

本次迭代为聊天界面新增两个发送能力（文件发送、截图）和一个消息卡片展示（文件消息接收），与现有图片/音视频通话功能对齐，保持 SendActionBar 扩展模式一致。

---

## 修改的文件

### 1. `src/pages/chat/queryChat/ChatFooter/SendActionBar/useFileMessage.ts`

**修改类型**：新增方法

**修改内容**：
- 新增 `getFileMessage(file)` 方法，Electron 环境调用 `IMSDK.createFileMessageFromFullPath`，Web 环境调用 `IMSDK.createFileMessage`
- 返回 `getImageMessage` 和 `getFileMessage` 两个方法

**为什么这样写**：复用现有 `FileWithPath` 接口，Electron 环境直接传 `file.path` 给 SDK，Web 环境走标准 `createFileMessage`，与 `getImageMessage` 的 Electron/Web 分支逻辑完全一致，保持代码风格统一。

---

### 2. `src/pages/chat/queryChat/ChatFooter/SendActionBar/index.tsx`

**修改类型**：新增按钮 + 重构 ActionWrap

**修改内容**：
- `sendActionList` 新增两项：`file`（文件上传，accept="*"）和 `screenshot`（截图按钮）
- `i18n.on("languageChanged")` 同步更新按钮 title（4 项）
- `SendActionBar` props 新增 `getFileMessage`，新增 `imageHandle`/`fileHandle`/`screenshotHandle` 三个独立 handler
- `ActionWrap` 重构：按 `actionKey` 区分渲染逻辑——`screenshot` 直接渲染 `<div onClick>`，其他 accept 项走 Upload 组件

**为什么这样写**：
- 复用已有 `fileIcon`（`file.png`）和 `cut`（`cut.png`）资源，无需新增文件
- 将 `fileHandle` 拆分为 `imageHandle` 和 `fileHandle`，职责单一，避免 if-else 判断
- `screenshot` 不走 Upload，直接绑定 `onClick`，是唯一不需要文件选择的按钮

---

### 3. `src/pages/chat/queryChat/ChatFooter/index.tsx`

**修改类型**：透传 props

**修改内容**：
- 解构 `useFileMessage` 时同时取出 `getFileMessage`
- 传递给 `SendActionBar` 的 props 新增 `getFileMessage`

---

### 4. `electron/constants/index.ts`

**修改类型**：新增 IPC 通道常量

**修改内容**：
- `IpcRenderToMain` 新增 `captureScreen: "capture-screen"`

**为什么这样写**：统一 IPC 通道定义，符合项目已有的命名规范。

---

### 5. `electron/main/ipcHandlerManage.ts`

**修改类型**：新增 IPC handler

**修改内容**：
- 导入 `desktopCapturer`（Electron）和 `path`、`fs`（Node.js）
- 新增 `ipcMain.handle(IpcRenderToMain.captureScreen, ...)` handler：
  1. 调用 `desktopCapturer.getSources({ types: ["screen"] })` 获取屏幕源
  2. 取第一个源的截图（PNG 格式）
  3. 保存到 `sdkResourcesPath` 目录
  4. 返回文件路径给渲染进程

**为什么这样写**：`desktopCapturer` 是 Electron 原生 API，直接调 SDK 的 `createFileMessageFromFullPath` 发送截图文件路径，整个流程与图片发送完全一致，无需额外处理二进制数据。

---

### 6. `src/i18n/resources/zh.json` 和 `src/i18n/resources/en.json`

**修改类型**：新增 i18n key

**修改内容**：
- `placeholder.image`、`placeholder.call`（已有）
- `placeholder.file`、`placeholder.screenshot`（新增）

---

### 7. `src/pages/chat/queryChat/MessageItem/FileMessageRender.tsx`（新建）

**修改类型**：新建组件

**修改内容**：
- 微信风格文件卡片：左侧文件图标 + 文件名 + 文件大小 + 右侧下载指示器
- 点击卡片调用 `window.open(url, "_blank")` 打开文件
- 无 URL 时 toast 提示"文件暂不支持预览"
- 使用 `Spin` 展示发送中状态

**为什么这样写**：
- 文件名 `truncate` 防止超长，文件大小用 `bytesToSize` 格式化
- 卡片有 hover 效果（`border-primary-color`），符合微信的交互反馈
- 复用 `bytesToSize` 工具函数，无需重复造轮子

---

### 8. `src/pages/chat/queryChat/MessageItem/index.tsx`

**修改类型**：注册消息渲染器

**修改内容**：
- 导入 `FileMessageRender`
- `components` map 新增 `[MessageType.FileMessage]: FileMessageRender`

---

## 功能流程

### 发送文件

```
用户点击 [文件按钮]
  → Ant Design Upload（accept="*"）
  → fileHandle() → getFileMessage(file)
  → IMSDK.createFileMessageFromFullPath({ filePath, fileName })
  → sendMessage({ message })
```

### 截图

```
用户点击 [截图按钮]
  → screenshotHandle()
  → window.electronAPI.ipcInvoke("capture-screen")
  → desktopCapturer.getSources()[0].thumbnail.toPNG()
  → 保存到 sdkResourcesPath
  → getFileMessage({ path: filePath, name: "screenshot_xxx.png" })
  → sendMessage({ message })
```

### 接收文件

```
收到消息 → contentType === MessageType.FileMessage
  → FileMessageRender 渲染文件卡片
  → 用户点击卡片 → window.open(url)
```

---

## 关键设计决策

1. **截图复用文件消息类型**：截图本质是 PNG 文件，直接用 `FileMessage` 而非新建 `SnapshotMessage` 类型，减少消息类型膨胀。

2. **截图保存到 sdkResourcesPath**：`desktopCapturer` 截图在主进程生成，需要一个持久化路径，`sdkResourcesPath` 符合 SDK 资源存储规范。

3. **文件消息渲染走 `window.open`**：不依赖 Electron 的 `shell.openPath`，跨窗口打开更安全，也避免了权限问题。

4. **ActionWrap 按 actionKey 区分渲染**：扩展方式与原有设计一致（`sendActionList` 配置项 + `ActionWrap` 渲染），新增按钮只需加配置项而非修改渲染逻辑。
