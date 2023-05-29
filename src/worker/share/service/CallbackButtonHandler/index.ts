import CallbackButtonHandlerPay from './CallbackButtonHandlerPay';

export default class CallbackButtonHandler {
  async process(data: string) {
    let text, inlineButtons;
    if (data.startsWith('server/api/buy/tokens')) {
      return new CallbackButtonHandlerPay().process(data);
    }

    return {
      text,
      inlineButtons,
    };
  }
}
