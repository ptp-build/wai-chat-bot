import { Environment } from './env';
import { WaiRouter } from './route';
import {
  ChatGptAction,
  ChatGptBillingUsageAction,
  ChatGptCommandsAction,
} from './controller/ChatGptController';

const iRouter = new WaiRouter({
  title: 'Worker Wai Chat ChatGpt',
  version: '1.0.1',
}).setRoute((router: any) => {
  router.post('/api/chatgpt/v1/chat/completions', ChatGptAction);
  router.post('/api/chatgpt/usage', ChatGptBillingUsageAction);
  router.post('/api/chatgpt/commands', ChatGptCommandsAction);
});

const worker: ExportedHandler<Environment> = {
  async fetch(request, env) {
    return await iRouter.setEnv(env).handleRequest(request);
  },
  async scheduled(event, env, ctx) {
    return await iRouter.setEnv(env).handleScheduled(event, ctx);
  },
};

export default worker;
