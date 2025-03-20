import { env } from '$env/dynamic/private';

export interface WolframConfig {
	baseUrl: string;
}

export function getWolframConfig(): WolframConfig {
	return {
		baseUrl: env.WOLFRAM_API_URL || 'http://localhost:3000/api/wolfram'
	};
}

export function mockConfig(): WolframConfig {
	return {
		baseUrl: 'http://localhost:3000/api/wolfram'
	};
}
