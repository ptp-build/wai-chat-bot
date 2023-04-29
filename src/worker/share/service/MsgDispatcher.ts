import { ActionCommands, getActionCommandsName } from '../../../lib/ptp/protobuf/ActionCommands';
import { Pdu } from '../../../lib/ptp/protobuf/BaseMsg';
import { AuthSessionType, getSessionInfoFromSign } from './User';
import { AuthLoginReq, AuthLoginRes, InitAppRes } from '../../../lib/ptp/protobuf/PTPAuth';
import { SendBotMsgReq, SendBotMsgRes, UpdateCmdReq } from '../../../lib/ptp/protobuf/PTPMsg';
import { ERR, UserStoreData_Type } from '../../../lib/ptp/protobuf/PTPCommon/types';
import { ChatIdPrompts } from '../../setting';
import { UserStoreData } from '../../../lib/ptp/protobuf/PTPCommon';
import { SyncReq, SyncRes, TopCatsReq, TopCatsRes } from '../../../lib/ptp/protobuf/PTPSync';
import { kv } from '../../env';
import { currentTs1000 } from '../utils/utils';

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
  async initApp() {
    const topCats = require('../../../assets/jsons/bots-cn.json');
    const chat = require('../../../assets/jsons/chat.json');
    const message = require('../../../assets/jsons/message.json');
    delete message.repliesThreadInfo;
    chat.id = ChatIdPrompts;
    chat.avatarHash = '2014496280034643200';
    chat.photos = [
      {
        id: '1361318180747186700',
        thumbnail: {
          width: 1836,
          height: 3192,
          dataUri:
            'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAFA3PEY8MlBGQUZaVVBfeMiCeG5uePWvuZHI////////////////////////////////////////////////////2wBDAVVaWnhpeOuCguv/////////////////////////////////////////////////////////////////////////wAARCAAoACgDASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAECA//EACkQAAEEAQIEBQUAAAAAAAAAAAEAAhEhMRJxMkFh8AMiUpHhUXKBktH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A4ADSKuPUr5YwZ+5RrWlnKVrSySNLf2QZgRg+6EXWN1S1vID3yrDJ4QRv1QYcKKI4DSaCINidIF475K6nCbJ69hYbGltCt7VMCRR6iaQal2bnOPjvCyXOJyUkekY6/wBQ2OED8/KDLidJsoh4SiCtcB4YHmnekkSMxuiIGqPqmozMmURBHGiiIg//2Q==',
        },
        sizes: [{ width: 1836, height: 3192, type: 'y' }],
      },
    ];
    message.chatId = chat.id;
    message.senderId = chat.id;
    delete message.content.photo;
    delete message.content.text;
    message.content.voice = {
      id: '6548697940473841000',
      duration: 1,
      waveform: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14.229166666666666,
        26.354166666666668, 36.427083333333336, 33.416666666666664, 36, 38.302083333333336,
        38.96875, 39.604166666666664, 39.625, 39.53125, 37.885416666666664, 37.364583333333336,
        36.989583333333336, 36.28125, 35.416666666666664, 34.166666666666664, 33.53125, 32.8125,
        32.625, 32.21875, 31.84375, 31.03125, 30.197916666666668, 30.072916666666668, 31.375,
        31.46875, 31.041666666666668, 30.927083333333332, 31.09375, 30.96875, 30.65625, 30.75,
        30.84375, 30.697916666666668, 30.520833333333332, 30.385416666666668, 30.291666666666668,
        31.03125, 31.854166666666668, 32.15625, 32.625, 32.8125, 32.34375, 32, 31.875,
      ],
    };
    chat.lastMessage = message;
    chat.isCreator = false;

    // const user:Partial<PbUser_Type> = {
    //   id:UserIdFirstBot,
    //   accessHash:"2014496280034643200",
    //   firstName:"s"
    // }
    const users = [];
    const chats = [];
    const messages = [];
    const chatFolders = [
      // {
      //   id:FolderIdWai,
      //   title:FolderTitleWai,
      //   includedChatIds:[UserIdFirstBot],
      //   excludedChatIds:[]
      // }
    ];
    this.sendPdu(
      new InitAppRes({
        users: JSON.stringify(users),
        chats: JSON.stringify(chats),
        messages: JSON.stringify(messages),
        chatFolders: JSON.stringify(chatFolders),
      }).pack()
    );
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
    const { userStoreData } = SyncReq.parseMsg(pdu);
    console.debug(JSON.stringify(userStoreData));
    const authUserId = this.authUserId;
    const userStoreDataStr = await kv.get(`W_U_S_D_${authUserId}`);
    let userStoreDataRes: UserStoreData_Type;
    let changed = false;
    if (userStoreDataStr) {
      const buf = Buffer.from(userStoreDataStr, 'hex');
      userStoreDataRes = UserStoreData.parseMsg(new Pdu(buf));
      if (userStoreData?.time < userStoreDataRes.time) {
        this.sendPdu(new SyncRes({ userStoreData: userStoreDataRes }).pack());
      } else {
        userStoreDataRes = userStoreData!;
        changed = true;
      }
    } else {
      userStoreDataRes = userStoreData!;
      userStoreDataRes.time = currentTs1000();
      changed = true;
    }
    //
    // if (this.address === '0x06d6783edcb3b16203b4f9377332dbda7dd9bddc') {
    //   const topCats = require('../../../assets/jsons/bots-cn.json');
    //   userStoreDataRes.myBots = topCats.bots.map(bot => bot.userId);
    //   this.sendPdu(new SyncRes({ userStoreData: userStoreDataRes }).pack());
    //   await kv.put(
    //     `W_U_S_D_${authUserId}`,
    //     Buffer.from(new UserStoreData(userStoreDataRes).pack().getPbData()).toString('hex')
    //   );
    // }

    if (changed) {
      await kv.put(
        `W_U_S_D_${authUserId}`,
        Buffer.from(new UserStoreData(userStoreDataRes).pack().getPbData()).toString('hex')
      );
    }
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
    // if (chatGpt) {
    //   let { messages, apiKey, systemPrompt, ...modelConfig } = JSON.parse(chatGpt);
    //   messages.unshift({
    //     role: 'system',
    //     content: systemPrompt,
    //   });
    //   messages.forEach((message: { date: undefined }) => {
    //     if (message.date !== undefined) {
    //       delete message.date;
    //     }
    //   });
    //   const body = JSON.stringify({
    //     ...modelConfig,
    //     messages,
    //     stream: true,
    //   });
    //   const encoder = new TextEncoder();
    //   const decoder = new TextDecoder();
    //   if (!apiKey) {
    //     apiKey = ENV.OPENAI_API_KEY;
    //   }
    //   const res = await requestOpenAi('POST', 'v1/chat/completions', body, apiKey);
    //   let reply = '';
    //   if (!msgId) {
    //     msgId = await ChatMsg.genMessageId();
    //   }
    //   new ReadableStream({
    //     async start(controller) {
    //       function onParse(event: any) {
    //         if (event.type === 'event') {
    //           const assets = event.assets;
    //           // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
    //           if (assets === '[DONE]') {
    //             console.error('[handleSendBotMsgReq]', assets);
    //             controller.close();
    //             ChatMsg.sendPdu(
    //               new SendBotMsgRes({
    //                 msgId,
    //                 chatId,
    //                 reply,
    //                 streamEnd: true,
    //               }).pack(),
    //               ws,
    //               pdu.getSeqNum()
    //             );
    //             return;
    //           }
    //           try {
    //             const json = JSON.parse(assets);
    //             const text = json.choices[0].delta.content;
    //             const queue = encoder.encode(text);
    //             if (text) {
    //               reply += text;
    //               console.log(reply);
    //               ChatMsg.sendPdu(
    //                 new SendBotMsgRes({
    //                   msgId,
    //                   chatId,
    //                   reply,
    //                 }).pack(),
    //                 ws,
    //                 pdu.getSeqNum()
    //               );
    //             }
    //             controller.enqueue(queue);
    //           } catch (e) {
    //             console.error('[handleSendBotMsgReq] error', e);
    //             controller.error(e);
    //           }
    //         }
    //       }
    //       let parser;
    //
    //       for await (const chunk of res.body as any) {
    //         const chunkDecode = decoder.decode(chunk);
    //         if (chunkDecode) {
    //           const chunkDecodeStr = Buffer.from(chunkDecode).toString();
    //           if (chunkDecodeStr.indexOf('{') === 0 && chunkDecodeStr.indexOf('"error": {') > 0) {
    //             const chunkDecodeJson = JSON.parse(chunkDecodeStr);
    //             if (chunkDecodeJson.error) {
    //               console.error('[error]', chunkDecodeJson.error.message);
    //               ChatMsg.sendPdu(
    //                 new SendBotMsgRes({
    //                   chatId,
    //                   msgId,
    //                   reply: chunkDecodeJson.error.message,
    //                 }).pack(),
    //                 ws,
    //                 pdu.getSeqNum()
    //               );
    //               return;
    //             }
    //           }
    //         }
    //
    //         if (!parser) {
    //           parser = createParser(onParse);
    //         }
    //         // console.log(Buffer.from(chunkDecode).toString());
    //         parser.feed(chunkDecode);
    //       }
    //     },
    //   });
    // } else {
    //   ChatMsg.sendPdu(
    //     new SendBotMsgRes({
    //       chatId,
    //       reply: text,
    //     }).pack(),
    //     ws,
    //     pdu.getSeqNum()
    //   );
    // }
  }
  async handleTopCatsReq(pdu: Pdu) {
    const { time } = TopCatsReq.parseMsg(pdu);
    const topCats = require('../../../assets/jsons/bots-cn.json');
    let payload: any = {};
    if (topCats.time > time) {
      payload = {
        time: topCats.time,
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
  static async handleUpdateCmdReq(pdu: Pdu, ws?: WebSocket) {
    const { chatId } = UpdateCmdReq.parseMsg(pdu);
    //
    // ChatMsg.sendPdu(
    //   new UpdateCmdRes({
    //     chatId,
    //     commands: [
    //       {
    //         command: 'test',
    //         description: 'test',
    //         botId: chatId,
    //       },
    //     ],
    //   }).pack(),
    //   ws,
    //   pdu.getSeqNum()
    // );
  }
  static async handleWsMsg(accountId: string, pdu) {
    const dispatcher = MsgDispatcher.getInstance(accountId);
    console.log('[onMessage]', getActionCommandsName(pdu.getCommandId()));
    switch (pdu.getCommandId()) {
      case ActionCommands.CID_AuthLoginReq:
        await dispatcher.handleAuthLoginReq(pdu);
        // const authSession = await ChatMsg.handleAuthLoginReq(pdu);
        // if (authSession) {
        // const account = this.accounts.get(accountId);
        // this.accounts.set(accountId, {
        //   websocket: webSocket,
        //   id: account?.id!,
        //   city: account?.city,
        //   country: account?.country,
        //   authSession,
        // });
        // let accountIds: string[] = [];
        // if (
        //   this.authUserAddressAccountMap &&
        //   this.authUserAddressAccountMap.has(authSession.address)
        // ) {
        //   accountIds = this.authUserAddressAccountMap.get(authSession.address)!;
        // }
        // accountIds.push(accountId);
        // this.authUserAddressAccountMap.set(authSession.address, accountIds);
        // console.log('CID_AuthLoginReq', authSession);
        // console.log('accounts', this.accounts);
        // }
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