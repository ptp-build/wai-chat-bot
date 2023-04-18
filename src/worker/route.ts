import { ENV } from './env';
import { SWAGGER_DOC } from './setting';
import { getCorsOptionsHeader, ResponseJson } from './share/utils/utils';
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi';
import {
	BotBtcAction,
	BotBtcChatGptAction,
	BotBtcCommandsAction,
} from './controller/BotBtcController';

export async function handleEvent({ request }: { request: Request }) {
	return await router.handle(request);
}

const router = OpenAPIRouter(SWAGGER_DOC);

router.all('*', async (request: Request) => {
	const { WAI_WORKER_API_TOKEN, IS_PROD } = ENV;
	if (request.method === 'OPTIONS') {
		return new Response('', {
			headers: {
				...getCorsOptionsHeader(ENV.Access_Control_Allow_Origin),
			},
		});
	}

	if (IS_PROD && request.url.includes('/api/')) {
		if (
			!WAI_WORKER_API_TOKEN ||
			request.headers.get('Authorization') !== `Bearer ${WAI_WORKER_API_TOKEN}`
		) {
			return ResponseJson({
				err_msg: 'invalid token',
			});
		}
	}
});

router.post('/btc/message', BotBtcAction);
router.post('/btc/chatGpt', BotBtcChatGptAction);
router.get('/btc/commands', BotBtcCommandsAction);
router.original.get('/', request => Response.redirect(`${request.url}docs`, 302));
router.all('*', () => new Response('Not Found.', { status: 404 }));
