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
	static async handleAuthLoginReq(pdu: Pdu, ws: WebSocket): Promise<AuthSessionType> {
		const { sign } = AuthLoginReq.parseMsg(pdu);
		const res = getSessionInfoFromSign(sign);

		ChatMsg.sendPdu(
			new AuthLoginRes({
				err: ERR.NO_ERROR,
			}).pack(),
			ws,
			pdu.getSeqNum()
		);
		return res;
	}
	static async handleSendBotMsgReq(pdu: Pdu, ws: WebSocket) {
		const { text, chatId, chatGpt } = SendBotMsgReq.parseMsg(pdu);
		if (chatGpt) {
			const { messages, apiKey, modelConfig, systemPrompt } = JSON.parse(chatGpt);

			messages.unshift({
				role: 'system',
				content: systemPrompt,
			});
			messages.forEach(message => {
				if (message.date !== undefined) {
					delete message.date;
				}
			});

			const encoder = new TextEncoder();
			const decoder = new TextDecoder();
			const res = await requestOpenAi(
				'POST',
				'v1/chat/completions',
				JSON.stringify({
					...modelConfig,
					messages,
					stream: true,
				}),
				apiKey
			);
			let reply = '';
			new ReadableStream({
				async start(controller) {
					function onParse(event: any) {
						if (event.type === 'event') {
							const data = event.data;
							// https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
							if (data === '[DONE]') {
								controller.close();
								return;
							}
							try {
								const json = JSON.parse(data);
								const text = json.choices[0].delta.content;
								const queue = encoder.encode(text);
								if (text) {
									reply += text;
									console.log(reply);
								}
								controller.enqueue(queue);
							} catch (e) {
								controller.error(e);
							}
						}
					}

					const parser = createParser(onParse);
					for await (const chunk of res.body as any) {
						const t = decoder.decode(chunk);
						// console.log(Buffer.from(t).toString());
						parser.feed(t);
					}
				},
			});
			//
			// ChatMsg.sendPdu(
			// 	new SendBotMsgRes({
			// 		chatId,
			// 		text: chatGpt,
			// 	}).pack(),
			// 	ws,
			// 	pdu.getSeqNum()
			// );
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
