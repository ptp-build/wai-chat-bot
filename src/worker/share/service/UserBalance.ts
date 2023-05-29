import { kv } from '../../env';
const BALANCE_TOKENS_KEY = 'U_B_T_K';
const TOTAL_SPEND_TOKENS_KEY = 'U_S_T_K';

export default class UserBalance {
  private readonly accountAddress: string;

  constructor(accountAddress: string) {
    this.accountAddress = accountAddress;
  }

  async firstLogin() {
    await this.addTokens(1000);
  }

  async addTokens(amount: number) {
    const balance = await this.getBalance();
    const newBalance = balance + amount;
    await kv.put(`${BALANCE_TOKENS_KEY}_${this.accountAddress}`, newBalance.toString());
  }

  async deductTokens(amount: number) {
    const totalSpend = await this.getTotalSpend();
    const balance = await this.getBalance();
    const newBalance = balance - amount;
    const newTotalSpend = totalSpend + amount;
    await kv.put(`${BALANCE_TOKENS_KEY}_${this.accountAddress}`, newBalance.toString());
    await kv.put(`${TOTAL_SPEND_TOKENS_KEY}_${this.accountAddress}`, newTotalSpend.toString());
    if (balance < amount) {
      throw new Error('Insufficient Tokens');
    }
  }
  async getBalance() {
    const str = await kv.get(`${BALANCE_TOKENS_KEY}_${this.accountAddress}`);
    return Number(str || '0');
  }

  async getTotalSpend() {
    const str = await kv.get(`${TOTAL_SPEND_TOKENS_KEY}_${this.accountAddress}`);
    return Number(str || '0');
  }
}
