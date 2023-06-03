import {kv, storage} from '../../../env';
import {User} from "../User";
import {MsgBotPublic} from "./MsgBotPublic";
import {PbMsg_Type} from "../../../../lib/ptp/protobuf/PTPCommon/types";
import {PbMsg} from "../../../../lib/ptp/protobuf/PTPCommon";
import {Pdu} from "../../../../lib/ptp/protobuf/BaseMsg";
import {Msg} from "./Msg";

export class MsgBot {
  private chatId: string;
  private authUserId: string;
  private msg: PbMsg_Type;
  constructor(authUserId:string,chatId: string, msg:PbMsg_Type) {
    this.chatId = chatId;
    this.authUserId = authUserId;
    this.msg = msg;
  }

  static async getMsg(authUserId:string,chatId:string,msgId: number) {
    const res = await MsgBot.getMsgBuffer(authUserId,chatId,msgId);
    return res ? PbMsg.parseMsg(new Pdu(res)) : null;
  }

  static async getMsgBuffer(authUserId:string,chatId:string,msgId: number) {
    const res = await storage.get(`wai/${authUserId}/msg/bot/${chatId}/${msgId}`);
    return res ? Buffer.from(res) : null;
  }

  async saveMsg() {
    const { msg,chatId,authUserId } = this;
    const rows = await MsgBot.getMsgIds(authUserId,chatId);
    if(!rows.includes(msg.id)){
      rows.push(msg.id)
      await MsgBot.saveMsgIds(authUserId,chatId,rows)
    }
    await storage.put(`wai/${authUserId}/msg/bot/${chatId}/${msg.id}`,Buffer.from(new PbMsg(msg).pack().getPbData()))

    if(await User.getBotIsPublic(chatId)){
      if(await User.getBotOwnerUserID(chatId) === authUserId){
        await new MsgBotPublic(chatId,msg).saveMsg()
      }
    }
  }
  static async saveMsgIds(authUserId:string,chatId:string,msgIds:number[]) {
    await kv.put(`wai/${authUserId}/msg/bot/${chatId}/rows`,JSON.stringify(msgIds));
  }

  static async getMsgIds(authUserId:string,chatId:string) {
    const rowsStr = await kv.get(`wai/${authUserId}/msg/bot/${chatId}/rows`);
    return rowsStr ? JSON.parse(rowsStr) : []
  }

  static async deleteMsg(authUserId:string,chatId:string,msgId: number) {
    await storage.delete(`wai/${authUserId}/msg/bot/${chatId}/${msgId}`);
    let rows = await MsgBot.getMsgIds(authUserId,chatId) as number[]
    if(rows.indexOf(msgId) > -1){
      rows = rows.filter(id=>id !== msgId)
    }
    await MsgBot.saveMsgIds(authUserId,chatId,rows)
  }
}
