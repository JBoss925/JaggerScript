# JaggerScript Demo Instructions

Following are the instructions for running the final demo contained in this folder. If you'd like to skip all the setup and installation, all the same functionality of the local version is available in your browser (using a custom editor I created) here: https://jboss925.github.io/jaggerscript. If you'd prefer to run it locally, that's fine too, just continue reading to learn how to install.

## Included Demoes

There are several demos included to demonstrate functionality that can be achieved with Jaggerscript. The default demo is a DoublyLinkedList implementation for numbers that can sort. However, feel free to explore the other demos under the "load example" button on the website, or by uncommenting a different program on a local machine. These demos vary from a Vector2 implementation to FizzBuzz, so be sure to try them out!


## Website Instructions

If you opt to do the demo on the website:
1) Load the page https://jboss925.github.io/jaggerscript
2) Select the demo you want to run/edit by clicking the "load example" button in the top, middle section of editor
3) Run the demo by clicking the triangle button next to the title "run" in the top left section of the editor

## Local Instructions

If you prefer to run JaggerScript on your local machine, you'll need to follow a few instructions.

As of now, all of the demo programs are in the folder `$root/test-program` where `$root` is the root of the repository. These files are all imported in the file `$root/index.ts`, which is the root of the application. All but one of them will be commented out, so to switch the demo you are executing, simply uncomment one of the files and re-comment the other.
```
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
```

# Installation (local only)

First things first, you will need NPM and Node. The NPM/Node docs for how to install the two can be found here: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm

Once NPM and Node are installed, `cd` into the base directory of the repository, referred to as `$root` from now on, and then install the project dependencies with:
```
npm install
```

# Running (local only)

Then, once the dependencies are installed, you're ready to begin! Simply run the command:
```
npm test
```

Running `npm test` will run the script at `$root/index.ts`. The `index.ts` script will then take a file at `$root/test-program/*.j` and use the parser to parse it into an AST. Then, it will inspect the AST tree, and output the AST structure to the file `$root/test-program/test-ast.txt`.

So, in order to see the program once its parsed, run `npm test`, and the AST output will be in `$root/test-program/test-ast.txt`.

Then, the program is converted into an intermediate representation that the interpreter will use, and that is written to `$root/test-program/test.txt`.

Lastly, the end state of the interpreter is written to `$root/test-program/test-state.txt`.

# Conclusion
And that's about it! To view values, use `console.log(...)` and view the output in the console window if you're on web, or the terminal if you're on local. Thanks for taking a look at JaggerScript!
