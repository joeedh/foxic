import { Vector3, Vector4, util, nstructjs, Vector4Like } from 'path.ux'
import config from './config'
import { MeshFlags, MeshFeatures, MeshTypes } from './mesh_base'
import { cubic, cubicOffsetDv, d2cubic, dcubic } from './bezier.js'
import { StructReader } from 'path.ux/scripts/util/nstructjs'
import { IDGen } from 'path.ux/scripts/util/util'
import { EventEmitter } from '@gametest/utils'

export const MeshVector = Vector3
export type MeshVector = Vector3

/** a global event emitter for code to trigger redraws */
export const meshRedrawEmitter = new EventEmitter<{
  redraw: (mesh: Mesh) => void
}>()

const sel = [1, 0.8, 0, 1]
const high = [1, 0.8, 0.7, 1]
const act = [0, 0.3, 0.8, 1]
const actsel = [0.5, 0.3, 0.8, 1]

let mix = (a: Vector4Like | number[], b: Vector4Like | number[], fac: number) =>
  new Vector4(a as unknown as Vector4).interp(b as unknown as Vector4, fac)

export const ElemColors = [
  [0, 0, 0, 1], //0    0
  sel, //001  1 Select
  act, //010  2 Active
  mix(sel, actsel, 0.25), //011  3 Select+Active
  high, //100  4 Highlight
  mix(high, sel, 0.5), //101  5 Highlight+Select
  mix(high, actsel, 0.5), //110  6 Highlight+Active
  new Vector4(high)
    .add(sel as unknown as Vector4)
    .add(actsel as unknown as Vector4)
    .mulScalar(0.3333), //111  7 Highlight+Select+Active
].map((color) => new Vector4(color))

export function getElemColor<E extends Element>(list: ElementArray<E>, e: E) {
  let mask = 0

  if (e.flag & MeshFlags.SELECT) {
    mask |= 1
  }

  if (e === list.active) {
    mask |= 2
  }

  if (e === list.highlight) {
    mask |= 4
  }

  return ElemColors[mask]
}

export class Element {
  type: MeshTypes
  flag: MeshFlags
  index: number
  _index: number
  eid: number

  static STRUCT = nstructjs.inlineRegister(
    this,
    `
mesh.Element {
  type     : int;
  flag     : int;
  index    : int;
  eid      : int;
}`,
  )

  constructor(type: MeshTypes) {
    this.type = type
    this.flag = this.index = 0
    this.eid = -1
    this._index = -1
  }

  [Symbol.keystr]() {
    return this.eid
  }

  toJSON() {
    return {
      type : this.type,
      flag : this.flag,
      index: this.index,
      eid  : this.eid,
    }
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this)
  }
}

//has Vector3 mixin
export class Vertex extends Element {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
mesh.Vertex {
  co          : ${(MeshVector as any).structName};
  edges       : array(e, int) | e.eid;
}`,
  )

  co: MeshVector
  edges: Edge[]

  constructor(co?: Vector3) {
    super(MeshTypes.VERTEX)
    this.co = new MeshVector(co)
    this.edges = []
  }

  get 0(): number {
    debugger
    return NaN
  }

  get 1(): number {
    debugger
    return NaN
  }

  get 2(): number {
    debugger
    return NaN
  }

  otherEdge(e: Edge) {
    if (this.edges.length !== 2) {
      throw new Error('otherEdge only works on 2-valence vertices')
    }

    if (e === this.edges[0]) return this.edges[1]
    else if (e === this.edges[1]) return this.edges[0]
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this)
    super.loadSTRUCT(reader)

    // just in case we saved this.co with a different type of vector
    this.co = new MeshVector(this.co)
  }
}

//has Vector3 mixin
export class Handle extends Element {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
mesh.Handle {
  co          : ${(MeshVector as any).structName};
  owner       : int | this.owner ? this.owner.eid : -1;
}`,
  )

  co: Vector3
  declare owner: Edge

  constructor(co: Vector3) {
    super(MeshTypes.HANDLE)

    this.co = new MeshVector()

    if (co !== undefined) {
      this.co.load(co)
    }
  }

  get 0() {
    debugger
    return NaN
  }

  get 1() {
    debugger
    return NaN
  }

  get 2() {
    debugger
    return NaN
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this)
    super.loadSTRUCT(reader)
    this.co = new MeshVector(this.co)
  }
}

const _evaluate_vs = util.cachering.fromConstructor(MeshVector, 64)
const _offset_dvs = util.cachering.fromConstructor(MeshVector, 64)
const _derivative_vs = util.cachering.fromConstructor(MeshVector, 64)
const _derivative2_vs = util.cachering.fromConstructor(MeshVector, 64)
const _normal_vs = util.cachering.fromConstructor(MeshVector, 64)

export class Edge extends Element {
  h1?: Handle
  h2?: Handle
  declare v1: Vertex
  declare v2: Vertex
  l?: Loop

  constructor() {
    super(MeshTypes.EDGE)

    this.h1 = this.h2 = undefined
    this.l = undefined
  }

  get loops() {
    let this2 = this

    return (function* () {
      if (!this2.l) {
        return
      }

      let l = this2.l
      let _i = 0

      do {
        if (_i++ > 100) {
          console.warn('Infinite loop detected!', this2.eid)
          break
        }

        yield l

        l = l.radial_next!
      } while (l !== this2.l)
    })()
  }

  evaluate(t: number) {
    const p = _evaluate_vs.next()

    if (this.h1) {
      const { v1, h1, h2, v2 } = this

      for (let i = 0; i < p.length; i++) {
        ;(p as unknown as number[])[i] = cubic(
          v1.co[i as 0 | 1],
          h1!.co[i as 0 | 1],
          h2!.co[i as 0 | 1],
          v2.co[i as 0 | 1],
          t,
        )
      }

      return p
    } else {
      return p.load(this.v1.co).interp(this.v2.co, t)
    }
  }

  derivative(t: number) {
    const p = _derivative_vs.next()
    if (this.h1) {
      const { v1, h1, h2, v2 } = this

      for (let i = 0; i < p.length; i++) {
        p[i as 0 | 1] = dcubic(
          v1.co[i as 0 | 1],
          h1!.co[i as 0 | 1],
          h2!.co[i as 0 | 1],
          v2.co[i as 0 | 1],
          t,
        )
      }
    } else {
      return p.load(this.v2.co).sub(this.v1.co)
    }

    return p
  }

  derivative2(t: number) {
    const p = _derivative2_vs.next()

    if (this.h1) {
      const { v1, h1, h2, v2 } = this

      for (let i = 0; i < p.length; i++) {
        p[i as 0 | 1] = d2cubic(
          v1.co[i as 0 | 1],
          h1!.co[i as 0 | 1],
          h2!.co[i as 0 | 1],
          v2.co[i as 0 | 1],
          t,
        )
      }
    } else {
      return p.zero()
    }

    return p
  }

  normal(t: number) {
    let p = _normal_vs.next().load(this.derivative(t))

    p.normalize().swapAxes(0, 1)
    p[1] = -p[1]

    return p
  }

  offsetDv(t: number, radius: number) {
    let dv = cubicOffsetDv(this.v1.co, this.h1!.co, this.h2!.co, this.v2.co, t, radius)
    return _offset_dvs.next().zero().loadXY(dv[0], dv[1])
  }

  curvature(t: number) {
    let dv1 = this.derivative(t)
    let dv2 = this.derivative2(t)

    let ret = (dv1[0] * dv2[1] - dv1[1] * dv2[0]) / Math.pow(dv1.dot(dv1), 3.0 / 2.0)

    return ret
  }

  handle(v: Vertex) {
    return v === this.v1 ? this.h1 : this.h2
  }

  vertex(h: Handle) {
    return h === this.h1 ? this.v1 : this.v2
  }

  otherVertex(v: Vertex) {
    if (v === undefined)
      throw new Error('v cannot be undefined in Edge.prototype.otherVertex()')

    if (v === this.v1) return this.v2
    if (v === this.v2) return this.v1

    throw new Error('vertex ' + v.eid + ' not in edge')
  }
}

Edge.STRUCT =
  nstructjs.inherit(Edge, Element, 'mesh.Edge') +
  `
  v1   : int | this.v1.eid;
  v2   : int | this.v2.eid;
  h1   : int | this.h1 ? this.h1.eid : -1;
  h2   : int | this.h2 ? this.h2.eid : -1;
  l    : int | this.l ? this.l.eid : -1;
}`
nstructjs.register(Edge)

export class Loop extends Element {
  declare f: Face
  radial_next?: Loop
  radial_prev?: Loop
  declare v: Vertex
  declare e: Edge
  declare next: Loop
  declare prev: Loop
  declare list: LoopList

  constructor() {
    super(MeshTypes.LOOP)

    this.radial_next = undefined
    this.radial_prev = undefined
  }

  evaluate(t: number) {
    if (this.v === this.e.v2) {
      t = 1.0 - t
    }

    return this.e.evaluate(t)
  }

  normal(t: number) {
    let sign = 1
    if (this.v === this.e.v2) {
      t = 1.0 - t
      sign = -1
    }

    return this.e.normal(t).mulScalar(sign)
  }

  derivative(t: number) {
    let sign = 1
    if (this.v === this.e.v2) {
      t = 1.0 - t
      sign = -1
    }

    return this.e.derivative(t).mulScalar(sign)
  }

  derivative2(t: number) {
    let sign = 1
    if (this.v === this.e.v2) {
      t = 1.0 - t
      sign = -1
    }

    return this.e.derivative2(t).mulScalar(sign)
  }

  offsetDv(t: number, radius: number) {
    let sign = 1
    if (this.v === this.e.v2) {
      t = 1.0 - t
      sign = -1
    }

    return this.e.offsetDv(t, radius).mulScalar(sign)
  }

  get h1() {
    return this.v === this.e.v1 ? this.e.h1 : this.e.h2
  }

  get h2() {
    return this.v === this.e.v1 ? this.e.h2 : this.e.h1
  }
}

Loop.STRUCT =
  nstructjs.inherit(Loop, Element, 'mesh.Loop') +
  `
  v : int | this.v.eid;
  e : int | this.e.eid;
}`
nstructjs.register(Loop)

type IterStack<T> = {
  [k: number]: T
  cur: number
  length: number
}
export class LoopListIter {
  private ret: { done: boolean; value: any }
  stack?: IterStack<this>
  l?: Loop
  list?: LoopList
  done: boolean
  i: number

  constructor() {
    this.ret = { done: false, value: undefined }
    this.stack = undefined
    this.l = undefined
    this.list = undefined
    this.done = false
    this.i = 0
  }

  [Symbol.iterator]() {
    return this
  }

  reset(list: LoopList, stack: IterStack<this>) {
    this.stack = stack
    this.list = list
    this.done = false
    this.l = list.l
    this.i = 0

    return this
  }

  next() {
    let ret = this.ret

    let l = this.l

    if (this.i++ > 100000) {
      console.warn('Infinite loop error!')
      return this.finish()
    }

    if (!l) {
      return this.finish()
    }

    this.l = this.l!.next
    if (this.l === this.list!.l) {
      this.l = undefined
    }

    ret.value = l
    ret.done = false

    return ret
  }

  finish() {
    if (!this.done) {
      this.list = undefined
      this.l = undefined
      this.ret.value = undefined
      this.ret.done = true
      this.stack!.cur--
      this.done = true
    }

    return this.ret
  }

  return() {
    return this.finish()
  }
}

let loopstack = new Array(1024) as unknown as IterStack<LoopListIter>
loopstack.cur = 0
for (let i = 0; i < loopstack.length; i++) {
  loopstack[i] = new LoopListIter()
}

export class LoopList extends Element {
  length: number
  _loops?: number[] //used by serialization
  declare l: Loop

  constructor() {
    super(MeshTypes.LOOPLIST)

    this.length = 0
  }

  get verts() {
    let this2 = this
    return (function* () {
      for (let l of this2) {
        yield l.v
      }
    })()
  }

  // the error TS is giving me here seems to be a bug
  // @ts-expect-error
  [Symbol.iterator]() {
    return loopstack[loopstack.cur++].reset(this, loopstack)
  }

  _save_loops() {
    return Array.from(this).map((l) => l.eid)
  }
}

LoopList.STRUCT =
  nstructjs.inherit(LoopList, Element, 'mesh.LoopList') +
  `
  _loops : iter(int) | this._save_loops();
}
`
nstructjs.register(LoopList)

export class Face extends Element {
  lists: LoopList[]
  blur: number
  center: Vector3
  fillColor: Vector4

  constructor() {
    super(MeshTypes.FACE)
    this.lists = []
    this.blur = 0.0
    this.center = new Vector3()
    this.fillColor = new Vector4([0.5, 0.5, 0.5, 1])
  }

  get loops() {
    let this2 = this
    let ret = (function* () {
      for (let list of this2.lists) {
        for (let l of list) {
          yield l
        }
      }
    })()
    Object.defineProperty(ret, 'length', {
      get: function () {
        let count = 0
        for (let list of this2.lists) {
          for (let l of list) {
            count++
          }
        }

        return count
      },
    })

    return ret
  }

  get verts() {
    let this2 = this
    let ret = (function* () {
      for (let list of this2.lists) {
        for (let l of list) {
          yield l.v
        }
      }
    })()

    Object.defineProperty(ret, 'length', {
      get: function () {
        let count = 0
        for (let list of this2.lists) {
          for (let l of list) {
            count++
          }
        }

        return count
      },
    })

    return ret
  }

  calcCenter() {
    this.center.zero()
    let tot = 0

    for (let l of this.loops) {
      this.center.add(l.v)
      tot++
    }

    if (tot) {
      this.center.mulScalar(1.0 / tot)
    }

    return this.center
  }
}

Face.STRUCT =
  nstructjs.inherit(Face, Element, 'mesh.Face') +
  `
  lists     : iter(list, int) | list.eid;
  fillColor : vec4;
  blur      : float;
}
`
nstructjs.register(Face)

export class ElementSetVisibleIter<E extends Element> {
  iter?: Iterator<E>
  set?: ElementSet<E>

  constructor(set: ElementSet<E>) {
    this.set = set
    this.iter = set[Symbol.iterator]()
  }

  copy() {
    return new ElementSetVisibleIter(this.set!)
  }

  [Symbol.iterator]() {
    return this.copy()
  }

  next() {
    let ret = this.iter!.next()
    while (!ret.done && ret.value.flag & MeshFlags.HIDE) {
      ret = this.iter!.next()
    }

    return ret
  }
}

export class ElementSet<E extends Element> extends Set<E> {
  type: MeshTypes

  constructor(type: MeshTypes) {
    super()
    this.type = type
  }

  get visible() {
    return new ElementSetVisibleIter(this)
  }

  get editable() {
    return this.visible
  }

  get length() {
    return this.size
  }

  remove(item: E) {
    this.delete(item)
  }
}

export class ElementListIter<E extends Element> {
  i = 0
  list: (E | undefined)[] | null = null
  ret = { done: true, value: undefined } as IteratorResult<E>

  constructor(list: (E | undefined)[]) {
    this.reset(list)
  }

  [Symbol.iterator]() {
    return this.copy().reset(this.list!)
  }

  copy() {
    return new VisibleIter(this.list!)
  }

  reset(list: (E | undefined)[]) {
    this.list = list
    this.i = 0

    this.skipInvalid()

    return this
  }

  invalidElem(e: E) {
    return false
  }

  skipInvalid() {
    let list = this.list!

    while (this.i < list.length) {
      if (list[this.i] !== undefined && !this.invalidElem(list[this.i]!)) {
        break
      }

      this.i++
    }
  }

  next() {
    if (this.i >= this.list!.length) {
      this.ret.value = undefined
      this.ret.done = true

      return this.ret as IteratorResult<E>
    }

    this.ret.value = this.list![this.i]
    this.ret.done = false

    this.i++
    this.skipInvalid()

    return this.ret as IteratorResult<E>
  }
}

class VisibleIter<E extends Element> extends ElementListIter<E> {
  invalidElem(e: E) {
    return !!(e.flag & MeshFlags.HIDE)
  }
}

export class ElementArray<E extends Element> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
  mesh.ElementArray {
    this        : iter(abstract(mesh.Element));
    highlight   : int | this.highlight ? this.highlight.eid : -1;
    active      : int | this.active ? this.active.eid : -1;
    type        : int;
  }
  `,
  )

  list: (E | undefined)[]
  length: number
  type: MeshTypes
  selected: ElementSet<E>
  on_selected?: (...args: any[]) => void
  highlight?: E
  active?: E
  freelist: number[]

  constructor(type: MeshTypes) {
    this.list = []
    this.length = 0
    this.type = type
    this.selected = new ElementSet(type)
    this.on_selected = undefined
    this.highlight = this.active = undefined
    this.freelist = []
  }

  get visible() {
    return new VisibleIter(this.list)
  }

  get editable() {
    return this.visible
  }

  [Symbol.iterator](): Iterator<E> {
    return new ElementListIter<E>(this.list)
  }

  concat(b: Iterable<E>) {
    let ret = []

    for (let item of this) {
      ret.push(item)
    }

    for (let item of b) {
      ret.push(item)
    }

    return ret
  }

  toJSON() {
    let arr = []

    for (let item of this) {
      arr.push(item)
    }

    let sel = []
    for (let v of this.selected) {
      sel.push(v.eid)
    }

    return {
      type     : this.type,
      array    : arr,
      selected : sel,
      active   : this.active !== undefined ? this.active.eid : -1,
      highlight: this.highlight !== undefined ? this.highlight.eid : -1,
    }
  }

  push(e: E) {
    e._index = this.list.length
    this.list.push(e)
    this.length++

    if (e.flag & MeshFlags.SELECT) {
      this.selected.add(e)
    }

    return this
  }

  remove(e: E) {
    if (this.selected.has(e)) {
      this.selected.remove(e)
    }

    if (this.active === e) this.active = undefined
    if (this.highlight === e) this.highlight = undefined

    if (e._index < 0 || this.list[e._index] !== e) {
      throw new Error('element not in array')
    }

    this.freelist.push(e._index)

    this.list[e._index] = undefined
    e._index = -1
    this.length--

    //super.remove(v);

    return this
  }

  selectNone() {
    for (let e of this) {
      this.setSelect(e, false)
    }
  }

  selectAll() {
    for (let e of this) {
      this.setSelect(e, true)
    }
  }

  setSelect(e: E, state: boolean) {
    if (state) {
      e.flag |= MeshFlags.SELECT

      this.selected.add(e)
    } else {
      e.flag &= ~MeshFlags.SELECT

      this.selected.remove(e)
    }

    return this
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this)

    for (let elem of this) {
      if (elem.flag & MeshFlags.SELECT) {
        this.selected.add(elem)
      }
    }
  }
}

export class Mesh {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
  mesh.Mesh {
    elists : array(mesh.ElementArray) | this.getElists();
    eidgen : IDGen;  
  }
  `,
  )

  eidgen: IDGen
  eidMap: Map<number, Element>
  declare verts: ElementArray<Vertex>
  declare handles: ElementArray<Handle>
  declare edges: ElementArray<Edge>
  declare loops: ElementArray<Loop>
  declare lists: ElementArray<LoopList>
  declare faces: ElementArray<Face>
  elists: {
    [k: number]: ElementArray<Element>
  }
  features: MeshFeatures

  private structureGen = 0

  constructor() {
    this.eidgen = new util.IDGen()
    this.eidMap = new Map()

    this.elists = {}

    this.makeElists()

    this.features = 0

    if (config.MESH_HANDLES) {
      this.features |= MeshFeatures.HANDLES
    }
  }

  clear() {
    this.elists = {}
    this.eidMap = new Map()
    this.makeElists()

    return this
  }

  get haveHandles() {
    return this.features & MeshFeatures.HANDLES
  }

  get elements() {
    return this.eidMap.values()
  }

  get hasHighlight() {
    for (let k in this.elists) {
      if (this.elists[k].highlight) {
        return true
      }
    }

    return false
  }

  getElists() {
    let ret = []

    for (let k in this.elists) {
      ret.push(this.elists[k])
    }

    return ret
  }

  addElistAliases() {
    this.verts = this.elists[MeshTypes.VERTEX] as ElementArray<Vertex>
    this.handles = this.elists[MeshTypes.HANDLE] as ElementArray<Handle>
    this.edges = this.elists[MeshTypes.EDGE] as ElementArray<Edge>
    this.loops = this.elists[MeshTypes.LOOP] as ElementArray<Loop>
    this.lists = this.elists[MeshTypes.LOOPLIST] as ElementArray<LoopList>
    this.faces = this.elists[MeshTypes.FACE] as ElementArray<Face>
  }

  makeElists() {
    for (let k in MeshTypes) {
      if (typeof k === 'string' && isNaN(parseFloat(k))) {
        let type = MeshTypes[k as keyof typeof MeshTypes]
        this.elists[type] = new ElementArray(type)
      }
    }

    this.addElistAliases()
  }

  _element_init(e: Element) {
    e.eid = this.eidgen.next()
    this.eidMap.set(e.eid, e)
  }

  setActive(elem: Element | undefined) {
    if (!elem) {
      for (let k in this.elists) {
        this.elists[k].active = undefined
      }
    } else {
      this.elists[elem.type].active = elem
    }

    return this
  }

  setHighlight(elem: Element | undefined) {
    let ret = false

    if (!elem) {
      for (let k in this.elists) {
        ret = ret || this.elists[k].highlight !== undefined
        this.elists[k].highlight = undefined
      }
    } else {
      ret = this.elists[elem.type].highlight !== elem
      this.elists[elem.type].highlight = elem
    }

    return ret
  }

  makeVertex(co: Vector3): Vertex {
    let v = new Vertex(co instanceof Vertex || co instanceof Handle ? co.co : co)

    this._element_init(v)
    this.verts.push(v)

    return v
  }

  makeHandle(co: Vector3): Handle {
    let h = new Handle(co)
    this._element_init(h)
    this.handles.push(h)
    return h
  }

  getEdge(v1: Vertex, v2: Vertex): Edge | undefined {
    for (let e of v1.edges) {
      if (e.otherVertex(v1) === v2) return e
    }

    return undefined
  }

  ensureEdge(v1: Vertex, v2: Vertex) {
    let e = this.getEdge(v1, v2)

    if (!e) {
      e = this.makeEdge(v1, v2)
    }

    return e
  }

  makeEdge(v1: Vertex, v2: Vertex) {
    let e = new Edge()

    e.v1 = v1
    e.v2 = v2

    if (this.features & MeshFeatures.HANDLES) {
      e.h1 = this.makeHandle(v1.co)
      e.h1.co.interp(v2.co, 1.0 / 2.0)
      e.h1.owner = e

      e.h2 = this.makeHandle(v1.co)
      e.h2.co.interp(v2.co, 2.0 / 3.0)
      e.h2.owner = e
    }

    v1.edges.push(e)
    v2.edges.push(e)

    this._element_init(e)
    this.edges.push(e)

    return e
  }

  killVertex(v: Vertex) {
    if (v.eid === -1) {
      console.trace('Warning: vertex', v.eid, 'already freed', v)
      return
    }

    let _i = 0

    while (v.edges.length > 0) {
      this.killEdge(v.edges[0])

      if (_i++ >= 100) {
        console.warn('mesh integrity warning, infinite loop detected in killVertex')
      }
    }

    this.eidMap.delete(v.eid)
    this.verts.remove(v)

    v.eid = -1
  }

  killEdge(e: Edge) {
    if (e.eid === -1) {
      console.trace('Warning: edge', e.eid, 'already freed', e)
      return
    }

    let _i = 0
    while (e.l) {
      this.killFace(e.l.f)

      if (_i++ > 1000) {
        console.log('infinite loop detected')
        break
      }
    }

    this.edges.remove(e)
    this.eidMap.delete(e.eid)

    if (this.features & MeshFeatures.HANDLES) {
      this.eidMap.delete(e.h1!.eid)
      this.handles.remove(e.h1!)

      this.eidMap.delete(e.h2!.eid)
      this.handles.remove(e.h2!)
    }

    e.eid = -1

    e.v1.edges.remove(e)
    e.v2.edges.remove(e)
  }

  radialLoopRemove(e: Edge, l: Loop) {
    if (e.l === l) {
      e.l = e.l.radial_next
    }

    if (e.l === l) {
      e.l = undefined
      return
    }

    l.radial_next!.radial_prev = l.radial_prev
    l.radial_prev!.radial_next = l.radial_next
  }

  radialLoopInsert(e: Edge, l: Loop) {
    if (!e.l) {
      e.l = l
      l.radial_next = l.radial_prev = l
    } else {
      l.radial_prev = e.l
      l.radial_next = e.l.radial_next

      e.l.radial_next!.radial_prev = l
      e.l.radial_next = l
    }
  }

  _killList(list: LoopList) {
    this.eidMap.delete(list.eid)
    this.lists.remove(list)
    list.eid = -1
  }

  killFace(f: Face) {
    for (let list of f.lists) {
      for (let l of list) {
        this.radialLoopRemove(l.e, l)

        this._killLoop(l)
      }

      this._killList(list)
    }

    this.eidMap.delete(f.eid)
    this.faces.remove(f)
    f.eid = -1
  }

  addLoopList(f: Face, vs: Vertex[]) {
    let list = new LoopList()
    this._element_init(list)
    this.lists.push(list)

    let lastl, firstl

    for (let i = 0; i < vs.length; i++) {
      let v1 = vs[i],
        v2 = vs[(i + 1) % vs.length]

      let e = this.getEdge(v1, v2)
      if (!e) {
        e = this.makeEdge(v1, v2)
      }

      let l = new Loop()
      this._element_init(l)
      this.loops.push(l)

      l.v = v1
      l.e = e
      l.f = f
      l.list = list

      this.radialLoopInsert(e, l)

      if (!firstl) {
        firstl = l
      } else {
        lastl!.next = l
        l!.prev = lastl!
      }

      lastl = l
    }

    firstl!.prev = lastl!
    lastl!.next = firstl!

    list.l = firstl!

    f.lists.push(list)
  }

  makeFace(vs: Vertex[]): Face {
    let f = new Face()
    this._element_init(f)
    this.faces.push(f)

    let list = new LoopList()
    this._element_init(list)
    this.lists.push(list)

    let lastl, firstl

    for (let i = 0; i < vs.length; i++) {
      let v1 = vs[i],
        v2 = vs[(i + 1) % vs.length]

      let e = this.getEdge(v1, v2)
      if (!e) {
        e = this.makeEdge(v1, v2)
      }

      let l = new Loop()
      this._element_init(l)
      this.loops.push(l)

      l.v = v1
      l.e = e
      l.f = f
      l.list = list

      this.radialLoopInsert(e, l)

      if (!firstl) {
        firstl = l
      } else {
        lastl!.next = l
        l.prev = lastl!
      }

      lastl = l
      list.length++
    }

    firstl!.prev = lastl!
    lastl!.next = firstl!

    list.l = firstl!

    f.lists.push(list)
    return f
    /*
      f           : this.f.eid,
      radial_next : this.radial_next.eid,
      radial_prev : this.radial_prev.eid,
      v           : this.v.eid,
      e           : this.e.eid,
      next        : this.next.eid,
      prev        : this.prev.eid,
      list        : this.list.eid
    */
  }

  selectFlush(selmode: number) {
    if (selmode & MeshTypes.VERTEX) {
      this.edges.selectNone()
      this.faces.selectNone()

      let set_active = this.edges.active === undefined
      set_active =
        set_active ||
        !(
          this.edges.active &&
          (this.edges.active.v1.flag | this.edges.active.v2.flag) & MeshFlags.SELECT
        )

      for (let e of this.edges) {
        if (e.v1.flag & MeshFlags.SELECT && e.v2.flag & MeshFlags.SELECT) {
          this.edges.setSelect(e, true)

          if (this.features & MeshFeatures.HANDLES) {
            this.handles.setSelect(e.h1!, true)
            this.handles.setSelect(e.h2!, true)
          }

          if (set_active) {
            this.edges.active = e
          }
        }
      }

      for (let f of this.faces) {
        let ok = true

        for (let l of f.loops) {
          if (!(l.e.flag & MeshFlags.SELECT)) {
            ok = false
            break
          }
        }

        if (ok) {
          this.faces.setSelect(f, true)
        }
      }
    } else if (selmode & MeshTypes.EDGE) {
      this.verts.selectNone()

      for (let v of this.verts) {
        for (let e of v.edges) {
          if (e.flag & MeshFlags.SELECT) {
            this.verts.setSelect(v, true)
            break
          }
        }
      }
    }
  }

  reverseEdge(e: Edge) {
    let tmp = e.v1
    e.v1 = e.v2
    e.v2 = tmp

    if (e.h1) {
      let tmp2 = e.h1
      e.h1 = e.h2
      e.h2 = tmp2
    }
  }

  splitEdgeMulti(e: Edge, steps: number) {
    let n = steps + 1

    for (let i = 0; i < steps; i++) {
      let t = 1.0 / n
      n--

      e = this.splitEdge(e, t)[0]
    }
  }

  splitEdge(e: Edge, t = 0.5): [Edge, Vertex] {
    let nv = this.makeVertex(e.evaluate(t))
    let ne = this.makeEdge(nv, e.v2)

    if (this.features & MeshFeatures.HANDLES) {
      let dv1 = e.derivative(0.0).mulScalar(1.0 / 3.0)
      let dv2 = e.derivative(t).mulScalar(1.0 / 3.0)
      let dv3 = e.derivative(1.0).mulScalar(1.0 / 3.0)

      e.h1!.co.load(dv1).mulScalar(t).add(e.v1.co)
      e.h2!.co.load(dv2).mulScalar(-t).add(nv.co)
      ne.h1!.co.load(dv2)
        .mulScalar(1.0 - t)
        .add(ne.v1.co)
      ne.h2!.co.load(dv3)
        .mulScalar(t - 1.0)
        .add(ne.v2.co)
    }

    e.v2.edges.remove(e)
    e.v2 = nv
    nv.edges.push(e)

    if (e.flag & MeshFlags.SELECT) {
      this.edges.setSelect(ne, true)
      this.verts.setSelect(nv, true)
    }

    if (e.l) {
      let l = e.l
      let ls = []
      let _i = 0
      do {
        if (_i++ > 10) {
          console.warn('infinite loop detected')
          break
        }

        ls.push(l)
        l = l.radial_next!
      } while (l !== e.l)

      for (let l of ls) {
        let l2 = new Loop()
        this._element_init(l2)
        this.loops.push(l2)

        l2.f = l.f
        l2.list = l.list

        if (l.v === e.v1) {
          l2.v = nv
          l2.e = ne
          l2.prev = l
          l2.next = l.next
          l.next.prev = l2
          l.next = l2

          this.radialLoopInsert(ne, l2)
        } else {
          this.radialLoopRemove(e, l)

          l2.v = nv
          l.e = ne
          l2.e = e

          this.radialLoopInsert(ne, l)
          this.radialLoopInsert(e, l2)

          l.next.prev = l2
          l2.prev = l
          l2.next = l.next
          l.next = l2

          /*
         v1 <--l2--<--l--- v2
             --e1--|--ne--
             --l--->--l2-->

          */
        }
      }
    }

    return [ne, nv]
  }

  copyElemData<E extends Element>(dst: E, src: E) {
    this.setSelect(dst, !!(src.flag & MeshFlags.SELECT))
    dst.flag = src.flag

    if (dst instanceof Vertex || dst instanceof Handle) {
      dst.co.load((src as unknown as Vertex).co)
    }
  }

  validate() {
    let ls = new Set<Loop>()

    for (let f of this.faces) {
      for (let l of f.loops) {
        ls.add(l)
      }
    }

    for (let l of ls) {
      this.radialLoopRemove(l.e, l)
    }

    for (let l of this.loops) {
      if (!ls.has(l)) {
        console.warn('Orphaned loop')
        this._killLoop(l)
      }
    }

    for (let l of ls) {
      let e = l.e
      l.e = this.ensureEdge(l.v, l.next.v)

      if (l.e !== e) {
        console.warn('Loop had wrong edge')
      }

      this.radialLoopInsert(l.e, l)
    }

    this.structureGen++
  }

  reverseWinding(f: Face) {
    for (let list of f.lists) {
      for (let l of list) {
        this.radialLoopRemove(l.e, l)
      }
    }

    for (let list of f.lists) {
      let es = []

      let ls = []
      for (let l of new Set(list)) {
        let t = l.next
        l.next = l.prev
        l.prev = t

        es.push(l.e)
        ls.push(l)
      }

      let i = 0
      for (let l of ls) {
        l.e = es[(i - 1 + es.length) % es.length]
        i++
      }
    }

    for (let list of f.lists) {
      for (let l of list) {
        this.radialLoopInsert(l.e, l)
      }
    }
  }

  clearHighlight() {
    let exist = this.hasHighlight

    for (let k in this.elists) {
      this.elists[k].highlight = undefined
    }

    return exist
  }

  unlinkFace(f: Face) {
    for (let list of f.lists) {
      for (let l of list) {
        this.radialLoopRemove(l.e, l)
      }
    }
  }

  linkFace(f: Face, forceRelink = true) {
    for (let list of f.lists) {
      for (let l of list) {
        if (forceRelink || !l.e) {
          l.e = this.getEdge(l.v, l.next.v)

          if (!l.e) {
            l.e = this.makeEdge(l.v, l.next.v)
          }
        }

        this.radialLoopInsert(l.e, l)
      }
    }
  }

  _killLoop(l: Loop) {
    this.eidMap.delete(l.eid)
    this.loops.remove(l)
    l.eid = -1
  }

  dissolveVertex(v: Vertex) {
    if (v.edges.length !== 2) {
      throw new Error("can't dissolve vertex with more than two edges")
    }

    let loops = new Set<Loop>()
    let faces = new Set<Face>()

    for (let e of v.edges) {
      for (let l of e.loops) {
        if (l.v !== v) {
          l = l.next
        }

        loops.add(l)
        faces.add(l.f)
      }
    }

    for (let f of faces) {
      this.unlinkFace(f)
    }

    for (let l of loops) {
      if (l.v !== v) {
        l = l.next
      }

      l.prev.next = l.next
      l.next.prev = l.prev

      if (l === l.list.l) {
        l.list.l = l.list.l.next
      }

      if (l === l.list.l) {
        console.warn('Destroying face')

        l.f.lists.remove(l.list)
        this._killList(l.list)

        if (l.f.lists.length === 0) {
          faces.delete(l.f)
          this.killFace(l.f)
          continue
        }
      } else {
        l.list.length--
      }

      this._killLoop(l)
    }

    let e1 = v.edges[0],
      e2 = v.edges[1]
    let v1 = e1.otherVertex(v),
      v2 = e2.otherVertex(v)

    let flag = (e1.flag | e2.flag) & ~MeshFlags.HIDE

    this.killVertex(v)
    if (1) {
      let e3 = this.makeEdge(v1, v2)

      if (flag & MeshFlags.SELECT) {
        this.edges.setSelect(e3, true)
      }

      e3.flag |= flag
    }

    for (let f of faces) {
      this.linkFace(f, true)
    }
  }

  getList(type: MeshTypes) {
    return this.elists[type]
  }

  setSelect(e: Element, state: boolean) {
    this.getList(e.type).setSelect(e, state)
  }

  selectNone() {
    for (let k in this.elists) {
      this.elists[k].selectNone()
    }
  }

  selectAll() {
    for (let k in this.elists) {
      this.elists[k].selectAll()
    }
  }

  /** @deprecated */
  regen_render() {
    return this.regenRender()
  }

  regenRender() {
    meshRedrawEmitter.emitEvent('redraw', this)
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this)

    let elists = this.elists as unknown as ElementArray<Element>[]
    this.elists = {}

    for (let elist of elists) {
      this.elists[elist.type] = elist
    }

    this.addElistAliases()

    let eidMap = (this.eidMap = new Map<number, Element>())

    for (let list of this.getElists()) {
      for (let elem of list) {
        eidMap.set(elem.eid, elem)
      }
    }

    for (let v of this.verts) {
      for (let i = 0; i < v.edges.length; i++) {
        v.edges[i] = eidMap.get(v.edges[i] as unknown as number)! as Edge
      }
    }

    for (let h of this.handles) {
      h.owner = eidMap.get(h.owner as unknown as number) as Edge
    }

    let eloops = new Map<Edge, Loop>()

    for (let e of this.edges) {
      e.v1 = eidMap.get(e.v1 as unknown as number) as Vertex
      e.v2 = eidMap.get(e.v2 as unknown as number) as Vertex
      e.h1 = eidMap.get(e.h1 as unknown as number) as Handle
      e.h2 = eidMap.get(e.h2 as unknown as number) as Handle
      eloops.set(e, eidMap.get(e.l as unknown as number) as Loop)
      e.l = undefined

      if (e.h1) {
        this.features |= MeshFeatures.HANDLES
      }
    }

    for (let l of this.loops) {
      l.v = eidMap.get(l.v as unknown as number) as Vertex
      l.e = eidMap.get(l.e as unknown as number) as Edge
    }

    for (let list of this.lists) {
      let loops = list._loops!.map((l) => eidMap.get(l)!) as Loop[]
      list._loops = undefined

      list.l = loops[0]

      for (let i = 0; i < loops.length; i++) {
        let l1 = loops[(i - 1 + loops.length) % loops.length]
        let l2 = loops[i]
        let l3 = loops[(i + 1) % loops.length]

        l1.next = l2
        l2.prev = l1
        l2.next = l3
        l3.prev = l2
      }
    }

    for (let f of this.faces) {
      for (let i = 0; i < f.lists.length; i++) {
        f.lists[i] = eidMap.get(f.lists[i] as unknown as number) as LoopList
      }

      for (let list of f.lists) {
        list.length = 0

        for (let l of list) {
          l.f = f
          l.list = list
          this.radialLoopInsert(l.e, l)
          list.length++
        }
      }
    }

    for (let [e, l] of eloops) {
      e.l = l
    }

    for (let elist of this.getElists()) {
      elist.active = eidMap.get(elist.active as unknown as number)
      elist.highlight = eidMap.get(elist.highlight as unknown as number)
    }
  }
}
