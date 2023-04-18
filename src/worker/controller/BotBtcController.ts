import WaiOpenAPIRoute from '../share/cls/WaiOpenAPIRoute';
import { Str, Bool, Int } from '@cloudflare/itty-router-openapi';
import { createStream, requestOpenai } from '../share/functions/openai';

const Body = {
	chatId: new Str({
		example: '1001',
		description: 'chat id',
	}),
	text: new Str({
		required: false,
		example: '/getBtcPrice',
		description: 'msg text',
	}),
};

export class BotBtcCommandsAction extends WaiOpenAPIRoute {
	static schema = {
		tags: ['Bot.Btc'],
		responses: {
			'200': {
				schema: {},
			},
		},
	};
	static Commands = [
		{
			command: 'getBtcPrice',
			description: 'getBtcPrice',
		},
	];
	async handle(request: Request, data: Record<string, any>) {
		return {
			commands: BotBtcCommandsAction.Commands,
		};
	}
}

export class BotBtcAction extends WaiOpenAPIRoute {
	static schema = {
		tags: ['Bot.Btc'],
		requestBody: Body,
		responses: {
			'200': {
				schema: {},
			},
		},
	};

	async handle(request: Request, data: Record<string, any>) {
		let error = 'invalid request';
		if (data.body) {
			const { text } = data.body;
			if (text) {
				if (text === '/getBtcPrice') {
					const res = await fetch(
						'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'
					);
					const json = await res.json();
					return WaiOpenAPIRoute.responseJson({
						text: json['price'],
					});
				}
			}
		}
		return WaiOpenAPIRoute.responseJson(
			{
				text: '',
			},
			200
		);
	}
}

export class BotBtcChatGptAction extends WaiOpenAPIRoute {
	static schema = {
		tags: ['Bot.Btc'],
		responses: {
			'200': {
				schema: {},
			},
		},
	};
	async handle(request: Request, data: Record<string, any>) {
		const json = await request.json();
		try {
			const stream = await createStream(request, JSON.stringify(json));
			return new Response(stream);
		} catch (error) {
			try {
				json.stream = false;
				const res = await requestOpenai(request, JSON.stringify(json));
				return WaiOpenAPIRoute.responseJson(await res.json());
			} catch (e) {
				return WaiOpenAPIRoute.responseJson(
					{
						error: {
							message: JSON.stringify(error),
						},
					},
					200
				);
			}
		}
	}
}
