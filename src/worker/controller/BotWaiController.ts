import { Str } from '@cloudflare/itty-router-openapi';
import WaiOpenAPIRoute from '../share/cls/WaiOpenAPIRoute';
import { kv } from '../env';
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
    example: '/setting',
    description: 'setting',
  }),
};

const Commands = [
  {
    command: 'start',
    description: '开始对话',
  },
  {
    command: 'setting',
    description: '设置面板',
  },
  {
    command: 'usage',
    description: '余额查询',
  },
];

export class BotWaiCommandsAction extends WaiOpenAPIRoute {
  static schema = {
    tags: ['Wai'],
    responses: {
      '200': {
        schema: {},
      },
    },
  };
  async handle(request: Request, data: Record<string, any>) {
    return WaiOpenAPIRoute.responseJson({
      commands: Commands,
      startTips: `您好，我是基于chatGpt的Ai小助手

您可以向我提问，我很乐意为您解答问题！

您也可以通过发送以下命令来控制我：

⚪ /setting 设置面板
⚪ /usage 余额查询
    `,
    });
  }
}

export class BotWaiAction extends WaiOpenAPIRoute {
  static schema = {
    tags: ['Wai'],
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
          case '/freePlan':
            return WaiOpenAPIRoute.responseData(
              '您好\n' +
                '请按以下步骤使用我们的免费计划:\n' +
                '1.关注推特 @WaiChatBot 并私信:"申请 apiKey",我们将发放一天使用期限apiKey给你\n' +
                '2.通过使用我们的聊天机器人，并分享到Twitter，同时@WaiChatBot,我们会为您的apiKey追加一天期限,' +
                '  每天分享每天追加，同一天分享只能算一次\n' +
                '\n' +
                '我们的机器人Twitter助理 会自动检查私信和@列表，自动发放和追加期限\n' +
                '\n'
            );
          case '/buyPro':
            return WaiOpenAPIRoute.responseData(
              '您好\n' +
                '付费会员筹备中...\n' +
                '您暂时可以通过免费计划/freePlan使用我们的服务\n' +
                '如果您觉得Wai好用，通过分享Twitter传播我们,我们十分感谢\n'
            );
        }
      }
    }
    return WaiOpenAPIRoute.responseData('');
  }
}
