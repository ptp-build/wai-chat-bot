import {ActionCommands, getActionCommandsName} from '../../../lib/ptp/protobuf/ActionCommands';
import {Pdu} from '../../../lib/ptp/protobuf/BaseMsg';
import {AuthSessionType, getSessionInfoFromSign} from './User';
import {AuthLoginReq, AuthLoginRes} from '../../../lib/ptp/protobuf/PTPAuth';
import {SendBotMsgReq, SendBotMsgRes} from '../../../lib/ptp/protobuf/PTPMsg';
import {ERR, UserStoreData_Type} from '../../../lib/ptp/protobuf/PTPCommon/types';
import {UserStoreData} from '../../../lib/ptp/protobuf/PTPCommon';
import {SyncReq, SyncRes, TopCatsReq, TopCatsRes} from '../../../lib/ptp/protobuf/PTPSync';
import {ENV, kv} from '../../env';
import {currentTs1000} from '../utils/utils';
import {requestOpenAi} from '../functions/openai';
import ChatMsg from './ChatMsg';
import {createParser} from 'eventsource-parser';

let dispatchers: Record<number, MsgDispatcher> = {};

export default class MsgDispatcher {
  private authUserId: string;
  private accountId: string;
  private address: string;
  constructor(accountId: string) {
    this.accountId = accountId;
  }

  static getInstance(accountId: string) {
    if (!dispatchers[accountId]) {
      dispatchers[accountId] = new MsgDispatcher(accountId);
    }
    return dispatchers[accountId];
  }
  async handleAuthLoginReq(pdu: Pdu): Promise<AuthSessionType | undefined> {
    const { sign, clientInfo } = AuthLoginReq.parseMsg(pdu);
    const res = await getSessionInfoFromSign(sign);
    console.log('[clientInfo]', JSON.stringify(clientInfo));
    console.log('[authSession]', JSON.stringify(res));
    if (res) {
      this.setAuthUserId(res.authUserId);
      this.setAddress(res.address);
      this.sendPdu(
        new AuthLoginRes({
          err: ERR.NO_ERROR,
        }).pack(),
        pdu.getSeqNum()
      );
    }

    return res;
  }
  async handleSyncReq(pdu: Pdu) {
    let { userStoreData } = SyncReq.parseMsg(pdu);
    // console.debug('userStoreData', this.address, JSON.stringify(userStoreData));
    const authUserId = this.authUserId;
    const userStoreDataStr = await kv.get(`W_U_S_D_${authUserId}`);
    let userStoreDataRes: UserStoreData_Type;
    let changed = false;
    if (userStoreDataStr) {
      const buf = Buffer.from(userStoreDataStr, 'hex');
      userStoreDataRes = UserStoreData.parseMsg(new Pdu(buf));
      // console.debug('userStoreDataRes', this.address, JSON.stringify(userStoreDataRes));

      if (!userStoreData?.time || userStoreData?.time < userStoreDataRes.time) {
        userStoreDataRes = userStoreData!
      } else {
        userStoreDataRes = userStoreData!;
        changed = true;
      }
    } else {
      userStoreDataRes = userStoreData!;
      userStoreDataRes.time = currentTs1000();
      changed = true;
    }

    if (changed) {
      await kv.put(
        `W_U_S_D_${authUserId}`,
        Buffer.from(new UserStoreData(userStoreDataRes).pack().getPbData()).toString('hex')
      );
    }
    this.sendPdu(new SyncRes({ userStoreData: userStoreDataRes }).pack());
  }

  async handleSendBotMsgReq(pdu: Pdu) {
    let { text, chatId, msgId, chatGpt } = SendBotMsgReq.parseMsg(pdu);
    console.log('handleSendBotMsgReq', { text, chatId, msgId, chatGpt });
    this.sendPdu(
      new SendBotMsgRes({
        reply: 'reply: ' + text,
      }).pack(),
      pdu.getSeqNum()
    );
    if (chatGpt) {
      await this.handleChatGptMsg(pdu);
    }
  }
  async handleChatGptMsg(pdu: Pdu) {
    let { chatId, msgId, chatGpt } = SendBotMsgReq.parseMsg(pdu);

    let { messages, apiKey, systemPrompt, ...modelConfig } = JSON.parse(chatGpt);
    messages.unshift({
      role: 'system',
      content: systemPrompt,
    });
    messages.forEach((message: { date: undefined }) => {
      if (message.date !== undefined) {
        delete message.date;
      }
    });
    const body = JSON.stringify({
      ...modelConfig,
      messages,
      stream: true,
    });
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    if (!apiKey) {
      apiKey = ENV.OPENAI_API_KEY;
    }
    const res = await requestOpenAi('POST', 'v1/chat/completions', body, apiKey);
    let reply = '';
    if (!msgId) {
      msgId = await ChatMsg.genMessageId();
    }
    new ReadableStream({
      async start(controller) {
        function onParse(event: any) {
          if (event.type === 'event') {
            const assets = event.assets;
            // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
            if (assets === '[DONE]') {
              console.error('[handleSendBotMsgReq]', assets);
              controller.close();
              // ChatMsg.sendPdu(
              //   new SendBotMsgRes({
              //     msgId,
              //     chatId,
              //     reply,
              //     streamEnd: true,
              //   }).pack(),
              //   ws,
              //   pdu.getSeqNum()
              // );
              return;
            }
            try {
              const json = JSON.parse(assets);
              const text = json.choices[0].delta.content;
              const queue = encoder.encode(text);
              if (text) {
                reply += text;
                console.log(reply);
                // ChatMsg.sendPdu(
                //   new SendBotMsgRes({
                //     msgId,
                //     chatId,
                //     reply,
                //   }).pack(),
                //   ws,
                //   pdu.getSeqNum()
                // );
              }
              controller.enqueue(queue);
            } catch (e) {
              console.error('[handleSendBotMsgReq] error', e);
              controller.error(e);
            }
          }
        }
        let parser;

        for await (const chunk of res.body as any) {
          const chunkDecode = decoder.decode(chunk);
          if (chunkDecode) {
            const chunkDecodeStr = Buffer.from(chunkDecode).toString();
            if (chunkDecodeStr.indexOf('{') === 0 && chunkDecodeStr.indexOf('"error": {') > 0) {
              const chunkDecodeJson = JSON.parse(chunkDecodeStr);
              if (chunkDecodeJson.error) {
                console.error('[error]', chunkDecodeJson.error.message);
                // ChatMsg.sendPdu(
                //   new SendBotMsgRes({
                //     chatId,
                //     msgId,
                //     reply: chunkDecodeJson.error.message,
                //   }).pack(),
                //   ws,
                //   pdu.getSeqNum()
                // );
                return;
              }
            }
          }

          if (!parser) {
            parser = createParser(onParse);
          }
          // console.log(Buffer.from(chunkDecode).toString());
          parser.feed(chunkDecode);
        }
      },
    });
  }
  async handleTopCatsReq(pdu: Pdu) {
    const { time } = TopCatsReq.parseMsg(pdu);
    const str = await kv.get('topCats-cn.json');

    let topCats;
    if (str) {
      topCats = JSON.parse(str);
    } else {
      return;
    }
    let payload: any = {};
    console.log('handleTopCatsReq', time, topCats.time, time < topCats.time);
    if (time < topCats.time) {
      payload = {
        topSearchPlaceHolder: '编程 写作 旅游...',
        cats: topCats.cats,
      };
    }
    const bots: any[] = [];
    topCats.bots.forEach(bot => {
      if (bot.time > time) {
        bots.push(bot);
      }
    });
    if (bots.length > 0) {
      payload.bots = bots;
    }
    this.sendPdu(
      new TopCatsRes({
        payload: JSON.stringify(payload),
      }).pack(),
      pdu.getSeqNum()
    );
  }
  static async handleUpdateCmdReq(pdu: Pdu, ws?: WebSocket) {}
  static async handleWsMsg(accountId: string, pdu) {
    const dispatcher = MsgDispatcher.getInstance(accountId);
    console.log(
      '[onMessage]',
      getActionCommandsName(pdu.getCommandId()),
      pdu.getSeqNum(),
      pdu.getPbData().slice(0, 16)
    );
    switch (pdu.getCommandId()) {
      case ActionCommands.CID_AuthLoginReq:
        await dispatcher.handleAuthLoginReq(pdu);
        break;
      case ActionCommands.CID_SyncReq:
        await dispatcher.handleSyncReq(pdu);
        break;
      case ActionCommands.CID_UpdateCmdReq:
        await dispatcher.handleUpdateCmdReq(pdu);
        break;
      case ActionCommands.CID_TopCatsReq:
        await dispatcher.handleTopCatsReq(pdu);
        break;
      case ActionCommands.CID_SendBotMsgReq:
        await dispatcher.handleSendBotMsgReq(pdu);
        break;
      case ActionCommands.CID_ShareBotReq:
        await dispatcher.handleShareBotReq(pdu);
        break;
      case ActionCommands.CID_ShareBotStopReq:
        await dispatcher.handleShareBotStopReq(pdu);
        break;
    }
  }

  private ws: WebSocket | any;
  setWs(ws: WebSocket | any) {
    this.ws = ws;
  }

  setAuthUserId(authUserId: string) {
    this.authUserId = authUserId;
  }

  setAddress(address: string) {
    this.address = address;
  }
  sendPdu(pdu: Pdu, seqNum: number = 0) {
    console.log('sendPdu', getActionCommandsName(pdu.getCommandId()));
    pdu.updateSeqNo(seqNum);
    this.ws.send(pdu.getPbData());
  }
}
