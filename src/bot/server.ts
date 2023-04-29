import { Pdu } from '../lib/ptp/protobuf/BaseMsg';
import { ActionCommands, getActionCommandsName } from '../lib/ptp/protobuf/ActionCommands';
import ChatMsg from '../worker/share/service/ChatMsg';

import * as WebSocket from 'ws';
import { AuthLoginRes } from '../lib/ptp/protobuf/PTPAuth';
import { ERR } from '../lib/ptp/protobuf/PTPCommon/types';

import { By, Key } from 'selenium-webdriver';
import { SendBotMsgReq, SendBotMsgRes } from '../lib/ptp/protobuf/PTPMsg';

const server = new WebSocket.Server({ port: 8080 });

const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
let driver: any;

async function captureScreenshot(text: string) {
  // 创建 Chrome 配置进行浏览器设置，例如禁用弹窗阻止器

  if (!driver) {
    const chromeOptions = new chrome.Options();
    chromeOptions.excludeSwitches(['enable-automation']);
    chromeOptions.addArguments('--disable-popup-blocking');

    // 创建 WebDriver 对象：
    driver = new webdriver.Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();

    await driver.get('http://www.google.com'); // 打开谷歌搜索页面
    await driver.findElement(By.name('q')).sendKeys(text, Key.RETURN);
  } else {
    await driver.findElement(By.name('q')).sendKeys(text, Key.RETURN);
  }
}

server.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  ChatMsg.ws_ = ws;
  ws.on('message', async (message: any) => {
    try {
      const pdu = new Pdu(Buffer.from(message));
      console.log('[onMessage]', getActionCommandsName(pdu.getCommandId()));
      switch (pdu.getCommandId()) {
        case ActionCommands.CID_AuthLoginReq:
          ChatMsg.sendPdu(
            new AuthLoginRes({
              err: ERR.NO_ERROR,
            }).pack(),
            undefined,
            pdu.getSeqNum()
          );
          // const authSession = await ChatMsg.handleAuthLoginReq(pdu);
          // if (authSession) {

          // const account = this.accounts.get(accountId);
          // this.accounts.set(accountId, {
          // 	websocket: webSocket,
          // 	id: account?.id!,
          // 	city: account?.city,
          // 	country: account?.country,
          // 	authSession,
          // });
          // let accountIds: string[] = [];
          // if (
          // 	this.authUserAddressAccountMap &&
          // 	this.authUserAddressAccountMap.has(authSession.address)
          // ) {
          // 	accountIds = this.authUserAddressAccountMap.get(authSession.address)!;
          // }
          // accountIds.push(accountId);
          // this.authUserAddressAccountMap.set(authSession.address, accountIds);
          // console.log('CID_AuthLoginReq', authSession);
          // console.log('accounts', this.accounts);
          // }
          break;
        case ActionCommands.CID_UpdateCmdReq:
          await ChatMsg.handleUpdateCmdReq(pdu);
          break;
        case ActionCommands.CID_SendBotMsgReq:
          let { text, chatId, msgId, chatGpt } = SendBotMsgReq.parseMsg(pdu);
          if (chatGpt) {
            await ChatMsg.handleSendBotMsgReq(pdu);
          } else {
            try {
              await captureScreenshot(text!);
              ChatMsg.sendPdu(
                new SendBotMsgRes({
                  msgId,
                  chatId,
                  reply: 'captureScreenshot',
                }).pack(),
                undefined,
                0
              );
            } catch (e) {
              console.error(e);
            } finally {
            }
          }

          break;
      }
    } catch (err) {
      // Report any exceptions directly back to the client. As with our handleErrors() this
      // probably isn't what you'd want to do in production, but it's convenient when testing.
      // webSocket.send(JSON.stringify({ error: err.stack }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
