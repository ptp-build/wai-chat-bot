import {Pdu} from '../../lib/ptp/protobuf/BaseMsg';
import {ActionCommands, getActionCommandsName} from '../../lib/ptp/protobuf/ActionCommands';
import {Download, Upload} from '../share/service/File';
import {
  DownloadMsgReq,
  DownloadMsgRes,
  RemoveMessagesReq,
  RemoveMessagesRes,
  UploadMsgReq,
  UploadMsgRes,
} from '../../lib/ptp/protobuf/PTPMsg';
import {ERR, UserMessageStoreData_Type,} from '../../lib/ptp/protobuf/PTPCommon/types';
import {ENV, kv, storage} from '../env';
import {AuthSessionType} from '../share/service/User';
import {
  DownloadUserReq,
  DownloadUserRes,
  GenUserIdRes,
  ShareBotReq,
  ShareBotRes,
  ShareBotStopReq,
  ShareBotStopRes,
  UploadUserReq,
  UploadUserRes,
} from '../../lib/ptp/protobuf/PTPUser';
import WaiOpenAPIRoute from '../share/cls/WaiOpenAPIRoute';
import {PbMsg, PbUser, UserMessageStoreData} from '../../lib/ptp/protobuf/PTPCommon';
import {OtherNotify} from '../../lib/ptp/protobuf/PTPOther';
import {currentTs, currentTs1000} from "../share/utils/utils";

export default class ProtoController extends WaiOpenAPIRoute {
  private authSession: AuthSessionType;
  static schema = {
    tags: ['Proto'],
    parameters: {},
    responses: {
      '200': {
        schema: {},
      },
    },
  };

  // @ts-ignore
  async handle(request: Request, data: Record<string, any>) {
    try {
      return await this.dispatch(request);
    } catch (e: any) {
      console.error(e.stack);
      return WaiOpenAPIRoute.responsePdu(
        new OtherNotify({
          err: ERR.ERR_SYSTEM,
        }).pack(),
        500
      );
    }
  }

  async dispatch(request: Request) {
    try {
      const arrayBuffer = await request.arrayBuffer();
      let pdu = new Pdu(Buffer.from(arrayBuffer));
      switch (pdu.getCommandId()) {
        case ActionCommands.CID_DownloadReq:
          return Download(pdu);
        default:
          break;
      }

      const res = await this.checkIfTokenIsInvalid(request);
      if (res) {
        return res;
      }

      const { authUserId, address } = this.authSession;
      console.log('auth', authUserId, address);
      console.debug(
        '[Proto Req]',
        authUserId,
        address,
        pdu.getCommandId(),
        getActionCommandsName(pdu.getCommandId())
      );

      switch (pdu.getCommandId()) {
        case ActionCommands.CID_UploadUserReq:
          return this.handleUploadUserReq(Number(authUserId), pdu);
        case ActionCommands.CID_DownloadUserReq:
          return this.handleDownloadUserReq(Number(authUserId), pdu);
        case ActionCommands.CID_UploadMsgReq:
          return this.handleUploadMsgReq(Number(authUserId), pdu);
        case ActionCommands.CID_RemoveMessagesReq:
          return this.handleRemoveMessagesReq(Number(authUserId), pdu);
        case ActionCommands.CID_DownloadMsgReq:
          return this.handleDownloadMsgReq(Number(authUserId), pdu);
        case ActionCommands.CID_ShareBotReq:
          return this.handleShareBotReq(Number(authUserId), pdu);
        case ActionCommands.CID_ShareBotStopReq:
          return this.handleShareBotStopReq(Number(authUserId), pdu);
        case ActionCommands.CID_GenUserIdReq:
          return this.handleGenUserIdReq(Number(authUserId), pdu);
        case ActionCommands.CID_UploadReq:
          return Upload(pdu);
        default:
          break;
      }
    } catch (e) {
      // @ts-ignore
      console.error(e.stack);
      // @ts-ignore
      return WaiOpenAPIRoute.responseError(ENV.IS_PROD ? 'System Error' : e.stack.split('\n'));
    }
  }

  async handleUploadMsgReq(authUserId: number, pdu: Pdu) {
    const { messages, chatId } = UploadMsgReq.parseMsg(pdu);
    const messageStorageDataStr = await kv.get(`W_M_S_D_${authUserId}_${chatId}`);

    let messageStorageData: UserMessageStoreData_Type = {
      time: currentTs1000(),
      chatId,
      messageIds: [],
      messageIdsDeleted: [],
    };

    if (messageStorageDataStr) {
      messageStorageData = UserMessageStoreData.parseMsg(
        new Pdu(Buffer.from(messageStorageDataStr, 'hex'))
      );
    }
    if (messages && messages?.length > 0) {
      for (let i = 0; i < messages?.length; i++) {
        const buf = messages[i];
        const msg = PbMsg.parseMsg(new Pdu(Buffer.from(buf)))
        if (!messageStorageData.messageIds?.indexOf(msg.id) > -1) {
          messageStorageData.messageIds?.push(msg.id);
        }
        await storage.put(`wai/${authUserId}/messages/${chatId}/${msg.id}`, Buffer.from(buf!));
      }
      messageStorageData.time = currentTs1000()
      await kv.put(
        `W_M_S_D_${authUserId}_${chatId}`,
        Buffer.from(new UserMessageStoreData(messageStorageData).pack().getPbData()).toString('hex')
      );
    }
    return WaiOpenAPIRoute.responsePdu(
      new UploadMsgRes({
        userMessageStoreData:messageStorageData!,
        err: ERR.NO_ERROR,
      }).pack()
    );
  }

  async handleDownloadMsgReq(authUserId: number, pdu: Pdu) {
    let { chatId,time } = DownloadMsgReq.parseMsg(pdu);
    if(!time){
      time = 0
    }
    const messages: Buffer[] = [];
    const messageStorageDataStr = await kv.get(`W_M_S_D_${authUserId}_${chatId}`);
    if (messageStorageDataStr) {
      let userMessageStoreData = UserMessageStoreData.parseMsg(
        new Pdu(Buffer.from(messageStorageDataStr, 'hex'))
      );
      const { messageIds, messageIdsDeleted } = userMessageStoreData;
      if(!userMessageStoreData.time){
        userMessageStoreData.time = currentTs1000()
      }
      if(time < userMessageStoreData.time){
        console.log('[handleDownloadMsgReq]', chatId, { messageIds, messageIdsDeleted });
        if (messageIds) {
          for (let i = 0; i < messageIds?.length; i++) {
            const messageId = messageIds[i];
            if (messageIdsDeleted && messageIdsDeleted.indexOf(messageId) > -1) {
              continue;
            }
            const res = await storage.get(`wai/${authUserId}/messages/${chatId}/${messageId}`);
            if(res){
              messages.push(Buffer.from(res));
            }
          }
          return WaiOpenAPIRoute.responsePdu(
              new DownloadMsgRes({
                userMessageStoreData,
                messages,
              }).pack()
          );
        }
      }
    }
    return WaiOpenAPIRoute.responsePdu(
      new DownloadMsgRes({
        err: ERR.NO_ERROR,
      }).pack()
    );
  }

  async handleRemoveMessagesReq(authUserId: number, pdu: Pdu) {
    const { chatId, messageIds } = RemoveMessagesReq.parseMsg(pdu);
    const messageStorageDataStr = await kv.get(`W_M_S_D_${authUserId}_${chatId}`);
    let messageStorageData: UserMessageStoreData_Type = {
      time: currentTs1000(),
      chatId,
      messageIds: [],
      messageIdsDeleted: [],
    };
    if (messageStorageDataStr) {
      messageStorageData = UserMessageStoreData.parseMsg(
        new Pdu(Buffer.from(messageStorageDataStr, 'hex'))
      );
    }
    console.log('handleRemoveMessagesReq', chatId, messageIds, messageStorageData);

    let changed = false;
    if (messageIds && messageIds.length > 0) {
      for (let i = 0; i < messageIds.length; i++) {
        const messageId = messageIds[i];
        if (messageStorageData.messageIds?.indexOf(messageId) > -1) {
          if (!messageStorageData.messageIdsDeleted) {
            messageStorageData.messageIdsDeleted = [];
          }
          messageStorageData.messageIdsDeleted?.push(messageId);
          changed = true;
        }
      }
    }
    if (changed) {
      messageStorageData.time =currentTs1000()
      await kv.put(
        `W_M_S_D_${authUserId}_${chatId}`,
        Buffer.from(new UserMessageStoreData(messageStorageData).pack().getPbData()).toString('hex')
      );

    }
    return WaiOpenAPIRoute.responsePdu(
        new RemoveMessagesRes({
          err: ERR.NO_ERROR,
        }).pack()
    );
  }

  async handleUploadUserReq(authUserId: number, pdu: Pdu) {
    const { userBuf } = UploadUserReq.parseMsg(pdu);
    const buf = Buffer.from(userBuf);
    const user = PbUser.parseMsg(new Pdu(buf))
    if(!user.updatedAt){
      user.updatedAt = currentTs();
    }
    await storage.put(`wai/users/${user.id}`, buf);
    await kv.put(`wai/users/updatedAt/${user.id}`, user.updatedAt.toString());

    console.debug(`saved userId:${user.id}`,user.updatedAt,JSON.stringify(user));

    return WaiOpenAPIRoute.responsePdu(
      new UploadUserRes({
        err: ERR.NO_ERROR,
      }).pack()
    );
  }

  async handleDownloadUserReq(authUserId: number, pdu: Pdu) {
    const { userId,updatedAt } = DownloadUserReq.parseMsg(pdu);
    const updatedAtCache = await kv.get(`wai/users/updatedAt/${userId}`);
    console.log("handleDownloadUserReq",userId,updatedAt,updatedAtCache)
    const str = await kv.get('topCats-cn.json');

    const topCats = str ? JSON.parse(str) : require("../../assets/jsons/topCats-cn.json");
    let bot = topCats.bots.find(bot=>bot.userId === userId)
    if(!bot){
      const authUserIdCache = await kv.get(`W_B_U_R_${userId}`);
      if(authUserIdCache !== authUserId){
        return WaiOpenAPIRoute.responsePdu(
            new DownloadUserRes({
              err: ERR.ERR_SYSTEM,
            }).pack()
        );
      }
    }

    if(updatedAtCache && updatedAt < Number(updatedAtCache)){
      const res = await storage.get(`wai/users/${userId}`);
      if(res){
        return WaiOpenAPIRoute.responsePdu(
            new DownloadUserRes({
              userBuf:Buffer.from(res),
              err: ERR.NO_ERROR,
            }).pack()
        );
      }
    }
    return WaiOpenAPIRoute.responsePdu(
        new DownloadUserRes({
          err: ERR.NO_ERROR,
        }).pack()
    );
  }

  async handleShareBotReq(authUserId: number, pdu: Pdu) {
    let { catBot,catTitle } = ShareBotReq.parseMsg(pdu);
    catTitle = catTitle.trim()
    const str = await kv.get('topCats-cn.json');
    const chatId = catBot.userId
    const topCats = str ? JSON.parse(str) : require("../../assets/jsons/topCats-cn.json");

    let isCatExists = false

    for (let i = 0; i < topCats.cats.length; i++) {
      const tapCat = topCats.cats[i]
      const botIds = [...new Set(tapCat.botIds)];

      if(tapCat.title === catTitle){
        isCatExists = true;
        if(botIds.indexOf(chatId) === -1){
          topCats.cats[i].botIds.push(chatId);
        }
      }else{
        if(botIds.indexOf(chatId) > -1){
          topCats.cats[i].botIds = topCats.cats[i].botIds.filter(id=>chatId !== id);
        }
      }
    }
    if (!isCatExists) {
      topCats.cats.push({
        title: catTitle,
        botIds: [chatId],
      });
    }
    topCats.bots.forEach(bot=>{
      bot.time = currentTs1000()
    })
    let bot = topCats.bots.find(bot=>bot.userId === chatId)
    if(!bot){
      topCats.bots.push({
        ...catBot,
        "time": currentTs1000()
      })
    }else{
      for (let i = 0; i < topCats.bots.length; i++) {
        const bot = topCats.bots[i]
        if(bot.userId === chatId){
          topCats.bots[i] = {
            ...bot,
            ...catBot,
            "time": currentTs1000()
          }
          break
        }
      }
    }

    topCats.time = currentTs1000()
    await kv.put('topCats-cn.json', JSON.stringify(topCats));
    await kv.put('topCats-bots-cn.json', JSON.stringify(topCats.bots));

    return WaiOpenAPIRoute.responsePdu(
        new ShareBotRes({
          err: ERR.NO_ERROR,
        }).pack()
    );
  }

  async handleShareBotStopReq(authUserId:number,pdu: Pdu) {
    let {userId} = ShareBotStopReq.parseMsg(pdu);
    const str = await kv.get('topCats-cn.json');
    const topCats = JSON.parse(str);
    let changed = false;
    for (let i = 0; i < topCats.cats.length; i++) {
      const cat = topCats.cats[i];
      if (cat.botIds.indexOf(userId) > -1) {
        changed = true;
        topCats.cats[i].botIds = topCats.cats[i].botIds.filter(id => id !== userId);
      }
    }
    if (changed) {
      topCats.time = currentTs1000();
      await kv.put('topCats-cn.json', JSON.stringify(topCats));
    }
    return WaiOpenAPIRoute.responsePdu(
        new ShareBotStopRes({
          err: ERR.NO_ERROR,
        }).pack()
    );
  }

  async handleGenUserIdReq(authUserId: number, pdu: Pdu) {
    console.debug('[handleGenUserIdReq]', authUserId);
    const userIdStr = await kv.get('W_U_INCR_' + authUserId, true);
    let userId = parseInt(ENV.SERVER_USER_ID_START);
    if (userIdStr) {
      userId = parseInt(userIdStr) + 1;
      if (userId < parseInt(ENV.SERVER_USER_ID_START)) {
        userId = parseInt(ENV.SERVER_USER_ID_START) + 1;
      }
    } else {
      userId += 1;
    }
    await kv.put('W_U_INCR_' + authUserId, userId.toString());
    await kv.put(`W_B_U_R_${userId}`, authUserId.toString());
    return WaiOpenAPIRoute.responsePdu(
      new GenUserIdRes({
        userId,
        err: ERR.NO_ERROR,
      }).pack()
    );
  }
}
