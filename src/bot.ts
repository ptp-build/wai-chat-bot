import * as WebSocket from 'ws';
import { WS_URL } from './setting';

const socket = new WebSocket(WS_URL!);

socket.on('open', () => {
	console.log('WebSocket connection established');
	// Send a message to the server
	socket.send('Hello from the client!11');
});

socket.on('message', (data: any) => {
	console.log(`WebSocket message received: ${data}`);
});

socket.on('close', () => {
	console.log('WebSocket connection closed');
});
