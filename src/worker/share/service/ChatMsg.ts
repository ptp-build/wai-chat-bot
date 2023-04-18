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
	static async handleAuthLoginReq(pdu: Pdu, ws: WebSocket): AuthSessionType {
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
		const { text, chatId } = SendBotMsgReq.parseMsg(pdu);
		ChatMsg.sendPdu(
			new SendBotMsgRes({
				chatId,
				text,
			}).pack(),
			ws,
			pdu.getSeqNum()
		);
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
