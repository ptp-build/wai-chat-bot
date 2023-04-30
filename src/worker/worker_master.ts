import { Environment } from './env';
import { WaiRouter } from './route';
import { BotMasterAction, BotMasterCommandsAction } from './controller/BotMasterController';

const iRouter = new WaiRouter({
  title: 'Worker Wai Chat Master',
  version: '1.0.1',
}).setRoute((router: any) => {
  router.post('/api/master/message', BotMasterAction);
  router.post('/api/master/commands', BotMasterCommandsAction);
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
