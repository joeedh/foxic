import config from './config'

import {
  BoolProperty,
  EnumProperty,
  FlagProperty,
  FloatProperty,
  IntProperty,
  ToolOp,
  PropertySlots,
  ToolDef,
} from 'path.ux'
import { Edge, Element, Face, Handle, Loop, meshRedrawEmitter, Vertex } from './mesh'
import { MeshCtx, SelToolModes } from './mesh_ops'
import { MeshTypes, MeshFlags } from './mesh_base'

interface ISelecTOpUndo {
  elems: number[]
  type: MeshTypes
  active: number
  highlight: number
}

export class SelectOpBase<
  CTX extends MeshCtx,
  Inputs extends PropertySlots = {},
  Outputs extends PropertySlots = {},
> extends ToolOp<
  Inputs & {
    mode: EnumProperty
    selectMask: FlagProperty
  },
  Outputs,
  CTX
> {
  _selectOpUndo?: ISelecTOpUndo[]

  static tooldef(): ToolDef {
    return {
      toolpath: '<select op base>',
      inputs: {
        mode      : new EnumProperty(SelToolModes.AUTO, SelToolModes),
        selectMask: new FlagProperty(0b11111, MeshTypes),
      },
    }
  }

  static invoke(ctx: MeshCtx, args: any) {
    let tool = super.invoke(ctx, args)

    if (!('selectMask' in args)) {
      tool.inputs.selectMask.setValue(ctx.selectMask)
    }

    return tool
  }

  getselectMask(ctx: CTX) {
    let mask = this.inputs.selectMask.getValue()

    if (ctx.mesh.haveHandles) {
      mask |= MeshTypes.HANDLE
    }

    return mask
  }

  undoPre(ctx: CTX) {
    this._selectOpUndo = []

    let mesh = ctx.mesh
    let mask = this.getselectMask(ctx)

    for (let list of mesh.getElists()) {
      let data = {
        elems    : [] as number[],
        type     : list.type,
        active   : list.active ? list.active.eid : -1,
        highlight: list.highlight ? list.highlight.eid : -1,
      }
      this._selectOpUndo.push(data)
      const elems = data.elems

      if (!(list.type & mask)) {
        continue
      }

      for (let e of list) {
        elems.push(e.eid)
        elems.push(e.flag)
      }
    }
  }

  undo(ctx: CTX) {
    let mesh = ctx.mesh
    let eidMap = mesh.eidMap

    for (let list of this._selectOpUndo!) {
      let elist = mesh.elists[list.type]

      elist.active = eidMap.get(list.active)
      elist.highlight = eidMap.get(list.highlight)

      let data = list.elems
      for (let i = 0; i < data.length; i += 2) {
        let eid = data[i],
          state = data[i + 1]

        let elem = eidMap.get(eid)
        if (!elem) {
          console.error('Missing mesh element ' + eid + ':' + list.type)
          continue
        }

        if (state === elem.flag) {
          continue
        }

        elist.setSelect(elem, !!(state & MeshFlags.SELECT))
      }
    }

    mesh.regenRender()
  }

  execPost(ctx: CTX) {
    ctx.mesh.regenRender()
  }
}

export class SelectOneOp<CTX extends MeshCtx> extends SelectOpBase<
  CTX,
  {
    elemEid: IntProperty
    flush: BoolProperty
    setActive: BoolProperty
    unique: BoolProperty
  }
> {
  static tooldef() {
    return {
      uiname  : 'Select One',
      toolpath: 'mesh.select_one',
      inputs: {
        elemEid  : new IntProperty(),
        flush    : new BoolProperty(true),
        setActive: new BoolProperty(true),
        unique   : new BoolProperty(true),
      },
    }
  }

  static invoke(ctx: MeshCtx, args: any) {
    let tool = super.invoke(ctx, args)

    if (!('selectMask' in args)) {
      tool.inputs.selectMask.setValue(ctx.selectMask)
    }

    return tool
  }

  exec(ctx: CTX) {
    let mesh = ctx.mesh
    let { mode, elemEid, flush, setActive, unique } = this.getInputs()
    let selectMask = this.getselectMask(ctx)

    let elem = mesh.eidMap.get(elemEid)
    const haveHandles = mesh.haveHandles

    if (elem === undefined) {
      console.error('Unknown element ' + elemEid)
      return
    }

    if (unique) {
      mesh.selectNone()
    }

    if (mode === SelToolModes.ADD || mode === SelToolModes.AUTO) {
      const select = mode !== SelToolModes.SUB

      mesh.setSelect(elem, select)

      if (select && haveHandles && elem.type === MeshTypes.VERTEX) {
        const vertex = elem as Vertex
        for (let e of vertex.edges) {
          mesh.setSelect(e.handle(vertex)!, true)
        }
      }
    }

    if (setActive) {
      mesh.setActive(elem)
    }

    if (flush) {
      mesh.selectFlush(selectMask as unknown as MeshTypes)
    }
  }
}

ToolOp.register(SelectOneOp)

export class ToggleSelectOp<CTX extends MeshCtx> extends SelectOpBase<
  CTX,
  { setActive: BoolProperty }
> {
  static tooldef() {
    return {
      uiname  : 'Select All/None',
      toolpath: 'mesh.toggle_select_all',
      inputs: {
        setActive: new BoolProperty(false),
      },
      outputs : ToolOp.inherit({}),
    }
  }

  exec(ctx: CTX) {
    let mesh = ctx.mesh
    let { setActive, mode, selectMask } = this.getInputs()

    let hasActive

    if (mode === SelToolModes.AUTO) {
      mode = SelToolModes.ADD

      for (let elist of mesh.getElists()) {
        if (!(elist.type & selectMask)) {
          continue
        }

        if (elist.active) {
          hasActive = true
        }

        if (elist.selected.length > 0) {
          mode = SelToolModes.SUB
        }
      }
    }

    if (setActive && mode === SelToolModes.SUB) {
      mesh.setActive(undefined)
    } else if (setActive && mode === SelToolModes.ADD) {
      setActive = setActive && !hasActive
    }

    console.log(setActive, selectMask, mode)

    for (let elist of mesh.getElists()) {
      if (!(elist.type & selectMask)) {
        continue
      }

      let setActive2 = setActive

      for (let elem of elist.editable) {
        elist.setSelect(elem, mode === SelToolModes.ADD)

        if (setActive2) {
          mesh.setActive(elem)
          setActive2 = false
        }
      }
    }

    mesh.selectFlush(selectMask)
  }
}

ToolOp.register(ToggleSelectOp)

export class SelectLinked<CTX extends MeshCtx> extends SelectOpBase<
  CTX,
  {
    pick: BoolProperty
    elemEid: IntProperty
    onlyElem: BoolProperty
  }
> {
  static tooldef() {
    return {
      uiname  : 'Select Linked',
      toolpath: 'mesh.select_linked',
      inputs: ToolOp.inherit({
        pick    : new BoolProperty(false),
        elemEid : new IntProperty(-1),
        onlyElem: new BoolProperty(false),
      }),
      outputs : ToolOp.inherit({}),
    }
  }

  static invoke(ctx: MeshCtx, args: any) {
    let tool = super.invoke(ctx, args)

    if (tool.inputs.pick.getValue()) {
      let workspace = ctx.canvas!
      let elem = workspace.findElement(
        tool.inputs.selectMask.getValue(),
        workspace.lastLocalMouse,
      )

      if (elem instanceof Element) {
        switch (elem.type) {
          case MeshTypes.HANDLE:
            elem = (elem as Handle).owner!.v1
            break
          case MeshTypes.EDGE:
            elem = (elem as Edge).v1
            break
          case MeshTypes.FACE:
            elem = (elem as Face).lists[0].l.v
            break
          case MeshTypes.LOOP:
            elem = (elem as Loop).v
            break
        }

        tool.inputs.elemEid.setValue(elem.eid)
        tool.inputs.onlyElem.setValue(true)
      }
    }

    return tool
  }

  exec(ctx: CTX) {
    let visit = new WeakSet()
    let stack = [] as Vertex[]
    let mesh = ctx.mesh
    let { selectMask, mode, pick, onlyElem, elemEid } = this.getInputs()

    let vs: Set<Vertex>

    if (onlyElem && elemEid >= 0) {
      let v = mesh.eidMap.get(elemEid)

      if (!v || v.type !== MeshTypes.VERTEX) {
        console.warn('Invalid element ' + elemEid + '; got', v)
        return
      } else {
        vs = new Set([v as Vertex])
      }
    } else {
      vs = new Set(mesh.verts.selected.editable)
    }

    for (let v of vs) {
      if (visit.has(v)) {
        continue
      }

      stack.length = 0
      stack.push(v)
      visit.add(v)

      while (stack.length > 0) {
        let v2 = stack.pop()!

        mesh.setSelect(v2, mode === SelToolModes.ADD)

        for (let e of v2.edges) {
          let v3 = e.otherVertex(v2)

          if (!visit.has(v3)) {
            visit.add(v3)
            stack.push(v3)
          }
        }
      }
    }

    mesh.selectFlush(selectMask)
  }
}

ToolOp.register(SelectLinked)
