import { Pdu } from '../../../lib/ptp/protobuf/BaseMsg';
import {
	SendBotMsgReq,
	SendBotMsgRes,
	UpdateCmdReq,
	UpdateCmdRes,
} from '../../../lib/ptp/protobuf/PTPMsg';
import { ERR, PbMsg_Type } from '../../../lib/ptp/protobuf/PTPCommon/types';
import { currentTs, sleep } from '../utils/utils';
import { AuthLoginReq, AuthLoginRes } from '../../../lib/ptp/protobuf/PTPAuth';
import { AuthSessionType, getSessionInfoFromSign } from './User';
import { createParser } from 'eventsource-parser';
import { requestOpenAi } from '../functions/openai';
import { ENV } from '../../env';

let messageIds: number[] = [];
export const LOCAL_MESSAGE_MIN_ID = 5e9;

const TIMESTAMP_BASE = 1676e9; // 2023-02-10
const TIMESTAMP_PRECISION = 1e2; // 0.1s
const LOCAL_MESSAGES_LIMIT = 1e6; // 1M

let localMessageCounter = LOCAL_MESSAGE_MIN_ID;

export function getNextLocalMessageId() {
	const datePart = Math.round((Date.now() - TIMESTAMP_BASE) / TIMESTAMP_PRECISION);
	return LOCAL_MESSAGE_MIN_ID + datePart + ++localMessageCounter / LOCAL_MESSAGES_LIMIT;
}

export default class ChatMsg {
	private chatId: string;
	constructor(chatId: string) {
		this.chatId = chatId;
	}
	static buildTextMessage(text: string, msg: Partial<PbMsg_Type>): PbMsg_Type {
		return {
			id: 0,
			chatId: '',
			content: {
				...msg.content,
				text: {
					...msg.content?.text,
					text,
				},
			},
			date: currentTs(),
			isOutgoing: false,
			...msg,
		};
	}

	static async genMessageId(): Promise<number> {
		let msgId = getNextLocalMessageId();
		if (messageIds.length > 10) {
			messageIds = messageIds.slice(messageIds.length - 10);
		}
		if (messageIds.indexOf(msgId) > -1) {
			await sleep(100);
			return ChatMsg.genMessageId();
		} else {
			messageIds.push(msgId);
			return msgId;
		}
	}
	static async handleAuthLoginReq(pdu: Pdu, ws: WebSocket): Promise<AuthSessionType | undefined> {
		const { sign, clientInfo } = AuthLoginReq.parseMsg(pdu);
		console.log('[clientInfo]', clientInfo);
		const res = await getSessionInfoFromSign(sign);

		ChatMsg.sendPdu(
			new AuthLoginRes({
				err: res ? ERR.NO_ERROR : ERR.ERR_AUTH_LOGIN,
			}).pack(),
			ws,
			pdu.getSeqNum()
		);
		return res;
	}
	static async handleSendBotMsgReq(pdu: Pdu, ws: WebSocket) {
		let { text, chatId, msgId, chatGpt } = SendBotMsgReq.parseMsg(pdu);
		if (chatGpt) {
			let { messages, apiKey, modelConfig, systemPrompt } = JSON.parse(chatGpt);
			messages.unshift({
				role: 'system',
				content: systemPrompt,
			});
			messages.forEach(message => {
				if (message.date !== undefined) {
					delete message.date;
				}
			});
			const body = JSON.stringify({
				...modelConfig,
				messages,
				stream: true,
			});
			const encoder = new TextEncoder();
			const decoder = new TextDecoder();
			if (!apiKey) {
				apiKey = ENV.OPENAI_API_KEY;
			}
			const res = await requestOpenAi('POST', 'v1/chat/completions', body, apiKey);
			let reply = '';
			if (!msgId) {
				msgId = await ChatMsg.genMessageId();
			}
			new ReadableStream({
				async start(controller) {
					function onParse(event: any) {
						if (event.type === 'event') {
							const data = event.data;
							// https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
							if (data === '[DONE]') {
								console.error('[handleSendBotMsgReq]', data);
								controller.close();
								ChatMsg.sendPdu(
									new SendBotMsgRes({
										msgId,
										chatId,
										text: reply,
										streamEnd: true,
									}).pack(),
									ws,
									pdu.getSeqNum()
								);
								return;
							}
							try {
								const json = JSON.parse(data);
								const text = json.choices[0].delta.content;
								const queue = encoder.encode(text);
								if (text) {
									reply += text;
									console.log(reply);
									ChatMsg.sendPdu(
										new SendBotMsgRes({
											msgId,
											chatId,
											text: reply,
										}).pack(),
										ws,
										pdu.getSeqNum()
									);
								}
								controller.enqueue(queue);
							} catch (e) {
								console.error('[handleSendBotMsgReq] error', e);
								controller.error(e);
							}
						}
					}
					let parser;

					for await (const chunk of res.body as any) {
						const chunkDecode = decoder.decode(chunk);
						if (chunkDecode) {
							const chunkDecodeStr = Buffer.from(chunkDecode).toString();
							if (
								chunkDecodeStr.indexOf('{') === 0 &&
								chunkDecodeStr.indexOf('"error": {') > 0
							) {
								const chunkDecodeJson = JSON.parse(chunkDecodeStr);
								if (chunkDecodeJson.error) {
									console.error('[error]', chunkDecodeJson.error.message);
									ChatMsg.sendPdu(
										new SendBotMsgRes({
											chatId,
											msgId,
											text: chunkDecodeJson.error.message,
										}).pack(),
										ws,
										pdu.getSeqNum()
									);
									return;
								}
							}
						}

						if (!parser) {
							parser = createParser(onParse);
						}
						// console.log(Buffer.from(chunkDecode).toString());
						parser.feed(chunkDecode);
					}
				},
			});
		} else {
			ChatMsg.sendPdu(
				new SendBotMsgRes({
					chatId,
					text,
				}).pack(),
				ws,
				pdu.getSeqNum()
			);
		}
	}
	static async handleUpdateCmdReq(pdu: Pdu, ws: WebSocket) {
		const { chatId } = UpdateCmdReq.parseMsg(pdu);

		ChatMsg.sendPdu(
			new UpdateCmdRes({
				chatId,
				commands: [
					{
						command: 'test',
						description: 'test',
						botId: chatId,
					},
				],
			}).pack(),
			ws,
			pdu.getSeqNum()
		);
	}
	static sendPdu(pdu: Pdu, ws: WebSocket, seqNum?: number) {
		pdu.updateSeqNo(seqNum || 0);
		ws.send(pdu.getPbData());
	}
}
