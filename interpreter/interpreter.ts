import { argv } from 'process';
import { inspect, isObject } from 'util';
import { ArgDef, ArgsDefine, ArgsIn, ArithmeticExpression, ArithmeticOperation, BooleanExpression, Break, Class, Comment, Definition, Expression, Func, FuncCall, IfBlock, Instantiate, Primitives, Program, Reassignment, Return, Scope, ScopeSpec, Token, Tokens, ValueType, Variable, WhileLoop, Instance, Constructor, ArithmeticOperator, Value } from '../parser/program';
import { sendMsg } from './messageReducer';

// Interpreter State
type IS = {
  heap: HeapWrapper<string, Value>,
  stack: Map<string, Value>[],
  stackPointer: number,
  runningInstance: Instance,
  classes: Map<string, Class>,
  functions: Map<Class, Map<String, Func>>
};
type BreakException = {
  token: Tokens.BreakException,
  state: IS
};

class HeapWrapper<T, S> {

  private heap = new Map<T, S>();

  public get(key: T): S | undefined {
    return this.heap.get(key);
  }

  public set(key: T, val: S) {
    // console.log("Set " + key + " to " + (isInstance((val as any)['value']) ? (val as unknown as Instance) : (val as any)['value']));
    // if (isInstance((val as any)['value'])) {
    //   console.log(val);
    // }
    return this.heap.set(key, val);
  }

  public delete(key: T): boolean {
    return this.heap.delete(key);
  }

}

var id = 0;

function isValue(obj: any) {
  return ["boolean", "string", "number"].includes(typeof (obj)) || obj == undefined || isInstance(obj);
}

function allocateInstance(clazz: Class, argsIn: ArgsIn | undefined, state: IS): [Instance, IS] {
  id++;
  let inst: Instance = {
    token: Tokens.Instance,
    type: clazz.name,
    class: clazz,
    pointer: String(id),
    globalScope: new Map()
  }
  let newState = state;
  let lastInstance = newState.runningInstance;
  newState.runningInstance = inst;
  newState = safeIncStackPointer(newState);
  newState.heap.set(inst.pointer, { value: inst, typeStr: getTypeStr(inst), numLiveReferences: 1, token: Tokens.Value, type: ValueType.Instance, heapPtr: inst.pointer });
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
    } else {
      throw new Error("Invalid value to set global variable " + gd.identifier + " to!");
    }
  });
  newState = safeDecStackPointer(newState);
  newState.runningInstance = lastInstance;
  [, newState] = evalConstructor(clazz.construct, inst, argsIn, newState);
  return [inst, newState];
}

function variableValue(variable: Variable, state: IS): Value {
  if (isNullOrUndef(variable.scope) || variable.scope?.scope.length == 0) {
    let fVal = state.stack[state.stackPointer].get(variable.variableName);
    if (fVal != undefined) return fVal as Value;
    let varPointer = state.runningInstance.globalScope.get(variable.variableName);
    let hVal = varPointer ? state.heap.get(varPointer) : undefined;
    if (hVal != undefined) return hVal as Value;
    throw new Error("Could not find variable: " + variable.variableName);
  } else {
    variable.scope = variable.scope as ScopeSpec;
    let lastInstance: Instance | undefined = undefined;
    for (let i = 0; i < variable.scope.scope.length + 1; i++) {
      if (i == 0) {
        let instVal: Instance;
        let fVal = state.stack[state.stackPointer].get(variable.scope.scope[i]);
        if (fVal == undefined) {
          let varPointer = state.runningInstance.globalScope.get(variable.scope.scope[i]);
          let hVal = varPointer ? state.heap.get(varPointer) : undefined;
          if (hVal == undefined) throw new Error("Couldn't find variable " + variable.variableName + " at " + variable.scope.scope.join(".") + "!");
          instVal = assertIsInstance(hVal as Value, variable, i);;
        } else {
          instVal = assertIsInstance(fVal as Value, variable, i);;
        }
        if (variable.scope.scope.length != 1 && instVal.token != Tokens.Instance) {
          throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
        }
        lastInstance = instVal;
      } else if (i == variable.scope.scope.length) {
        lastInstance = lastInstance as Instance;
        let instVal;
        let varPointer = lastInstance.globalScope.get(variable.variableName);
        let hVal = varPointer ? state.heap.get(varPointer) : undefined;

        if (hVal == undefined) throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
        instVal = hVal;
        return instVal as Value;
      } else {
        lastInstance = lastInstance as Instance;
        let instVal: Instance | undefined;
        let varPointer = lastInstance.globalScope.get(variable.scope.scope[i]);
        let hVal = varPointer ? state.heap.get(varPointer) : undefined;
        if (hVal == undefined) throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
        instVal = assertIsInstance(hVal as Value, variable, i);;
        if (i == variable.scope.scope.length && instVal.token != Tokens.Instance) {
          throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
        }
        lastInstance = instVal;
      }
    }
    throw new Error("Should be unreachable!");
  }
}

function getVarCurrentValueType(variable: Variable, state: IS): ValueType {
  return getType(variableValue(variable, state).value);
}

function assertIsInstance(inst: Value, variable: Variable, i?: number): Instance {
  if (i) {
    if ((inst.value as any)['token'] != Tokens.Instance) {
      if (variable.scope == undefined) {
        throw new Error("Variable " + variable.variableName + " is not an instance!");
      } else {
        throw new Error("Variable " +
          ((i == variable.scope.scope.length) ? variable.variableName : variable.scope?.scope[i + 1]) +
          " can't be found on " + variable.scope.scope.reduce((prev, curr, ind) => {
            return (ind == 0 ? (prev + curr) : (prev + "." + curr));
          }, "") + "!");
      }
    }
  } else {
    if ((inst.value as any)['token'] != Tokens.Instance) {
      if (variable.scope == undefined) {
        throw new Error("Variable " + variable.variableName + "is not an instance!");
      } else {
        throw new Error("Variable " + variable.scope.scope.join(".") + "." + variable.variableName + " is not an instance!");
      }
    }
  }
  return inst.value as Instance;
}

function setVariableValue(variable: Variable, value: Value, state: IS, onHeap?: boolean): [boolean, IS] {
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
          newState.runningInstance.globalScope.set(variable.variableName, value.heapPtr as string);
          return [true, newState];
        } else {
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
  } else {
    variable.scope = variable.scope as ScopeSpec;
    let lastInstance: Instance | undefined;
    for (let i = 0; i < variable.scope.scope.length + 1; i++) {
      if (i == 0) {
        let instVal: Instance;
        let fVal = checkF ? state.stack[state.stackPointer].get(variable.scope.scope[i]) : undefined;
        if (isNullOrUndef(fVal)) {
          let varPointer = state.runningInstance.globalScope.get(variable.scope.scope[i]);
          let hVal = checkH ? (varPointer ? state.heap.get(varPointer) : undefined) : undefined;
          if (isNullOrUndef(hVal)) throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
          instVal = assertIsInstance(hVal as Value, variable, i);;
        } else {
          instVal = assertIsInstance(fVal as Value, variable, i);;
        }
        if (variable.scope.scope.length != 1 && instVal.token != Tokens.Instance) {
          throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
        }
        lastInstance = instVal;
      } else if (i == variable.scope.scope.length) {
        let varPointer = (lastInstance as Instance).globalScope.get(variable.variableName);
        let hVal = checkH ? (varPointer ? state.heap.get(varPointer) : undefined) : undefined;
        if (isNullOrUndef(hVal)) throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
        let newState = state;
        if (hVal?.typeStr != value.typeStr || hVal == undefined) {
          throw new Error("Attempted to assign value of type " + value.typeStr + " to a value of type " + hVal?.typeStr);
        }
        if (isOnHeap(value)) {
          (lastInstance as Instance).globalScope.set(variable.variableName, value.heapPtr as string);
        } else {
          id++;
          (lastInstance as Instance).globalScope.set(variable.variableName, String(id));
          value.heapPtr = String(id);
          newState.heap.set(String(id), value);
        }
        return [true, newState];
      } else {
        let instVal: Instance;
        let varPointer = (lastInstance as Instance).globalScope.get(variable.scope.scope[i]);
        let hVal = varPointer ? state.heap.get(varPointer) : undefined;
        if (isNullOrUndef(hVal)) throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
        instVal = assertIsInstance(hVal as Value, variable, i);
        if (i == variable.scope.scope.length && instVal.token != Tokens.Instance) {
          throw new Error("Couldn't find variable at " + variable.scope.scope.join(".") + "!");
        }
        lastInstance = instVal;
      }
    }
    throw new Error("This should never be reached!");
  }
}

function isNullOrUndef(val: any) {
  return val == null || val == undefined;
}

export function evalProgram(ast: Program): IS {
  let mainClass = ast.classes.find(c => { return (c.functions.find(func => func.name == "main")) != undefined });
  if (isNullOrUndef(mainClass)) {
    throw new Error("Program has no main function!");
  }
  mainClass = mainClass as Class;
  let mainFunc = mainClass.functions.find(func => func.name == "main");
  if (isNullOrUndef(mainFunc)) {
    throw new Error("Program has no main function!");
  }
  mainFunc = mainFunc as Func;
  let interpState: IS = {
    heap: new HeapWrapper(), stack: [new Map(), new Map()], runningInstance: (undefined as unknown as Instance), classes: new Map(),
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

function evalExpression(ast: Token, state: IS): [Primitives | Instance, IS] {
  let newState = state;
  switch (ast.token) {
    case (Tokens.Value):
      return evalValue(ast as Value, newState);
    case (Tokens.ArithmeticExpression):
      return evalAexp(ast as ArithmeticExpression, newState);
    case (Tokens.FuncCall):
      return evalFuncCall(ast as FuncCall, newState);
    case (Tokens.Variable):
      return evalVariable(ast as Variable, newState);
    case (Tokens.Instantiate):
      return evalInstantiate(ast as Instantiate, newState);
    case (Tokens.BooleanExpression):
      return evalBexp(ast as BooleanExpression, newState);
    default:
      console.log(inspect(ast, true, 200));
      throw new Error("Token with tokenType " + ast.token + " found!");
  }
}

function evalAST(ast: Token, state: IS): [any, IS] {
  switch (ast.token) {
    case (Tokens.Class):
      return evalClass(ast as Class, state);
    case (Tokens.Definition):
      return evalDefinition(ast as Definition, state);
    // case (Tokens.Func):
    //   return evalFunction(ast as Func, state);
    // case ("Constructor"):
    //   return evalConstructor(ast, state);
    case (Tokens.Reassignment):
      return evalReassignment(ast as Reassignment, state);
    case (Tokens.ArgsIn):
      return evalArgsIn(ast as ArgsIn, state);
    case (Tokens.IfBlock):
      return evalIfBlock(ast as IfBlock, state);
    case (Tokens.WhileLoop):
      return evalWhileLoop(ast as WhileLoop, state);
    case (Tokens.Break):
      return evalBreak(ast as Break, state);
    case (Tokens.Return):
      return evalReturn(ast as Return, state);
    case (Tokens.Comment):
      return evalComment(ast as Comment, state);
    default:
      return evalExpression(ast, state);
  }
}

function evalComment(ast: Comment, state: IS): [undefined, IS] {
  return [undefined, state];
}

function checkLt(val: Primitives | Instance, val2: Primitives | Instance) {
  if (getTypeStr(val) != getTypeStr(val2)) {
    throw new Error("Cannot compare values of two different types! (" + getTypeStr(val) + " < " + getTypeStr(val2) + ")");
  }
  if (isInstance(val) || isInstance(val2)) {
    throw new Error("Cannot compare using less-than on instances! (" + getTypeStr(val) + " < " + getTypeStr(val2) + ")");
  }
  if (val == undefined || val2 == undefined) {
    throw new Error("Cannot compare using less-than on undefined! (" + getTypeStr(val) + " < " + getTypeStr(val2) + ")");
  } else {
    return val < val2;
  }
}

function checkGt(val: Primitives | Instance, val2: Primitives | Instance) {
  if (getTypeStr(val) != getTypeStr(val2)) {
    throw new Error("Cannot compare values of two different types! (" + getTypeStr(val) + " > " + getTypeStr(val2) + ")");
  }
  if (isInstance(val) || isInstance(val2)) {
    throw new Error("Cannot compare using greater-than on instances! (" + getTypeStr(val) + " > " + getTypeStr(val2) + ")");
  }
  if (val == undefined || val2 == undefined) {
    throw new Error("Cannot compare using greater-than on undefined! (" + getTypeStr(val) + " > " + getTypeStr(val2) + ")");
  } else {
    return val > val2;
  }
}

function checkEq(val: Primitives | Instance, val2: Primitives | Instance) {
  if (getTypeStr(val) != getTypeStr(val2) && val != undefined && val2 != undefined) {
    throw new Error("Cannot compare values of two different types! (" + getTypeStr(val) + " == " + getTypeStr(val2) + ")");
  }
  if (isInstance(val) && isInstance(val2)) {
    return (val as Instance).pointer == (val2 as Instance).pointer;
  }
  return (val as Primitives) == (val2 as Primitives);
}

function checkNeq(val: Primitives | Instance, val2: Primitives | Instance) {
  if (isInstance(val) && isInstance(val2)) {
    return (val as Instance).pointer != (val2 as Instance).pointer;
  }
  return (val as Primitives) != (val2 as Primitives);
}

function checkLte(val: Primitives | Instance, val2: Primitives | Instance) {
  if (getTypeStr(val) != getTypeStr(val2)) {
    throw new Error("Cannot compare values of two different types! (" + getTypeStr(val) + " <= " + getTypeStr(val2) + ")");
  }
  if (isInstance(val) || isInstance(val2)) {
    throw new Error("Cannot compare using less-than-equal on instances! (" + getTypeStr(val) + " <= " + getTypeStr(val2) + ")");
  }
  if (val == undefined || val2 == undefined) {
    throw new Error("Cannot compare using less-than-equal on undefined! (" + getTypeStr(val) + " <= " + getTypeStr(val2) + ")");
  } else {
    return val <= val2;
  }
}

function checkGte(val: Primitives | Instance, val2: Primitives | Instance) {
  if (getTypeStr(val) != getTypeStr(val2)) {
    throw new Error("Cannot compare values of two different types! (" + getTypeStr(val) + " >= " + getTypeStr(val2) + ")");
  }
  if (isInstance(val) || isInstance(val2)) {
    throw new Error("Cannot compare using greater-than-equal on instances! (" + getTypeStr(val) + " >= " + getTypeStr(val2) + ")");
  }
  if (val == undefined || val2 == undefined) {
    throw new Error("Cannot compare using greater-than-equal on undefined! (" + getTypeStr(val) + " >= " + getTypeStr(val2) + ")");
  } else {
    return val >= val2;
  }
}

// Evaluate boolean expressions
function evalBexp(ast: BooleanExpression, state: IS): [boolean, IS] {
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
function evalReturn(ast: Return, state: IS): [Primitives | Instance, IS] {
  if (ast.value == undefined) {
    let newState = state;
    // console.log("RETURN: undefined");

    return [undefined, newState];
  } else {
    let [value, newState] = evalExpression(ast.value, state);
    // console.log("RETURN: " + valToString(value));

    return [value, newState];
  }
}

function evalBreak(ast: Break, state: IS): [undefined, IS] {
  // console.log("BREAK");
  let be: BreakException = { token: Tokens.BreakException, state: state };
  throw be;
}

const LOOP_LIMIT = 10000;

function evalWhileLoop(ast: WhileLoop, state: IS): [undefined, IS] {
  let [val, newState] = evalExpression(ast.expression, state);
  // let log = "WHILE LOOP ";
  let i = 0;
  while (val == true) {
    i++;
    if (i > LOOP_LIMIT) { sendMsg({ tag: 'log', content: "Infinite loop detected! Loop looped more than LOOP_LIMIT=" + LOOP_LIMIT }); break };
    // log += "TRUE: " + val;
    // Implement breaks w/ exceptions
    try {
      for (let w of ast.within) {
        [, newState] = evalAST(w, newState);
      }
    } catch (e) {
      if (e.token == Tokens.BreakException) {
        newState = e.state;
        break;
      } else {
        throw e;
      }
    }
    [val, newState] = evalExpression(ast.expression, newState);
  }
  return [undefined, newState];
}

function evalIfBlock(ast: IfBlock, state: IS): [undefined, IS] {
  let [ifBlockVal, newState] = evalExpression(ast.ifBlock.expression, state);
  if (ifBlockVal == true) {
    // console.log("IF: " + ast.ifBlock.expression);
    ast.ifBlock.within.forEach(w => {
      [, newState] = evalAST(w, newState);
    });
  } else {
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
    } else {
      // console.log("NO-ENTER-IF");
    }
  }
  return [undefined, newState];
}

function evalInstantiate(ast: Instantiate, state: IS): [Instance, IS] {
  // console.log("INSTANTIATE: " + ast.className);
  let clazz = state.classes.get(ast.className);
  if (isNullOrUndef(clazz)) throw new Error("No class with name: " + ast.className);
  let [newInstance, newState] = allocateInstance((clazz as Class), ast.args, state);
  return [newInstance, newState];
}

function isInstance(value: Primitives | Instance): boolean {
  if (value == undefined) return false;
  return (value as any)['token'] == Tokens.Instance;
}

function isOnHeap(value: Value): boolean {
  return (value.heapPtr != undefined);
}

function evalReassignment(ast: Reassignment, state: IS): [Primitives | Instance, IS] {
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
      let inst = (newState.heap.get((expVal as Instance).pointer) as Value);
      inst.numLiveReferences++;
      varVal.numLiveReferences--;
      [, newState] = setVariableValue(ast.variable, inst, newState);
    } else {
      let inst = (newState.heap.get((expVal as Instance).pointer) as Value);
      // TODO: P sure unneeded
      // inst.numLiveReferences++;
      inst.numLiveReferences += varVal.numLiveReferences;
      varVal.numLiveReferences--;
      [, newState] = setVariableValue(ast.variable, inst, newState);
    }
  } else {
    // VarVal is on the heap instead of isInstance
    if (isOnHeap(varVal)) {
      [, newState] = setVariableValue(ast.variable, {
        typeStr: getTypeStr(expVal), numLiveReferences: 1, value: expVal,
        type: getType(expVal), token: Tokens.Value
      }, newState);
      varVal.numLiveReferences--;
    } else {
      [, newState] = setVariableValue(ast.variable, {
        typeStr: getTypeStr(expVal), numLiveReferences: varVal.numLiveReferences, value: expVal,
        type: getType(expVal), token: Tokens.Value
      }, newState);
      varVal.numLiveReferences--;
    }
  }
  return [expVal, newState];
}

function evalVariable(ast: Variable, state: IS): [Primitives | Instance, IS] {
  let s = variableValue(ast, state);
  // console.log("VARIABLE: " + ast.variableName + " = " + valToString(s.value));
  return [s.value, state];
}

function evalArgsIn(ast: ArgsIn, state: IS): [ArgsIn, IS] {
  // console.log("ARGSIN: " + ast.args);
  return [ast, state];
}

function evalScopeSpec(ast: ScopeSpec, state: IS): [ScopeSpec, IS] {
  // console.log("SCOPESPEC: " + ast.scope);
  return [ast, state];
}

function safeIncStackPointer(state: IS): IS {
  let newState = state;
  newState.stackPointer++;
  if (newState.stack.length <= newState.stackPointer) {
    newState.stack.push(new Map());
  }
  return newState;
}

function safeDecStackPointer(state: IS): IS {
  let newState = state;
  newState.stackPointer--;
  return newState;
}

function clearInstance(inst: Instance, state: IS): [undefined, IS] {
  let newState = state;
  for (let heapPtr of Array.from(inst.globalScope.values())) {
    let heapVal = newState.heap.get(heapPtr);
    heapVal = heapVal ? heapVal : ((() => { throw new Error("Heap val not found at pointer " + heapPtr + "!"); })());
    if (isInstance(heapVal.value)) {
      [, newState] = clearInstance(heapVal.value as Instance, newState);
    }
    if (heapVal.numLiveReferences == 0) {
      console.log("Deleted pointer " + heapPtr + " from the heap!");
      newState.heap.delete(heapPtr);
    }
  }
  return [undefined, newState];
}

function clearStack(state: IS): IS {
  let newState = state;
  Array.from(newState.stack[newState.stackPointer].entries()).forEach(([key, val]) => {
    val.numLiveReferences--;
    if (isInstance(val.value) && val.numLiveReferences == 0) {
      [, newState] = clearInstance(val.value as Instance, newState);
    } else {
      if (isOnHeap(val)) {
        if (val.numLiveReferences == 0) {
          newState.heap.delete(val.heapPtr as string);
        }
      }
    }
  });
  newState.stack[newState.stackPointer].clear();
  return newState;
}

function evalFuncCall(ast: FuncCall, state: IS): [Primitives | Instance, IS] {
  let newState = state;
  let argsArray = ast.args ? ast.args.args : [];
  if (argsArray.length != (ast.args ? ast.args.args.length : 0)) {
    throw new Error("Too many or too few arguments passed to function call!");
  }
  let argsVals: (Primitives | Instance)[] = [];
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
  } else {
    ast.scope = ast.scope as ScopeSpec;
    // console.log check -------------------------------------------------------
    if (ast.scope.scope.length == 1 && ast.scope.scope[0] == "console" && ast.functionName == "log") {
      if (ast.args) {
        for (let arg of argsVals) {
          sendMsg({ tag: 'log', content: arg });
        }
      }
      return [undefined, newState];
    }
    // -------------------------------------------------------------------------
    let variableScope = ast.scope.scope.slice(0, ast.scope.scope.length - 1);
    let variableName = ast.scope.scope[ast.scope.scope.length - 1];
    let varFunctionParent: Variable = {
      token: Tokens.Variable,
      variableName: variableName,
      type: ValueType.Instance,
      typeStr: "unknown",
      scope: {
        token: Tokens.ScopeSpec,
        scope: variableScope
      }
    };
    let functionParentInst = variableValue(varFunctionParent, newState);
    varFunctionParent.typeStr = getTypeStr(functionParentInst.value);
    if (!isInstance(functionParentInst.value)) {
      throw new Error("Functions do not exist on primitive at: " + ast.scope.scope.join("."));
    }
    let calledInst: Instance = functionParentInst.value as Instance;
    let lastInstance = newState.runningInstance;
    newState.runningInstance = calledInst;
    let func = newState.functions.get(calledInst.class)?.get(ast.functionName);
    if (isNullOrUndef(func)) {
      throw new Error("Function " + ast.functionName + " could not be found at: " + ast.scope?.scope.join("."));
    }
    let [funcVal, newState2] = evalFunction((func as Func), argsVals, newState);
    newState2.runningInstance = lastInstance;
    return [funcVal, newState2];
  }
}

function evalFunction(ast: Func, argsVals: (Primitives | Instance)[], state: IS): [Primitives | Instance, IS] {
  let newState = state;
  newState = safeIncStackPointer(newState);
  if (ast.args) {
    ast.args.args.forEach((argdef, ind) => {
      if (isInstance(argsVals[ind])) {
        let instVal = (newState.heap.get((argsVals[ind] as Instance).pointer) as Value);
        instVal.numLiveReferences++;
        newState.stack[newState.stackPointer].set(argdef.identifier, instVal);
      } else {
        newState.stack[newState.stackPointer].set(argdef.identifier, {
          value: argsVals[ind], typeStr: getTypeStr(argsVals[ind]),
          numLiveReferences: 1, type: getType(argsVals[ind]),
          token: Tokens.Value
        });
      }
    });
  }
  let returnVal = undefined;
  for (let wi of ast.within) {
    if (wi.token == Tokens.Return) {
      let ret: Return = wi as Return;
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

function evalConstructor(ast: Constructor, instance: Instance, argsIn: ArgsIn | undefined, state: IS): [undefined, IS] {
  let newState = state;
  let argsArray = argsIn ? argsIn.args : [];
  if (argsArray.length != (ast.args ? ast.args.args.length : 0)) {
    throw new Error("Too many or too few arguments passed to constructor for: " + ast.parent.name + "!");
  }
  let argsVals: (Primitives | Instance)[] = [];
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
        let instVal = (newState.heap.get((argsVals[ind] as Instance).pointer) as Value);
        instVal.numLiveReferences++;
        newState.stack[newState.stackPointer].set(argdef.identifier, instVal);
      } else {
        newState.stack[newState.stackPointer].set(argdef.identifier, {
          value: argsVals[ind], typeStr: getTypeStr(argsVals[ind]),
          numLiveReferences: 1, type: getType(argsVals[ind]),
          token: Tokens.Value
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

function evalArgsDefine(ast: ArgsDefine, state: IS): [ArgsDefine, IS] {
  return [ast, state];
}

function evalValue(ast: Value, state: IS): [Primitives | Instance, IS] {
  // console.log("VALUE: " + ast.value);
  return [ast.value, state];
}

function getTypeStr(value: Primitives | Instance): string | "boolean" |
  "number" | "string" | "undefined" {
  if (isInstance(value)) {
    return (value as Instance).type;
  } else {
    switch (typeof (value)) {
      case "boolean":
        return "boolean";
      case "number":
        return "number"
      case "string":
        return "string";
      case "undefined":
        return "undefined";
      default:
        throw new Error("Unexpected literal!");
    }
  }
}

function getType(obj: Primitives | Instance): ValueType {
  if (obj == undefined) {
    return ValueType.Undefined
  }
  if (isInstance(obj)) {
    return ValueType.Instance;
  } else {
    if (typeof (obj) == "string") {
      return ValueType.String;
    }
    if (typeof (obj) == "number") {
      return ValueType.Number;
    }
    if (typeof (obj) == "boolean") {
      return ValueType.Boolean;
    }
  }
  return ValueType.Undefined;
}

function valToString(value: Primitives | Instance): string {
  if (isInstance(value)) {
    let inst = (value as Instance);
    return inst.type + " (" + Array.from(inst.globalScope.entries()).map(([e, k]) => "[" + e + "," + k + "]") + ")";
  } else {
    return (value ? value : "undefined") + "";
  }
}

function evalDefinition(ast: Definition, state: IS, isGlobal?: boolean): [Primitives | Instance, IS] {
  let newState: IS;
  let expVal: Primitives | Instance;
  if (ast.equals == undefined) {
    newState = state;
    expVal = undefined;
  } else {
    let [expVal2, newState2] = evalExpression(ast.equals, state);
    newState = newState2;
    expVal = expVal2;
  }
  // console.log("DEFINE: " + ast.type + " " + ast.identifier + " as " + valToString(expVal));
  let newVariable: Variable = {
    token: Tokens.Variable,
    variableName: ast.identifier,
    type: getType(expVal),
    typeStr: ast.type
  };
  let expValTypeStr = getTypeStr(expVal);
  if (expValTypeStr != "undefined" && expValTypeStr != ast.type) {
    throw new Error("Cannot assign value of type " + expValTypeStr + " to variable " + ast.identifier + " of type " + ast.type);
  }
  if (isInstance(expVal)) {
    expVal = (expVal as Instance);
    let heapVal = newState.heap.get(expVal.pointer);
    heapVal = heapVal ? heapVal : ((() => { throw new Error("Heap val not found at pointer " + expVal.pointer + "!"); })());
    heapVal.numLiveReferences++;
    if (isGlobal) {
      newState.runningInstance.globalScope.set(ast.identifier, expVal.pointer);
    } else {
      [, newState] = setVariableValue(newVariable, heapVal, newState);
    }
    return [expVal, newState];
  }
  if (isGlobal) {
    id++;
    newState.heap.set(String(id), {
      value: expVal, typeStr: ast.type,
      numLiveReferences: 1, type: getType(expVal),
      token: Tokens.Value, heapPtr: String(id)
    });
    newState.runningInstance.globalScope.set(ast.identifier, String(id));
  } else {
    [, newState] = setVariableValue(newVariable, {
      value: expVal, typeStr: ast.type,
      numLiveReferences: 1, type: getType(expVal),
      token: Tokens.Value
    }, newState);
  }
  return [expVal, newState];
}

function evalClass(ast: Class, state: IS): [Class, IS] {
  // console.log("CLASS: " + ast.name);
  return [ast, state];
}

function doOp(left: number, right: number, operator: ArithmeticOperator): number {
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

function evalAexp(ast: ArithmeticExpression, state: IS): [number, IS] {
  let newState = state;
  let [leftVal, newState2] = evalExpression(ast.left, newState);
  if (typeof (leftVal) != "number") {
    throw new Error("Can't perform arithmetic on a non-number!");
  }
  let ops: { op: ArithmeticOperator, value: number }[] = [];
  if (Array.isArray(ast.right)) {
    newState2 = ast.right.reduce((prev, curr) => {
      let [opVal, is] = evalAop(curr, prev);
      ops.push(opVal);
      return is;
    }, newState2);
  } else {
    let [opVal, newState3] = evalAop(ast.right, newState2);
    ops.push(opVal);
    newState2 = newState3;
  }
  let arithVal = ops.reduce((prev: number, curr: { op: ArithmeticOperator, value: number }) => {
    return doOp(prev, curr.value, curr.op);
  }, leftVal);
  // console.log("AEXP: " + leftVal);
  return [arithVal, newState2];
}

function evalAop(ast: ArithmeticOperation, state: IS): [{ op: ArithmeticOperator, value: number }, IS] {
  let newState = state;
  let [rightVal, newState2] = evalExpression(ast.value, newState);
  // console.log("AOP: " + ast.operation + " " + rightVal);
  if (typeof (rightVal) != "number") {
    throw new Error("Can't perform arithmetic on a non-number!");
  }
  return [{ op: ast.operation, value: rightVal }, newState2];
}