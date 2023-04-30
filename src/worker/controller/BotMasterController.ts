import { Str } from '@cloudflare/itty-router-openapi';
import WaiOpenAPIRoute from '../share/cls/WaiOpenAPIRoute';
import { kv } from '../env';
import { currentTs } from '../share/utils/utils';

const Body = {
  chatId: new Str({
    example: '1001',
    description: 'chat id',
  }),
  text: new Str({
    required: true,
    example: '/getBtcPrice',
    description: 'msg text',
  }),
};

const Commands = [
  {
    command: 'getTopCats',
    description: 'getTopCats',
  },
  {
    command: 'setTopCats',
    description: 'setTopCats',
  },
];

export class BotMasterCommandsAction extends WaiOpenAPIRoute {
  static schema = {
    tags: ['Master'],
    responses: {
      '200': {
        schema: {},
      },
    },
  };
  async handle(request: Request, data: Record<string, any>) {
    return WaiOpenAPIRoute.responseJson({
      commands: Commands,
    });
  }
}

export class BotMasterAction extends WaiOpenAPIRoute {
  static schema = {
    tags: ['Master'],
    requestBody: Body,
    responses: {
      '200': {
        schema: {},
      },
    },
  };

  async handle(request: Request, data: Record<string, any>) {
    if (data.body) {
      const { text } = data.body;
      if (text) {
        if (text === '/getTopCats') {
          const str = await kv.get('topCats-cn.json');
          const topCats = JSON.parse(str);
          return WaiOpenAPIRoute.responseData(
            '```\n' +
              JSON.stringify(
                {
                  cats: topCats.cats,
                  time: topCats.time,
                  bots: topCats.bots.slice(0, 2),
                },
                null,
                2
              ) +
              '```',
            200
          );
        }
        if (text === '/setTopCats') {
          const topCats = require('../../assets/jsons/topCats-cn.json');
          topCats.time = currentTs();
          topCats.bots.forEach(bot => {
            bot.time = topCats.time;
          });
          await kv.put('topCats-cn.json', JSON.stringify(topCats));
          return WaiOpenAPIRoute.responseData(
            '```\n' +
              JSON.stringify(
                {
                  cats: topCats.cats,
                  time: topCats.time,
                },
                null,
                2
              ) +
              '```',
            200
          );
        }
      }
    }
    return WaiOpenAPIRoute.responseJson(
      {
        text: '',
      },
      200
    );
  }
}
