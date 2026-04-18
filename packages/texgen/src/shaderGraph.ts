import { DataAPI, nstructjs, NumSlider, UIBase, Vector2, Vector4 } from 'path.ux'
import { registerDataClass } from '@gametest/vis-tester-base/core/register'
import { StructReader } from 'path.ux/scripts/util/nstructjs'
import { TexGenContext } from './context'

export type GlslType = 'bool' | 'int' | 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat4'
export class GraphCycleError extends Error {}

export const NodeClasses: INodeConstructor[] = []

enum SocketFlags {
  None = 0,
  /** Only one connection allowed */
  Single = 1,
}

export class NumConstraints {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
  texgen.NumConstraints {
    min           : float;
    max           : float;
    slideSpeed    : float;
    slideExp      : float;
    step          : float;
    decimalPlaces : int;
  }
    `,
  )

  min = -10000
  max = 10000
  slideSpeed = 2.0
  slideExp = 3.0
  step = 0.01
  decimalPlaces = 3

  copyTo(b: this): this {
    b.min = this.min
    b.max = this.max
    b.step = this.step
    b.slideExp = this.slideExp
    b.slideSpeed = this.slideSpeed
    b.decimalPlaces = this.decimalPlaces
    return this
  }
}

// Sockets
export abstract class NodeSocket<VALUE> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `texgen.NodeSocket {
      name          : string;
      type          : string;
      socketType    : string;
      _edges        : iter(int) | this._saveEdges();
      _id           : int;
      flag          : int;
      numConstraints: texgen.NumConstraints;
    }`,
  )

  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    st.string('socketType', 'socketType').readOnly()
    st.string('name', 'name').readOnly()
    return st
  }

  numConstraints = new NumConstraints()
  name = ''
  type = ''
  value: VALUE
  edges: NodeSocket<any>[] = []
  socketType: 'input' | 'output' = 'input'
  flag = 0
  _id = -1

  // node owning this socket — set by NodeBase constructor
  node!: NodeBase<any>

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
    other.flag = this.flag
    this.numConstraints.copyTo(other.numConstraints)
    return this
  }

  single() {
    this.flag |= SocketFlags.Single
    return this
  }

  connect(other: NodeSocket<any>): this {
    if (this === other) {
      throw new Error('Cannot connect socket to itself')
    }
    if (this.socketType === other.socketType) {
      throw new Error(`Cannot connect two ${this.socketType}s together`)
    }
    if (this.flag & SocketFlags.Single) {
      this.disconnectAll()
    }
    if (other.flag & SocketFlags.Single) {
      other.disconnectAll()
    }

    if (!this.edges.includes(other)) this.edges.push(other)
    if (!other.edges.includes(this)) other.edges.push(this)

    return this
  }

  disconnect(sock: NodeSocket<any>) {
    const i = this.edges.indexOf(sock)
    if (i >= 0) this.edges.splice(i, 1)
    const j = sock.edges.indexOf(this)
    if (j >= 0) sock.edges.splice(j, 1)
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

  /** load e.g. min, max ranges, etc from the default socket here */
  afterSTRUCT(defaultSocket: this) {
    defaultSocket.numConstraints.copyTo(this.numConstraints)
    this.flag |= defaultSocket.flag & SocketFlags.Single
  }

  makeWidget(ctx: TexGenContext): UIBase<TexGenContext> | undefined {
    return undefined
  }

  min(n: number) {
    this.numConstraints.min = n
    return this
  }

  max(n: number) {
    this.numConstraints.max = n
    return this
  }

  slideSpeed(n: number) {
    this.numConstraints.slideSpeed = n
    return this
  }

  slideExp(n: number) {
    this.numConstraints.slideExp = n
    return this
  }

  decimalPlaces(n: number) {
    this.numConstraints.decimalPlaces = n
    return this
  }

  step(n: number) {
    this.numConstraints.step = n
    return this
  }
}

export class FloatSocket extends NodeSocket<number> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `texgen.FloatSocket {
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

  makeWidget(ctx: TexGenContext): UIBase<TexGenContext> | undefined {
    const slider = UIBase.createElement('numslider-x') as NumSlider<TexGenContext>
    slider.ctx = ctx
    slider._init()
    slider.setValue(this.value)
    slider.onchange = (arg) => {
      this.value = slider.value
      slider.ctx.redrawAll()
    }
    const n = this.numConstraints
    slider.setAttribute('min', '' + n.min)
    slider.setAttribute('max', '' + n.max)
    slider.setAttribute('slideSpeed', '' + n.slideSpeed)
    slider.setAttribute('slideExp', '' + n.slideExp)
    slider.setAttribute('decimalPlaces', '' + n.decimalPlaces)
    return slider
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
  new (): NodeBase<any>
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
      pos     : vec2;
      _id     : int;
      _inputs : iter(abstract(texgen.NodeSocket)) | this._saveSockets(this.inputs);
      _outputs: iter(abstract(texgen.NodeSocket)) | this._saveSockets(this.outputs);
    }`,
  )

  static register(cls: INodeConstructor) {
    NodeClasses.push(cls)
    registerDataClass(cls as any)
    if (!nstructjs.isRegistered(cls)) {
      throw new Error('Class not registered with nstructjs: ' + (cls as any).name)
    }
  }

  static getClass(typeName: string) {
    return NodeClasses.find((cls) => cls.nodeDef.typeName === typeName)
  }

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

  pos = new Vector2()
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
      const defsock = this.inputs[s.name]
      if (defsock) {
        s.afterSTRUCT(defsock)
      }
      inObj[s.name] = s
    }
    const outObj: Record<string, NodeSocket<any>> = {}
    for (const s of outputs) {
      s.node = this
      s.socketType = 'output'
      const defsock = this.inputs[s.name]
      if (defsock) {
        s.afterSTRUCT(defsock)
      }
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
  static STRUCT = nstructjs.inlineRegister(this, `texgen.SdfInputNode {}`)
  static readonly nodeDef = {
    ...NodeBase.nodeDef,
    typeName   : 'SDF_INPUT',
    uiName     : 'SDF Input',
    description: 'Samples the u_sdf texture as a float',
    inputs     : {},
    outputs    : { value: new FloatSocket() },
  }
}
NodeBase.register(SdfInputNode)

export class OutputNode<
  CHILD extends INodeConstructor = typeof OutputNode,
> extends NodeBase<CHILD> {
  static STRUCT = nstructjs.inlineRegister(this, 'texgen.OutputNode {}')
  static readonly nodeDef = {
    ...NodeBase.nodeDef,
    typeName   : 'OUTPUT',
    uiName     : 'Output',
    description: 'Final color output',
    inputs     : { color: new FloatSocket().single() },
    outputs    : {},
  }
}
NodeBase.register(OutputNode)

export class MultiplyNode<
  CHILD extends INodeConstructor = typeof MultiplyNode,
> extends NodeBase<CHILD> {
  static STRUCT = nstructjs.inlineRegister(this, `texgen.MultiplyNode {}`)
  static readonly nodeDef = {
    ...NodeBase.nodeDef,
    typeName   : 'MULTIPLY',
    uiName     : 'Multiply',
    description: 'a * b',
    inputs     : { a: new FloatSocket(1), b: new FloatSocket(1) },
    outputs    : { value: new FloatSocket() },
  }
}
NodeBase.register(MultiplyNode)

export class AddNode<
  CHILD extends INodeConstructor = typeof AddNode,
> extends NodeBase<CHILD> {
  static STRUCT = nstructjs.inlineRegister(this, `texgen.AddNode {}`)
  static readonly nodeDef = {
    ...NodeBase.nodeDef,
    typeName   : 'ADD',
    uiName     : 'Add',
    description: 'a + b',
    inputs     : { a: new FloatSocket(0), b: new FloatSocket(0) },
    outputs    : { value: new FloatSocket() },
  }
}
NodeBase.register(AddNode)

export class ThresholdNode<
  CHILD extends INodeConstructor = typeof ThresholdNode,
> extends NodeBase<CHILD> {
  static STRUCT = nstructjs.inlineRegister(this, `texgen.ThresholdNode {}`)
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
  static STRUCT = nstructjs.inlineRegister(this, `texgen.MixNode {}`)
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
NodeBase.register(MixNode)

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

export class GraphNodeList extends Array<NodeBase<any>> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    texgen.GraphNodeList {
      highlight   : int | this.highlight?._id ?? -1;
      active      : int | this.active?._id ?? -1;

      this        : array(abstract(texgen.NodeBase));
      selected    : iter(e, int) | e._id;
    }`,
  )

  active?: NodeBase<any>
  highlight?: NodeBase<any>
  selected = new Set<NodeBase<any>>()
  private nodeIdMap = new Map<number, NodeBase<any>>()
  private socketIdMap = new Map<number, NodeSocket<any>>()

  isSelected(node: NodeBase<any>) {
    return this.selected.has(node)
  }

  push(...items: NodeBase<any>[]): number {
    const result = super.push(...items)
    if (this.nodeIdMap) {
      for (const node of items) {
        for (const socket of node.allSockets()) {
          socket.node = node
          this.socketIdMap.set(socket._id, socket)
        }
        this.nodeIdMap.set(node._id, node)
      }
    }
    return result
  }
  remove(item: NodeBase<any>, suppressError?: boolean): void {
    let i = this.indexOf(item)
    if (i === -1) {
      if (!suppressError) {
        throw new Error('Item not found in array')
      }
      return
    }
    this.selected.delete(item)
    super.splice(i, 1)
    if (this.nodeIdMap) {
      this.nodeIdMap.delete(item._id)
    }
  }
  get(id: number): NodeBase<any> | undefined {
    return this.nodeIdMap.get(id)
  }
  getSocket(id: number): NodeSocket<any> | undefined {
    return this.socketIdMap.get(id)
  }
  setSelect(item: NodeBase<any>, state: boolean): void {
    if (state) {
      this.selected.add(item)
    } else {
      this.selected.delete(item)
    }
  }
  clearSelection(): void {
    this.selected.clear()
  }
  selectAll(): void {
    for (const node of this) {
      this.selected.add(node)
    }
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this)
    this.nodeIdMap = new Map()
    for (const node of this) {
      for (const socket of node.allSockets()) {
        this.socketIdMap.set(socket._id, socket)
      }
      this.nodeIdMap.set(node._id, node)
    }

    for (const node of this) {
      for (const socket of node.allSockets()) {
        socket.node = node

        const ids = (socket as any)._edges as number[] | undefined
        socket.edges = []
        if (ids) {
          for (const id of ids) {
            const o = this.getSocket(id)
            if (o === undefined) {
              console.warn(node, id, this)
              throw new Error('deserialization error: no socket with id ' + id)
            }
            socket.edges.push(o)
          }
        }
        delete (socket as any)._edges
      }
    }
    const selectedIds = this.selected as unknown as number[]
    this.selected = new Set(selectedIds.map((id) => this.nodeIdMap!.get(id)!))
    this.highlight = this.nodeIdMap.get((this as any).highlight)
    this.active = this.nodeIdMap.get((this as any).active)
  }
}

export class NodeGraph {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `texgen.NodeGraph {
      nodes        : texgen.GraphNodeList;
      _sockIdGen   : int;
      _idGen       : int;
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

  hasCycle = false
  nodes = new GraphNodeList()

  private _idGen = 0
  private _sockIdGen = 0

  constructor() {}

  addNode<T extends NodeBase<any>>(node: T): T {
    node._id = this._idGen++
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
    sdf.pos.loadXY(40, 40)
    out.pos.loadXY(240, 40)
    sdf.outputs.value.connect(out.inputs.color)
  }

  // simple coercion to float at compile time
  private static coerceToFloat(srcType: GlslType, expr: string): string {
    switch (srcType) {
      case 'float':
        return `(${expr})`
      case 'bool':
      case 'int':
        return `float(${expr})`
      case 'vec2':
      case 'vec3':
      case 'vec4':
        return `length(${expr})`
      default:
        return `float(${expr})`
    }
  }
  private static coerceToInt(srcType: GlslType, expr: string): string {
    switch (srcType) {
      case 'bool':
      case 'float':
        return `int(${expr})`
      case 'int':
        return `(${expr})`
      case 'vec2':
      case 'vec3':
      case 'vec4':
        return `int(length(${expr}))`
      default:
        return `int(float(${expr}))`
    }
  }
  private static coerceToVec2(srcType: GlslType, expr: string): string {
    switch (srcType) {
      case 'bool':
      case 'float':
      case 'int':
        return `vec2(${expr}, ${expr})`
      case 'vec2':
        return `(${expr})`
      case 'vec3':
        return `(${expr}).xy`
      case 'vec4':
        return `(${expr}).xy`
      default:
        return `vec2(${expr})`
    }
  }
  private static coerceToVec3(srcType: GlslType, expr: string): string {
    switch (srcType) {
      case 'bool':
      case 'float':
      case 'int':
        return `vec3(${expr}, ${expr}, ${expr})`
      case 'vec2':
        return `vec3(${expr}, 0.0)`
      case 'vec3':
        return `(${expr})`
      case 'vec4':
        return `(${expr}).xyz`
      default:
        return `vec3(${expr})`
    }
  }
  private static coerceToVec4(srcType: GlslType, expr: string): string {
    switch (srcType) {
      case 'bool':
      case 'float':
      case 'int':
        return `vec4(${expr}, ${expr}, ${expr}, ${expr})`
      case 'vec2':
        return `vec4(${expr}, 0.0, 1.0)`
      case 'vec3':
        return `vec4(${expr}, 1.0)`
      case 'vec4':
        return `(${expr})`
      default:
        return `vec4(${expr})`
    }
  }

  private static coerce(expr: string, srcType: GlslType, dstType: GlslType) {
    switch (dstType) {
      case 'float':
        return this.coerceToFloat(srcType, expr)
      case 'int':
        return this.coerceToInt(srcType, expr)
      case 'vec2':
        return this.coerceToVec2(srcType, expr)
      default:
        return expr
    }
  }

  canConnect(sourceSocket: NodeSocket<any>, targetSocket: NodeSocket<any>): boolean {
    if (sourceSocket.node === targetSocket.node) {
      return false
    }
    if (sourceSocket.socketType === targetSocket.socketType) {
      return false
    }
    if (sourceSocket.edges.includes(targetSocket)) {
      return false
    }

    // check for cycles
    sourceSocket.edges.push(targetSocket)
    targetSocket.edges.push(sourceSocket)
    const result = !this.checkForCycles()
    sourceSocket.edges.pop()
    targetSocket.edges.pop()

    return result
  }

  checkForCycles() {
    const visited = new WeakSet<NodeBase<any>>()
    const cycleVisit = (node: NodeBase<any>) => {
      if (visited.has(node)) {
        return true
      }

      visited.add(node)
      for (const k in node.inputs) {
        const sock = node.inputs[k]
        if (sock.connectedTo) {
          if (cycleVisit(sock.connectedTo.node)) {
            return true
          }
        }
      }
      visited.delete(node)
      return false
    }

    for (const node of this.nodes) {
      if (cycleVisit(node)) {
        return true
      }
    }
    return false
  }
  compile(onError = (msg: string) => console.error(msg)): ICompiledShader {
    // assign sequential ids
    let id = 0
    const nodeIds = new Map<NodeBase<any>, number>()
    for (const n of this.nodes) {
      nodeIds.set(n, id++)
    }

    // topological sort
    const sorted: NodeBase<any>[] = []
    const visited = new WeakSet<NodeBase<any>>()
    const cycleVisited = new WeakSet<NodeBase<any>>()
    this.hasCycle = false
    const cycleVisit = (n: NodeBase<any>) => {
      if (cycleVisited.has(n)) {
        onError('cycle in shader graph!')
        this.hasCycle = true
        return
      }

      cycleVisited.add(n)
      for (const k in n.inputs) {
        const sock = n.inputs[k]
        for (const o of sock.edges) {
          if (o.node) cycleVisit(o.node)
        }
      }
      cycleVisited.delete(n)
    }

    const visit = (n: NodeBase<any>) => {
      if (cycleVisited.has(n)) {
        onError('cycle in shader graph!')
        this.hasCycle = true
        return
      }
      if (visited.has(n)) {
        return
      }

      visited.add(n)
      cycleVisited.add(n)
      for (const k in n.inputs) {
        const sock = n.inputs[k]
        for (const o of sock.edges) {
          if (o.node) visit(o.node)
        }
      }
      cycleVisited.delete(n)
      sorted.push(n)
    }
    for (const n of this.nodes) {
      cycleVisit(n)
    }
    if (this.hasCycle) {
      throw new GraphCycleError('cycle!')
    }
    for (const n of this.nodes) {
      visit(n)
    }

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

const nodeColors = [
  [0.2, 0.25, 0.3, 1], // unselected
  [0.6, 0.65, 0.65, 1], // selected
  [0.3, 0.35, 0.4, 1], // highlighted
  [0.8, 0.85, 0.85, 1], // highlighted and selected
].map((v) => new Vector4(v))

export function getNodeColor(
  node: NodeBase<any>,
  isSelected: boolean,
  isHighlight: boolean,
  isActive: boolean,
) {
  let mask = 0
  if (isSelected) mask |= 1
  if (isHighlight) mask |= 2
  //if (isActive) mask |= 4

  // TODO: implement color logic based on mask
  return nodeColors[mask]
}
