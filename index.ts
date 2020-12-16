const parser = require('./parser/parser');
import { inspect } from 'util';
import * as fs from 'fs';
import { assert } from 'console';
import { convertToProgram } from './compiler/compiler';
import { evalProgram } from './interpreter/interpreter';
import { Program } from './parser/program';

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
  let sampleOutput: any[] = parser.parse(program);
  fs.writeFileSync("./test-program/test-ast.txt", inspect(sampleOutput, true, 200));
  let convertedProgram: Program = convertToProgram(sampleOutput);
  fs.writeFileSync("./test-program/test.txt", inspect(convertedProgram, true, 200));
  let runProgram = evalProgram(convertedProgram);
  fs.writeFileSync("./test-program/test-state.txt", inspect(runProgram, true, 200));
  console.log('\n');
}
catch (ex) {
  console.log(ex);
}
