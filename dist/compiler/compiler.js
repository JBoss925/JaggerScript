"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToProgram = convertToProgram;
const util_1 = require("util");
const program_1 = require("../parser/program");
function isNullOrUndef(val) {
    return val == null || val == undefined;
}
function convertToProgram(ast, additionalData) {
    let prog = {
        token: program_1.Tokens.Program,
        classes: ast.map((c) => convertAST(c, additionalData)).filter((c) => c.token != program_1.Tokens.Comment)
    };
    return prog;
}
function convertExpression(ast, additionalData) {
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
            console.log((0, util_1.inspect)(ast, true, 200));
            throw new Error("Token with tokenType " + ast.tokenType + " found!");
    }
}
function convertAST(ast, additionalData) {
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
function handleComment(ast, additionalData) {
    return {
        token: program_1.Tokens.Comment,
        comment: ast.comment
    };
}
function handleConstructor(ast, additionalData) {
    // assert(!isNullOrUndef(additionalData.parent) && typeof (additionalData.parent) == "string");
    let construct = {
        token: program_1.Tokens.Constructor,
        parent: additionalData.parent,
        args: ast.args ? handleArgsDefine(ast.args, additionalData) : undefined,
        within: ast.within.map((child) => convertAST(child, additionalData))
    };
    return construct;
}
function handleBexp(ast, additionalData) {
    // assert(["<", ">", "<=", ">=", "==", "!="].includes(ast.op));
    let boolExp = {
        token: program_1.Tokens.BooleanExpression,
        operator: ast.op,
        left: convertExpression(ast.left, additionalData),
        right: convertExpression(ast.right, additionalData)
    };
    return boolExp;
}
function handleReturn(ast, additionalData) {
    let returnToken = {
        token: program_1.Tokens.Return,
        value: ast.value ? convertExpression(ast.value, additionalData) : undefined
    };
    return returnToken;
}
function handleBreak(ast, additionalData) {
    let breakToken = {
        token: program_1.Tokens.Break
    };
    return breakToken;
}
function handleWhileLoop(ast, additionalData) {
    let whileLoop = {
        token: program_1.Tokens.WhileLoop,
        expression: convertExpression(ast.expression),
        within: ast.within.map((v) => convertAST(v, additionalData))
    };
    return whileLoop;
}
function handleIfBlock(ast, additionalData) {
    let ifBlock = {
        token: program_1.Tokens.IfBlock,
        ifBlock: {
            expression: convertExpression(ast.ifBlock.expression),
            within: ast.ifBlock.within.map((v) => convertAST(v, additionalData)),
        },
        elifBlocks: ast.elifBlocks ? ast.elifBlocks.map((efBlock) => {
            return {
                token: program_1.Tokens.ElifBlock,
                expression: convertExpression(efBlock.expression, additionalData),
                within: efBlock.within.map((v) => convertAST(v, additionalData))
            };
        }) : undefined,
        elseBlock: ast.elseBlock ? {
            token: program_1.Tokens.ElseBlock,
            within: ast.elseBlock.within.map((v) => convertAST(v, additionalData))
        } : undefined
    };
    return ifBlock;
}
function handleInstantiate(ast, additionalData) {
    let instantiate = {
        token: program_1.Tokens.Instantiate,
        className: ast.className,
        args: ast.args ? handleArgsIn(ast.args, additionalData) : undefined
    };
    return instantiate;
}
function handleReassignment(ast, additionalData) {
    let reassignment = {
        token: program_1.Tokens.Reassignment,
        variable: handleVariable(ast.variable, additionalData),
        equals: convertExpression(ast.equals, additionalData)
    };
    return reassignment;
}
function handleVariable(ast, additionalData) {
    let variable = {
        token: program_1.Tokens.Variable,
        scope: ast.scope ? handleScopeSpec(ast.scope, additionalData) : undefined,
        variableName: ast.variableName,
        type: program_1.ValueType.Unknown,
        typeStr: "unknown"
    };
    return variable;
}
function handleArgsIn(ast, additionalData) {
    let argsIn = {
        token: program_1.Tokens.ArgsIn,
        args: Array.isArray(ast.args) ? ast.args.map((arg) => { return convertAST(arg, additionalData); }) : [convertAST(ast.args, additionalData)]
    };
    return argsIn;
}
function handleScopeSpec(ast, additionalData) {
    let scopeSpec = {
        token: program_1.Tokens.ScopeSpec,
        scope: ast.scope.split(".")
    };
    return scopeSpec;
}
function handleFuncCall(ast, additionalData) {
    let funcCall = {
        token: program_1.Tokens.FuncCall,
        functionName: ast.functionName,
        args: ast.args ? handleArgsIn(ast.args, additionalData) : undefined,
        scope: ast.scope ? handleScopeSpec(ast.scope, additionalData) : undefined
    };
    return funcCall;
}
function handleAop(ast, additionalData) {
    // assert(["+", "-", "/", "*"].includes(ast.op));
    let aop = {
        token: program_1.Tokens.ArithmeticOperation,
        operation: ast.op,
        value: convertExpression(ast.value, additionalData)
    };
    return aop;
}
function handleAexp(ast, additionalData) {
    let aexp = {
        token: program_1.Tokens.ArithmeticExpression,
        left: ast.left ? convertExpression(ast.left, additionalData) : ((() => { throw new Error("Left of Aexp was undefined! " + ast); })()),
        right: ast.right ? (Array.isArray(ast.right) ? ast.right.map((val) => handleAop(val, additionalData)) : [handleAop(ast.right, additionalData)]) : ((() => { throw new Error("Left of Aexp was undefined! " + ast); })())
    };
    // assert(!ast.right.some(val => val.token != Tokens.ArithmeticOperation));
    return aexp;
}
function handleFunction(ast, additionalData) {
    // assert(!isNullOrUndef(additionalData.parent) && typeof (additionalData.parent) == "string");
    let func = {
        token: program_1.Tokens.Func,
        parent: additionalData.parent,
        name: ast.funcName,
        scopes: new Map(),
        args: ast.args ? handleArgsDefine(ast.args, additionalData) : undefined,
        within: ast.within.map((child) => convertAST(child, additionalData))
    };
    return func;
}
function handleArgDef(ast, additionalData) {
    let argDef = {
        token: program_1.Tokens.ArgDef,
        type: ast.type,
        identifier: ast.identifier
    };
    return argDef;
}
function handleArgsDefine(ast, additionalData) {
    let argsDefine = {
        token: program_1.Tokens.ArgsDefine,
        args: ast.args.map((ad) => handleArgDef(ad, additionalData))
    };
    return argsDefine;
}
function handlePrimitive(ast, additionalData) {
    // assert(["number", "string", "boolean"].includes(ast.type));
    if (ast.type == "number") {
        // assert(!isNullOrUndef(ast.value) && !isNaN(Number(ast.value)));
        let value = {
            token: program_1.Tokens.Value,
            type: program_1.ValueType.Number,
            value: Number(ast.value),
            typeStr: "number",
            numLiveReferences: 0
        };
        return value;
    }
    if (ast.type == "string") {
        // assert(!isNullOrUndef(ast.value));
        let value = {
            token: program_1.Tokens.Value,
            type: program_1.ValueType.String,
            value: String(ast.value),
            typeStr: "string",
            numLiveReferences: 0
        };
        return value;
    }
    if (ast.type == "boolean") {
        // assert(["true", "false"].includes(ast.value));
        let value = {
            token: program_1.Tokens.Value,
            type: program_1.ValueType.Boolean,
            value: Boolean(ast.value),
            typeStr: "boolean",
            numLiveReferences: 0
        };
        return value;
    }
    if (ast.type == "undefined") {
        let value = {
            token: program_1.Tokens.Value,
            type: program_1.ValueType.Undefined,
            value: undefined,
            typeStr: "undefined",
            numLiveReferences: 0
        };
        return value;
    }
    throw new Error("Unrecognized primitive!");
}
function handleDefinition(ast, additionalData) {
    let def = {
        token: program_1.Tokens.Definition,
        type: ast.type,
        identifier: ast.identifier,
        equals: ast.equals ? convertExpression(ast.equals, additionalData) : undefined
    };
    return def;
}
function handleClass(ast, additionalData) {
    let s = {
        token: program_1.Tokens.Class,
        name: ast.className,
        scope: new Map(),
        globalVars: [],
        functions: [],
        construct: {}
    };
    let globalDefs = ast.within.filter((t) => t.tokenType == "Definition");
    globalDefs = globalDefs.map(gDef => {
        return convertAST(gDef, { parent: s, ...additionalData });
    });
    let functions = ast.within.filter((t) => t.tokenType == "Function");
    functions = functions.map(funcDef => {
        return convertAST(funcDef, { parent: s, ...additionalData });
    });
    let constructorTok = ast.within.filter((t) => t.tokenType == "Constructor");
    if (constructorTok.length <= 0)
        throw new Error("No constructor given for class " + ast.className + "!");
    let constructor = convertAST(constructorTok[0], { parent: s, ...additionalData });
    s.globalVars = globalDefs;
    s.functions = functions;
    s.construct = constructor;
    return s;
}
