import {kv} from '../../../env';
import {User} from "../User";
import {MsgBotPublic} from "./MsgBotPublic";

export class MsgBot {
  private chatId: string;
  private senderId: string;
  private authUserId: string;
  private msgId: number;
  private msgDate: number;
  private text: string;
  constructor(authUserId:string,chatId: string, senderId: string,text:string,msgId:number,msgDate:number) {
    this.chatId = chatId;
    this.authUserId = authUserId;
    this.msgId = msgId;
    this.msgDate = msgDate;
    this.senderId = senderId;
    this.text = text;
  }


  static async getMsg(authUserId:string,chatId:string,msgId: number) {
    const res = await kv.get(`wai/${authUserId}/msg/bot/${chatId}/${msgId}`);
    return res ? JSON.parse(res) : null;
  }

  async saveMsg() {
    const { msgId,msgDate,chatId,text,senderId,authUserId } = this;
    if(msgId){
      const rowsStr = await kv.get(`wai/${authUserId}/msg/bot/${chatId}/rows`);
      const rows = rowsStr ? JSON.parse(rowsStr) : []
      if(!rows.includes(msgId) && msgId){
        rows.push(msgId)
        rows.sort((a,b)=>b-a)
        await MsgBot.saveMsgIds(authUserId,chatId,rows)
      }
      await kv.put(`wai/${authUserId}/msg/bot/${chatId}/${msgId}`,JSON.stringify({
        msgId,msgDate,chatId,senderId,text
      }));
      if(await User.getBotIsPublic(chatId)){
        if(await User.getBotOwnerUserID(chatId) === authUserId){
          await new MsgBotPublic(chatId,senderId,text,msgId,msgDate).saveMsg()
        }
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

  async deleteMsg(msgId: number) {
    const { chatId,authUserId } = this;
    await kv.delete(`wai/${authUserId}/msg/bot/${chatId}/${msgId}`);
    let rows = await MsgBot.getMsgIds(authUserId,chatId) as number[]
    if(rows.indexOf(msgId) > -1){
      rows = rows.filter(id=>id !== msgId)
    }
    await kv.put(`wai/${authUserId}/msg/bot/${chatId}/rows`,JSON.stringify(rows));
  }
}
