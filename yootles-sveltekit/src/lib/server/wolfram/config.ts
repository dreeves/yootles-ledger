import { dev } from '$app/environment';

export function getWolframConfig() {
	return {
		baseUrl: 'https://www.wolframcloud.com/obj/narthura/yootles/processLedger',
		timeout: parseInt(process.env.WOLFRAM_TIMEOUT || '30000', 10),
		retryAttempts: parseInt(process.env.WOLFRAM_RETRY_ATTEMPTS || '3', 10)
	};
}

// For development/testing
export const mockConfig = {
	baseUrl: 'https://www.wolframcloud.com/obj/narthura/yootles/processLedger',
	timeout: 5000,
	retryAttempts: 1
};
