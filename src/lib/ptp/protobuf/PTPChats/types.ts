// DO NOT EDIT
import type * as PTPCommon from '../PTPCommon/types';

export interface FetchChatReq_Type {
  chatId: string;
}
export interface FetchChatRes_Type {
  payload?: string;
  err: PTPCommon.ERR;
}
export interface LoadChatsReq_Type {
  limit: number;
  offsetDate: number;
  archived: boolean;
  withPinned: boolean;
  lastLocalServiceMessage?: string;
}
export interface LoadChatsRes_Type {
  payload: string;
  err: PTPCommon.ERR;
}
