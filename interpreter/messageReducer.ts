import { send } from "process";

export type Message = {
  tag: string,
  content: any
}

export const sendMsg = (msg: Message) => {
  if (msg.tag == "log") {
    console.log(msg.content);
  }
}