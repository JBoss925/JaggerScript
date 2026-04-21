"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const parser = require('./parser/parser');
const util_1 = require("util");
const fs = __importStar(require("fs"));
const compiler_1 = require("./compiler/compiler");
const interpreter_1 = require("./interpreter/interpreter");
require.extensions['.j'] = function (module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
};
// Choose a program to run
let program = require('./test-program/DoublyLinkedList.j');
// let program = require('./test-program/GetTheReference.j');
// let program = require('./test-program/NestingDollClasses.j');
// let program = require('./test-program/AllocateAnInstance.j');
// let program = require('./test-program/FizzBuzz.j');
// let program = require('./test-program/CubeRoot.j');
// let program = require('./test-program/DoubleBreak.j');
// let program = require('./test-program/OnlyTheEvens.j');
// let program = require('./test-program/Random.j');
try {
    let sampleOutput = parser.parse(program);
    fs.writeFileSync("./test-program/test-ast.txt", (0, util_1.inspect)(sampleOutput, true, 200));
    let convertedProgram = (0, compiler_1.convertToProgram)(sampleOutput);
    fs.writeFileSync("./test-program/test.txt", (0, util_1.inspect)(convertedProgram, true, 200));
    let runProgram = (0, interpreter_1.evalProgram)(convertedProgram);
    fs.writeFileSync("./test-program/test-state.txt", (0, util_1.inspect)(runProgram, true, 200));
    console.log('\n');
}
catch (ex) {
    console.log(ex);
}
