import { Environment } from './env';
import { WaiRouter } from './route';
import {
  ChatGptAction,
  ChatGptBillingUsageAction,
  ChatGptCommandsAction,
} from './controller/ChatGptController';
import {
  AutoGptCreateTasksAction,
  AutoGptExecuteTaskAction,
  AutoGptStartGoalAction,
} from './controller/AutoGptController';
import { BotMasterAction, BotMasterCommandsAction } from './controller/BotMasterController';
import ProtoController from './controller/ProtoController';
export { WebSocketDurableObject } from './durable-object';

export type EnvironmentDo = {
  DO_WEBSOCKET: DurableObjectNamespace;
};

const iRouter = new WaiRouter({
  title: 'Worker Wai Chat',
  version: '1.0.1',
}).setRoute((router: any) => {
  router.post('/api/chatgpt/v1/chat/completions', ChatGptAction);
  router.post('/api/chatgpt/usage', ChatGptBillingUsageAction);
  router.post('/api/chatgpt/commands', ChatGptCommandsAction);

  router.post('/api/autoGpt/start', AutoGptStartGoalAction);
  router.post('/api/autoGpt/execute', AutoGptExecuteTaskAction);
  router.post('/api/autoGpt/createTasks', AutoGptCreateTasksAction);

  router.post('/api/master/message', BotMasterAction);
  router.post('/api/master/commands', BotMasterCommandsAction);

  router.post('/api/proto', ProtoController);
});

const worker: ExportedHandler<Environment & EnvironmentDo> = {
  async fetch(request, env) {
    iRouter.setEnv(env);
    if (request.headers.get('upgrade') === 'websocket') {
      const durableObjectId = env.DO_WEBSOCKET.idFromName('/ws');
      const durableObjectStub = env.DO_WEBSOCKET.get(durableObjectId);
      return durableObjectStub.fetch(request);
    } else {
      return iRouter.handleRequest(request);
    }
  },
  async scheduled(event, env, ctx) {
    return await iRouter.setEnv(env).handleScheduled(event, ctx);
  },
};

export default worker;
