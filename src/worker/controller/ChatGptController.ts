import { Bool, Int, Query, Str } from '@cloudflare/itty-router-openapi';
import WaiOpenAPIRoute from '../share/cls/WaiOpenAPIRoute';
import {requestOpenAiStream, requestOpenAi, requestUsage, handleAskResult} from '../share/functions/openai';
import { ENV } from '../env';

const Message = {
  role: new Str({
    example: 'user',
    description: '角色: user | system | assistant',
  }),
  content: new Str({
    example: '我的第一个命令是 pwd',
    description: '问题',
  }),
};

const requestBody1 = {
  apiKey: new Str({
    example: '',
    description: 'openAi api_key',
  }),
};
const requestBody = {
  chatId: new Str({
    required: false,
    example: '10001',
    description: 'chatId',
  }),
  msgAskDate: new Int({
    required: false,
    example: 1,
    description: 'msgDateAsk',
  }),
  msgAskId: new Int({
    required: false,
    example: 1,
    description: 'msgIdAsk',
  }),
  msgId: new Int({
    required: false,
    example: 1,
    description: 'msgId',
  }),
  msgDate: new Int({
    required: false,
    example: 1,
    description: 'msgDate',
  }),
  apiKey: new Str({
    example: '',
    description: 'openAi api_key',
  }),
  systemPrompt: new Str({
    example:
      '我想让你充当 Linux 终端。我将输入命令，您将回复终端应显示的内容。我希望您只在一个唯一的代码块内回复终端输出，而不是其他任何内容。不要写解释。除非我指示您这样做，否则不要键入命令。当我需要用英语告诉你一些事情时，我会把文字放在中括号内[就像这样]',
    description: '系统 prompt',
  }),
  messages: [Message],
  stream: new Bool({
    example: false,
    description: '是否使用 stream',
  }),
  model: new Str({
    example: 'gpt-3.5-turbo',
    description: 'chatGpt model: gpt-3.5-turbo | gpt-4',
  }),
  temperature: new Int({
    example: 1,
    description: '随机性 (temperature): 值越大，回复越随机',
  }),

  max_tokens: new Int({
    example: 2000,
    description: '单次回复限制 (max_tokens): 单次交互所用的最大 Token 数, max_tokens < 4096',
  }),
  presence_penalty: new Int({
    example: 0,
    description:
      '话题新鲜度 (presence_penalty): 值越大，越有可能扩展到新话题,-2 < presence_penalty < 2',
  }),
};

function getApiKeyFromHttpBodyOrEnv(body: Record<string, any>) {
  let apiKey;
  if (!body.apiKey) {
    apiKey = ENV.OPENAI_API_KEY;
  } else {
    apiKey = body.apiKey;
  }
  delete body['apiKey'];
  return apiKey;
}

export class ChatGptBillingUsageAction extends WaiOpenAPIRoute {
  static schema = {
    tags: ['ChatGpt'],
    requestBody: requestBody1,
    parameters: {
      start_date: Query(Str, {
        description: 'start_date',
        example: '2023-04-01',
      }),
      end_date: Query(Str, {
        description: 'end_date',
        example: '2023-05-01',
      }),
    },
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
    const { start_date, end_date } = data;
    const { body } = data;
    // let apiKey = getApiKeyFromHttpBodyOrEnv(body);
    if (body.apiKey) {
      let apiKey = body.apiKey;
      try {
        const res = await requestUsage(apiKey, start_date, end_date);
        return WaiOpenAPIRoute.responseJson(res);
      } catch (error) {
        console.error(error);
        return WaiOpenAPIRoute.responseError('system error');
      }
    } else {
      let balance = await this.getUserBalance();
      let totalEarn = await this.getUserTotalEarn();
      let totalSpend = await this.getUserTotalSpend();
      return WaiOpenAPIRoute.responseJson({
        used: totalSpend,
        subscription: balance,
        text: `✅ 余额：${balance} Tokens ， (总消耗： ${totalSpend} Tokens)
        
🎉 赚取： ${totalEarn} Tokens
        \n\n获取更多:`,
        inlineButtons: [
          [
            {
              type: 'callback',
              text: '🥑 购买',
              data: 'server/api/token/buy/tokens',
            },
          ],
          [
            {
              type: 'callback',
              text: '💌 赚取',
              data: 'server/api/token/earn/plan',
            },
          ],
          [
            {
              type: 'callback',
              text: '🔁 兑换',
              data: 'server/api/token/exchange',
            },
          ],
        ],
      });
    }
  }
}

export class ChatGptAction extends WaiOpenAPIRoute {
  static schema = {
    tags: ['ChatGpt'],
    requestBody,
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
    const { body } = data;
    const apiKey = getApiKeyFromHttpBodyOrEnv(body);
    if(!body.apiKey){
      const balance = await this.getUserBalance()
      if(balance <= 0){
        return WaiOpenAPIRoute.responseData(
            `\n您的Token 余额不足 发送 /usage 获取更多Token!\n`
        );
      }
    }
    let systemPrompt = '';
    if (body['systemPrompt']) {
      systemPrompt = body['systemPrompt'];
    }
    const chatId = body['chatId']
    const msgId = body['msgId']
    const msgDate = body['msgDate']
    const msgAskId = body['msgAskId']
    const msgAskDate = body['msgAskDate']
    delete body['systemPrompt'];
    delete body['chatId'];
    delete body['msgId'];
    delete body['msgDate'];
    delete body['msgAskId'];
    delete body['msgAskDate'];

    body.messages.unshift({
      role: 'system',
      content: systemPrompt,
    });
    body.messages.forEach(message => {
      if (message.date) {
        delete message['date'];
      }
    });
    const {authUserId} = this.getAuthSession();

    try {
      if (body.stream) {
        const stream = await requestOpenAiStream(
            body,
            apiKey,
            chatId,
            msgId,
            msgDate,
            msgAskId,
            msgAskDate,
            authUserId,
        );
        return WaiOpenAPIRoute.responseData(stream);
      } else {
        const res = await requestOpenAi(
            'POST', 'v1/chat/completions',
            body, apiKey,
            chatId,
            msgId,
            msgDate,
            msgAskId,
            msgAskDate,
            authUserId,
            false
        );
        return WaiOpenAPIRoute.responseJson(res);
      }
    } catch (error) {
      const msg = "Invoke OpenAi Error,Try again later"
      console.error(msg,error);
      return WaiOpenAPIRoute.responseData(msg);
    }
  }
}

export class ChatGptCommandsAction extends WaiOpenAPIRoute {
  static schema = {
    tags: ['ChatGptBot'],
    responses: {
      '200': {
        schema: {},
      },
    },
  };
  async handle(request: Request, data: Record<string, any>) {
    return {
      commands: [],
    };
  }
}
