export interface ChildWindowOptions {

  width?: number;

  height?: number;

  x?: number;

  y?: number;

  useContentSize?: boolean;

  center?: boolean;

  minWidth?: number;

  minHeight?: number;

  maxWidth?: number;

  maxHeight?: number;

  resizable?: boolean;

  movable?: boolean;

  minimizable?: boolean;

  maximizable?: boolean;

  closable?: boolean;

  focusable?: boolean;

  alwaysOnTop?: boolean;

  fullscreen?: boolean;

  fullscreenable?: boolean;

  simpleFullscreen?: boolean;

  skipTaskbar?: boolean;

  hiddenInMissionControl?: boolean;

  kiosk?: boolean;

  title?: string;

  show?: boolean;

  paintWhenInitiallyHidden?: boolean;

  frame?: boolean;

  modal?: boolean;

  acceptFirstMouse?: boolean;

  disableAutoHideCursor?: boolean;

  autoHideMenuBar?: boolean;

  enableLargerThanScreen?: boolean;

  backgroundColor?: string;

  hasShadow?: boolean;

  opacity?: number;

  darkTheme?: boolean;

  transparent?: boolean;

  type?: string;

  visualEffectState?: "followWindow" | "active" | "inactive";

  titleBarStyle?: "default" | "hidden" | "hiddenInset" | "customButtonsOnHover";

  trafficLightPosition?: Point;

  roundedCorners?: boolean;

  fullscreenWindowTitle?: boolean;

  thickFrame?: boolean;

  vibrancy?:
    | "appearance-based"
    | "light"
    | "dark"
    | "titlebar"
    | "selection"
    | "menu"
    | "popover"
    | "sidebar"
    | "medium-light"
    | "ultra-dark"
    | "header"
    | "sheet"
    | "window"
    | "hud"
    | "fullscreen-ui"
    | "tooltip"
    | "content"
    | "under-window"
    | "under-page";

  zoomToPageWidth?: boolean;

  tabbingIdentifier?: string;
}
