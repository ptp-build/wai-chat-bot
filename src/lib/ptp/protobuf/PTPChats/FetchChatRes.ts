import BaseMsg from '../BaseMsg';
import { ActionCommands } from '../ActionCommands';
import type { Pdu } from '../BaseMsg';
import type { FetchChatRes_Type } from './types';

export default class FetchChatRes extends BaseMsg {
  public msg?: FetchChatRes_Type
  constructor(msg?: FetchChatRes_Type) {
    super('PTP.Chats.FetchChatRes', msg);
    this.setCommandId(ActionCommands.CID_FetchChatRes);
    this.msg = msg;
  }
  static parseMsg(pdu : Pdu): FetchChatRes_Type {
    return new FetchChatRes().decode(pdu.body());
  }
}
