export const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000';

export const endpoints = {
  predict: `${API_GATEWAY_URL}/predict`,
}; 