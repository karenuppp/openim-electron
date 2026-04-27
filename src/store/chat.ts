import { MessageItem } from "@openim/wasm-client-sdk";
import { create } from "zustand";

export interface QuoteState {
  quoteMessage: MessageItem | null;
  setQuoteMessage: (msg: MessageItem | null) => void;
}

interface QuoteFallbackState {
  quoteFallback: MessageItem | null;
  setQuoteFallback: (msg: MessageItem | null) => void;
}

export const useChatStore = create<QuoteState & QuoteFallbackState>((set, get) => ({

  quoteMessage: null,
  setQuoteMessage: (msg) => set({ quoteMessage: msg }),


  quoteFallback: null,
  setQuoteFallback: (msg) => set({ quoteFallback: msg }),
}));
