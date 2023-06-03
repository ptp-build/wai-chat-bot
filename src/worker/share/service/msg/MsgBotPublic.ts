import {kv, storage} from '../../../env';
import {PbMsg_Type} from "../../../../lib/ptp/protobuf/PTPCommon/types";
import {Msg} from "./Msg";
import {PbMsg} from "../../../../lib/ptp/protobuf/PTPCommon";
import {Pdu} from "../../../../lib/ptp/protobuf/BaseMsg";

export class MsgBotPublic {
  private chatId: string;
  private msg: PbMsg_Type;
  constructor(chatId: string, msg: PbMsg_Type) {
    this.chatId = chatId;
    this.msg = msg;
  }

  static async getMsgBuffer(chatId:string,msgId: number) {
    const res = await storage.get(`wai/msg/bot/public/${chatId}/${msgId}`);
    return res ? Buffer.from(res) : null;
  }

  static async getMsg(chatId:string,msgId: number) {
    const buf = await MsgBotPublic.getMsgBuffer(chatId,msgId)
    return buf ? PbMsg.parseMsg(new Pdu(buf)) : null;
  }

  async saveMsg() {
    const {chatId,msg } = this;
    const rowsStr = await MsgBotPublic.getMsgIds(chatId);
    const rows = rowsStr ? JSON.parse(rowsStr) : []
    if(!rows.includes(msg.id)){
      rows.push(msg.id)
      await kv.put(`wai/msg/bot/public/${chatId}/rows`,JSON.stringify(rows));
    }
    await storage.put(`wai/msg/bot/public/${chatId}/${msg.id}`,new PbMsg(msg).pack().getPbData());
  }

  static async getMsgIds(chatId:string) {
    const rowsStr = await kv.get(`wai/msg/bot/public/${chatId}/rows`);
    return rowsStr ? JSON.parse(rowsStr) : []
  }

  async deleteMsg(msgId: number) {
    const { chatId,authUserId } = this;
    await storage.delete(`wai/msg/bot/public/${chatId}/${msgId}`);
    let rows = await MsgBotPublic.getMsgIds(chatId) as number[]
    if(rows.indexOf(msgId) > -1){
      rows = rows.filter(id=>id !== msgId)
    }
    await kv.put(`wai/msg/bot/public/${chatId}/rows`,JSON.stringify(rows));
  }
}
