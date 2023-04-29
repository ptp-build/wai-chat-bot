import { initEnv } from './env';

export type Environment = {
  DO_WEBSOCKET: DurableObjectNamespace;
};

export { WebSocketDurableObject } from './durable-object';

const worker: ExportedHandler<Environment> = {
  async fetch(request, env) {
    initEnv(env);
    if (request.headers.get('upgrade') === 'websocket') {
      //@ts-ignore
      const durableObjectId = env.DO_WEBSOCKET.idFromName('/ws');
      //@ts-ignore
      const durableObjectStub = env.DO_WEBSOCKET.get(durableObjectId);
      return durableObjectStub.fetch(request);
    } else {
      return new Response('');
    }
  },
};

export default worker;
