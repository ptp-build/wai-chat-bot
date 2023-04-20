import { createParser } from 'eventsource-parser';

const OPENAI_URL = 'api.openai.com';
const DEFAULT_PROTOCOL = 'https';
const PROTOCOL = DEFAULT_PROTOCOL;
const BASE_URL = OPENAI_URL;

export async function requestOpenAi(method: string, path: string, body?: string, apiKey?: string) {
	console.log('[requestOpenAi]', body);
	if (apiKey) {
		console.log('[requestOpenAi] apiKey', apiKey.substring(apiKey.length - 4));
	} else {
		console.warn('[requestOpenAi] apiKey is null');
	}
	return fetch(`${PROTOCOL}://${BASE_URL}/${path}`, {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Authorization': `Bearer ${apiKey}`,
		},
		method,
		body,
	});
}

export async function createStream(body: string, apiKey: string) {
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const res = await requestOpenAi('POST', 'v1/chat/completions', body, apiKey);
	return new ReadableStream({
		async start(controller) {
			function onParse(event: any) {
				if (event.type === 'event') {
					const data = event.data;
					// https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
					if (data === '[DONE]') {
						controller.close();
						return;
					}
					try {
						const json = JSON.parse(data);
						const text = json.choices[0].delta.content;
						const queue = encoder.encode(text);
						controller.enqueue(queue);
					} catch (e) {
						controller.error(e);
					}
				}
			}

			const parser = createParser(onParse);
			for await (const chunk of res.body as any) {
				parser.feed(decoder.decode(chunk));
			}
		},
	});
}

export async function requestUsage(apiKey: string, start_date: string, end_date) {
	const [used, subs] = await Promise.all([
		requestOpenAi(
			'GET',
			`dashboard/billing/usage?start_date=${start_date}&end_date=${end_date}`,
			undefined,
			apiKey
		),
		requestOpenAi('GET', `dashboard/billing/subscription`, undefined, apiKey),
	]);

	const response = (await used.json()) as {
		total_usage?: number;
		error?: {
			type: string;
			message: string;
		};
	};

	const total = (await subs.json()) as {
		hard_limit_usd?: number;
	};

	if (response.error && response.error.type) {
		console.error(response.error);
		throw new Error(response.error.type);
	}

	if (response.total_usage) {
		response.total_usage = Math.round(response.total_usage) / 100;
	}

	if (total.hard_limit_usd) {
		total.hard_limit_usd = Math.round(total.hard_limit_usd * 100) / 100;
	}
	console.log('total', total);
	return {
		used: response.total_usage,
		subscription: total.hard_limit_usd,
		text: `本月已用: ${response.total_usage} / 总: ${total.hard_limit_usd} USD`,
	};
}
