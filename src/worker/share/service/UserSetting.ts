import { kv } from '../../env';
const KEY = 'U_ST_K';

export default class UserSetting {
  private readonly userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async getValue(key: string) {
    const str = await kv.get(`${KEY}_${this.userId}_${key}`);
    return str || '';
  }

  async setValue(key: string, value: string) {
    await kv.put(`${KEY}_${this.userId}_${key}`, value);
  }
}
