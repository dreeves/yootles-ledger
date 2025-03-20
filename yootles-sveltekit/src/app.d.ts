// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	// Use a more specific type for socketIoServer
	const socketIoServer: import('socket.io').Server | undefined;
}

export {};
