import { ENV } from './env';
import { SWAGGER_DOC } from './setting';
import { getCorsOptionsHeader } from './share/utils/utils';
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi';
import { Environment } from './index';
import {
  ChatGptAction,
  ChatGptBillingUsageAction,
  ChatGptCommandsAction,
} from './controller/ChatGptController';
import ProtoController from './controller/ProtoController';
import {
  AutoGptCreateTasksAction,
  AutoGptExecuteTaskAction,
  AutoGptStartGoalAction,
} from './controller/AutoGptController';
import { BotMasterAction, BotMasterCommandsAction } from './controller/BotMasterController';

export async function handleEvent({ request, env }: { request: Request; env: Environment }) {
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
    const auth = request.headers.get('Authorization');
  }
});

router.post('/api/chatgpt/v1/chat/completions', ChatGptAction);
router.post('/api/chatgpt/usage', ChatGptBillingUsageAction);
router.post('/api/chatgpt/commands', ChatGptCommandsAction);

router.post('/api/autoGpt/start', AutoGptStartGoalAction);
router.post('/api/autoGpt/execute', AutoGptExecuteTaskAction);
router.post('/api/autoGpt/createTasks', AutoGptCreateTasksAction);

router.post('/api/master/message', BotMasterAction);
router.post('/api/master/commands', BotMasterCommandsAction);

router.post('/api/proto', ProtoController);

router.original.get('/', request => Response.redirect(`${request.url}docs`, 302));
router.all('*', () => new Response('Not Found.', { status: 404 }));
