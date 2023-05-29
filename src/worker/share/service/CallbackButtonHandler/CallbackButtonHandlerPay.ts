export default class CallbackButtonHandlerPay {
  async process(data: string) {
    let text, inlineButtons;
    const t = data.split('/');
    console.log(t);

    if (data.startsWith('server/api/buy/tokens')) {
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
      case 'server/api/buy/tokens':
        text = '选择支付方式';
        inlineButtons = JSON.stringify([
          [
            {
              type: 'callback',
              text: '谷歌支付 Google Pay (android app only 测试)',
              data: 'server/api/buy/tokens/google_pay',
            },
          ],
          [
            {
              type: 'callback',
              text: '苹果支付 Apple Pay (android app only 测试)',
              data: 'server/api/buy/tokens/apple_pay',
            },
          ],
          [
            {
              type: 'callback',
              text: '💎 数字货币 (USDT)',
              data: 'server/api/buy/tokens/crypto',
            },
          ],
          [
            {
              type: 'callback',
              text: '🌎💳 支付宝/微信/Paypal/Visa/Master',
              data: 'server/api/buy/tokens/global',
            },
          ],
        ]);
        break;
      case 'server/api/buy/tokens/global':
      case 'server/api/buy/tokens/crypto':
      case 'server/api/buy/tokens/apple_pay':
      case 'server/api/buy/tokens/google_pay':
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
      case 'server/api/free/plan':
        // text =
        //   '💌 You can invite friend and get 3000 free tokens!\n' +
        //   '\n' +
        //   'Just forward the message below to your friend:\n' +
        //   "- When your friend starts the bot, you'll get free tokens\n" +
        //   '- You can invite up to 3 friends (you used 0/3 invites)\n' +
        //   '- Your friend has to use the bot for the first time with your invite link' +
        //   '\n' +
        //   '\n' +
        //   'You are invited to ChatGPT (GPT-4) bot! Tap this link to start:\n' +
        //   '🚀 Start the bot';

        text = 'soon...';
        break;
    }
    return {
      text,
      inlineButtons,
    };
  }
}
