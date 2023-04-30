import { Environment } from './env';
import { WaiRouter } from './route';
import WaiOpenAPIRoute from './share/cls/WaiOpenAPIRoute';
export { WebSocketDurableObject } from './durable-object';

const iRouter = new WaiRouter({
  title: 'Worker Wai Chat Websocket',
  version: '1.0.1',
});

const worker: ExportedHandler<Environment> = {
  async fetch(request, env) {
    iRouter.setEnv(env);
    if (request.headers.get('upgrade') === 'websocket' && env.DO_WEBSOCKET) {
      const durableObjectId = env.DO_WEBSOCKET.idFromName('/ws');
      const durableObjectStub = env.DO_WEBSOCKET.get(durableObjectId);
      return durableObjectStub.fetch(request);
    } else {
      return WaiOpenAPIRoute.responseJson(iRouter.getInfo());
    }
  },
  async scheduled(event, env, ctx) {
    return await iRouter.setEnv(env).handleScheduled(event, ctx);
  },
};

export default worker;
