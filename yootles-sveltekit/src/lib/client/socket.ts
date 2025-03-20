import { io, type Socket } from 'socket.io-client';
import { invalidate } from '$app/navigation';

export function initSocket(ledgerId: string): Socket {
	const socket = io({
		path: '/socket.io'
	});

	socket.on('connect', () => {
		socket.emit('join-ledger', ledgerId);
	});

	socket.on('refresh', () => {
		// Use SvelteKit's invalidate instead of full page reload
		invalidate(`/api/ledger/${ledgerId}`);
	});

	return socket;
}
