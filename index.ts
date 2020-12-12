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

let program = require('./test-program/test.j');

try {
  let sampleOutput: any[] = parser.parse(program);
  fs.writeFileSync("./test-program/test-ast.txt", inspect(sampleOutput, true, 200));
  let convertedProgram: Program = convertToProgram(sampleOutput);
  fs.writeFileSync("./test-program/test.txt", inspect(convertedProgram, true, 200));
  let runProgram = evalProgram(convertedProgram);
  fs.writeFileSync("./test-program/test_state.txt", inspect(runProgram, true, 200));
  console.log('\n');
}
catch (ex) {
  console.log(ex);
}
