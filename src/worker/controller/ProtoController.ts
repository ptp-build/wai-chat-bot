import { Pdu } from '../../lib/ptp/protobuf/BaseMsg';
import { ActionCommands, getActionCommandsName } from '../../lib/ptp/protobuf/ActionCommands';
import { Download, Upload } from '../share/service/File';
import {
  DownloadMsgReq,
  DownloadMsgRes,
  RemoveMessagesReq,
  RemoveMessagesRes,
  UploadMsgReq,
  UploadMsgRes,
} from '../../lib/ptp/protobuf/PTPMsg';
import {
  ERR,
  MessageStoreRow_Type,
  UserMessageStoreData_Type,
  UserStoreRow_Type,
} from '../../lib/ptp/protobuf/PTPCommon/types';
import { ENV, kv, storage } from '../env';
import { AuthSessionType } from '../share/service/User';
import {
  DownloadUserReq,
  DownloadUserRes,
  GenUserIdRes,
  UploadUserReq,
  UploadUserRes,
} from '../../lib/ptp/protobuf/PTPUser';
import WaiOpenAPIRoute from '../share/cls/WaiOpenAPIRoute';
import { UserMessageStoreData } from '../../lib/ptp/protobuf/PTPCommon';
import { OtherNotify } from '../../lib/ptp/protobuf/PTPOther';

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
      time: Math.ceil(+new Date() / 1000),
      chatId,
      messageIds: [],
      messageIdsDeleted: [],
    };
    if (messageStorageDataStr) {
      messageStorageData = UserMessageStoreData.parseMsg(
        new Pdu(Buffer.from(messageStorageDataStr, 'hex'))
      );
    }
    if (messages) {
      for (let i = 0; i < messages?.length; i++) {
        const { buf, messageId } = messages[i];
        if (!messageStorageData.messageIds?.indexOf(messageId) > -1) {
          messageStorageData.messageIds?.push(messageId);
        }
        await storage.put(`wai/${authUserId}/messages/${chatId}/${messageId}`, Buffer.from(buf!));
      }
      await kv.put(
        `W_M_S_D_${authUserId}_${chatId}`,
        Buffer.from(new UserMessageStoreData(messageStorageData).pack().getPbData()).toString('hex')
      );
    }
    return WaiOpenAPIRoute.responsePdu(
      new UploadMsgRes({
        err: ERR.NO_ERROR,
      }).pack()
    );
  }

  async handleDownloadMsgReq(authUserId: number, pdu: Pdu) {
    const { chatId } = DownloadMsgReq.parseMsg(pdu);
    const messages: MessageStoreRow_Type[] = [];
    const messageStorageDataStr = await kv.get(`W_M_S_D_${authUserId}_${chatId}`);
    if (messageStorageDataStr) {
      const { messageIds, messageIdsDeleted } = UserMessageStoreData.parseMsg(
        new Pdu(Buffer.from(messageStorageDataStr, 'hex'))
      );
      console.log('[handleDownloadMsgReq]', chatId, { messageIds, messageIdsDeleted });
      if (messageIds) {
        for (let i = 0; i < messageIds?.length; i++) {
          const messageId = messageIds[i];
          if (messageIdsDeleted && messageIdsDeleted.indexOf(messageId) > -1) {
            continue;
          }
          const res = await storage.get(`wai/${authUserId}/messages/${chatId}/${messageId}`);
          messages.push({
            messageId,
            buf: Buffer.from(res!),
          });
        }
      }
    }
    return WaiOpenAPIRoute.responsePdu(
      new DownloadMsgRes({
        messages,
        err: ERR.NO_ERROR,
      }).pack()
    );
  }

  async handleRemoveMessagesReq(authUserId: number, pdu: Pdu) {
    const { chatId, messageIds } = RemoveMessagesReq.parseMsg(pdu);
    const messageStorageDataStr = await kv.get(`W_M_S_D_${authUserId}_${chatId}`);
    let messageStorageData: UserMessageStoreData_Type = {
      time: Math.ceil(+new Date() / 1000),
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
    const { users } = UploadUserReq.parseMsg(pdu);

    if (users) {
      for (let i = 0; i < users?.length; i++) {
        if (users) {
          const { buf, userId } = users[i];
          await storage.put(`wai/${authUserId}/users/${userId}`, Buffer.from(buf!));
          console.log(`userId:${userId}`);
        }
      }
    }

    return WaiOpenAPIRoute.responsePdu(
      new UploadUserRes({
        err: ERR.NO_ERROR,
      }).pack()
    );
  }

  async handleDownloadUserReq(authUserId: number, pdu: Pdu) {
    const { userIds } = DownloadUserReq.parseMsg(pdu);
    const users: UserStoreRow_Type[] = [];
    if (userIds) {
      for (let i = 0; i < userIds?.length; i++) {
        const userId = userIds![i];
        const res = await storage.get(`wai/${authUserId}/users/${userId}`);
        if (res) {
          users.push({
            userId,
            buf: Buffer.from(res!),
          });
        }
      }
    }

    return WaiOpenAPIRoute.responsePdu(
      new DownloadUserRes({
        users,
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
