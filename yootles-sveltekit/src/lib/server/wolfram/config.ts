import { dev } from '$app/environment';

export function getWolframConfig() {
  if (!process.env.WOLFRAM_API_KEY) {
    throw new Error('WOLFRAM_API_KEY environment variable is not set');
  }

  return {
    apiKey: process.env.WOLFRAM_API_KEY,
    baseUrl: process.env.WOLFRAM_API_URL || 'https://www.wolframcloud.com/obj/yootles',
    timeout: parseInt(process.env.WOLFRAM_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(process.env.WOLFRAM_RETRY_ATTEMPTS || '3', 10)
  };
}

// For development/testing
export const mockConfig = {
  apiKey: 'test-key',
  baseUrl: 'http://localhost:3000',
  timeout: 5000,
  retryAttempts: 1
};