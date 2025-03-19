import type { Handle } from '@sveltejs/kit';
import { setupWebSocket } from '$lib/server/socket';

export const handle: Handle = async ({ event, resolve }) => {
  // Store the raw server instance for Socket.IO setup
  if (!global.socketIoServer && event.platform?.server) {
    global.socketIoServer = setupWebSocket(event.platform.server);
  }

  return resolve(event);
};