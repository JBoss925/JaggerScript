"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMsg = void 0;
const sendMsg = (msg) => {
    if (msg.tag == "log") {
        console.log(msg.content);
    }
};
exports.sendMsg = sendMsg;
