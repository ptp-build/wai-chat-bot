import { Environment } from './env';
import ProtoController from './controller/ProtoController';
import { WaiRouter } from './route';

const iRouter = new WaiRouter({
  title: 'Worker Wai Chat Storage',
  version: '1.0.1',
}).setRoute((router: any) => {
  router.post('/api/proto', ProtoController);
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
