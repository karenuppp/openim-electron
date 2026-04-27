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

---

## 新增功能：右键菜单 / 引用 / 收藏 / 撤回

### 修改的文件

#### 1. `src/store/chat.ts`（新建）

**修改类型**：新建 Zustand store

**修改内容**：
- `useChatStore`：管理 `quoteMessage`（当前引用消息）和 `favorites`（收藏列表）两个状态
- `addFavorite`：收藏消息，`localStorage` 持久化，最多存 100 条
- `removeFavorite`：删除收藏
- `loadFavorites`：从 `localStorage` 恢复收藏列表

**为什么这样写**：引用消息需要在 `ChatFooter`（发送引用消息）和 `MessageContextMenu`（设置引用源）之间跨组件共享状态；收藏列表需要页面刷新后持久化。Zustand store 是最轻量的跨组件状态共享方案。

---

#### 2. `src/pages/chat/queryChat/MessageItem/MessageContextMenu.tsx`（新建）

**修改类型**：新建组件

**修改内容**：
- 使用 Ant Design `Dropdown` 组件，`trigger=["contextMenu"]` 实现右键菜单
- 三个菜单项：**收藏**（写入 store）、**引用**（设置 `quoteMessage`）、**撤回**（调用 `IMSDK.revokeMessage` 并 emit `MSG_REVOKED` 事件）
- 包裹每个消息卡片的外层

**为什么这样写**：
- `Dropdown` + `trigger=["contextMenu"]` 是 Ant Design 最简洁的右键菜单实现，无需手动管理位置
- 撤回操作后通过 `emit("MSG_REVOKED", clientMsgID)` 事件总线通知聊天区，双方都会移除该消息

---

#### 3. `src/pages/chat/queryChat/MessageItem/index.tsx`

**修改类型**：集成右键菜单

**修改内容**：
- 导入 `MessageContextMenu`，用 `<MessageContextMenu message={message}>` 包裹整个消息卡片

---

#### 4. `src/pages/chat/queryChat/useHistoryMessageList.tsx`

**修改类型**：监听撤回事件

**修改内容**：
- 新增 `revokeMessage` handler：监听 `MSG_REVOKED` 事件，从 `messageList` 中过滤掉对应 `clientMsgID` 的消息

---

#### 5. `src/pages/chat/queryChat/ChatFooter/index.tsx`

**修改类型**：引用消息条

**修改内容**：
- 读取 `useChatStore` 的 `quoteMessage` 和 `setQuoteMessage`
- `enterToSend` 时：如果 `quoteMessage` 存在，调用 `IMSDK.createQuoteMessage({ text, message: JSON.stringify(quoteMessage) })` 创建引用消息
- 输入框上方新增引用消息条：显示被引用消息的发送者 + 摘要 + 关闭按钮
- 发送完成后清空 `quoteMessage`

---

#### 6. `src/pages/chat/queryChat/FavoritesPanel.tsx`（新建）

**修改类型**：新建组件

**修改内容**：
- 使用 Ant Design `Drawer` 从右侧滑出收藏面板
- 展示所有收藏消息（头像、昵称、消息摘要）
- 点击收藏项：emit `JUMP_TO_MESSAGE` 事件，滚动定位到原消息，然后关闭面板
- 支持删除收藏

---

#### 7. `src/pages/chat/queryChat/ChatHeader/index.tsx`

**修改类型**：新增收藏按钮

**修改内容**：
- `menuList` 新增 idx=3：**收藏**（`StarOutlined` 图标）
- `ChatHeader` 接收 `onOpenFavorites?: () => void` prop，点击收藏按钮时调用

---

#### 8. `src/pages/chat/queryChat/index.tsx`

**修改类型**：集成收藏面板

**修改内容**：
- 导入 `FavoritesPanel`，状态管理 `favoritesOpen`
- `<FavoritesPanel open={favoritesOpen} onClose={() => setFavoritesOpen(false)} />`

---

#### 9. `src/pages/chat/queryChat/ChatContent.tsx`

**修改类型**：处理滚动定位

**修改内容**：
- 监听 `JUMP_TO_MESSAGE` 事件：找到对应 `clientMsgID` 的消息索引，用 `virtuoso.current?.scrollToIndex({ index, align: "center" })` 平滑滚动到该消息

---

#### 10. `electron/constants/index.ts`

**修改类型**：新增 IPC 常量

**修改内容**：
- `openFile: "open-file"`（已有）
- `downloadFile: "download-file"`（新增）：下载文件到本地后用系统程序打开

---

#### 11. `electron/main/ipcHandlerManage.ts`

**修改类型**：新增 IPC handler

**修改内容**：
- `download-file`：接收 `{ url, fileName }`，用 `axios` 下载文件到 `sdkResourcesPath`，再调用 `shell.openPath` 用系统程序打开
- `open-file`：调用 `shell.openPath` 打开本地文件

---

## 功能流程

### 撤回

```
用户右键消息 → 点击"撤回"
  → IMSDK.revokeMessage({ conversationID, clientMsgID })
  → emit("MSG_REVOKED", clientMsgID)
  → useHistoryMessageList 监听 → 从列表移除该消息
```

### 引用

```
用户右键消息 → 点击"引用"
  → setQuoteMessage(message)  // 写入 store
  → ChatFooter 感知 quoteMessage 变化 → 显示引用条
  → 用户编辑内容 → enterToSend()
  → IMSDK.createQuoteMessage({ text, message: JSON.stringify(quoteMessage) })
  → sendMessage({ message })
  → 清空 quoteMessage
```

### 收藏

```
用户右键消息 → 点击"收藏"
  → addFavorite(message)  // 写入 localStorage
  → 用户点击 Header 收藏按钮
  → FavoritesPanel Drawer 滑出
  → 点击收藏项 → emit("JUMP_TO_MESSAGE", clientMsgID)
  → ChatContent 监听 → 平滑滚动到原消息
```

---

## 关键设计决策

1. **撤回使用事件总线而非 SDK 推送**：SDK 的 `revokeMessage` 只在服务器记录，不推送消息删除；双方都需要在本地移除消息，所以用 `emit("MSG_REVOKED")` 事件。

2. **引用消息用 `JSON.stringify(message)` 传入 SDK**：`QuoteMsgParams.message` 是 `string` 类型，完整消息体需要序列化，接收方由 SDK 内部解析展示。

3. **收藏最多 100 条**：防止 `localStorage` 无限膨胀，微信的收藏策略也是限制条数。

4. **收藏滚动定位用 `JUMP_TO_MESSAGE` 事件**：收藏面板在 `QueryChat` 层，滚动区域在 `ChatContent`，跨组件通信通过事件总线最简单。

5. **下载文件走 main process**：`renderer` 不能直接下载（跨域 + Node API 限制），`download-file` IPC handler 在 main process 用 `axios` 下载，走 `shell.openPath` 直接用本地程序打开。
