import { io, type Socket } from 'socket.io-client';
import { invalidate } from '$app/navigation';

export function initSocket(ledgerId: string): Socket {
	const socket = io('http://localhost:3000', {
		path: '/socket.io',
		transports: ['websocket']
	});

	socket.on('connect', () => {
		console.log('Socket connected');
		socket.emit('join-ledger', ledgerId);
	});

	socket.on('connect_error', (error) => {
		console.error('Socket connection error:', error);
	});

	socket.on('refresh', async () => {
		// Wait a moment for the server to process the change
		await new Promise((resolve) => setTimeout(resolve, 100));
		// Then invalidate the data to refresh error state
		await invalidate(`/api/ledger/${ledgerId}`);
		await invalidate(`/${ledgerId}`);
	});

	return socket;
}
