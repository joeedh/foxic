// instead if 'ports' we call them 'sockets
abstract class NodeSocket<VALUE> {
  name: string = ''
  type: string = ''
  value: VALUE

  edges: NodeSocket<VALUE>[] = []
  socketType: 'input' | 'output' = 'input'

  constructor(value: VALUE) {
    this.value = value
  }

  clone(): this {
    const cls = this.constructor as any
    const b = new cls(this.value) as this
    this.copyTo(b)
    return b
  }

  protected copyTo(other: this): this {
    // Default implementation does nothing
    // Subclasses can override to copy additional properties
    return this
  }
}
export class IntSocket extends NodeSocket<number> {
  constructor(value?: number) {
    super(value ?? 0)
  }
}
export class FloatSocket extends NodeSocket<number> {
  constructor(value?: number) {
    super(value ?? 0)
  }
}

interface INodeDef {
  typeName: string
  uiName: string
  description: string
  icon?: number
  inputs: Record<string, NodeSocket<any>>
  outputs: Record<string, NodeSocket<any>>
}

interface INodeConstructor {
  // note: we will rely on typescript to enforce socket inheritance.
  readonly nodeDef: INodeDef
}

// note: unlike other examples in the codebase, we do not separate the
// socket types from their declarations in nodeDef.  Instead we pass the
// constructor of child classes to their parents which handles inheritance.
abstract class NodeBase<CHILD extends INodeConstructor> {
  static readonly nodeDef = {
    typeName   : 'BASE',
    uiName     : '',
    description: '',
    icon       : 0,
    inputs     : {},
    outputs    : {},
  };

  declare readonly ['constructor']: CHILD
  declare inputs: CHILD['nodeDef']['inputs']
  declare outputs: CHILD['nodeDef']['outputs']

  constructor() {
    this.inputs = Object.fromEntries(
      Object.entries(this.constructor.nodeDef.inputs).map(([k, v]) => [k, v.clone()]),
    ) as CHILD['nodeDef']['inputs']
    this.outputs = Object.fromEntries(
      Object.entries(this.constructor.nodeDef.outputs).map(([k, v]) => [k, v.clone()]),
    ) as CHILD['nodeDef']['outputs']
  }
}

// example node 1
class TestNode<CHILD extends INodeConstructor = typeof TestNode> extends NodeBase<CHILD> {
  static readonly nodeDef = {
    ...super.nodeDef,
    typeName   : 'TEST',
    uiName     : 'Test Node',
    description: 'A test node',
    inputs: {
      a: new IntSocket(),
      b: new FloatSocket(),
    },
    outputs: {
      color: new FloatSocket(),
    },
  }

  constructor() {
    super()
  }
}

// example node 2, inherits from TestNode
class TestNode2 extends TestNode<typeof TestNode> {
  static readonly nodeDef = {
    ...super.nodeDef,
    typeName   : 'TEST',
    uiName     : 'Test Node',
    description: 'A test node',
    inputs: {
      // note: TS will give us an error if we don't include the parent inputs
      // this is by design.
      ...super.nodeDef.inputs,
      c: new IntSocket(),
    },
    outputs: {
      ...super.nodeDef.outputs,
      color: new FloatSocket(),
    },
  }

  constructor() {
    super()
  }
}
