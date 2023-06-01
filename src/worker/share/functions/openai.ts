import { createParser } from 'eventsource-parser';
// import {
//   encode,
// } from 'gpt-tokenizer'
import UserBalance from "../service/UserBalance";
import {User} from "../service/User";
import {MsgBot} from "../service/msg/MsgBot";

const OPENAI_URL = 'api.openai.com';
const DEFAULT_PROTOCOL = 'https';
const PROTOCOL = DEFAULT_PROTOCOL;
const BASE_URL = OPENAI_URL;
//
// export async function translate(content: string) {
//   const res = await requestOpenAi(
//     'POST',
//     'v1/chat/completions',
//     JSON.stringify({
//       messages: [
//         {
//           role: 'user',
//           content,
//         },
//       ],
//       stream: false,
//       model: 'gpt-3.5-turbo',
//       temperature: 0.5,
//       max_tokens: 2000,
//       presence_penalty: 0,
//     }),
//     ENV.OPENAI_API_KEY
//   );
//
//   const json = await res.json();
//   return json.choices[0].message.content;
// }

export async function requestOpenAi(method: string, path: string, body: Record<string, any>, apiKey: string,
                                    chatId: string,
                                    msgId: number,
                                    msgDate: number,
                                    msgAskId: number,
                                    msgAskDate: number,
                                    authUserId: string,
                                    stream:boolean = false) {
  const res = await fetch(`${PROTOCOL}://${BASE_URL}/${path}`, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${apiKey}`,
    },
    method,
    body:JSON.stringify(body),
  });
  if(stream){
    return res
  }else{
    const json = await res.json();
    console.log("[requestOpenAi res]",JSON.stringify(json))
    await handleAskResult(body,chatId,msgId,msgDate,msgAskId,msgAskDate,authUserId,json.choices[0].message.content,json.usage)
    return json
  }
}

export async function handleAskResult(
    body: Record<string, any>,
    chatId: string,
    msgId: number,
    msgDate: number,
    msgAskId: number,
    msgAskDate: number,
    authUserId: string,
    resultText:string,
    resultUsage?:Record<string, any>
){
  // console.log('[handleAskResult]', JSON.stringify(body));
  const {messages} = body
  const askTxt = messages[messages.length - 1].content;
  // let contents = []
  // for (let i = 0; i < messages.length; i++) {
    // const message = messages[i]
    // contents.push([message.role,message.content])
    // contents += "\n"+message.role + ":" + message.content
  // }
  let prompt_tokens = 0;
  let completion_tokens = 0;
  let total_tokens = 0;
  // console.log(encode(JSON.stringify(messages)).length,contents)
  if(!resultUsage){
    // prompt_tokens = encode(JSON.stringify(messages)).length;
    // completion_tokens = encode(resultText).length;
    total_tokens = completion_tokens + prompt_tokens
  }else{
    prompt_tokens = resultUsage!.prompt_tokens
    completion_tokens = resultUsage!.completion_tokens
    total_tokens = resultUsage!.total_tokens
  }
  console.log("[handleAskResult]",{
    chatId,
    msgId,
    msgDate,
    msgAskId,
    msgAskDate,
    authUserId
  },{prompt_tokens,completion_tokens,total_tokens},{askTxt,resultText})

  if(msgAskId){
    await new MsgBot(authUserId,chatId,authUserId,askTxt,msgAskId,msgAskDate).saveMsg()
  }

  if(msgId){
    await new MsgBot(authUserId,chatId,chatId,resultText,msgId,msgDate).saveMsg()
    await new UserBalance(authUserId).deductTokens(total_tokens)
    const ownerUserId = await User.getBotOwnerUserID(chatId)
    if(ownerUserId && ownerUserId !== authUserId && await User.getBotIsPublic(chatId)){
      await new UserBalance(ownerUserId).addEarnTokens(Math.ceil(total_tokens * 0.05))
    }
  }
}
export async function requestOpenAiStream(
  body: Record<string, any>,
  apiKey: string,
  chatId: string,
  msgId: number,
  msgDate: number,
  msgAskId: number,
  msgAskDate: number,
  authUserId: string,
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const res = await requestOpenAi(
      'POST', 'v1/chat/completions', body, apiKey,chatId,msgId,msgDate,msgAskId,msgAskDate,authUserId,true);
  return new ReadableStream({
    async cancel(reason) {
      console.error(reason);
    },

    async start(controller) {
      let txt = ""
      let token_len = 0
      function onParse(event: any) {
        // console.log(event);
        if (event.type === 'event') {
          const data = event.data;
          // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
          if (data === '[DONE]') {
            controller.close();
            handleAskResult(body,chatId,msgId,msgDate,msgAskId,msgAskDate,authUserId,txt)
            return;
          }
          try {
            const json = JSON.parse(data);
            // console.log(data);
            const c = json.choices[0].delta.content
            if(c){
              // token_len += encode(c).length
              // console.log("token",c,encode(c),encode(c).length,token_len)
              txt += c;
            }
            const queue = encoder.encode(c);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      }

      const parser = createParser(onParse);
      for await (const chunk of res.body as any) {
        const chunkDecode = decoder.decode(chunk);
        if (chunkDecode) {
          try {
            const res = JSON.parse(chunkDecode);
            if (res.error) {
              const queue = encoder.encode('ERROR:' + JSON.stringify(res.error));
              controller.enqueue(queue);
              controller.close();
            }
          } catch (e) {
            parser.feed(chunkDecode);
          }
        }
      }
    },
  });
}

export async function requestUsage(apiKey: string, start_date: string, end_date: string) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': `Bearer ${apiKey}`,
  }
  const method = "GET"
  const url = `${PROTOCOL}://${BASE_URL}`
  const [used, subs] = await Promise.all([
    fetch(`${url}/dashboard/billing/usage?start_date=${start_date}&end_date=${end_date}`, {
      headers,
      method
    }),
    fetch(`${url}/dashboard/billing/subscription`, {
      headers,
      method
    })
  ]);

  const response = (await used.json()) as {
    total_usage?: number;
    error?: {
      type: string;
      message: string;
    };
  };

  const total = (await subs.json()) as {
    hard_limit_usd?: number;
  };

  if (response.error && response.error.type) {
    console.error(response.error);
    throw new Error(response.error.type);
  }

  if (response.total_usage) {
    response.total_usage = Math.round(response.total_usage) / 100;
  }

  if (total.hard_limit_usd) {
    total.hard_limit_usd = Math.round(total.hard_limit_usd * 100) / 100;
  }
  console.log('total', total);
  const key = `apkKey: 【 ${apiKey.substring(0, 6)}***${apiKey.substring(apiKey.length - 3)} 】`;
  return {
    used: response.total_usage,
    subscription: total.hard_limit_usd,
    text: `${key}\n\n已用: ${response.total_usage} / 总: ${total.hard_limit_usd} USD`,
  };
}
