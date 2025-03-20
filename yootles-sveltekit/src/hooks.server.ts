import type { Handle } from '@sveltejs/kit';
import { setupWebSocket } from '$lib/server/socket';
import type { Server } from 'http';

declare global {
	// eslint-disable-next-line no-var
	var socketIoServer: ReturnType<typeof setupWebSocket>;
}

interface NodePlatform {
	server?: Server;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Store the raw server instance for Socket.IO setup
	const platform = event.platform as unknown as NodePlatform;
	if (!global.socketIoServer && platform?.server) {
		global.socketIoServer = setupWebSocket(platform.server);
	}

	return resolve(event);
};
