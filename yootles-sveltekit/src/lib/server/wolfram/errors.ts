export class WolframError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly details?: unknown
	) {
		super(message);
		this.name = 'WolframError';
	}
}

export class WolframTimeoutError extends WolframError {
	constructor(message = 'Request timed out') {
		super(message, 'TIMEOUT');
	}
}

export class WolframAuthError extends WolframError {
	constructor(message = 'Authentication failed') {
		super(message, 'AUTH_ERROR');
	}
}

export function isWolframError(error: unknown): error is WolframError {
	return error instanceof WolframError;
}
