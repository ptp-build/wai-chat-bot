import * as WebSocket from 'ws';
import { SendReq, SendRes } from './lib/ptp/protobuf/PTPMsg';
import { Pdu } from './lib/ptp/protobuf/BaseMsg';
import { ActionCommands } from './lib/ptp/protobuf/ActionCommands';
import { ERR } from './lib/ptp/protobuf/PTPCommon/types';

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws: WebSocket) => {
	ws.on('message', (message: Buffer) => {
		const pdu = new Pdu(message);
		switch (pdu.getCommandId()) {
			case ActionCommands.CID_SendReq:
				const { text, chatId } = SendReq.parseMsg(new Pdu(message));
				console.log({ text, chatId });
				ws.send(
					new SendRes({
						action: 'newMessage',
						payload: text,
					})
						.pack()
						.getPbData()
				);
				break;
		}
	});
});
