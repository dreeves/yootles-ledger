import type { Handle } from '@sveltejs/kit';
import { setupWebSocket } from '$lib/server/socket';
import type { Server } from 'http';
import { createServer } from 'http';

declare global {
	// eslint-disable-next-line no-var
	var httpServer: Server | undefined;
	// eslint-disable-next-line no-var
	var socketIoServer: ReturnType<typeof setupWebSocket> | undefined;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Create HTTP server if it doesn't exist
	if (!('httpServer' in global) || !global.httpServer) {
		global.httpServer = createServer();
		global.httpServer.listen(3000);
	}

	// Setup Socket.IO if not already setup
	if (!('socketIoServer' in global) || !global.socketIoServer) {
		global.socketIoServer = setupWebSocket(global.httpServer);
	}

	return resolve(event);
};
