// Generic Token Type ----------------------------------------------------------
export type Token = {
  token: string
}
// -----------------------------------------------------------------------------


// Overall program -------------------------------------------------------------
export type Program = {
  token: Tokens.Program,
  classes: Class[]
}
// -----------------------------------------------------------------------------


// Classes and Funcs -----------------------------------------------------------
export type Class = {
  token: Tokens.Class,
  name: string,
  scope: Scope,
  globalVars: Definition[]
  functions: Func[],
  construct: Constructor
}

export type Constructor = {
  token: Tokens.Constructor,
  parent: Class,
  args: ArgsDefine | undefined,
  within: WithinFunction[]
}

export type Func = {
  token: Tokens.Func,
  parent: Class,
  name: string,
  scopes: Scope,
  args: ArgsDefine | undefined,
  within: WithinFunction[]
}
// -----------------------------------------------------------------------------


// Building blocks -------------------------------------------------------------
export type Definition = {
  token: Tokens.Definition,
  type: string,
  identifier: string,
  equals: Expression | undefined
}

export type Reassignment = {
  token: Tokens.Reassignment,
  variable: Variable,
  equals: Expression
}

export type Return = {
  token: Tokens.Return,
  value: Expression | undefined
}

export type Break = {
  token: Tokens.Break
}

export type Instantiate = {
  token: Tokens.Instantiate,
  className: string,
  args?: ArgsIn
}

export type Variable = {
  token: Tokens.Variable,
  scope?: ScopeSpec,
  variableName: string,
  type: ValueType,
  typeStr: string
}

export type FuncCall = {
  token: Tokens.FuncCall,
  functionName: string,
  args?: ArgsIn,
  scope?: ScopeSpec
}

export type ArgsIn = {
  token: Tokens.ArgsIn,
  args: Expression[]
}

export type ArgsDefine = {
  token: Tokens.ArgsDefine
  args: ArgDef[]
}

export type ArgDef = {
  token: Tokens.ArgDef,
  type: string,
  identifier: string
}

export type Scope = Map<string, Value>

export type IfBlock = {
  token: Tokens.IfBlock,
  ifBlock: {
    expression: Expression,
    within: WithinIf[]
  }
  elifBlocks: {
    token: Tokens.ElifBlock,
    expression: Expression,
    within: WithinIf[]
  }[] | undefined,
  elseBlock: {
    token: Tokens.ElseBlock,
    within: WithinIf[]
  } | undefined
}

export type WhileLoop = {
  token: Tokens.WhileLoop,
  expression: Expression,
  within: WithinLoop[]
}

export type ScopeSpec = {
  token: Tokens.ScopeSpec,
  scope: string[]
}
// -----------------------------------------------------------------------------


// Expression ------------------------------------------------------------------
export type Expression = ArithmeticExpression | Value | Instantiate | Variable | FuncCall | BooleanExpression

export type ArithmeticOperator = "+" | "-" | "/" | "*" | "%"

export type ArithmeticExpression = {
  token: Tokens.ArithmeticExpression,
  left: Expression,
  right: ArithmeticOperation,
}

export type ArithmeticOperation = {
  token: Tokens.ArithmeticOperation,
  operation: ArithmeticOperator,
  value: Expression
}

export type BooleanOperator = "==" | "!=" | "<" | ">" | "<=" | ">="

export type BooleanExpression = {
  token: Tokens.BooleanExpression,
  left: Expression,
  operator: BooleanOperator,
  right: Expression
}

// export type Value = {
//   token: Tokens.Value,
//   type: ValueType,
//   value: Primitives | Instance
// }

export type Value = {
  token: Tokens.Value,
  typeStr: string,
  numLiveReferences: number,
  type: ValueType,
  heapPtr?: string,
  value: Primitives | Instance,
}

export type Instance = {
  token: Tokens.Instance,
  class: Class,
  type: string,
  pointer: string,
  globalScope: Map<string, string>
};

export type Comment = {
  token: Tokens.Comment,
  comment: string
};

// -----------------------------------------------------------------------------

export enum Tokens {
  Program = "P",
  Class = "C",
  Constructor = "CO",
  Func = "F",

  Definition = "D",
  Reassignment = "R",
  Return = "RT",
  Break = "B",
  BreakException = "BE",
  Instantiate = "I",
  Instance = "IN",
  FuncCall = "FC",

  IfBlock = "If",
  ElifBlock = "EI",
  ElseBlock = "E",

  WhileLoop = "W",

  ArgsDefine = "A",
  ArgDef = "AD",
  ArgsIn = "AI",

  Variable = "VA",
  ScopeSpec = "S",

  ArithmeticExpression = "AE",
  ArithmeticOperation = "AO",
  BooleanExpression = "BE",
  Value = "V",

  Comment = "COM"
}

export enum ValueType {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Instance = "instance",
  Undefined = "undefined",
  Unknown = "unknown"
}

export type Primitives = string | number | boolean | undefined

export type WithinFunction = Definition | WhileLoop | IfBlock | Reassignment | Expression | Return

export type WithinIf = WithinFunction

export type WithinLoop = WithinFunction | Break