import {ENV, Environment, initEnv, kv} from './env';
import {SWAGGER_DOC} from './setting';
import {currentTs1000, getCorsOptionsHeader} from './share/utils/utils';
import {OpenAPIRouter, OpenAPIRouterSchema} from '@cloudflare/itty-router-openapi';

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
    const url = request.url;
    const urlObj = new URL(url);
    if ((urlObj.pathname.startsWith('/m/android') || urlObj.pathname.startsWith('/m/ios'))
        && urlObj.searchParams.get('v')) {
      const v = urlObj.searchParams.get('v');
      const theme = urlObj.searchParams.get('theme') || "light";
      const platform = urlObj.pathname.startsWith('/m/android') ? "android":"ios"
      return await this.handleMobilePage(platform, v,theme);
    }

    return this.router.handle(request);
  }

  async handleMobilePage(platform: 'android' | 'ios', version: string,theme:string = "light") {
    const page = await kv.get(`mobile_index_${version}.html`);
    const option = {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    };
    if (page) {
      return new Response(
        `<script>
                    window.__PLATFORM='${platform}';
                    window.__THEME='${theme}';
                    window.__FRONT_VERSION='${version}';
                </script>${page}`,
        option
      );
    } else {
      const t = currentTs1000();
      const res = await fetch(`https://wai.chat/version.txt?${t}`);
      const v = (await res.text()).trim();

      const home_res = await fetch(`https://wai.chat/?${t}`);
      const html = await home_res.text();
      if(v === version){
        await kv.put(`mobile_index_${v.trim()}.html`, html);
        return new Response(
            `<script>
                    window.__PLATFORM='${platform}';
                    window.__THEME='${theme}';
                    window.__FRONT_VERSION='${v.trim()}';
                </script>${html}`,
            option
        );
      }else{
        return new Response(
            `Not Found ${platform},version: ${version}`,
            {
              status: 404,
            }
        );
      }
    }
  }

  async handleScheduled(event: ScheduledController, ctx: ExecutionContext) {}
}
