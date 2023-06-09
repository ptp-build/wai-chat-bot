import { Pdu } from '../lib/ptp/protobuf/BaseMsg';
import { AuthSessionType } from './share/service/User';
import { OtherNotify } from '../lib/ptp/protobuf/PTPOther';
import { ERR } from '../lib/ptp/protobuf/PTPCommon/types';
import { initEnv } from './env';
import MsgDispatcher from './share/service/MsgDispatcher';

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
  authUserAddressAccountMap: Map<string, string[]> = new Map();
  pings: Map<string, number>;
  storage: DurableObjectStorage;
  dolocation: string;

  constructor(state: DurableObjectState, env: Record<string, any>) {
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
    const dispatcher = MsgDispatcher.getInstance(accountId);
    dispatcher.setWs(webSocket);

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
        await MsgDispatcher.handleWsMsg(accountId, pdu);
      } catch (err) {
        console.error(err);
      }
    });

    // On "close" and "error" events, remove the WebSocket from the webSockets list
    let closeOrErrorHandler = () => {
      console.log('user', accountId);
      const account = this.accounts.get(accountId);
      if (account && account.authSession?.address && this.authUserAddressAccountMap) {
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
    this.broadcast(Buffer.from(new OtherNotify({ err: ERR.NO_ERROR }).pack().getPbData()));
    if (this.accounts.size) this.scheduleNextAlarm(this.storage);
  }
}
