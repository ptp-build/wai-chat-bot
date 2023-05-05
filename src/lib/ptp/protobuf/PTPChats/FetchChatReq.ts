import BaseMsg from '../BaseMsg';
import { ActionCommands } from '../ActionCommands';
import type { Pdu } from '../BaseMsg';
import type { FetchChatReq_Type } from './types';

export default class FetchChatReq extends BaseMsg {
  public msg?: FetchChatReq_Type
  constructor(msg?: FetchChatReq_Type) {
    super('PTP.Chats.FetchChatReq', msg);
    this.setCommandId(ActionCommands.CID_FetchChatReq);
    this.msg = msg;
  }
  static parseMsg(pdu : Pdu): FetchChatReq_Type {
    return new FetchChatReq().decode(pdu.body());
  }
}
