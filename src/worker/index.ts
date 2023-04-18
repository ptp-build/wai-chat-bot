import { initEnv } from './env';
import { handleEvent } from './route';

export type Environment = {
	DO_WEBSOCKET: DurableObjectNamespace;
};

export { WebSocketDurableObject } from './durable-object';

const worker: ExportedHandler<Environment> = {
	async fetch(request, env) {
		initEnv(env);
		return await handleEvent({ request, env });
	},
};

export default worker;
