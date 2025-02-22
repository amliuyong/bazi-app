declare global {
  interface Window {
    ENV?: {
      NEXT_PUBLIC_WS_URL?: string;
    };
  }
}

export const WS_URL = (typeof window !== 'undefined' && window.ENV?.NEXT_PUBLIC_WS_URL) || 'wss://localhost:3000/';
