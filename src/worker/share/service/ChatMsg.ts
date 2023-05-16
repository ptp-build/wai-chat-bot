import {Pdu} from '../../../lib/ptp/protobuf/BaseMsg';
import {PbMsg_Type} from '../../../lib/ptp/protobuf/PTPCommon/types';
import {currentTs, sleep} from '../utils/utils';
import * as WebSocketServer from 'ws';
import {getActionCommandsName} from '../../../lib/ptp/protobuf/ActionCommands';
import {ChatIdPrompts} from '../../setting';

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
  static ws_: WebSocketServer;
  private chatId: string;
  constructor(chatId: string) {
    this.chatId = chatId;
  }
  static buildDemoChat() {
    const chat = require('../../../assets/jsons/chat.json');
    const message = require('../../../assets/jsons/message.json');
    delete message.repliesThreadInfo;
    chat.id = ChatIdPrompts;
    chat.avatarHash = '2014496280034643200';
    chat.photos = [
      {
        id: '1361318180747186700',
        thumbnail: {
          width: 1836,
          height: 3192,
          dataUri:
            'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAFA3PEY8MlBGQUZaVVBfeMiCeG5uePWvuZHI////////////////////////////////////////////////////2wBDAVVaWnhpeOuCguv/////////////////////////////////////////////////////////////////////////wAARCAAoACgDASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAECA//EACkQAAEEAQIEBQUAAAAAAAAAAAEAAhEhMRJxMkFh8AMiUpHhUXKBktH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A4ADSKuPUr5YwZ+5RrWlnKVrSySNLf2QZgRg+6EXWN1S1vID3yrDJ4QRv1QYcKKI4DSaCINidIF475K6nCbJ69hYbGltCt7VMCRR6iaQal2bnOPjvCyXOJyUkekY6/wBQ2OED8/KDLidJsoh4SiCtcB4YHmnekkSMxuiIGqPqmozMmURBHGiiIg//2Q==',
        },
        sizes: [{ width: 1836, height: 3192, type: 'y' }],
      },
    ];
    message.chatId = chat.id;
    message.senderId = chat.id;
    delete message.content.photo;
    delete message.content.text;
    message.content.voice = {
      id: '6548697940473841000',
      duration: 1,
      waveform: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14.229166666666666,
        26.354166666666668, 36.427083333333336, 33.416666666666664, 36, 38.302083333333336,
        38.96875, 39.604166666666664, 39.625, 39.53125, 37.885416666666664, 37.364583333333336,
        36.989583333333336, 36.28125, 35.416666666666664, 34.166666666666664, 33.53125, 32.8125,
        32.625, 32.21875, 31.84375, 31.03125, 30.197916666666668, 30.072916666666668, 31.375,
        31.46875, 31.041666666666668, 30.927083333333332, 31.09375, 30.96875, 30.65625, 30.75,
        30.84375, 30.697916666666668, 30.520833333333332, 30.385416666666668, 30.291666666666668,
        31.03125, 31.854166666666668, 32.15625, 32.625, 32.8125, 32.34375, 32, 31.875,
      ],
    };
    chat.lastMessage = message;
    chat.isCreator = false;
  }
  static buildTextMessage(text: string, msg?: Partial<PbMsg_Type>): PbMsg_Type {
    return {
      id: 0,
      chatId: '',
      content: {
        ...msg?.content,
        text: {
          ...msg?.content?.text,
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

  static sendPdu(pdu: Pdu, ws?: WebSocket, seqNum?: number) {
    console.log('sendPdu', getActionCommandsName(pdu.getCommandId()));
    if (ws) {
      pdu.updateSeqNo(seqNum || 0);
      ws.send(pdu.getPbData());
    } else {
      pdu.updateSeqNo(seqNum || 0);
      ChatMsg.ws_.send(pdu.getPbData());
    }
  }
}
