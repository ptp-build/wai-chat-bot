import { getCorsHeader } from '../utils/utils';
import { ENV, kv } from '../../env';

import { Pdu } from '../../../lib/ptp/protobuf/BaseMsg';
import { OpenAPIRoute } from '@cloudflare/itty-router-openapi';
import Account from '../Account';
import { AuthSessionType, genUserId } from '../service/User';

export default class WaiOpenAPIRoute extends OpenAPIRoute {
	private authSession: AuthSessionType;
	async checkTokenIsInvalid(request: Request) {
		const auth = request.headers.get('Authorization');
		if (!auth) {
			return WaiOpenAPIRoute.responseError('not auth', 400);
		}
		const token = auth.replace('Bearer ', '');
		if (token.indexOf('_') === -1) {
			return WaiOpenAPIRoute.responseError('not auth', 400);
		}
		const res = token.split('_');
		const sign = res[0];
		const ts = parseInt(res[1]);
		const clientId = parseInt(res[3]);
		const account = new Account(ts);
		const { address } = account.recoverAddressAndPubKey(
			Buffer.from(sign, 'hex'),
			ts.toString()
		);
		if (!address) {
			return WaiOpenAPIRoute.responseError('not auth', 400);
		}
		Account.setServerKv(kv);
		let authUserId = await account.getUidFromCacheByAddress(address);
		if (!authUserId) {
			authUserId = await genUserId();
			await account.saveUidFromCacheByAddress(address, authUserId);
		}
		this.authSession = {
			address,
			authUserId,
			ts,
			clientId,
		};
		return false;
	}
	jsonResp(params: { data: Record<string, any>; status?: number }): Response {
		return new Response(JSON.stringify(params.data), {
			headers: {
				...getCorsHeader(ENV.Access_Control_Allow_Origin),
			},
			status: params.status || 200,
		});
	}

	static responseError(error = '', status = 500) {
		return WaiOpenAPIRoute.responseJson({ error, status }, status);
	}

	static responseData(data: any, status = 200) {
		return new Response(data, {
			status,
			headers: {
				...getCorsHeader(ENV.Access_Control_Allow_Origin),
			},
		});
	}
	static responseJson(data: object, status = 200) {
		return new Response(JSON.stringify(data), {
			status,
			headers: {
				...getCorsHeader(ENV.Access_Control_Allow_Origin),
			},
		});
	}
	static responseBuffer(data: Buffer, status = 200) {
		return new Response(data, {
			status,
			headers: {
				...getCorsHeader(ENV.Access_Control_Allow_Origin, 'application/octet-stream'),
			},
		});
	}
	static responsePdu(data: Pdu, status = 200) {
		return WaiOpenAPIRoute.responseBuffer(Buffer.from(data.getPbData()), status);
	}
}
