import { kv, ENV } from '../../env';
import Account from '../Account';
import WaiOpenAPIRoute from '../cls/WaiOpenAPIRoute';

export async function genUserId() {
	let value = await kv.get('USER_INCR', true);
	if (!value) {
		value = parseInt(ENV.USER_ID_START);
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

export async function getSessionInfoFromSign(token:string) {
	const res = token.split('_');
	const sign = res[0];
	const ts = parseInt(res[1]);
	const clientId = parseInt(res[3]);
	const account = new Account(1);
	const { address } = account.recoverAddressAndPubKey(Buffer.from(sign, 'hex'), ts.toString());
	if (!address) {
		return
	}
	Account.setServerKv(kv);
	let authUserId = await account.getUidFromCacheByAddress(address);
	if (!authUserId) {
		authUserId = await genUserId();
		await account.saveUidFromCacheByAddress(address, authUserId);
	}
	return { authUserId, ts, address, clientId };
}
