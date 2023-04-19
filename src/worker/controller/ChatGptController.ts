import { Str, Bool, Query, Int } from '@cloudflare/itty-router-openapi';
import WaiOpenAPIRoute from '../share/cls/WaiOpenAPIRoute';
import { createStream, requestOpenAi } from '../share/functions/openai';
import { ENV } from '../env';

const Message = {
	role: new Str({
		example: 'user',
		description: '角色: user | system | assistant',
	}),
	content: new Str({
		example: '我的第一个命令是 pwd',
		description: '问题',
	}),
};

const requestBody1 = {
	apiKey: new Str({
		example: '',
		description: 'openAi api_key',
	}),
};
const requestBody = {
	apiKey: new Str({
		example: '',
		description: 'openAi api_key',
	}),
	systemPrompt: new Str({
		example:
			'我想让你充当 Linux 终端。我将输入命令，您将回复终端应显示的内容。我希望您只在一个唯一的代码块内回复终端输出，而不是其他任何内容。不要写解释。除非我指示您这样做，否则不要键入命令。当我需要用英语告诉你一些事情时，我会把文字放在中括号内[就像这样]',
		description: '系统 prompt',
	}),
	messages: [Message],
	stream: new Bool({
		example: false,
		description: '是否使用 stream',
	}),
	model: new Str({
		example: 'gpt-3.5-turbo',
		description: 'chatGpt model: gpt-3.5-turbo | gpt-4',
	}),
	temperature: new Int({
		example: 1,
		description: '随机性 (temperature): 值越大，回复越随机',
	}),

	max_tokens: new Int({
		example: 2000,
		description: '单次回复限制 (max_tokens): 单次交互所用的最大 Token 数, max_tokens < 4096',
	}),
	presence_penalty: new Int({
		example: 0,
		description:
			'话题新鲜度 (presence_penalty): 值越大，越有可能扩展到新话题,-2 < presence_penalty < 2',
	}),
};

const Commands = [
	{
		command: 'apiKey',
		description: '设置 OpenAi apiKey',
	},
	{
		command: 'aiModel',
		description: '模型设置',
	},
	{
		command: 'systemPrompt',
		description: '系统prompt',
	},
];

function getOpenAiApiKey(body: Record<string, any>) {
	let apiKey;
	if (!body.apiKey) {
		apiKey = ENV.OPENAI_API_KEY;
	} else {
		apiKey = body.apiKey;
	}
	delete body['apiKey'];
	return apiKey;
}

function checkTokenIsInvalid(request: Request) {
	if (ENV.IS_PROD) {
		const auth = request.headers.get('Authorization');
		if (!auth) {
			return WaiOpenAPIRoute.responseError('Authorization required', 400);
		}
		if (auth?.indexOf('Bearer ') !== 0) {
			return WaiOpenAPIRoute.responseError('Authorization invalid', 400);
		}
		// const token = auth.replace('Bearer ', '');
		// if (ENV.TOKENS.indexOf(token) === -1) {
		// 	return WaiOpenAPIRoute.responseError('token invalid', 401);
		// }
	}
	return false;
}

export class ChatGptBillingSubscriptionAction extends WaiOpenAPIRoute {
	static schema = {
		tags: ['ChatGpt'],
		requestBody: requestBody1,
		responses: {
			'200': {
				schema: {},
			},
		},
	};
	async handle(request: Request, data: Record<string, any>) {
		const { body } = data;
		const apiKey = getOpenAiApiKey(body);

		try {
			const res = await requestOpenAi(
				'GET',
				'dashboard/billing/subscription',
				undefined,
				apiKey
			);
			return WaiOpenAPIRoute.responseJson(await res.json());
		} catch (error) {
			console.error(error);
			return WaiOpenAPIRoute.responseError('fetch error');
		}
	}
}
export class ChatGptBillingUsageAction extends WaiOpenAPIRoute {
	static schema = {
		tags: ['ChatGpt'],
		requestBody: requestBody1,
		parameters: {
			start_date: Query(Str, {
				description: 'start_date',
				example: '2023-04-01',
			}),
			end_date: Query(Str, {
				description: 'end_date',
				example: '2023-05-01',
			}),
		},
		responses: {
			'200': {
				schema: {},
			},
		},
	};
	async handle(request: Request, data: Record<string, any>) {
		const { start_date, end_date } = data;
		const { body } = data;
		const apiKey = getOpenAiApiKey(body);

		try {
			const res = await requestOpenAi(
				'GET',
				'dashboard/billing/usage' + `?start_date=${start_date}&end_date=${end_date}`,
				undefined,
				apiKey
			);
			return WaiOpenAPIRoute.responseJson(await res.json());
		} catch (error) {
			console.error(error);
			return WaiOpenAPIRoute.responseError('system error');
		}
	}
}

export class ChatGptAction extends WaiOpenAPIRoute {
	static schema = {
		tags: ['ChatGpt'],
		requestBody,
		responses: {
			'200': {
				schema: {},
			},
		},
	};
	async handle(request: Request, data: Record<string, any>) {
		const { body } = data;
		const apiKey = getOpenAiApiKey(body);

		let systemPrompt = '';
		if (body['systemPrompt']) {
			systemPrompt = body['systemPrompt'];
		}
		delete body['systemPrompt'];

		body.messages.unshift({
			role: 'system',
			content: systemPrompt,
		});
		try {
			if (body.stream) {
				try {
					const stream = await createStream(JSON.stringify(body), apiKey);
					return new Response(stream);
				} catch (e) {
					const res = await requestOpenAi(
						'POST',
						'v1/chat/completions',
						JSON.stringify(body),
						apiKey
					);
					return WaiOpenAPIRoute.responseJson(await res.json());
				}
			} else {
				const res = await requestOpenAi(
					'POST',
					'v1/chat/completions',
					JSON.stringify(body),
					apiKey
				);
				return WaiOpenAPIRoute.responseJson(await res.json());
			}
		} catch (error) {
			console.error(error);
			return WaiOpenAPIRoute.responseError('system error');
		}
	}
}

export class ChatGptCommandsAction extends WaiOpenAPIRoute {
	static schema = {
		tags: ['ChatGptBot'],
		responses: {
			'200': {
				schema: {},
			},
		},
	};
	async handle(request: Request, data: Record<string, any>) {
		return {
			commands: Commands,
		};
	}
}
