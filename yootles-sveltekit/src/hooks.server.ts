import type { Handle } from '@sveltejs/kit';
import { setupWebSocket } from '$lib/server/socket';

declare global {
  // eslint-disable-next-line no-var
  var socketIoServer: any;
}

export const handle: Handle = async ({ event, resolve }) => {
  // Store the raw server instance for Socket.IO setup
  // @ts-ignore - platform.server is available in node adapter
  if (!global.socketIoServer && event.platform?.server) {
    // @ts-ignore - platform.server is available in node adapter
    global.socketIoServer = setupWebSocket(event.platform.server);
  }

  return resolve(event);
};