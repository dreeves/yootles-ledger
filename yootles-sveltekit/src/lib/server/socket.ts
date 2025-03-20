import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

export function setupWebSocket(server: HttpServer) {
	const io = new Server(server, {
		path: '/socket.io',
		transports: ['websocket'],
		cors: {
			origin: '*',
			methods: ['GET', 'POST']
		}
	});

	io.on('connection', (socket) => {
		console.log('Client connected');

		socket.on('join-ledger', (ledgerId: string) => {
			console.log('Client joined ledger:', ledgerId);
			socket.join(ledgerId);
		});

		socket.on('ledger-update', (data: { ledgerId: string }) => {
			console.log('Ledger updated:', data.ledgerId);
			io.to(data.ledgerId).emit('refresh');
		});

		socket.on('disconnect', () => {
			console.log('Client disconnected');
		});
	});

	return io;
}
