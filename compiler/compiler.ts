import { inspect } from 'util';
import { ArgDef, ArgsDefine, ArgsIn, ArithmeticExpression, ArithmeticOperation, BooleanExpression, Break, Class, Comment, Constructor, Definition, Expression, Func, FuncCall, IfBlock, Instantiate, Primitives, Program, Reassignment, Return, Scope, ScopeSpec, Token, Tokens, Value, ValueType, Variable, WhileLoop } from '../parser/program';

function isNullOrUndef(val: any) {
  return val == null || val == undefined;
}

export function convertToProgram(ast: any, additionalData?: any): Program {
  let prog: Program = {
    token: Tokens.Program,
    classes: ast.map((c: Token) => convertAST(c, additionalData))
  };
  return prog;
}

function convertExpression(ast: any, additionalData?: any): Expression {
  switch (ast.tokenType) {
    case ("Primitive"):
      return handlePrimitive(ast, additionalData);
    case ("ArithmeticExpression"):
      return handleAexp(ast, additionalData);
    case ("FuncCall"):
      return handleFuncCall(ast, additionalData);
    case ("Variable"):
      return handleVariable(ast, additionalData);
    case ("Instantiate"):
      return handleInstantiate(ast, additionalData);
    case ("BooleanExpression"):
      return handleBexp(ast, additionalData);
    default:
      console.log(inspect(ast, true, 200));
      throw new Error("Token with tokenType " + ast.tokenType + " found!");
  }
}

function convertAST(ast: any, additionalData?: any): Token {
  switch (ast.tokenType) {
    case ("Class"):
      return handleClass(ast, additionalData);
    case ("Definition"):
      return handleDefinition(ast, additionalData);
    case ("Constructor"):
      return handleConstructor(ast, additionalData);
    case ("Function"):
      return handleFunction(ast, additionalData);
    case ("Reassignment"):
      return handleReassignment(ast, additionalData);
    case ("ArgumentsIn"):
      return handleArgsIn(ast, additionalData);
    case ("IfBlock"):
      return handleIfBlock(ast, additionalData);
    case ("WhileLoop"):
      return handleWhileLoop(ast, additionalData);
    case ("Break"):
      return handleBreak(ast, additionalData);
    case ("Return"):
      return handleReturn(ast, additionalData);
    case ("Comment"):
      return handleComment(ast, additionalData);
    default:
      return convertExpression(ast, additionalData);
  }
}

function handleComment(ast: any, additionalData?: any): Comment {
  return {
    token: Tokens.Comment,
    comment: ast.comment
  };
}

function handleConstructor(ast: any, additionalData?: any): Constructor {
  // assert(!isNullOrUndef(additionalData.parent) && typeof (additionalData.parent) == "string");
  let construct: Constructor = {
    token: Tokens.Constructor,
    parent: additionalData.parent,
    args: ast.args ? handleArgsDefine(ast.args, additionalData) : undefined,
    within: ast.within.map((child: Token) => convertAST(child, additionalData))
  };
  return construct;
}

function handleBexp(ast: any, additionalData?: any): BooleanExpression {
  // assert(["<", ">", "<=", ">=", "==", "!="].includes(ast.op));
  let boolExp: BooleanExpression = {
    token: Tokens.BooleanExpression,
    operator: ast.op,
    left: convertExpression(ast.left, additionalData),
    right: convertExpression(ast.right, additionalData)
  };
  return boolExp;
}

function handleReturn(ast: any, additionalData?: any): Return {
  let returnToken: Return = {
    token: Tokens.Return,
    value: ast.value ? convertExpression(ast.value, additionalData) : undefined
  };
  return returnToken;
}

function handleBreak(ast: any, additionalData?: any): Break {
  let breakToken: Break = {
    token: Tokens.Break
  };
  return breakToken;
}

function handleWhileLoop(ast: any, additionalData?: any): WhileLoop {
  let whileLoop: WhileLoop = {
    token: Tokens.WhileLoop,
    expression: convertExpression(ast.expression),
    within: ast.within.map((v: Token) => convertAST(v, additionalData))
  };
  return whileLoop;
}

function handleIfBlock(ast: any, additionalData?: any): IfBlock {
  let ifBlock: IfBlock = {
    token: Tokens.IfBlock,
    ifBlock: {
      expression: convertExpression(ast.ifBlock.expression),
      within: ast.ifBlock.within.map((v: Token) => convertAST(v, additionalData)),
    },
    elifBlocks: ast.elifBlocks ? ast.elifBlocks.map((efBlock: any) => {
      return {
        token: Tokens.ElifBlock,
        expression: convertExpression(efBlock.expression, additionalData),
        within: efBlock.within.map((v: Token) => convertAST(v, additionalData))
      }
    }) : undefined,
    elseBlock: ast.elseBlock ? {
      token: Tokens.ElseBlock,
      within: ast.elseBlock.within.map((v: Token) => convertAST(v, additionalData))
    } : undefined
  };
  return ifBlock;
}

function handleInstantiate(ast: any, additionalData?: any): Instantiate {
  let instantiate: Instantiate = {
    token: Tokens.Instantiate,
    className: ast.className,
    args: ast.args ? handleArgsIn(ast.args, additionalData) : undefined
  };
  return instantiate;
}

function handleReassignment(ast: any, additionalData?: any): Reassignment {
  let reassignment: Reassignment = {
    token: Tokens.Reassignment,
    variable: handleVariable(ast.variable, additionalData),
    equals: convertExpression(ast.equals, additionalData)
  };
  return reassignment;
}

function handleVariable(ast: any, additionalData?: any): Variable {
  let variable: Variable = {
    token: Tokens.Variable,
    scope: ast.scope ? handleScopeSpec(ast.scope, additionalData) : undefined,
    variableName: ast.variableName,
    type: ValueType.Unknown,
    typeStr: "unknown"
  };
  return variable;
}

function handleArgsIn(ast: any, additionalData?: any): ArgsIn {
  let argsIn: ArgsIn = {
    token: Tokens.ArgsIn,
    args: Array.isArray(ast.args) ? ast.args.map((arg: Token) => { return convertAST(arg, additionalData); }) : [convertAST(ast.args, additionalData)]
  };
  return argsIn;
}

function handleScopeSpec(ast: any, additionalData?: any): ScopeSpec {
  let scopeSpec: ScopeSpec = {
    token: Tokens.ScopeSpec,
    scope: ast.scope.split(".")
  };
  return scopeSpec;
}

function handleFuncCall(ast: any, additionalData?: any): FuncCall {
  let funcCall: FuncCall = {
    token: Tokens.FuncCall,
    functionName: ast.functionName,
    args: ast.args ? handleArgsIn(ast.args, additionalData) : undefined,
    scope: ast.scope ? handleScopeSpec(ast.scope, additionalData) : undefined
  };
  return funcCall;
}

function handleAop(ast: any, additionalData?: any): ArithmeticOperation {
  // assert(["+", "-", "/", "*"].includes(ast.op));
  let aop: ArithmeticOperation = {
    token: Tokens.ArithmeticOperation,
    operation: ast.op,
    value: convertExpression(ast.value, additionalData)
  };
  return aop;
}

function handleAexp(ast: any, additionalData?: any): ArithmeticExpression {
  let aexp: ArithmeticExpression = {
    token: Tokens.ArithmeticExpression,
    left: ast.left ? convertExpression(ast.left, additionalData) : ((() => { throw new Error("Left of Aexp was undefined! " + ast); })()),
    right: ast.right ? (Array.isArray(ast.right) ? ast.right.map((val: any) => handleAop(val, additionalData)) : [handleAop(ast.right, additionalData)]) : ((() => { throw new Error("Left of Aexp was undefined! " + ast); })())
  };
  // assert(!ast.right.some(val => val.token != Tokens.ArithmeticOperation));
  return aexp;
}

function handleFunction(ast: any, additionalData?: any): Func {
  // assert(!isNullOrUndef(additionalData.parent) && typeof (additionalData.parent) == "string");
  let func: Func = {
    token: Tokens.Func,
    parent: additionalData.parent,
    name: ast.funcName,
    scopes: new Map<string, Value>(),
    args: ast.args ? handleArgsDefine(ast.args, additionalData) : undefined,
    within: ast.within.map((child: Token) => convertAST(child, additionalData))
  };
  return func;
}

function handleArgDef(ast: any, additionalData?: any): ArgDef {
  let argDef: ArgDef = {
    token: Tokens.ArgDef,
    type: ast.type,
    identifier: ast.identifier
  };
  return argDef;
}

function handleArgsDefine(ast: any, additionalData?: any): ArgsDefine {
  let argsDefine: ArgsDefine = {
    token: Tokens.ArgsDefine,
    args: ast.args.map((ad: any) => handleArgDef(ad, additionalData))
  }
  return argsDefine;
}

function handlePrimitive(ast: any, additionalData?: any): Value {
  // assert(["number", "string", "boolean"].includes(ast.type));
  if (ast.type == "number") {
    // assert(!isNullOrUndef(ast.value) && !isNaN(Number(ast.value)));
    let value: Value = {
      token: Tokens.Value,
      type: ValueType.Number,
      value: Number(ast.value),
      typeStr: "number",
      numLiveReferences: 0
    };
    return value;
  }
  if (ast.type == "string") {
    // assert(!isNullOrUndef(ast.value));
    let value: Value = {
      token: Tokens.Value,
      type: ValueType.String,
      value: String(ast.value),
      typeStr: "string",
      numLiveReferences: 0
    };
    return value;
  }
  if (ast.type == "boolean") {
    // assert(["true", "false"].includes(ast.value));
    let value: Value = {
      token: Tokens.Value,
      type: ValueType.Boolean,
      value: Boolean(ast.value),
      typeStr: "boolean",
      numLiveReferences: 0
    };
    return value;
  }
  throw new Error("Unrecognized primitive!")
}

function handleDefinition(ast: any, additionalData?: any): Definition {
  let def: Definition = {
    token: Tokens.Definition,
    type: ast.type,
    identifier: ast.identifier,
    equals: ast.equals ? convertExpression(ast.equals, additionalData) : undefined
  }
  return def;
}

function handleClass(ast: any, additionalData?: any): Class {
  let s: Class = {
    token: Tokens.Class,
    name: ast.className,
    scope: new Map<string, Value>(),
    globalVars: [],
    functions: [],
    construct: {} as Constructor
  };
  let globalDefs: any[] = ast.within.filter((t: any) => t.tokenType == "Definition");
  globalDefs = globalDefs.map(gDef => {
    return convertAST(gDef, { parent: s, ...additionalData });
  });
  let functions: any[] = ast.within.filter((t: any) => t.tokenType == "Function");
  functions = functions.map(funcDef => {
    return convertAST(funcDef, { parent: s, ...additionalData });
  });
  let constructorTok: any[] = ast.within.filter((t: any) => t.tokenType == "Constructor");
  if (constructorTok.length <= 0) throw new Error("No constructor given for class " + ast.className + "!");
  let constructor = convertAST(constructorTok[0], { parent: s, ...additionalData });
  s.globalVars = globalDefs;
  s.functions = functions;
  s.construct = constructor as Constructor;
  return s;
}