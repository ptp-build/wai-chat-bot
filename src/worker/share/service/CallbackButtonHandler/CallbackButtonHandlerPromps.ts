export default class CallbackButtonHandlerPromps {
  async process(data: string) {
    let text, inlineButtons;
    const t = data.split('/');
    console.log(t);

    switch (data) {
      case 'server/api/prompt':
        text = 'Prompt 大全';
        inlineButtons = JSON.stringify([
          [
            {
              type: 'callback',
              text: '写作',
              data: 'server/api/prompt',
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
