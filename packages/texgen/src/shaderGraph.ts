import { DataAPI, nstructjs } from 'path.ux'
import { registerDataClass } from '@gametest/vis-tester-base/core/register'

// Sockets
export abstract class NodeSocket<VALUE> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `texgen.NodeSocket {
      name       : string;
      type       : string;
      socketType : string;
      _edges     : iter(int) | this._saveEdges();
      _id        : int;
    }`,
  )

  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    st.string('socketType', 'socketType').readOnly()
    st.string('name', 'name').readOnly()
    return st
  }

  name = ''
  type = ''
  value: VALUE
  edges: NodeSocket<any>[] = []
  socketType: 'input' | 'output' = 'input'
  _id = -1

  // node owning this socket — set by NodeBase constructor
  node?: NodeBase<any>

  constructor(value: VALUE) {
    this.value = value
  }

  clone(): this {
    const cls = this.constructor as new (v: VALUE) => this
    const b = new cls(this.value)
    this.copyTo(b)
    return b
  }

  protected copyTo(other: this): this {
    other.name = this.name
    other.type = this.type
    other.socketType = this.socketType
    return this
  }

  connect(other: NodeSocket<any>): this {
    if (this === other) {
      throw new Error('Cannot connect socket to itself')
    }
    if (this.socketType === other.socketType) {
      throw new Error(`Cannot connect two ${this.socketType}s together`)
    }
    if (!this.edges.includes(other)) this.edges.push(other)
    if (!other.edges.includes(this)) other.edges.push(this)
    return this
  }

  disconnectAll() {
    for (const o of this.edges) {
      const i = o.edges.indexOf(this)
      if (i >= 0) o.edges.splice(i, 1)
    }
    this.edges.length = 0
  }

  _saveEdges() {
    return this.edges.map((s) => s._id)
  }

  loadSTRUCT(reader: nstructjs.StructReader<this>) {
    reader(this)
  }
}

export class FloatSocket extends NodeSocket<number> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    nstructjs.inherit(this, NodeSocket, 'texgen.FloatSocket') +
      `
      value : float;
    }`,
  )

  type = 'float'

  static defineAPI(api: DataAPI) {
    const st = super.defineAPI(api)
    st.float('value', 'value')
    return st
  }

  constructor(value?: number) {
    super(value ?? 0)
  }
}

export class IntSocket extends NodeSocket<number> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    nstructjs.inherit(this, NodeSocket, 'texgen.IntSocket') +
      `
      value : int;
    }`,
  )

  static defineAPI(api: DataAPI) {
    const st = super.defineAPI(api)
    st.int('value', 'value')
    return st
  }

  type = 'int'

  constructor(value?: number) {
    super(value ?? 0)
  }
}

const VEC_DEFAULT = (n: number) => Array.from({ length: n }, () => 0)

export class Vec2Socket extends NodeSocket<number[]> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    nstructjs.inherit(this, NodeSocket, 'texgen.Vec2Socket') +
      `
      value : array(float);
    }`,
  )
  static defineAPI(api: DataAPI) {
    const st = super.defineAPI(api)
    st.vec2('value', 'value')
    return st
  }

  type = 'vec2'

  constructor(value?: number[]) {
    super(value ?? VEC_DEFAULT(2))
  }
}

export class Vec3Socket extends NodeSocket<number[]> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    nstructjs.inherit(this, NodeSocket, 'texgen.Vec3Socket') +
      `
      value : array(float);
    }`,
  )

  static defineAPI(api: DataAPI) {
    const st = super.defineAPI(api)
    st.vec3('value', 'value')
    return st
  }

  type = 'vec3'

  constructor(value?: number[]) {
    super(value ?? VEC_DEFAULT(3))
  }
}

export class Vec4Socket extends NodeSocket<number[]> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    nstructjs.inherit(this, NodeSocket, 'texgen.Vec4Socket') +
      `
      value : array(float);
    }`,
  )

  static defineAPI(api: DataAPI) {
    const st = super.defineAPI(api)
    st.vec4('value', 'value')
    return st
  }

  type = 'vec4'

  constructor(value?: number[]) {
    super(value ?? VEC_DEFAULT(4))
  }
}

// register socket classes (no defineAPI, but still part of nstructjs registry)
;[FloatSocket, IntSocket, Vec2Socket, Vec3Socket, Vec4Socket].forEach((c) =>
  registerDataClass(c as any, true),
)

// Node definitions
export interface INodeDef {
  typeName: string
  uiName: string
  description: string
  icon?: number
  inputs: Record<string, NodeSocket<any>>
  outputs: Record<string, NodeSocket<any>>
}

export interface INodeConstructor {
  readonly nodeDef: INodeDef
}

const cloneSockets = (
  defs: Record<string, NodeSocket<any>>,
  socketType: 'input' | 'output',
  owner: NodeBase<any>,
) => {
  const out: Record<string, NodeSocket<any>> = {}
  for (const k in defs) {
    const s = defs[k].clone()
    s.name = k
    s.socketType = socketType
    s.node = owner
    out[k] = s
  }
  return out
}

export abstract class NodeBase<CHILD extends INodeConstructor> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `texgen.NodeBase {
      pos     : array(float);
      _id     : int;
      _inputs : iter(abstract(texgen.NodeSocket)) | this._saveSockets(this.inputs);
      _outputs: iter(abstract(texgen.NodeSocket)) | this._saveSockets(this.outputs);
    }`,
  )

  static readonly nodeDef: INodeDef = {
    typeName   : 'BASE',
    uiName     : '',
    description: '',
    icon       : 0,
    inputs     : {},
    outputs    : {},
  }

  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    st.vec2('pos', 'pos')

    type SocketList = Record<string, NodeSocket<any>>

    function socketList(key: 'inputs' | 'outputs') {
      return {
        get(api: DataAPI, list: SocketList, key: string) {
          return list[key]
        },
        getKey(api: DataAPI, list: SocketList, value: NodeSocket<any>) {
          for (const k in list) {
            if (list[k] === value) {
              return k
            }
          }
          return undefined
        },
        getStruct(api: DataAPI, list: SocketList, key: string) {
          return api.mapStruct(list[key].constructor)
        },
        getLength(api: DataAPI, list: SocketList) {
          return Object.keys(list).length
        },
        getIter(api: DataAPI, list: SocketList) {
          return Object.values(list)[Symbol.iterator]()
        },
      } as const
    }
    st.list<SocketList, string, NodeSocket<any>>('inputs', 'inputs', socketList('inputs'))
    st.list<SocketList, string, NodeSocket<any>>(
      'outputs',
      'outputs',
      socketList('outputs'),
    )
    return st
  }

  pos: [number, number] = [0, 0]
  _id = -1;

  declare readonly ['constructor']: CHILD
  declare inputs: CHILD['nodeDef']['inputs']
  declare outputs: CHILD['nodeDef']['outputs']

  constructor() {
    const def = (this.constructor as unknown as INodeConstructor).nodeDef
    this.inputs = cloneSockets(def.inputs, 'input', this) as CHILD['nodeDef']['inputs']
    this.outputs = cloneSockets(
      def.outputs,
      'output',
      this,
    ) as CHILD['nodeDef']['outputs']
  }

  *allSockets(): Generator<NodeSocket<any>> {
    for (const k in this.inputs) yield this.inputs[k]
    for (const k in this.outputs) yield this.outputs[k]
  }

  _saveSockets(map: Record<string, NodeSocket<any>>) {
    return Object.values(map)
  }

  loadSTRUCT(reader: nstructjs.StructReader<this>) {
    reader(this)
    const anyThis = this as any
    const inputs = anyThis._inputs as NodeSocket<any>[]
    const outputs = anyThis._outputs as NodeSocket<any>[]
    delete anyThis._inputs
    delete anyThis._outputs

    const inObj: Record<string, NodeSocket<any>> = {}
    for (const s of inputs) {
      s.node = this
      s.socketType = 'input'
      inObj[s.name] = s
    }
    const outObj: Record<string, NodeSocket<any>> = {}
    for (const s of outputs) {
      s.node = this
      s.socketType = 'output'
      outObj[s.name] = s
    }
    anyThis.inputs = inObj
    anyThis.outputs = outObj
  }
}

// Concrete node classes
export class SdfInputNode<
  CHILD extends INodeConstructor = typeof SdfInputNode,
> extends NodeBase<CHILD> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    nstructjs.inherit(this, NodeBase, 'texgen.SdfInputNode') + `}`,
  )
  static readonly nodeDef = {
    ...NodeBase.nodeDef,
    typeName   : 'SDF_INPUT',
    uiName     : 'SDF Input',
    description: 'Samples the u_sdf texture as a float',
    inputs     : {},
    outputs    : { value: new FloatSocket() },
  }
}

export class OutputNode<
  CHILD extends INodeConstructor = typeof OutputNode,
> extends NodeBase<CHILD> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    nstructjs.inherit(this, NodeBase, 'texgen.OutputNode') + `}`,
  )
  static readonly nodeDef = {
    ...NodeBase.nodeDef,
    typeName   : 'OUTPUT',
    uiName     : 'Output',
    description: 'Final color output',
    inputs     : { color: new FloatSocket() },
    outputs    : {},
  }
}

export class MultiplyNode<
  CHILD extends INodeConstructor = typeof MultiplyNode,
> extends NodeBase<CHILD> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    nstructjs.inherit(this, NodeBase, 'texgen.MultiplyNode') + `}`,
  )
  static readonly nodeDef = {
    ...NodeBase.nodeDef,
    typeName   : 'MULTIPLY',
    uiName     : 'Multiply',
    description: 'a * b',
    inputs     : { a: new FloatSocket(1), b: new FloatSocket(1) },
    outputs    : { value: new FloatSocket() },
  }
}

export class AddNode<
  CHILD extends INodeConstructor = typeof AddNode,
> extends NodeBase<CHILD> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    nstructjs.inherit(this, NodeBase, 'texgen.AddNode') + `}`,
  )
  static readonly nodeDef = {
    ...NodeBase.nodeDef,
    typeName   : 'ADD',
    uiName     : 'Add',
    description: 'a + b',
    inputs     : { a: new FloatSocket(0), b: new FloatSocket(0) },
    outputs    : { value: new FloatSocket() },
  }
}

export class ThresholdNode<
  CHILD extends INodeConstructor = typeof ThresholdNode,
> extends NodeBase<CHILD> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    nstructjs.inherit(this, NodeBase, 'texgen.ThresholdNode') + `}`,
  )
  static readonly nodeDef = {
    ...NodeBase.nodeDef,
    typeName   : 'THRESHOLD',
    uiName     : 'Threshold',
    description: 'step(threshold, value)',
    inputs     : { value: new FloatSocket(0), threshold: new FloatSocket(0.5) },
    outputs    : { value: new FloatSocket() },
  }
}

export class MixNode<
  CHILD extends INodeConstructor = typeof MixNode,
> extends NodeBase<CHILD> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    nstructjs.inherit(this, NodeBase, 'texgen.MixNode') + `}`,
  )
  static readonly nodeDef = {
    ...NodeBase.nodeDef,
    typeName   : 'MIX',
    uiName     : 'Mix',
    description: 'mix(a, b, t)',
    inputs: {
      a: new FloatSocket(0),
      b: new FloatSocket(1),
      t: new FloatSocket(0.5),
    },
    outputs    : { value: new FloatSocket() },
  }
}

export const NodeClasses: Array<INodeConstructor & { new (): NodeBase<any> }> = [
  SdfInputNode,
  OutputNode,
  MultiplyNode,
  AddNode,
  ThresholdNode,
  MixNode,
]
;[
  NodeBase,
  SdfInputNode,
  OutputNode,
  MultiplyNode,
  AddNode,
  ThresholdNode,
  MixNode,
].forEach((c) => registerDataClass(c as any, true))

// NodeGraph
const VERT_SRC = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  // fullscreen triangle
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0);
  v_uv = (p + 1.0) * 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}
`

export interface ICompiledShader {
  vertSrc: string
  fragSrc: string
  hash: number
}

export class NodeGraph {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `texgen.NodeGraph {
      nodes : iter(abstract(texgen.NodeBase));
    }`,
  )

  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    st.list<NodeBase<any>[], number, NodeBase<any>>('nodes', 'nodes', {
      get: (api: DataAPI, list: NodeBase<any>[], key: number) => {
        return list[key]
      },
      getKey: (api: DataAPI, list: NodeBase<any>[], value: NodeBase<any>) => {
        return list.indexOf(value)
      },
      getLength: (api: DataAPI, list: NodeBase<any>[]) => {
        return list.length
      },
      getIter: (api: DataAPI, list: NodeBase<any>[]) => {
        return list[Symbol.iterator]()
      },
      getStruct: (api: DataAPI, list: NodeBase<any>[], key: number) => {
        return api.mapStruct(list[key].constructor)
      },
    })
    return st
  }
  nodes: NodeBase<any>[] = []
  private _idgen = 0
  private _sockIdGen = 0

  constructor() {}

  addNode<T extends NodeBase<any>>(node: T): T {
    node._id = this._idgen++
    for (const s of node.allSockets()) {
      s._id = this._sockIdGen++
    }
    this.nodes.push(node)
    return node
  }

  removeNode(node: NodeBase<any>) {
    for (const s of node.allSockets()) s.disconnectAll()
    const i = this.nodes.indexOf(node)
    if (i >= 0) this.nodes.splice(i, 1)
  }

  addDefaultNodes() {
    const sdf = this.addNode(new SdfInputNode())
    const out = this.addNode(new OutputNode())
    sdf.pos = [40, 40]
    out.pos = [240, 40]
    sdf.outputs.value.connect(out.inputs.color)
  }

  // simple coercion to float at compile time
  private static coerceToFloat(srcType: string, expr: string): string {
    switch (srcType) {
      case 'float':
      case 'int':
        return `float(${expr})`
      case 'vec2':
        return `(${expr}).x`
      case 'vec3':
      case 'vec4':
        return `(${expr}).r`
      default:
        return `float(${expr})`
    }
  }

  compile(): ICompiledShader {
    // assign sequential ids
    let id = 0
    const nodeIds = new Map<NodeBase<any>, number>()
    for (const n of this.nodes) {
      nodeIds.set(n, id++)
    }

    // topological sort
    const sorted: NodeBase<any>[] = []
    const visited = new Set<NodeBase<any>>()
    const visit = (n: NodeBase<any>) => {
      if (visited.has(n)) return
      visited.add(n)
      for (const k in n.inputs) {
        const sock = n.inputs[k]
        for (const o of sock.edges) {
          if (o.node) visit(o.node)
        }
      }
      sorted.push(n)
    }
    for (const n of this.nodes) visit(n)

    // emit code
    const lines: string[] = []
    const outputVar = (n: NodeBase<any>, key: string) => `n${nodeIds.get(n)}_${key}`

    const inputExpr = (n: NodeBase<any>, key: string): string => {
      const sock = n.inputs[key]
      if (sock.edges.length > 0) {
        const upstream = sock.edges[0]
        if (upstream.node) {
          const expr = outputVar(upstream.node, upstream.name)
          return NodeGraph.coerceToFloat(upstream.type, expr)
        }
      }
      return `float(${(sock.value as number) ?? 0})`
    }

    let outputColorExpr = '0.0'

    for (const n of sorted) {
      const t = (n.constructor as unknown as INodeConstructor).nodeDef.typeName
      switch (t) {
        case 'SDF_INPUT': {
          lines.push(`  float ${outputVar(n, 'value')} = texture(u_sdf, v_uv).r;`)
          break
        }
        case 'MULTIPLY': {
          lines.push(
            `  float ${outputVar(n, 'value')} = ${inputExpr(n, 'a')} * ${inputExpr(n, 'b')};`,
          )
          break
        }
        case 'ADD': {
          lines.push(
            `  float ${outputVar(n, 'value')} = ${inputExpr(n, 'a')} + ${inputExpr(n, 'b')};`,
          )
          break
        }
        case 'THRESHOLD': {
          lines.push(
            `  float ${outputVar(n, 'value')} = step(${inputExpr(n, 'threshold')}, ${inputExpr(n, 'value')});`,
          )
          break
        }
        case 'MIX': {
          lines.push(
            `  float ${outputVar(n, 'value')} = mix(${inputExpr(n, 'a')}, ${inputExpr(n, 'b')}, ${inputExpr(n, 't')});`,
          )
          break
        }
        case 'OUTPUT': {
          outputColorExpr = inputExpr(n, 'color')
          break
        }
      }
    }

    const fragSrc = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_sdf;
out vec4 out_color;
void main() {
${lines.join('\n')}
  float c = ${outputColorExpr};
  out_color = vec4(vec3(c), 1.0);
}
`

    const hash = hashString(fragSrc)
    return { vertSrc: VERT_SRC, fragSrc, hash }
  }

  loadSTRUCT(reader: nstructjs.StructReader<this>) {
    reader(this)

    // rebuild socket connections from saved id arrays
    const socketsById = new Map<number, NodeSocket<any>>()
    for (const n of this.nodes) {
      for (const s of n.allSockets()) {
        socketsById.set(s._id, s)
      }
    }
    for (const n of this.nodes) {
      for (const s of n.allSockets()) {
        const ids = (s as any)._edges as number[] | undefined
        s.edges = []
        if (ids) {
          for (const id of ids) {
            const o = socketsById.get(id)
            if (o) s.edges.push(o)
          }
        }
        delete (s as any)._edges
      }
    }
  }
}

function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return h
}

registerDataClass(NodeGraph as any, true)
