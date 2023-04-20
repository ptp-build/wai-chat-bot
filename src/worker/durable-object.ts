import { Pdu } from '../lib/ptp/protobuf/BaseMsg';
import { ActionCommands, getActionCommandsName } from '../lib/ptp/protobuf/ActionCommands';
import ChatMsg from './share/service/ChatMsg';
import { AuthSessionType } from './share/service/User';
import { OtherNotify } from '../lib/ptp/protobuf/PTPOther';
import { ERR } from '../lib/ptp/protobuf/PTPCommon/types';
import { initEnv } from './env';

interface AccountUser {
	websocket: WebSocket;
	authSession?: AuthSessionType;
	id: string;
	city: string | undefined | any;
	country: string | any;
}

// every 10 seconds
const healthCheckInterval = 10e3;

export class WebSocketDurableObject {
	accounts: Map<string, AccountUser>;
	authUserAddressAccountMap: Map<string, string[]>;
	pings: Map<string, number>;
	storage: DurableObjectStorage;
	dolocation: string;

	constructor(state: DurableObjectState, env) {
		initEnv(env);
		// We will put the WebSocket objects for each client into `websockets`
		this.accounts = new Map();
		this.pings = new Map();
		this.storage = state.storage;
		this.dolocation = '';

		this.scheduleNextAlarm(this.storage);
		this.getDurableObjectLocation().catch(console.error);
	}

	async fetch(request: Request) {
		const requestMetadata = request.cf;

		// To accept the WebSocket request, we create a WebSocketPair (which is like a socketpair,
		// i.e. two WebSockets that talk to each other), we return one end of the pair in the
		// response, and we operate on the other end. Note that this API is not part of the
		// Fetch API standard; unfortunately, the Fetch API / Service Workers specs do not define
		// any way to act as a WebSocket server today.
		let pair = new WebSocketPair();
		//@ts-ignore
		const [client, server] = Object.values(pair);

		// We're going to take pair[1] as our end, and return pair[0] to the client.
		//@ts-ignore
		await this.handleWebSocketSession(server, requestMetadata);

		// Now we return the other end of the pair to the client.
		return new Response(null, { status: 101, webSocket: client });
	}

	async handleWebSocketSession(webSocket: WebSocket, metadata: IncomingRequestCfProperties) {
		// Accept our end of the WebSocket. This tells the runtime that we'll be terminating the
		// WebSocket in JavaScript, not sending it elsewhere.
		webSocket.accept();

		// Create our session and add it to the accounts map.
		const accountId = crypto.randomUUID();
		// console.log('metadata', JSON.stringify(metadata));
		this.accounts.set(accountId, {
			id: accountId,
			city: metadata.city,
			country: metadata.country,
			websocket: webSocket,
		});

		webSocket.addEventListener('message', async msg => {
			try {
				const pdu = new Pdu(Buffer.from(msg.data));
				console.log('[onMessage]', getActionCommandsName(pdu.getCommandId()));
				switch (pdu.getCommandId()) {
					case ActionCommands.CID_AuthLoginReq:
						const authSession = await ChatMsg.handleAuthLoginReq(pdu, webSocket);
						this.accounts.set(accountId, {
							...this.accounts.get(accountId),
							authSession,
						});
						let accountIds = [];
						if (
							this.authUserAddressAccountMap &&
							this.authUserAddressAccountMap.has(authSession.address)
						) {
							accountIds = this.authUserAddressAccountMap.get(authSession.address)!;
						}
						accountIds.push(accountId);
						this.authUserAddressAccountMap.set(authSession.address, accountIds);
						console.log('CID_AuthLoginReq', authSession);
						console.log('accounts', this.accounts);
						break;
					case ActionCommands.CID_UpdateCmdReq:
						await ChatMsg.handleUpdateCmdReq(pdu, webSocket);
						break;
					case ActionCommands.CID_SendBotMsgReq:
						await ChatMsg.handleSendBotMsgReq(pdu, webSocket);
						break;
				}
			} catch (err) {
				// Report any exceptions directly back to the client. As with our handleErrors() this
				// probably isn't what you'd want to do in production, but it's convenient when testing.
				// webSocket.send(JSON.stringify({ error: err.stack }));
			}
		});

		// On "close" and "error" events, remove the WebSocket from the webSockets list
		let closeOrErrorHandler = () => {
			console.log('user', accountId);
			const account = this.accounts.get(accountId);
			if (account.authSession?.address && this.authUserAddressAccountMap) {
				let accountIds = this.authUserAddressAccountMap.get(account.authSession!.address);
				if (accountIds) {
					accountIds = accountIds.filter(id => id !== accountId);
					this.authUserAddressAccountMap.set(account.authSession!.address, accountIds);
				}
			}
			this.accounts.delete(accountId);
		};
		webSocket.addEventListener('close', closeOrErrorHandler);
		webSocket.addEventListener('error', closeOrErrorHandler);
	}

	// broadcast() broadcasts a message to all clients.
	broadcast(message: Buffer) {
		// Iterate over all the sessions sending them messages.
		this.accounts.forEach((user, key) => {
			try {
				user.websocket.send(message);
			} catch (err) {
				this.accounts.delete(key);
			}
		});
	}

	async getDurableObjectLocation() {
		const res = await fetch('https://workers.cloudflare.com/cf.json');
		const json = (await res.json()) as IncomingRequestCfProperties;
		// console.log('getDurableObjectLocation', JSON.stringify(json));
		this.dolocation = `${json.city} (${json.country})`;
	}

	scheduleNextAlarm(storage: DurableObjectStorage) {
		try {
			const alarmTime = Date.now() + healthCheckInterval;
			storage.setAlarm(alarmTime);
		} catch {
			console.log('Durable Objects Alarms not supported in Miniflare (--local mode) yet.');
		}
	}

	alarm() {
		const msg = { type: 'healthcheck' };
		this.broadcast(Buffer.from(new OtherNotify({ err: ERR.NO_ERROR }).pack().getPbData()));
		if (this.accounts.size) this.scheduleNextAlarm(this.storage);
	}
}
