import config from '../config/config.js'

import {
  util,
  math,
  Vector2,
  Vector3,
  Vector4,
  Matrix4,
  nstructjs,
  ToolOp,
  IntProperty,
  FloatProperty,
  Vec3Property,
  Vec4Property,
  Vec2Property,
  FlagProperty,
  keymap,
  INumVector,
  PropertySlots,
  ToolDef,
} from '../path.ux/pathux.js'
import {Context} from './context.js'

import {Vertex, MeshTypes, MeshFlags, MeshVector, Element, Mesh, ElementArray, Handle} from './mesh.js'

const VecProperty = new Vertex().co.length === 3 ? Vec3Property : Vec2Property
type VecProperty = Vertex['co'] extends Vector2 ? Vec2Property : Vec3Property

const Vector = MeshVector
const VectorSize = new Vector().length

export class TransformList<T = any> extends Array<T> {
  typeName: string
  selMask: number

  constructor(typeName: string, selMask: number) {
    super()

    this.typeName = typeName
    this.selMask = selMask
  }
}

export interface ITransformClassDef {
  typeName: string
  uiName: string
  selMask: number
}
export interface ITransformClass {
  undoPre(mesh: Mesh, selMask: number, list: TransformList): any
  undo(mesh: Mesh, selMask: number, data: any): void
  create(mesh: Mesh, selMask: number): TransformList
  transformDefine(): ITransformClassDef
}

export const TransformClasses = [] as ITransformClass[]

export class TransformElem {
  constructor() {}

  static undoPre(mesh: Mesh, selMask: number, list: TransformList): any {
    throw new Error('implement me!')
  }

  static undo(mesh: Mesh, selMask: number, data: any) {
    throw new Error('implement me!')
  }

  static create(mesh: Mesh, selMask: number) {
    throw new Error('implement me!')
  }

  static transformDefine() {
    return {
      typeName: '',
      uiName  : '',
      selMask : 0,
    }
  }

  static register(cls: ITransformClass) {
    TransformClasses.push(cls)
  }

  static getClass(typeName: string): ITransformClass | undefined {
    for (let cls of TransformClasses) {
      if (cls.transformDefine().typeName === typeName) {
        return cls
      }
    }
  }

  minmax(min: MeshVector, max: MeshVector) {
    throw new Error('implement me!')
  }

  apply(matrix: Matrix4) {
    throw new Error('implement me!')
  }
}

export class TransformVert extends TransformElem {
  v: Vertex | Handle
  start: MeshVector

  constructor(v: Vertex | Handle) {
    super()

    this.v = v
    this.start = new MeshVector(v.co)
  }

  static create(mesh: Mesh, selMask: number) {
    let list = new TransformList(this.transformDefine().typeName, selMask)

    let doList = (elist: ElementArray<Vertex | Handle>) => {
      for (let v of elist.selected.editable) {
        list.push(new this(v))
      }
    }

    if (selMask & MeshTypes.VERTEX) {
      doList(mesh.verts)
    }

    if (mesh.haveHandles && selMask & MeshTypes.HANDLE) {
      doList(mesh.handles)
    }

    return list
  }

  static undoPre(mesh: Mesh, selMask: Number, list: TransformList<TransformVert>) {
    let ret = []

    for (let td of list) {
      ret.push(td.v.eid)

      for (let i = 0; i < VectorSize; i++) {
        ret.push(td.v.co[i])
      }
    }

    return ret
  }

  static undo(mesh: Mesh, selMask: number, data: number[]) {
    let vlen = VectorSize + 1

    for (let i = 0; i < data.length; i += vlen) {
      let eid = data[i]

      let elem = mesh.eidMap.get(eid) as Vertex | Handle
      if (!elem) {
        console.error('Missing element ' + eid)
        continue
      }

      for (let j = 0; j < VectorSize; j++) {
        ;(elem.co as unknown as number[])[j] = data[i + j + 1]
      }
    }
  }

  static transformDefine() {
    return {
      typeName: 'verts',
      uiName  : 'verts',
      selMask : MeshTypes.VERTEX | MeshTypes.HANDLE,
    }
  }

  minmax(min: MeshVector, max: MeshVector) {
    min.min(this.start)
    max.max(this.start)
  }

  apply(matrix: Matrix4) {
    this.v.co.load(this.start)
    this.v.co.multVecMatrix(matrix)
  }
}

TransformElem.register(TransformVert)

type TransformData = TransformList[]

export class TransformOp<Inputs extends PropertySlots = {}, Outputs extends PropertySlots = {}> extends ToolOp<
  Inputs & {selMask: FlagProperty; center: VecProperty},
  Outputs,
  Context
> {
  transData?: TransformData
  deltaMpos: Vector2
  startMpos: Vector2
  lastMpos: Vector2
  _lastMpos: Vector2
  mpos: Vector2
  first: boolean

  _undo?: any
  _undoSelMask?: number

  constructor() {
    super()

    this.deltaMpos = new Vector2()
    this.startMpos = new Vector2()
    this.lastMpos = new Vector2()
    this._lastMpos = new Vector2()
    this.mpos = new Vector2()

    this.first = true
  }

  static tooldef(): ToolDef {
    return {
      toolpath: '',
      inputs: {
        selMask: new FlagProperty(config.SELECTMASK, MeshTypes),
        center : new VecProperty(),
      },
    }
  }

  calcTransCenter(tdata: TransformData) {
    let min = new Vector()
    let max = new Vector()

    min.addScalar(1e17)
    max.addScalar(-1e17)
    for (let list of tdata) {
      for (let td of list) {
        td.minmax(min, max)
      }
    }

    this.inputs.center.setValue(min.interp(max, 0.5))
  }

  getTransData(ctx: Context, doCenter = true) {
    if (this.transData) {
      if (doCenter) {
        this.calcTransCenter(this.transData)
      }

      return this.transData
    }

    let ret = []
    let mesh = ctx.mesh
    let selMask = this.inputs.selMask.getValue()

    for (let list of TransformClasses) {
      ret.push(list.create(mesh, selMask))
    }

    if (doCenter) {
      this.calcTransCenter(ret)
    }

    this.transData = ret
    return ret
  }

  execPost(ctx: Context) {
    this.transData = undefined
    window.redraw_all()
  }

  execPre(ctx: Context) {
    this.getTransData(ctx)
    window.redraw_all()
  }

  modalStart(ctx: Context) {
    super.modalStart(ctx)
    this.getTransData(ctx)
  }

  undoPre(ctx: Context) {
    this._undo = {}
    this._undoSelMask = this.inputs.selMask.getValue()

    let tdata = this.getTransData(ctx)

    let selMask = this.inputs.selMask.getValue()
    let mesh = ctx.mesh

    for (let list of tdata) {
      let cls = TransformElem.getClass(list.typeName)!
      this._undo[list.typeName] = cls.undoPre(ctx.mesh, selMask, list)
    }

    window.redraw_all()
  }

  undo(ctx: Context) {
    let mesh = ctx.mesh

    for (let k in this._undo) {
      TransformElem.getClass(k)!.undo(mesh, this._undoSelMask!, this._undo[k])
    }

    window.redraw_all()
  }

  on_pointerup(e: PointerEvent) {
    this.modalEnd(false)
  }

  on_pointercancel(e: PointerEvent) {
    this.modalEnd(true) //will cancel
  }

  on_keydown(e: KeyboardEvent) {
    switch (e.keyCode) {
      case keymap['Enter']:
      case keymap['Space']:
        this.modalEnd(false)
        break
      case keymap['Escape']:
      case keymap['Backspace']:
      case keymap['Delete']:
        this.modalEnd(true)
        break
    }
  }

  on_pointermove(e: PointerEvent) {
    let ctx = this.modal_ctx!

    let workspace = ctx.workspace!
    let mpos = workspace.getLocalMouse(e.x, e.y)

    if (this.first) {
      this.startMpos.load(mpos)
      this.lastMpos.load(mpos)
      this.deltaMpos.zero()
      this.mpos.load(mpos)
      this._lastMpos.load(mpos)

      this.first = false
      return
    }

    this.lastMpos.load(this._lastMpos)
    this.deltaMpos.load(mpos).sub(this.lastMpos)

    this.mpos.load(mpos)
    this._lastMpos.load(mpos)
  }
}

export class TranslateOp<Inputs extends PropertySlots = {}, Outputs extends PropertySlots = {}> extends TransformOp<
  Inputs & {offset: VecProperty},
  Outputs
> {
  constructor() {
    super()
  }

  static tooldef() {
    return {
      uiname  : 'Move',
      toolpath: 'transform.translate',
      inputs: ToolOp.inherit({
        offset: new VecProperty(),
      }),
      is_modal: true,
    }
  }

  on_pointermove(e: PointerEvent) {
    super.on_pointermove(e)

    let delta = new Vector2(this.mpos).sub(this.startMpos)
    delta = new Vector2().loadXY(delta[0], delta[1])

    this.inputs.offset.setValue(new Vector().loadXY(delta[0], delta[1]))
    this.exec(this.modal_ctx!)
  }

  exec(ctx: Context) {
    let delta = this.inputs.offset.getValue()

    let matrix = new Matrix4()
    matrix.translate(delta[0], delta[1], delta[2] ?? 0.0)

    let tdata = this.getTransData(ctx)

    console.log(tdata)

    for (let tlist of tdata) {
      for (let td of tlist) {
        td.apply(matrix)
      }
    }

    window.redraw_all()
  }
}

ToolOp.register(TranslateOp)

export class ScaleOp extends TransformOp<{scale: VecProperty}> {
  constructor() {
    super()
  }

  static tooldef() {
    return {
      uiname  : 'Move',
      toolpath: 'transform.scale',
      inputs: ToolOp.inherit({
        scale: new VecProperty(),
      }),
      is_modal: true,
    }
  }

  on_pointermove(e: PointerEvent) {
    let ctx = this.modal_ctx!
    let workspace = ctx.workspace!

    super.on_pointermove(e)

    this.resetTempGeom()

    let delta2 = new Vector2(this.mpos).sub(this.startMpos)
    let delta = new Vector().loadXY(delta2[0], delta2[1])

    let center = this.inputs.center.getValue()

    let l1 = this.startMpos.vectorDistance(center)
    let l2 = this.mpos.vectorDistance(center)

    if (l1 === 0.0 || l2 === 0.0) {
      return
    }

    let scenter = workspace.getGlobalMouse(center[0], center[1])

    this.makeTempLine([e.x, e.y], scenter)

    let ratio = l2 / l1
    let scale = new Vector().addScalar(1.0)

    scale.loadXY(ratio, ratio)

    this.inputs.scale.setValue(scale)
    this.exec(this.modal_ctx!)
  }

  exec(ctx: Context) {
    let scale = this.inputs.scale.getValue()
    let center = this.inputs.center.getValue()

    let tmat1 = new Matrix4()
    let tmat2 = new Matrix4()

    tmat1.translate(-center[0], -center[1], -(center[2] ?? 0.0))
    tmat2.translate(center[0], center[1], center[2] ?? 0.0)

    let matrix = new Matrix4()

    matrix.multiply(tmat2)
    matrix.scale(scale[0], scale[1], scale[2] ?? 1.0)
    matrix.multiply(tmat1)

    let tdata = this.getTransData(ctx)

    for (let tlist of tdata) {
      for (let td of tlist) {
        td.apply(matrix)
      }
    }

    window.redraw_all()
  }
}

ToolOp.register(ScaleOp)

export class RotateOp extends TransformOp<{th: FloatProperty}> {
  constructor() {
    super()
  }

  static tooldef() {
    return {
      uiname  : 'Move',
      toolpath: 'transform.rotate',
      inputs: ToolOp.inherit({
        th: new FloatProperty(),
      }),
      is_modal: true,
    }
  }

  on_pointermove(e: PointerEvent) {
    super.on_pointermove(e)

    let ctx = this.modal_ctx!
    let workspace = ctx.workspace!

    this.resetTempGeom()

    let {center, th} = this.getInputs()

    let scenter = workspace.getGlobalMouse(center[0], center[1])
    this.makeTempLine([e.x, e.y], scenter)

    let d1 = new Vector2(this.lastMpos)
    let d2 = new Vector2(this.mpos)

    d1.sub(center).normalize()
    d2.sub(center).normalize()

    let dth = Math.asin((d1[0] * d2[1] - d1[1] * d2[0]) * 0.99999)

    th += dth

    this.inputs.th.setValue(th)
    this.exec(this.modal_ctx!)

    this.lastMpos.load(this.mpos)
  }

  exec(ctx: Context) {
    let {center, th} = this.getInputs()

    let tmat1 = new Matrix4()
    let tmat2 = new Matrix4()

    tmat1.translate(center[0], center[1], center[2] ?? 0.0)
    tmat2.translate(-center[0], -center[1], -(center[2] ?? 0.0))

    let matrix = new Matrix4()
    let rotmat = new Matrix4()
    rotmat.euler_rotate(0.0, 0.0, th)

    matrix.multiply(tmat1)
    matrix.multiply(rotmat)
    matrix.multiply(tmat2)

    let tdata = this.getTransData(ctx)

    for (let tlist of tdata) {
      for (let td of tlist) {
        td.apply(matrix)
      }
    }

    window.redraw_all()
  }
}

ToolOp.register(RotateOp)
