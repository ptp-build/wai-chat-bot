export default class CloudFlareKv {
  private db: any;
  static cache: Record<string, any> = {};
  init(db: any) {
    this.db = db;
  }
  async put(key: string, value: any) {
    console.debug('[kv put]', key,value);
    return this.db.put(key, value);
  }

  async get(key: string, force?: boolean) {
    console.debug('[kv get]', key);
    return await this.db.get(key);
  }

  async delete(key: string) {
    console.debug('[kv delete]', key);
    return this.db.delete(key);
  }

  async list(options: { prefix?: string }) {
    const rows = [];
    let cur = null;
    do {
      // @ts-ignore
      const { keys, cursor } = await this.db.list({
        prefix: options.prefix,
        cursor: cur,
      });
      rows.push(...keys);
      cur = cursor;
    } while (cur);

    return rows;
  }
}
