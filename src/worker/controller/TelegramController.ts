import WaiOpenAPIRoute from '../share/cls/WaiOpenAPIRoute';
import { Str } from '@cloudflare/itty-router-openapi';
import {
  getTelegramChatAdminister,
  sendMessageToTelegram,
  sendTextMessageToTelegram,
  TelegramBot,
} from '../share/service/Telegram';

const BotSendMessageBody = {
  token: new Str({
    example: '',
    description: 'token',
  }),
  chatId: new Str({
    example: '',
    description: 'chatId',
  }),
  text: new Str({
    required: true,
    example: 'hi',
    description: 'setting',
  }),
};

export class TelegramBotSendMessageAction extends WaiOpenAPIRoute {
  static schema = {
    tags: ['Telegram'],
    requestBody: BotSendMessageBody,
    responses: {
      '200': {
        schema: {},
      },
    },
  };

  async handle(request: Request, data: Record<string, any>) {
    const { text, chatId, token } = data.body;

    const res = await sendTextMessageToTelegram(text, chatId, token);
    console.log(res);
    await this.notifyUrlButton(text, chatId, token);
    return WaiOpenAPIRoute.responseJson(res);
  }
  async notifyUrlButton(text: string, chatId: string, token: string) {
    await new TelegramBot(token).replyButtons(
      text,
      [
        [
          {
            text: 'Visit Website',
            url: 'https://www.example.com',
          },
        ],
      ],
      chatId
    );
  }
}
