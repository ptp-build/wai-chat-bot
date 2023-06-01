import {kv} from '../../../env';

export class MsgBotPublic {
  private chatId: string;
  private senderId: string;
  private msgId: number;
  private msgDate: number;
  private text: string;
  constructor(chatId: string, senderId: string,text:string,msgId:number,msgDate:number) {
    this.chatId = chatId;
    this.msgId = msgId;
    this.msgDate = msgDate;
    this.senderId = senderId;
    this.text = text;
  }

  static async getMsg(chatId:string,msgId: number) {
    const res = await kv.get(`wai/msg/bot/public/${chatId}/${msgId}`);
    return res ? JSON.parse(res) : null;
  }

  async saveMsg() {
    const { msgId,msgDate,chatId,text,senderId } = this;
    const rowsStr = await kv.get(`wai/msg/bot/public/${chatId}/rows`);
    const rows = rowsStr ? JSON.parse(rowsStr) : []
    if(!rows.includes(msgId)){
      rows.push(msgId)
      rows.sort((a,b)=>b-a)
      await kv.put(`wai/msg/bot/public/${chatId}/rows`,JSON.stringify(rows));
    }
    await kv.put(`wai/msg/bot/public/${chatId}/${msgId}`,JSON.stringify({
      msgId,msgDate,chatId,senderId,text
    }));
  }
  static async getMsgIds(chatId:string) {
    const rowsStr = await kv.get(`wai/msg/bot/public/${chatId}/rows`);
    return rowsStr ? JSON.parse(rowsStr) : []
  }

  async deleteMsg(msgId: number) {
    const { chatId,authUserId } = this;
    await kv.delete(`wai/msg/bot/public/${chatId}/${msgId}`);
    let rows = await MsgBotPublic.getMsgIds(chatId) as number[]
    if(rows.indexOf(msgId) > -1){
      rows = rows.filter(id=>id !== msgId)
    }
    await kv.put(`wai/msg/bot/public/${chatId}/rows`,JSON.stringify(rows));
  }
}
