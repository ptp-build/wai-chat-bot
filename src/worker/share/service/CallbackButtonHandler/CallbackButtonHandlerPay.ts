import CallbackButtonHandler from './index';

export default class CallbackButtonHandlerPay {
  private handler: CallbackButtonHandler;
  constructor(handler: CallbackButtonHandler) {
    this.handler = handler;
  }
  async process(data: string) {
    let text, inlineButtons;
    const t = data.split('/');
    console.log(t);

    if (data.startsWith('server/api/token/buy/tokens')) {
      if (t.length === 6) {
        const orderId = t[t.length - 1];
        const payType = t[t.length - 2];
        console.log(payType, orderId);
        switch (payType) {
          case 'global':
            text = `🟣 500,000 ChatGPT Tokens

点击下面按钮并支付
$5.99
如果您有问题请联系: @pay_support_bot .
`;
            inlineButtons = JSON.stringify([
              [
                {
                  type: 'url',
                  text: '去支付',
                  url: 'https://open-gptapp.lemonsqueezy.com/checkout?cart=0cf9ebff-c170-4c20-b08b-e12942791a75',
                },
              ],
            ]);

            break;
          case 'google_pay':
          case 'apple_pay':
            text = `🟣 500,000 ChatGPT Tokens

点击下面按钮并支付
$5.99`;

            inlineButtons = JSON.stringify([
              [
                {
                  type: 'callback',
                  text: `${payType === 'google_pay' ? '谷歌 Pay 支付' : 'Apple Pay 支付'}`,
                  data: `build/in/pay/${payType === 'google_pay' ? 'google_pay' : 'apple_pay'}`,
                },
              ],
            ]);
            break;
          case 'crypto':
            text = `🟣 500,000 ChatGPT Tokens

点击下面按钮并支付
$5.99

请在 1 小时内完成支付操作. 如果您有问题请联系: @pay_support_bot .`;

            inlineButtons = JSON.stringify([
              [
                {
                  type: 'url',
                  text: '去支付',
                  url: 'https://pay.cryptomus.com/pay/b87b3a37-e383-4f62-ae88-41008aa0d63d',
                },
              ],
            ]);
            break;
        }
      }
    }
    switch (data) {
      case 'server/api/token/buy/tokens':
        text = '选择支付方式';
        inlineButtons = JSON.stringify([
          [
            {
              type: 'callback',
              text: '谷歌支付 Google Pay (android app only 测试)',
              data: 'server/api/token/buy/tokens/google_pay',
            },
          ],
          [
            {
              type: 'callback',
              text: '苹果支付 Apple Pay (android app only 测试)',
              data: 'server/api/token/buy/tokens/apple_pay',
            },
          ],
          [
            {
              type: 'callback',
              text: '💎 数字货币 (USDT)',
              data: 'server/api/token/buy/tokens/crypto',
            },
          ],
          [
            {
              type: 'callback',
              text: '🌎💳 支付宝/微信/Paypal/Visa/Master',
              data: 'server/api/token/buy/tokens/global',
            },
          ],
        ]);
        break;
      case 'server/api/token/buy/tokens/global':
      case 'server/api/token/buy/tokens/crypto':
      case 'server/api/token/buy/tokens/apple_pay':
      case 'server/api/token/buy/tokens/google_pay':
        text = '选择购买数量?';
        inlineButtons = JSON.stringify([
          [
            {
              type: 'callback',
              text: '🟣 +500K Tokens – 5.99$ (-40%)',
              data: data + '/10001',
            },
          ],
          // [
          //   {
          //     type: 'callback',
          //     text: '🟣 +1500K Tokens – 15.99$ (-40%)',
          //     data: data + '/10002',
          //   },
          // ],
          // [
          //   {
          //     type: 'callback',
          //     text: '🟣 +2500K Tokens – 25.99$ (-40%)',
          //     data: data + '/10003',
          //   },
          // ],
        ]);
        break;
      case 'server/api/token/earn/plan':
        text =
          '💌 创建机器人，设为公开，分享机器人，赚取Token\n' +
          '\n' +
          '- 创建机器人AI机器人\n' +
          '- 发动 /ai > 设置公开机器人(赚佣金)\n' +
          '- 分享机器人到社交媒体\n' +
          '- 赚取好友5%的Token使用\n' +
          '- 兑换赚取的Token\n' +
          '\n';
        break;
      case 'server/api/token/exchange':
        text = '🔁 兑换将赚取的Token转化成您的可使用Token\n' + '\n点击确认兑换' + '\n';
        inlineButtons = JSON.stringify([
          [
            {
              type: 'callback',
              text: '✅ 确认',
              data: 'server/api/token/exchange/confirm',
            },
          ],
        ]);
        break;
      case 'server/api/token/exchange/confirm':
        text = await this.handler.exchangeConfirm()
        break;
    }
    return {
      text,
      inlineButtons,
    };
  }
}
