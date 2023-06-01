import {kv, ENV, storage} from '../../env';
import Account from '../Account';
import {PbUser} from "../../../lib/ptp/protobuf/PTPCommon";
import {Pdu} from "../../../lib/ptp/protobuf/BaseMsg";

export async function genUserId() {
  let value = await kv.get('USER_INCR', true);
  if (!value) {
    value = parseInt(ENV.SERVER_USER_ID_START);
  } else {
    value = parseInt(value) + 1;
  }
  await kv.put('USER_INCR', value.toString());
  return value.toString();
}

export type AuthSessionType = {
  authUserId: string;
  ts: number;
  address: string;
  clientId: number;
};

export async function getSessionInfoFromSign(token: string) {
  const res = token.split('_');
  const sign = res[0];
  const ts = parseInt(res[1]);
  const clientId = parseInt(res[3]);
  const account = new Account(1);
  const { address } = account.recoverAddressAndPubKey(Buffer.from(sign, 'hex'), ts.toString());
  if (!address) {
    return;
  }
  Account.setServerKv(kv);
  let authUserId = await account.getUidFromCacheByAddress(address);
  if (!authUserId) {
    authUserId = await genUserId();
    await account.saveUidFromCacheByAddress(address, authUserId);
  }
  return { authUserId, ts, address, clientId };
}

export class User{
  private userId: string;
  constructor(userId:string) {
    this.userId = userId
  }

  static async getBotOwnerUserID(userId:string){
    return await kv.get(`W_B_U_R_${userId}`);
  }

  static async setBotOwnerUserID(userId:string,ownerUserId:string){
    return await kv.put(`W_B_U_R_${userId}`,ownerUserId);
  }

  static async getUserBuffFromKv(userId:string){
    const res = await storage.get(`wai/users/${userId}`);
    return res ? Buffer.from(res) : null
  }

  static async getUserInfoFromKv(userId:string){
    const buf = await User.getUserBuffFromKv(userId)
    return buf ? PbUser.parseMsg(new Pdu(buf)) : null
  }

  static async enableBotIsPublic(chatId:string,enable: boolean) {
    await kv.put("W_U_B_PUB_"+chatId,enable? '1': "0")
  }

  static async getBotIsPublic(botId:string) {
    const str = await kv.get("W_U_B_PUB_"+botId)
    return str === "1";
  }
}
