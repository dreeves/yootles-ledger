import { io, type Socket } from 'socket.io-client';

export function initSocket(ledgerId: string): Socket {
  const socket = io({
    path: '/socket.io'
  });

  socket.on('connect', () => {
    socket.emit('join-ledger', ledgerId);
  });

  socket.on('refresh', () => {
    // Trigger page refresh when ledger is updated
    window.location.reload();
  });

  return socket;
}