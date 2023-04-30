import { Str } from '@cloudflare/itty-router-openapi';
import WaiOpenAPIRoute from '../share/cls/WaiOpenAPIRoute';
import { kv } from '../env';
import { currentTs, currentTs1000 } from '../share/utils/utils';
import { UserStoreData_Type } from '../../lib/ptp/protobuf/PTPCommon/types';
import { UserStoreData } from '../../lib/ptp/protobuf/PTPCommon';
import { Pdu } from '../../lib/ptp/protobuf/BaseMsg';

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
  {
    command: 'setTopCatsAdminUid',
    description: 'setTopCatsAdminUid',
  },
  {
    command: 'getAuth',
    description: 'getAuth',
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
    const res = await this.checkIfTokenIsInvalid(request);
    if (res) {
      return res;
    }
    const { authUserId } = this.getAuthSession();
    const userStoreDataStr = await kv.get(`W_U_S_D_${authUserId}`);
    let userStoreDataRes: UserStoreData_Type;
    if (userStoreDataStr) {
      const buf = Buffer.from(userStoreDataStr, 'hex');
      userStoreDataRes = UserStoreData.parseMsg(new Pdu(buf));
    }

    const str = await kv.get('topCats-cn.json');
    const topCats = JSON.parse(str);

    if (data.body) {
      const { text } = data.body;
      if (text) {
        switch (text) {
          case '/getAuth':
            if (userStoreDataRes.chatFolders) {
              userStoreDataRes.chatFolders = JSON.parse(userStoreDataRes.chatFolders);
            }
            return WaiOpenAPIRoute.responseJsonData({
              session: this.getAuthSession(),
              userStoreDataRes,
            });
          case '/getTopCats':
            return WaiOpenAPIRoute.responseJsonData({
              cats: topCats.cats,
              time: topCats.time,
              bots: topCats.bots.slice(0, 1),
            });
          case '/setTopCatsAdminUid':
            if (userStoreDataRes) {
              if (!userStoreDataRes.myBots) {
                userStoreDataRes.myBots = [];
              }
              topCats.bots.forEach(bot => {
                userStoreDataRes.myBots?.push(bot.userId);
                kv.put(`W_B_U_R_${bot.userId}`, this.getAuthSession().authUserId.toString());
              });
              userStoreDataRes.time = currentTs1000();
              await kv.put(
                `W_U_S_D_${authUserId}`,
                Buffer.from(new UserStoreData(userStoreDataRes).pack().getPbData()).toString('hex')
              );
            }
            return WaiOpenAPIRoute.responseJsonData(
              {
                userStoreDataRes,
              },
              'topCats-cn.json'
            );
          case '/setTopCats':
            const topCats1 = require('../../assets/jsons/topCats-cn.json');
            // await kv.put('topCats-cn.json', JSON.stringify(topCats1));
            return WaiOpenAPIRoute.responseJsonData(
              {
                cats: topCats1.cats,
                time: topCats1.time,
              },
              'topCats-cn.json'
            );
        }
      }
    }
    return WaiOpenAPIRoute.responseData('');
  }
}
