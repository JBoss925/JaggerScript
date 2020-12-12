# J-Lang

Following are the instructions for running the Beta demo contained in this folder. Simply follow a few simple commands, and you will be able to run simple J-Lang programs.

As of now, all operations will be done with the file "test.j", but this can work for any file and you can feel free to change "test.j" if you want to see the parser work on your own program.

# Running the demo

First things first, you will need NPM and Node. The NPM/Node docs for how to install the two can be found here: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm

Once NPM and Node are installed, `cd` into the base directory of the repository, referred to as `$root` from now on, and then install the project dependencies with:
```
npm install
```

Then, once the dependencies are installed, you're ready to begin! Simply run the command:
```
npm test
```

Running `npm test` will run the script at "`$root`/index.ts". The "index.ts" script will then take the file at "`$root`/test-program/test.j" and use the parser to parse it into an AST. Then, it will inspect the AST tree, and output the AST structure to the file "`$root`/test-program/test-ast.txt".

Thus, in order to see the results, you can change "`$root`/test-program/test.j", run `npm test`, and see the AST output in "`$root`/test-program/test-ast.txt".

Then, it will convert the program into an intermediate representation that the interpreter will use, and write that to "`$root`/test-program/test.txt".

You can also use `console.log(...)` statements at any point to print values of objects to the console.

Last, the end state of the interpreter is written to "`$root`/test-program/test_state.txt".
