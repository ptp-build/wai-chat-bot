import CallbackButtonHandler from './index';

export default class CallbackButtonHandlerBotPublic {
  private handler: CallbackButtonHandler;
  constructor(handler: CallbackButtonHandler) {
    this.handler = handler;
  }
  async process(data: string) {
    let text, inlineButtons;
    switch (data) {
      case 'server/api/bot/public/disable':
        await this.handler.enableBotIsPublic(false);
        text = '关闭成功';
        break;
      case 'server/api/bot/public/enable':
        await this.handler.enableBotIsPublic(true);
        text = '开启成功';
        break;
      case 'server/api/bot/public':
        const isPublic = await this.handler.getBotIsPublic();
        text = '公开机器人，分享好友，赚钱Token使用的 5%';
        inlineButtons = JSON.stringify([
          isPublic
            ? [
                {
                  type: 'callback',
                  text: '关闭',
                  data: 'server/api/bot/public/disable',
                },
              ]
            : [
                {
                  type: 'callback',
                  text: '开启',
                  data: 'server/api/bot/public/enable',
                },
              ],
        ]);
        break;
    }
    return {
      text,
      inlineButtons,
    };
  }
}
