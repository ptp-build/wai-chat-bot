import { ENV, initEnv } from './env';
import { SWAGGER_DOC } from './setting';
import { getCorsOptionsHeader } from './share/utils/utils';
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi';
import ProtoController from './controller/ProtoController';

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

router.post('/api/proto', ProtoController);

router.original.get('/', request => Response.redirect(`${request.url}docs`, 302));
router.all('*', () => new Response('Not Found.', { status: 404 }));

export type Environment = {};

export async function handleEvent({ request, env }: { request: Request; env: Environment }) {
  return await router.handle(request);
}
const worker: ExportedHandler<Environment> = {
  async fetch(request, env) {
    initEnv(env);
    return await handleEvent({ request, env });
  },
};

export default worker;
