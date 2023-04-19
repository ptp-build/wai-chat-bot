import { createParser } from 'eventsource-parser';

const OPENAI_URL = 'api.openai.com';
const DEFAULT_PROTOCOL = 'https';
const PROTOCOL = DEFAULT_PROTOCOL;
const BASE_URL = OPENAI_URL;

export async function requestOpenAi(method: string, path: string, body?: string, apiKey?: string) {
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
