import { ENV, Environment, initEnv } from './env';
import { SWAGGER_DOC } from './setting';
import { getCorsOptionsHeader } from './share/utils/utils';
import { OpenAPIRouter, OpenAPIRouterSchema } from '@cloudflare/itty-router-openapi';

export class WaiRouter {
  private version?: string;
  private title: string;
  private router: any;
  constructor(info: { title: string; version?: string }) {
    this.title = info.title;
    this.version = info.version;
  }
  getInfo() {
    return {
      title: this.title,
      version: this.version || '1.0.1',
    };
  }
  setRoute(iRoute: (router: OpenAPIRouterSchema) => void) {
    const router = OpenAPIRouter({
      ...SWAGGER_DOC,
      schema: {
        ...SWAGGER_DOC.schema,
        info: {
          ...this.getInfo(),
        },
      },
    });
    this.router = router;
    router.all('*', async (request: Request) => {
      if (request.method === 'OPTIONS') {
        return new Response('', {
          headers: {
            ...getCorsOptionsHeader(ENV.Access_Control_Allow_Origin),
          },
        });
      }
    });
    iRoute(router);
    router.original.get('/', request => Response.redirect(`${request.url}docs`, 302));
    router.all('*', () => new Response('Not Found.', { status: 404 }));
    return this;
  }
  setEnv(env: Environment) {
    initEnv(env);
    return this;
  }
  async handleRequest(request: Request) {
    return this.router.handle(request);
  }

  async handleScheduled(event: ScheduledController, ctx: ExecutionContext) {}
}
