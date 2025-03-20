import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

export function setupWebSocket(server: HttpServer) {
	const io = new Server(server);

	io.on('connection', (socket) => {
		socket.on('join-ledger', (ledgerId: string) => {
			socket.join(ledgerId);
		});

		socket.on('ledger-update', (data: { ledgerId: string }) => {
			io.to(data.ledgerId).emit('refresh');
		});
	});

	return io;
}
