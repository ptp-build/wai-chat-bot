import { initEnv, kv } from './env';
import { translate } from './share/functions/openai';

export type Environment = {
  DO_WEBSOCKET: DurableObjectNamespace;
};

export { WebSocketDurableObject } from './durable-object';

const doSomeTaskOnASchedule = async () => {
  console.log('doSomeTaskOnASchedule');
};
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
  async scheduled(event, env, ctx) {
    initEnv(env);
    const str = await kv.get('topCats-cn.json');
    const topCats = JSON.parse(str);
    const str1 = await kv.get('topCats-cn2.json');
    // console.log('topCats-cn.json', str);
    // console.log('topCats-cn2.json', str1);
    let topCats1;
    if (!str1) {
      topCats1 = {
        bots: [],
        currentBotIndex2: 0,
      };
    } else {
      topCats1 = JSON.parse(str1);
    }

    // const t = await translate(
    //   `将：${JSON.stringify(topCats.cats)} 这个json的 title 的值部分翻译成中文.返回json`
    // );
    // console.log(t);
    // topCats1.cats = JSON.parse(t);
    // if (!topCats1.currentBotIndex2) {
    //   topCats1.currentBotIndex2 = 0;
    // }
    // if (topCats1.currentBotIndex2 < topCats.bots.length) {
    //   const currentBotIndex2 = topCats1.currentBotIndex2;
    //   const bot = topCats.bots[currentBotIndex2];
    //   const t = await translate(
    //     `将：${JSON.stringify(
    //       bot
    //     )} 这个json的 cat/firstName/bio/template/welcome/init_system_content 的值部分翻译成中文.返回json:{cat:"xxxx",firstName:"xxx",bio:"xxx",template:"xxx",welcome:"xxx",init_system_content:"xxx"},xxx为翻译的内容`
    //   );
    //   topCats1.currentBotIndex2 = currentBotIndex2 + 1;
    //   console.log(currentBotIndex2, JSON.stringify(bot), t);
    //   topCats1.bots[currentBotIndex2] = {
    //     ...bot,
    //     ...JSON.parse(t),
    //     time: currentTs(),
    //   };
    // }
    // await kv.put('topCats-cn2.json', JSON.stringify(topCats1));
  },
};

export default worker;
