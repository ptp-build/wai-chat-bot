export class TelegramBot {
  private token: string;
  private chat_id?: string;
  private text?: string;
  private reply_markup?: string;
  constructor(token: string) {
    this.token = token;
  }

  async replyText(text: string, chat_id: string) {
    return sendMessageToTelegram({ text, chat_id }, this.token);
  }

  async replyButtons(text: string, buttons: any[], chat_id: string) {
    return sendMessageToTelegram(
      {
        text,
        reply_markup: {
          inline_keyboard: buttons,
        },
        chat_id,
      },
      this.token
    );
  }
}

// 发送消息到Telegram
export async function sendTextMessageToTelegram(text: string, chat_id: string, token: string) {
  return sendMessageToTelegram(
    {
      text,
      chat_id,
    },
    token
  );
}

// 发送消息到Telegram
export async function sendMessageToTelegram(body: Record<string, any>, token: string) {
  return await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

// 发送聊天动作到TG
export async function sendChatActionToTelegram(action, token, chat_id: string) {
  return await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id,
      action: action,
    }),
  }).then(res => res.json());
}

export async function bindTelegramWebHook(token, url) {
  return await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url,
    }),
  }).then(res => res.json());
}

// 获取群组管理员信息
export async function getTelegramChatAdminister(chatId: string, token: string) {
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/getChatAdministrators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chat_id: chatId }),
    }).then(res => res.json());
    if (resp.ok) {
      return resp.result;
    }
  } catch (e) {
    console.error(e);
    return null;
  }
}
