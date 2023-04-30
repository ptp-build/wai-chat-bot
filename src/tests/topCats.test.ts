import { currentTs } from '../worker/share/utils/utils';

const fs = require('fs');
const path = require('path');
const absolutePath = path.resolve(__dirname);

describe('topCats', () => {
  it('topCats build', async () => {
    const topCats = require('../assets/jsons/topCats-cn.json');
    // console.log(topCats);
    const time = currentTs();
    fs.writeFile(
      path.join(absolutePath, '../assets/jsons', 'topCats-cn1.json'),
      JSON.stringify(
        {
          time,
          cats: topCats.cats,
          bots: topCats.bots.map((bot: any) => {
            bot.time = time;
            bot.cat = '';
            return bot;
          }),
        },
        null,
        2
      ),
      (err: any) => {
        if (err) throw err;
        console.log('File created and data written to it!');
      }
    );
  });
});
