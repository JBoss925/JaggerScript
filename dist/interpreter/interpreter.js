"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evalProgram = evalProgram;
const util_1 = require("util");
const program_1 = require("../parser/program");
const messageReducer_1 = require("./messageReducer");
class HeapWrapper {
    constructor() {
        this.heap = new Map();
    }
    get(key) {
        return this.heap.get(key);
    }
    set(key, val) {
        // console.log("Set " + key + " to " + (isInstance((val as any)['value']) ? (val as unknown as Instance) : (val as any)['value']));
        // if (isInstance((val as any)['value'])) {
        //   console.log(val);
        // }
        return this.heap.set(key, val);
    }
    delete(key) {
        return this.heap.delete(key);
    }
}
var id = 0;
function isObject(value) {
    return value !== null && typeof value === 'object';
}
function isValue(obj) {
    return ["boolean", "string", "number"].includes(typeof (obj)) || obj == undefined || isInstance(obj);
}
function allocateInstance(clazz, argsIn, state) {
    id++;
    let inst = {
        token: program_1.Tokens.Instance,
        type: clazz.name,
        class: clazz,
        pointer: String(id),
        globalScope: new Map()
    };
    let newState = state;
    let lastInstance = newState.runningInstance;
    newState.runningInstance = inst;
    newState = safeIncStackPointer(newState);
    newState.heap.set(inst.pointer, { value: inst, typeStr: getTypeStr(inst), numLiveReferences: 1, token: program_1.Tokens.Value, type: program_1.ValueType.Instance, heapPtr: inst.pointer });
    clazz.globalVars.forEach(gd => {
        let [globVal, newState2] = evalDefinition(gd, newState, true);
        newState = newState2;
        if (isValue(globVal)) {
            // if (isInstance(globVal)) {
            //   let inst = (newState.heap.get((globVal as Instance).pointer) as Value);
            //   newState.runningInstance.globalScope.set(gd.identifier, (inst.heapPtr as string));
            // } else {
            //   id++;
            //   newState.heap.set(String(id), {
            //     value: globVal, typeStr: gd.type,
            //     numLiveReferences: 1,
            //     type: getType(globVal),
            //     token: Tokens.Value,
            //     heapPtr: String(id)
            //   });
            //   newState.runningInstance.globalScope.set(gd.identifier, String(id));
            // }
        }
        else {
            throw new Error("Invalid value to set global variable " + gd.identifier + " to!");
        }
    });
    newState = safeDecStackPointer(newState);
    newState.runningInstance = lastInstance;
    [, newState] = evalConstructor(clazz.construct, inst, argsIn, newState);
    return [inst, newState];
}
function variableValue(variable, state) {
    if (isNullOrUndef(variable.scope) || variable.scope?.scope.length == 0) {
        let fVal = state.stack[state.stackPointer].get(variable.variableName);
        if (fVal != undefined)
            return fVal;
        let varPointer = state.runningInstance.globalScope.get(variable.variableName);
        let hVal = varPointer ? state.heap.get(varPointer) : undefined;
        if (hVal != undefined)
            return hVal;
        throw new Error("Could not find variable: " + variable.variableName);
    }
    else {
        variable.scope = variable.scope;
        let lastInstance = undefined;
        for (let i = 0; i < variable.scope.scope.length + 1; i++) {
            if (i == 0) {
                let instVal;
                let fVal = state.stack[state.stackPointer].get(variable.scope.scope[i]);
                if (fVal == undefined) {
                    let varPointer = state.runningInstance.globalScope.get(variable.scope.scope[i]);
                    let hVal = varPointer ? state.heap.get(varPointer) : undefined;
                    if (hVal == undefined)
                        throw new Error("Couldn't find variable " + variable.variableName + " at " + variable.scope.scope.join(".") + "!");
                    instVal = assertIsInstance(hVal, variable, i);
                    ;
                }
                else {
                    instVal = assertIsInstance(fVal, variable, i);
                    ;
                }
                if (variable.scope.scope.length != 1 && instVal.token != program_1.Tokens.Instance) {
                    throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
                }
                lastInstance = instVal;
            }
            else if (i == variable.scope.scope.length) {
                lastInstance = lastInstance;
                let instVal;
                let varPointer = lastInstance.globalScope.get(variable.variableName);
                let hVal = varPointer ? state.heap.get(varPointer) : undefined;
                if (hVal == undefined)
                    throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
                instVal = hVal;
                return instVal;
            }
            else {
                lastInstance = lastInstance;
                let instVal;
                let varPointer = lastInstance.globalScope.get(variable.scope.scope[i]);
                let hVal = varPointer ? state.heap.get(varPointer) : undefined;
                if (hVal == undefined)
                    throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
                instVal = assertIsInstance(hVal, variable, i);
                ;
                if (i == variable.scope.scope.length && instVal.token != program_1.Tokens.Instance) {
                    throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
                }
                lastInstance = instVal;
            }
        }
        throw new Error("Should be unreachable!");
    }
}
function getVarCurrentValueType(variable, state) {
    return getType(variableValue(variable, state).value);
}
function assertIsInstance(inst, variable, i) {
    if (i) {
        if (inst.value['token'] != program_1.Tokens.Instance) {
            if (variable.scope == undefined) {
                throw new Error("Variable " + variable.variableName + " is not an instance!");
            }
            else {
                throw new Error("Variable " +
                    ((i == variable.scope.scope.length) ? variable.variableName : variable.scope?.scope[i + 1]) +
                    " can't be found on " + variable.scope.scope.reduce((prev, curr, ind) => {
                    return (ind == 0 ? (prev + curr) : (prev + "." + curr));
                }, "") + "!");
            }
        }
    }
    else {
        if (inst.value['token'] != program_1.Tokens.Instance) {
            if (variable.scope == undefined) {
                throw new Error("Variable " + variable.variableName + "is not an instance!");
            }
            else {
                throw new Error("Variable " + variable.scope.scope.join(".") + "." + variable.variableName + " is not an instance!");
            }
        }
    }
    return inst.value;
}
function setVariableValue(variable, value, state, onHeap) {
    let checkF = onHeap == undefined ? true : !onHeap;
    let checkH = onHeap == undefined ? true : onHeap;
    if (isNullOrUndef(variable.scope) || variable.scope?.scope.length == 0) {
        let newState = state;
        if (checkF) {
            let fVal = newState.stack[newState.stackPointer].get(variable.variableName);
            if (!isNullOrUndef(fVal)) {
                newState.stack[newState.stackPointer].set(variable.variableName, value);
                return [true, newState];
            }
        }
        if (checkH) {
            let varPointer = newState.runningInstance.globalScope.get(variable.variableName);
            let hVal = varPointer ? newState.heap.get(varPointer) : undefined;
            if (!isNullOrUndef(hVal)) {
                if (isOnHeap(value)) {
                    newState.runningInstance.globalScope.set(variable.variableName, value.heapPtr);
                    return [true, newState];
                }
                else {
                    id++;
                    newState.runningInstance.globalScope.set(variable.variableName, String(id));
                    value.heapPtr = String(id);
                    newState.heap.set(String(id), value);
                    return [true, newState];
                }
            }
        }
        newState.stack[newState.stackPointer].set(variable.variableName, value);
        return [true, newState];
    }
    else {
        variable.scope = variable.scope;
        let lastInstance;
        for (let i = 0; i < variable.scope.scope.length + 1; i++) {
            if (i == 0) {
                let instVal;
                let fVal = checkF ? state.stack[state.stackPointer].get(variable.scope.scope[i]) : undefined;
                if (isNullOrUndef(fVal)) {
                    let varPointer = state.runningInstance.globalScope.get(variable.scope.scope[i]);
                    let hVal = checkH ? (varPointer ? state.heap.get(varPointer) : undefined) : undefined;
                    if (isNullOrUndef(hVal))
                        throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
                    instVal = assertIsInstance(hVal, variable, i);
                    ;
                }
                else {
                    instVal = assertIsInstance(fVal, variable, i);
                    ;
                }
                if (variable.scope.scope.length != 1 && instVal.token != program_1.Tokens.Instance) {
                    throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
                }
                lastInstance = instVal;
            }
            else if (i == variable.scope.scope.length) {
                let varPointer = lastInstance.globalScope.get(variable.variableName);
                let hVal = checkH ? (varPointer ? state.heap.get(varPointer) : undefined) : undefined;
                if (isNullOrUndef(hVal))
                    throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
                let newState = state;
                if (hVal?.typeStr != value.typeStr || hVal == undefined) {
                    throw new Error("Attempted to assign value of type " + value.typeStr + " to a value of type " + hVal?.typeStr);
                }
                if (isOnHeap(value)) {
                    lastInstance.globalScope.set(variable.variableName, value.heapPtr);
                }
                else {
                    id++;
                    lastInstance.globalScope.set(variable.variableName, String(id));
                    value.heapPtr = String(id);
                    newState.heap.set(String(id), value);
                }
                return [true, newState];
            }
            else {
                let instVal;
                let varPointer = lastInstance.globalScope.get(variable.scope.scope[i]);
                let hVal = varPointer ? state.heap.get(varPointer) : undefined;
                if (isNullOrUndef(hVal))
                    throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
                instVal = assertIsInstance(hVal, variable, i);
                if (i == variable.scope.scope.length && instVal.token != program_1.Tokens.Instance) {
                    throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
                }
                lastInstance = instVal;
            }
        }
        throw new Error("This should never be reached!");
    }
}
function isNullOrUndef(val) {
    return val == null || val == undefined;
}
function evalProgram(ast) {
    let mainClass = ast.classes.find(c => { return (c.functions.find(func => func.name == "main")) != undefined; });
    if (isNullOrUndef(mainClass)) {
        throw new Error("Program has no main function!");
    }
    mainClass = mainClass;
    let mainFunc = mainClass.functions.find(func => func.name == "main");
    if (isNullOrUndef(mainFunc)) {
        throw new Error("Program has no main function!");
    }
    mainFunc = mainFunc;
    let interpState = {
        heap: new HeapWrapper(), stack: [new Map(), new Map()], runningInstance: undefined, classes: new Map(),
        functions: new Map(), stackPointer: 0
    };
    ast.classes.forEach(cla => {
        interpState.classes.set(cla.name, cla);
        cla.functions.forEach(f => {
            if (!interpState.functions.has(cla)) {
                interpState.functions.set(cla, new Map());
            }
            interpState.functions.get(cla)?.set(f.name, f);
        });
    });
    let [mainInstance, newState2] = allocateInstance(mainClass, undefined, interpState);
    newState2.runningInstance = mainInstance;
    let [, newState3] = evalFunction(mainFunc, [], newState2);
    return newState3;
}
function evalExpression(ast, state) {
    let newState = state;
    switch (ast.token) {
        case (program_1.Tokens.Value):
            return evalValue(ast, newState);
        case (program_1.Tokens.ArithmeticExpression):
            return evalAexp(ast, newState);
        case (program_1.Tokens.FuncCall):
            return evalFuncCall(ast, newState);
        case (program_1.Tokens.Variable):
            return evalVariable(ast, newState);
        case (program_1.Tokens.Instantiate):
            return evalInstantiate(ast, newState);
        case (program_1.Tokens.BooleanExpression):
            return evalBexp(ast, newState);
        default:
            console.log((0, util_1.inspect)(ast, true, 200));
            throw new Error("Token with tokenType " + ast.token + " found!");
    }
}
function evalAST(ast, state) {
    switch (ast.token) {
        case (program_1.Tokens.Class):
            return evalClass(ast, state);
        case (program_1.Tokens.Definition):
            return evalDefinition(ast, state);
        // case (Tokens.Func):
        //   return evalFunction(ast as Func, state);
        // case ("Constructor"):
        //   return evalConstructor(ast, state);
        case (program_1.Tokens.Reassignment):
            return evalReassignment(ast, state);
        case (program_1.Tokens.ArgsIn):
            return evalArgsIn(ast, state);
        case (program_1.Tokens.IfBlock):
            return evalIfBlock(ast, state);
        case (program_1.Tokens.WhileLoop):
            return evalWhileLoop(ast, state);
        case (program_1.Tokens.Break):
            return evalBreak(ast, state);
        case (program_1.Tokens.Return):
            return evalReturn(ast, state);
        case (program_1.Tokens.Comment):
            return evalComment(ast, state);
        default:
            return evalExpression(ast, state);
    }
}
function evalComment(ast, state) {
    return [undefined, state];
}
function checkLt(val, val2) {
    if (getTypeStr(val) != getTypeStr(val2)) {
        throw new Error("Cannot compare values of two different types! (" + getTypeStr(val) + " < " + getTypeStr(val2) + ")");
    }
    if (isInstance(val) || isInstance(val2)) {
        throw new Error("Cannot compare using less-than on instances! (" + getTypeStr(val) + " < " + getTypeStr(val2) + ")");
    }
    if (val == undefined || val2 == undefined) {
        throw new Error("Cannot compare using less-than on undefined! (" + getTypeStr(val) + " < " + getTypeStr(val2) + ")");
    }
    else {
        return val < val2;
    }
}
function checkGt(val, val2) {
    if (getTypeStr(val) != getTypeStr(val2)) {
        throw new Error("Cannot compare values of two different types! (" + getTypeStr(val) + " > " + getTypeStr(val2) + ")");
    }
    if (isInstance(val) || isInstance(val2)) {
        throw new Error("Cannot compare using greater-than on instances! (" + getTypeStr(val) + " > " + getTypeStr(val2) + ")");
    }
    if (val == undefined || val2 == undefined) {
        throw new Error("Cannot compare using greater-than on undefined! (" + getTypeStr(val) + " > " + getTypeStr(val2) + ")");
    }
    else {
        return val > val2;
    }
}
function checkEq(val, val2) {
    if (getTypeStr(val) != getTypeStr(val2) && val != undefined && val2 != undefined) {
        throw new Error("Cannot compare values of two different types! (" + getTypeStr(val) + " == " + getTypeStr(val2) + ")");
    }
    if (isInstance(val) && isInstance(val2)) {
        return val.pointer == val2.pointer;
    }
    return val == val2;
}
function checkNeq(val, val2) {
    if (isInstance(val) && isInstance(val2)) {
        return val.pointer != val2.pointer;
    }
    return val != val2;
}
function checkLte(val, val2) {
    if (getTypeStr(val) != getTypeStr(val2)) {
        throw new Error("Cannot compare values of two different types! (" + getTypeStr(val) + " <= " + getTypeStr(val2) + ")");
    }
    if (isInstance(val) || isInstance(val2)) {
        throw new Error("Cannot compare using less-than-equal on instances! (" + getTypeStr(val) + " <= " + getTypeStr(val2) + ")");
    }
    if (val == undefined || val2 == undefined) {
        throw new Error("Cannot compare using less-than-equal on undefined! (" + getTypeStr(val) + " <= " + getTypeStr(val2) + ")");
    }
    else {
        return val <= val2;
    }
}
function checkGte(val, val2) {
    if (getTypeStr(val) != getTypeStr(val2)) {
        throw new Error("Cannot compare values of two different types! (" + getTypeStr(val) + " >= " + getTypeStr(val2) + ")");
    }
    if (isInstance(val) || isInstance(val2)) {
        throw new Error("Cannot compare using greater-than-equal on instances! (" + getTypeStr(val) + " >= " + getTypeStr(val2) + ")");
    }
    if (val == undefined || val2 == undefined) {
        throw new Error("Cannot compare using greater-than-equal on undefined! (" + getTypeStr(val) + " >= " + getTypeStr(val2) + ")");
    }
    else {
        return val >= val2;
    }
}
// Evaluate boolean expressions
function evalBexp(ast, state) {
    // console.log("BEXP: " + ast.left.variableName + " " + ast.operator + " " + ast.right.variableName);
    let newState = state;
    let [leftVal, newState2] = evalExpression(ast.left, newState);
    newState = newState2;
    let left = leftVal;
    let [rightVal, newState3] = evalExpression(ast.right, newState);
    newState = newState3;
    let right = rightVal;
    switch (ast.operator) {
        case ("<"):
            return [checkLt(left, right), newState];
        case (">"):
            return [checkGt(left, right), newState];
        case ("=="):
            return [checkEq(left, right), newState];
        case ("!="):
            return [checkNeq(left, right), newState];
        case ("<="):
            return [checkLte(left, right), newState];
        case (">="):
            return [checkGte(left, right), newState];
    }
}
// Evaluate return expressions
function evalReturn(ast, state) {
    if (ast.value == undefined) {
        let newState = state;
        // console.log("RETURN: undefined");
        return [undefined, newState];
    }
    else {
        let [value, newState] = evalExpression(ast.value, state);
        // console.log("RETURN: " + valToString(value));
        return [value, newState];
    }
}
function evalBreak(ast, state) {
    // console.log("BREAK");
    let be = { token: program_1.Tokens.BreakException, state: state };
    throw be;
}
const LOOP_LIMIT = 10000;
function evalWhileLoop(ast, state) {
    let [val, newState] = evalExpression(ast.expression, state);
    // let log = "WHILE LOOP ";
    let i = 0;
    while (val == true) {
        i++;
        if (i > LOOP_LIMIT) {
            (0, messageReducer_1.sendMsg)({ tag: 'log', content: "Infinite loop detected! Loop looped more than LOOP_LIMIT=" + LOOP_LIMIT });
            break;
        }
        ;
        // log += "TRUE: " + val;
        // Implement breaks w/ exceptions
        try {
            for (let w of ast.within) {
                [, newState] = evalAST(w, newState);
            }
        }
        catch (e) {
            const error = e;
            if (error.token == program_1.Tokens.BreakException && error.state) {
                newState = error.state;
                break;
            }
            else {
                throw e;
            }
        }
        [val, newState] = evalExpression(ast.expression, newState);
    }
    return [undefined, newState];
}
function evalIfBlock(ast, state) {
    let [ifBlockVal, newState] = evalExpression(ast.ifBlock.expression, state);
    if (ifBlockVal == true) {
        // console.log("IF: " + ast.ifBlock.expression);
        ast.ifBlock.within.forEach(w => {
            [, newState] = evalAST(w, newState);
        });
    }
    else {
        let foundElifBlock = false;
        if (ast.elifBlocks != undefined) {
            for (let elifBlock of ast.elifBlocks) {
                let [elifBlockVal, newState2] = evalExpression(elifBlock.expression, newState);
                newState = newState2;
                if (elifBlockVal == true) {
                    // console.log("ELIF: " + elifBlock.expression);
                    foundElifBlock = true;
                    elifBlock.within.forEach(w => {
                        [, newState] = evalAST(w, newState);
                    });
                    break;
                }
            }
        }
        if (!foundElifBlock && ast.elseBlock) {
            // console.log("ELSE");
            ast.elseBlock.within.forEach(w => {
                [, newState] = evalAST(w, newState);
            });
        }
        else {
            // console.log("NO-ENTER-IF");
        }
    }
    return [undefined, newState];
}
function evalInstantiate(ast, state) {
    // console.log("INSTANTIATE: " + ast.className);
    let clazz = state.classes.get(ast.className);
    if (isNullOrUndef(clazz))
        throw new Error("No class with name: " + ast.className);
    let [newInstance, newState] = allocateInstance(clazz, ast.args, state);
    return [newInstance, newState];
}
function isInstance(value) {
    if (value == undefined)
        return false;
    return value['token'] == program_1.Tokens.Instance;
}
function isOnHeap(value) {
    return (value.heapPtr != undefined);
}
function evalReassignment(ast, state) {
    // Check the value exists by grabbing the value
    // console.log("REASSIGN: " + ast.variable.variableName);
    let varVal = variableValue(ast.variable, state);
    let [expVal, newState] = evalExpression(ast.equals, state);
    // console.log("REASSIGN: " + ast.variable.variableName + " to " + (isInstance(expVal) ? valToString(expVal) : expVal));
    // Check for type equivalence on reassignment
    if (getTypeStr(expVal) != "undefined") {
        if (varVal.typeStr != getTypeStr(expVal)) {
            throw new Error("Reassigned from type " + varVal.typeStr + " to type " + getTypeStr(expVal) + "!");
        }
    }
    ast.variable.typeStr = varVal.typeStr;
    ast.variable.type = getType(expVal);
    // THIS IS THE MOST IMPORTANT STEP TO DO NEXT
    // ADD HEAPPTR AND ISONHEAP TO VALUE TYPE
    // MAYBE DO THIS HEAP CHECKING ON DEFINITION AS WELL
    // TODO: VarVal is on the heap instead of isInstance
    if (isInstance(expVal)) {
        if (isOnHeap(varVal)) {
            let inst = newState.heap.get(expVal.pointer);
            inst.numLiveReferences++;
            varVal.numLiveReferences--;
            [, newState] = setVariableValue(ast.variable, inst, newState);
        }
        else {
            let inst = newState.heap.get(expVal.pointer);
            // TODO: P sure unneeded
            // inst.numLiveReferences++;
            inst.numLiveReferences += varVal.numLiveReferences;
            varVal.numLiveReferences--;
            [, newState] = setVariableValue(ast.variable, inst, newState);
        }
    }
    else {
        // VarVal is on the heap instead of isInstance
        if (isOnHeap(varVal)) {
            [, newState] = setVariableValue(ast.variable, {
                typeStr: varVal.typeStr, numLiveReferences: 1, value: expVal,
                type: getType(expVal), token: program_1.Tokens.Value
            }, newState);
            varVal.numLiveReferences--;
        }
        else {
            [, newState] = setVariableValue(ast.variable, {
                typeStr: varVal.typeStr, numLiveReferences: varVal.numLiveReferences, value: expVal,
                type: getType(expVal), token: program_1.Tokens.Value
            }, newState);
            varVal.numLiveReferences--;
        }
    }
    return [expVal, newState];
}
function evalVariable(ast, state) {
    let s = variableValue(ast, state);
    // console.log("VARIABLE: " + ast.variableName + " = " + valToString(s.value));
    return [s.value, state];
}
function evalArgsIn(ast, state) {
    // console.log("ARGSIN: " + ast.args);
    return [ast, state];
}
function evalScopeSpec(ast, state) {
    // console.log("SCOPESPEC: " + ast.scope);
    return [ast, state];
}
function safeIncStackPointer(state) {
    let newState = state;
    newState.stackPointer++;
    if (newState.stack.length <= newState.stackPointer) {
        newState.stack.push(new Map());
    }
    return newState;
}
function safeDecStackPointer(state) {
    let newState = state;
    newState.stackPointer--;
    return newState;
}
function clearInstance(inst, state) {
    let newState = state;
    for (let heapPtr of Array.from(inst.globalScope.values())) {
        let heapVal = newState.heap.get(heapPtr);
        heapVal = heapVal ? heapVal : ((() => { throw new Error("Heap val not found at pointer " + heapPtr + "!"); })());
        heapVal.numLiveReferences--;
        if (isInstance(heapVal.value) && heapVal.numLiveReferences == 0) {
            [, newState] = clearInstance(heapVal.value, newState);
        }
        else if (heapVal.numLiveReferences == 0) {
            console.log("Deleted pointer " + heapPtr + " from the heap!");
            newState.heap.delete(heapPtr);
        }
    }
    return [undefined, newState];
}
function clearStack(state) {
    let newState = state;
    Array.from(newState.stack[newState.stackPointer].entries()).forEach(([key, val]) => {
        val.numLiveReferences--;
        if (isInstance(val.value) && val.numLiveReferences == 0) {
            [, newState] = clearInstance(val.value, newState);
        }
        else {
            if (isOnHeap(val)) {
                if (val.numLiveReferences == 0) {
                    newState.heap.delete(val.heapPtr);
                }
            }
        }
    });
    newState.stack[newState.stackPointer].clear();
    return newState;
}
function evalFuncCall(ast, state) {
    let newState = state;
    let argsArray = ast.args ? ast.args.args : [];
    if (argsArray.length != (ast.args ? ast.args.args.length : 0)) {
        throw new Error("Too many or too few arguments passed to function call!");
    }
    let argsVals = [];
    for (let arg of argsArray) {
        let [val, newState2] = evalExpression(arg, newState);
        newState = newState2;
        argsVals.push(val);
    }
    // console.log("FUNC CALL: " + ast.functionName);
    if (isNullOrUndef(ast.scope) || ast.scope?.scope.length == 0) {
        let currentClass = state.runningInstance.class;
        let nextFunc = state.functions.get(currentClass)?.get(ast.functionName);
        let [funcVal, newState2] = evalFunction(nextFunc ? nextFunc : (() => { throw new Error("No function with name: " + ast.functionName + "!"); })(), argsVals, newState);
        return [funcVal, newState2];
    }
    else {
        ast.scope = ast.scope;
        // console.log check -------------------------------------------------------
        if (ast.scope.scope.length == 1 && ast.scope.scope[0] == "console" && ast.functionName == "log") {
            if (ast.args) {
                for (let arg of argsVals) {
                    (0, messageReducer_1.sendMsg)({ tag: 'log', content: arg });
                }
            }
            return [undefined, newState];
        }
        // -------------------------------------------------------------------------
        let variableScope = ast.scope.scope.slice(0, ast.scope.scope.length - 1);
        let variableName = ast.scope.scope[ast.scope.scope.length - 1];
        let varFunctionParent = {
            token: program_1.Tokens.Variable,
            variableName: variableName,
            type: program_1.ValueType.Instance,
            typeStr: "unknown",
            scope: {
                token: program_1.Tokens.ScopeSpec,
                scope: variableScope
            }
        };
        let functionParentInst = variableValue(varFunctionParent, newState);
        varFunctionParent.typeStr = getTypeStr(functionParentInst.value);
        if (!isInstance(functionParentInst.value)) {
            throw new Error("Functions do not exist on primitive at: " + ast.scope.scope.join("."));
        }
        let calledInst = functionParentInst.value;
        let lastInstance = newState.runningInstance;
        newState.runningInstance = calledInst;
        let func = newState.functions.get(calledInst.class)?.get(ast.functionName);
        if (isNullOrUndef(func)) {
            throw new Error("Function " + ast.functionName + " could not be found at: " + ast.scope?.scope.join("."));
        }
        let [funcVal, newState2] = evalFunction(func, argsVals, newState);
        newState2.runningInstance = lastInstance;
        return [funcVal, newState2];
    }
}
function evalFunction(ast, argsVals, state) {
    let newState = state;
    newState = safeIncStackPointer(newState);
    if (ast.args) {
        ast.args.args.forEach((argdef, ind) => {
            if (isInstance(argsVals[ind])) {
                let instVal = newState.heap.get(argsVals[ind].pointer);
                instVal.numLiveReferences++;
                newState.stack[newState.stackPointer].set(argdef.identifier, instVal);
            }
            else {
                newState.stack[newState.stackPointer].set(argdef.identifier, {
                    value: argsVals[ind], typeStr: argdef.type,
                    numLiveReferences: 1, type: getType(argsVals[ind]),
                    token: program_1.Tokens.Value
                });
            }
        });
    }
    let returnVal = undefined;
    for (let wi of ast.within) {
        if (wi.token == program_1.Tokens.Return) {
            let ret = wi;
            if (!isNullOrUndef(ret.value)) {
                let [value, newState4] = evalAST(ret, newState);
                newState = newState4;
                returnVal = value;
            }
            break;
        }
        let [value, newState3] = evalAST(wi, newState);
        newState = newState3;
    }
    newState = clearStack(newState);
    newState = safeDecStackPointer(newState);
    // console.log("FUNCTION: " + ast.name + " returns " + (isInstance(returnVal) ? valToString(returnVal) : returnVal) + " with args: " + argsVals);
    return [returnVal, newState];
}
function evalConstructor(ast, instance, argsIn, state) {
    let newState = state;
    let argsArray = argsIn ? argsIn.args : [];
    if (argsArray.length != (ast.args ? ast.args.args.length : 0)) {
        throw new Error("Too many or too few arguments passed to constructor for: " + ast.parent.name + "!");
    }
    let argsVals = [];
    for (let i = 0; i < argsArray.length; i++) {
        let [val, newState2] = evalExpression(argsArray[i], newState);
        newState = newState2;
        argsVals.push(val);
    }
    // console.log("CONSTRUCTOR: " + ast.parent.name + " with args: " + argsVals);
    newState = safeIncStackPointer(newState);
    if (ast.args) {
        ast.args.args.forEach((argdef, ind) => {
            if (isInstance(argsVals[ind])) {
                let instVal = newState.heap.get(argsVals[ind].pointer);
                instVal.numLiveReferences++;
                newState.stack[newState.stackPointer].set(argdef.identifier, instVal);
            }
            else {
                newState.stack[newState.stackPointer].set(argdef.identifier, {
                    value: argsVals[ind], typeStr: argdef.type,
                    numLiveReferences: 1, type: getType(argsVals[ind]),
                    token: program_1.Tokens.Value
                });
            }
        });
    }
    let lastInstance = newState.runningInstance;
    newState.runningInstance = instance;
    ast.within.forEach(wi => {
        [, newState] = evalAST(wi, newState);
    });
    newState.runningInstance = lastInstance;
    newState = clearStack(newState);
    newState = safeDecStackPointer(newState);
    return [, newState];
}
function evalArgsDefine(ast, state) {
    return [ast, state];
}
function evalValue(ast, state) {
    // console.log("VALUE: " + ast.value);
    return [ast.value, state];
}
function getTypeStr(value) {
    if (isInstance(value)) {
        return value.type;
    }
    else {
        switch (typeof (value)) {
            case "boolean":
                return "boolean";
            case "number":
                return "number";
            case "string":
                return "string";
            case "undefined":
                return "undefined";
            default:
                throw new Error("Unexpected literal!");
        }
    }
}
function getType(obj) {
    if (obj == undefined) {
        return program_1.ValueType.Undefined;
    }
    if (isInstance(obj)) {
        return program_1.ValueType.Instance;
    }
    else {
        if (typeof (obj) == "string") {
            return program_1.ValueType.String;
        }
        if (typeof (obj) == "number") {
            return program_1.ValueType.Number;
        }
        if (typeof (obj) == "boolean") {
            return program_1.ValueType.Boolean;
        }
    }
    return program_1.ValueType.Undefined;
}
function valToString(value) {
    if (isInstance(value)) {
        let inst = value;
        return inst.type + " (" + Array.from(inst.globalScope.entries()).map(([e, k]) => "[" + e + "," + k + "]") + ")";
    }
    else {
        return (value ? value : "undefined") + "";
    }
}
function evalDefinition(ast, state, isGlobal) {
    let newState;
    let expVal;
    if (ast.equals == undefined) {
        newState = state;
        expVal = undefined;
    }
    else {
        let [expVal2, newState2] = evalExpression(ast.equals, state);
        newState = newState2;
        expVal = expVal2;
    }
    // console.log("DEFINE: " + ast.type + " " + ast.identifier + " as " + valToString(expVal));
    let newVariable = {
        token: program_1.Tokens.Variable,
        variableName: ast.identifier,
        type: getType(expVal),
        typeStr: ast.type
    };
    let expValTypeStr = getTypeStr(expVal);
    if (expValTypeStr != "undefined" && expValTypeStr != ast.type) {
        throw new Error("Cannot assign value of type " + expValTypeStr + " to variable " + ast.identifier + " of type " + ast.type);
    }
    if (isInstance(expVal)) {
        expVal = expVal;
        let heapVal = newState.heap.get(expVal.pointer);
        heapVal = heapVal ? heapVal : ((() => { throw new Error("Heap val not found at pointer " + expVal.pointer + "!"); })());
        heapVal.numLiveReferences++;
        if (isGlobal) {
            newState.runningInstance.globalScope.set(ast.identifier, expVal.pointer);
        }
        else {
            [, newState] = setVariableValue(newVariable, heapVal, newState);
        }
        return [expVal, newState];
    }
    if (isGlobal) {
        id++;
        newState.heap.set(String(id), {
            value: expVal, typeStr: ast.type,
            numLiveReferences: 1, type: getType(expVal),
            token: program_1.Tokens.Value, heapPtr: String(id)
        });
        newState.runningInstance.globalScope.set(ast.identifier, String(id));
    }
    else {
        [, newState] = setVariableValue(newVariable, {
            value: expVal, typeStr: ast.type,
            numLiveReferences: 1, type: getType(expVal),
            token: program_1.Tokens.Value
        }, newState);
    }
    return [expVal, newState];
}
function evalClass(ast, state) {
    // console.log("CLASS: " + ast.name);
    return [ast, state];
}
function doOp(left, right, operator) {
    switch (operator) {
        case "*":
            return left * right;
        case "/":
            return left / right;
        case "+":
            return left + right;
        case "-":
            return left - right;
        case "%":
            return left % right;
    }
}
function evalAexp(ast, state) {
    let newState = state;
    let [leftVal, newState2] = evalExpression(ast.left, newState);
    if (typeof (leftVal) != "number") {
        throw new Error("Can't perform arithmetic on a non-number!");
    }
    let ops = [];
    if (Array.isArray(ast.right)) {
        newState2 = ast.right.reduce((prev, curr) => {
            let [opVal, is] = evalAop(curr, prev);
            ops.push(opVal);
            return is;
        }, newState2);
    }
    else {
        let [opVal, newState3] = evalAop(ast.right, newState2);
        ops.push(opVal);
        newState2 = newState3;
    }
    let arithVal = ops.reduce((prev, curr) => {
        return doOp(prev, curr.value, curr.op);
    }, leftVal);
    // console.log("AEXP: " + leftVal);
    return [arithVal, newState2];
}
function evalAop(ast, state) {
    let newState = state;
    let [rightVal, newState2] = evalExpression(ast.value, newState);
    // console.log("AOP: " + ast.operation + " " + rightVal);
    if (typeof (rightVal) != "number") {
        throw new Error("Can't perform arithmetic on a non-number!");
    }
    return [{ op: ast.operation, value: rightVal }, newState2];
}
