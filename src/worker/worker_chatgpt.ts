import { ENV, initEnv } from './env';
import { SWAGGER_DOC } from './setting';
import { getCorsOptionsHeader } from './share/utils/utils';
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi';
import {
  ChatGptAction,
  ChatGptBillingUsageAction,
  ChatGptCommandsAction,
} from './controller/ChatGptController';

const router = OpenAPIRouter(SWAGGER_DOC);

router.all('*', async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', {
      headers: {
        ...getCorsOptionsHeader(ENV.Access_Control_Allow_Origin),
      },
    });
  }
});

router.post('/api/chatgpt/v1/chat/completions', ChatGptAction);
router.post('/api/chatgpt/usage', ChatGptBillingUsageAction);
router.post('/api/chatgpt/commands', ChatGptCommandsAction);

router.original.get('/', request => Response.redirect(`${request.url}docs`, 302));
router.all('*', () => new Response('Not Found.', { status: 404 }));

export type Environment = {};

export async function handleEvent({ request, env }: { request: Request; env: Environment }) {
  return await router.handle(request);
}
const worker = {
  async fetch(request, env) {
    initEnv(env);
    return await handleEvent({ request, env });
  },
};

export default worker;
