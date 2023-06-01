import CallbackButtonHandlerPay from './CallbackButtonHandlerPay';
import CallbackButtonHandlerPrompts from './CallbackButtonHandlerPrompts';
import CallbackButtonHandlerBotPublic from './CallbackButtonHandlerBotPublic';
import {AuthSessionType, User} from '../User';
import {kv} from "../../../env";
import UserBalance from "../UserBalance";

export default class CallbackButtonHandler {
  private authSession: AuthSessionType;
  private chatId: string;
  constructor({ authSession, chatId }: { chatId: string; authSession: AuthSessionType }) {
    this.authSession = authSession;
    this.chatId = chatId;
  }
  async process(data: string) {
    let text, inlineButtons;
    if (data.startsWith('server/api/token')) {
      return new CallbackButtonHandlerPay(this).process(data);
    }

    if (data.startsWith('server/api/prompts')) {
      return new CallbackButtonHandlerPrompts(this).process(data);
    }

    if (data.startsWith('server/api/bot/public')) {
      return new CallbackButtonHandlerBotPublic(this).process(data);
    }
    return {
      text,
      inlineButtons,
    };
  }

  async enableBotIsPublic(enable: boolean) {
    const {chatId} = this;
    await User.enableBotIsPublic(chatId,enable)
  }

  async getBotIsPublic() {
    const {chatId} = this;
    return User.getBotIsPublic(chatId)
  }

  async exchangeConfirm() {
    const {authSession} = this;
    const {authUserId} = authSession
    const userBalance = new UserBalance(authUserId)
    const earn = await userBalance.getTotalEarn()
    if(earn > 0){
      await userBalance.addEarnTokens(-earn)
      await userBalance.addTokens(earn)
      return "✅ 兑换成功"
    }else{
      return "兑换失败"
    }
  }
}
