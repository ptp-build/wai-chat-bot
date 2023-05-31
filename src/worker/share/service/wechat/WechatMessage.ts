import { ENV, kv } from '../../../env';
import { currentTs } from '../../utils/utils';

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  expires_at?: number;
}

interface SendTemplateMsgRequest {
  touser: string;
  template_id: string;
  data: {
    [key: string]: {
      value: string;
      color?: string;
    };
  };
  url?: string;
  miniprogram?: {
    appid: string;
    pagepath: string;
  };
}

interface SendTemplateMsgResponse {
  errcode: number;
  errmsg: string;
  msgid: number;
}

const SEND_TEMPLATE_MSG_URL = 'https://api.weixin.qq.com/cgi-bin/message/template/send';

export class WechatMessage {
  getAccessTokenUrl(APPID: string, APPSECRET: string) {
    return `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`;
  }
  async fetchAccessToken() {
    const response = await fetch(this.getAccessTokenUrl(ENV.WECHAT_APPID, ENV.WECHAT_APPSECRET));
    const data: AccessTokenResponse = await response.json();
    data.expires_at = currentTs() + data.expires_in - 10;
    await kv.put('WECHAT_ACCESS_TOKEN', JSON.stringify(data));
    return data.access_token;
  }
  async getAccessToken(): Promise<string> {
    const str = await kv.get('WECHAT_ACCESS_TOKEN');
    if (str) {
      const obj = JSON.parse(str) as AccessTokenResponse;
      if (obj.expires_at < currentTs()) {
        return this.fetchAccessToken();
      } else {
        return obj.access_token;
      }
    } else {
      return this.fetchAccessToken();
    }
  }
  async sendTemplateMsg(
    accessToken: string,
    request: SendTemplateMsgRequest
  ): Promise<SendTemplateMsgResponse> {
    const response = await fetch(`${SEND_TEMPLATE_MSG_URL}?access_token=${accessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return await response.json();
  }

  async sendNotify(text: string) {
    const accessToken = await this.getAccessToken();
    const request: SendTemplateMsgRequest = {
      touser: ENV.WECHAT_NOTIFY_USER,
      template_id: ENV.WECHAT_NOTIFY_TEMPLATE_ID,
      data: {
        note: {
          value: text,
          color: '#173177',
        },
      },
      url: 'https://wai.chat',
    };
    return await this.sendTemplateMsg(accessToken, request);
  }
}
