import CloudFlareKv from './share/db/CloudFlareKv';
import CloudFlareR2 from './share/storage/CloudFlareR2';

export type Environment = {
  DO_WEBSOCKET?: DurableObjectNamespace;
  IS_PROD: boolean;
  OPENAI_API_KEY: string;
  WECHAT_APPID: string;
  WECHAT_APPSECRET: string;
  WECHAT_NOTIFY_USER: string;
  WECHAT_NOTIFY_TEMPLATE_ID: string;
  KV_NAMESPACE_BINDING_KEY: string;
  R2_STORAGE_BINDING_KEY: string;
  SERVER_USER_ID_START: string;
  Access_Control_Allow_Origin: string;
  TOKENS: string[];
};

export const ENV: Environment = {
  DO_WEBSOCKET: undefined,
  IS_PROD: true,
  WECHAT_APPID: '',
  WECHAT_APPSECRET: '',
  WECHAT_NOTIFY_USER: '',
  WECHAT_NOTIFY_TEMPLATE_ID: '',
  OPENAI_API_KEY: '',
  KV_NAMESPACE_BINDING_KEY: 'DATABASE',
  R2_STORAGE_BINDING_KEY: 'STORAGE',
  SERVER_USER_ID_START: '623415',
  Access_Control_Allow_Origin: '*',
  TOKENS: [],
};

export let kv: CloudFlareKv;
export let storage: CloudFlareR2;

export function initEnv(env: Environment) {
  for (const key in ENV) {
    if (env[key] !== undefined) {
      // @ts-ignore
      ENV[key] = env[key];
    }
  }
  kv = new CloudFlareKv();
  kv.init(env[ENV.KV_NAMESPACE_BINDING_KEY]);
  storage = new CloudFlareR2();
  storage.init(env[ENV.R2_STORAGE_BINDING_KEY]);
}
