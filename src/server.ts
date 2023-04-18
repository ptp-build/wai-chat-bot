import * as WebSocket from 'ws';
import { Pdu } from './lib/ptp/protobuf/BaseMsg';
import { ActionCommands, getActionCommandsName } from './lib/ptp/protobuf/ActionCommands';
import ChatMsg from './worker/share/service/ChatMsg';
import http from 'http';
import { getCorsHeader, getCorsOptionsHeader } from './worker/share/utils/utils';
import { handleEvent } from './worker/route';
const createServer = require('http').createServer;

interface Headers {
	append(name: string, value: string): void;
	delete(name: string): void;
	get(name: string): string | null;
	has(name: string): boolean;
	set(name: string, value: string): void;
	forEach(callback: (value: string, name: string, headers: Headers) => void, thisArg?: any): void;
}
declare class Body {
	body: ReadableStream<Uint8Array> | null;
	bodyUsed: boolean;
	arrayBuffer(): Promise<ArrayBuffer>;
	json(): Promise<any>;
	text(): Promise<string>;
}
type RequestInfo = Request | URL | string;
type ReferrerPolicy =
	| ''
	| 'no-referrer'
	| 'no-referrer-when-downgrade'
	| 'unsafe-url'
	| 'origin'
	| 'strict-origin'
	| 'origin-when-cross-origin'
	| 'strict-origin-when-cross-origin'
	| 'same-origin'
	| 'strict-origin-when-cross-origin';
interface RequestInit {
	body?: BodyInit | null;
	cache?: RequestCache;
	credentials?: RequestCredentials;
	headers?: HeadersInit;
	integrity?: string;
	keepalive?: boolean;
	method?: string;
	mode?: RequestMode;
	redirect?: RequestRedirect;
	referrer?: string;
	referrerPolicy?: ReferrerPolicy;
	signal?: AbortSignal | null;
	window?: any;
}
declare class Request extends Body {
	constructor(input: RequestInfo, init?: RequestInit);
	readonly method: string;
	readonly url: string;
	readonly headers: Headers;
	readonly referrer: string;
	readonly referrerPolicy: ReferrerPolicy;
	readonly mode: RequestMode;
	readonly credentials: RequestCredentials;
	readonly cache: RequestCache;
	readonly redirect: RequestRedirect;
	readonly integrity: string;
	clone(): Request;
}

const server = createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
	// let responseHeaders: Record<string, string> = getCorsOptionsHeader();
	// if (req.method === 'OPTIONS') {
	// 	Object.keys(responseHeaders).forEach((key: string) => {
	// 		res.setHeader(key, responseHeaders[key]);
	// 	});
	// 	res.end();
	// }
	// const handleRequest = async (body?: string) => {
	// 	try {
	// 		console.log(req.url);
	// 		const url = `http://${req.headers.host}${req.url!}`;
	// 		//@ts-ignore
	// 		const request = new Request(url, { method: req.method!, headers: req.headers! });
	// 		//@ts-ignore
	// 		const response = await handleEvent({ request });
	// 		response.body.pipe(res);
	// 		//
	// 		// const resBody = { status: 'success', text: 'test' };
	// 		// let responseHeaders: Record<string, string> = getCorsHeader();
	// 		// Object.keys(responseHeaders).forEach((key: string) => {
	// 		// 	res.setHeader(key, responseHeaders[key]);
	// 		// });
	// 		// res.end(JSON.stringify(resBody));
	// 	} catch (error: any) {
	// 		console.error(error);
	// 		res.statusCode = 400;
	// 		return res.end(`Error: ${error.message}`);
	// 	}
	// };
	// if (['GET', 'POST'].indexOf(req.method!) > -1) {
	// 	let body = '';
	// 	if (req.method === 'POST') {
	// 		req.on('data', chunk => {
	// 			body += chunk.toString();
	// 		});
	// 		req.on('end', async () => {
	// 			await handleRequest(body);
	// 		});
	// 	} else {
	// 		await handleRequest();
	// 	}
	// } else {
	// 	res.statusCode = 404;
	// 	res.end();
	// }

	res.statusCode = 200;
	res.end('hello world');
});

const wss = new WebSocket.Server({ server, port: 1222 });

wss.on('connection', (ws: WebSocket) => {
	ws.on('message', async (data: Buffer) => {
		const pdu = new Pdu(data);
		console.log('[onMessage]', getActionCommandsName(pdu.getCommandId()));
		switch (pdu.getCommandId()) {
			case ActionCommands.CID_AuthLoginReq:
				await ChatMsg.handleAuthLoginReq(pdu, ws);
				break;
			case ActionCommands.CID_UpdateCmdReq:
				await ChatMsg.handleUpdateCmdReq(pdu, ws);
				break;
			case ActionCommands.CID_SendBotMsgReq:
				await ChatMsg.handleSendBotMsgReq(pdu, ws);
				break;
		}
	});
});

wss.on('listening', () => {
	console.log('WebSocket server started: ws://localhost:1222');
});

server.listen(1221, () => {
	console.log('HTTP server started: http://localhost:1221');
});
