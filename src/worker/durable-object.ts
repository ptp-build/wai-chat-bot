import { Pdu } from '../lib/ptp/protobuf/BaseMsg';
import { AuthSessionType } from './share/service/User';
import { OtherNotify } from '../lib/ptp/protobuf/PTPOther';
import { ERR } from '../lib/ptp/protobuf/PTPCommon/types';
import { Environment, initEnv } from './env';
import MsgDispatcher from './share/service/MsgDispatcher';
import { ActionCommands, getActionCommandsName } from '../lib/ptp/protobuf/ActionCommands';
import { SendMsgRes, SendTextMsgReq } from '../lib/ptp/protobuf/PTPMsg';
import { currentTs } from './share/utils/utils';

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
  pings: Map<string, number>;
  storage: DurableObjectStorage;
  dolocation: string;

  constructor(state: DurableObjectState, env: Environment) {
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
    if (request.url.endsWith('sendMessage')) {
      console.log('[fetch]', request.url, this.accounts);
      const requestBody = await request.json();
      let hasSent = false;
      this.accounts.forEach((user, key) => {
        if (user.authSession?.authUserId === requestBody.toUserId) {
          console.log('[send]', user);
          try {
            user.websocket.send(
              new SendMsgRes({
                replyText: requestBody.text,
                senderId: requestBody.fromUserId,
                chatId: requestBody.chatId,
                date: currentTs(),
              })
                .pack()
                .getPbData()
            );
            hasSent = true;
          } catch (e) {
            console.error(e);
          }
        }
      });
      return new Response(null, { status: hasSent ? 200 : 404 });
    }
    const requestMetadata = request.cf;
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
        const dispatcher = MsgDispatcher.getInstance(accountId);
        switch (pdu.getCommandId()) {
          case ActionCommands.CID_AuthLoginReq:
            const res = await dispatcher.handleAuthLoginReq(pdu);
            console.log('CID_AuthLoginReq', res);
            if (res) {
              this.accounts.set(accountId, {
                ...this.accounts.get(accountId),
                authSession: res,
              });
            }
            return;
        }
        await MsgDispatcher.handleWsMsg(accountId, pdu);
      } catch (err) {
        console.error(err);
      }
    });

    // On "close" and "error" events, remove the WebSocket from the webSockets list
    let closeOrErrorHandler = () => {
      console.log('user', accountId);
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
