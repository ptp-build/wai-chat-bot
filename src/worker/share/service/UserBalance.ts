import { kv } from '../../env';
const BALANCE_TOKENS_KEY = 'U_B_T_K';
const TOTAL_SPEND_TOKENS_KEY = 'U_S_T_K';
const TOTAL_EARN_TOKENS_KEY = 'U_E_T_K';

export default class UserBalance {
  private readonly authUserId: string;

  constructor(authUserId: string) {
    this.authUserId = authUserId;
  }

  async firstLogin() {
    console.log('[firstLogin]', this.authUserId);
    await this.addTokens(1000);
  }

  async addTokens(amount: number) {
    const balance = await this.getBalance();
    const newBalance = balance + amount;
    console.log('[addTokens]', this.authUserId, { amount, newBalance });
    await kv.put(`${BALANCE_TOKENS_KEY}_${this.authUserId}`, newBalance.toString());
  }

  async addEarnTokens(amount: number) {
    const balance = await this.getTotalEarn();
    const newBalance = balance + amount;
    console.log('[addEarnTokens]', this.authUserId, { amount, newBalance });
    await kv.put(`${TOTAL_EARN_TOKENS_KEY}_${this.authUserId}`, newBalance.toString());
  }

  async deductTokens(amount: number) {
    const totalSpend = await this.getTotalSpend();
    const balance = await this.getBalance();
    const newBalance = balance - amount;
    const newTotalSpend = totalSpend + amount;
    await kv.put(`${BALANCE_TOKENS_KEY}_${this.authUserId}`, newBalance.toString());
    await kv.put(`${TOTAL_SPEND_TOKENS_KEY}_${this.authUserId}`, newTotalSpend.toString());
  }
  async getBalance() {
    const str = await kv.get(`${BALANCE_TOKENS_KEY}_${this.authUserId}`);
    return Number(str || '0');
  }

  async getTotalSpend() {
    const str = await kv.get(`${TOTAL_SPEND_TOKENS_KEY}_${this.authUserId}`);
    return Number(str || '0');
  }

  async getTotalEarn() {
    const str = await kv.get(`${TOTAL_EARN_TOKENS_KEY}_${this.authUserId}`);
    return Number(str || '0');
  }
}
