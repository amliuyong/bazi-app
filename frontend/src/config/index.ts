export const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000';
export const WS_URL = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}?Authorization=Bearer test API`;

export const endpoints = {
  predict: `${API_GATEWAY_URL}/predict`,
}; 