import {
  IntProperty,
  JSONAny,
  PropertySlots,
  StringProperty,
  ToolOp,
  Vec2Property,
  Vector2,
  nstructjs,
} from 'path.ux'
import { TexGenContext } from './context'
import { NodeBase, NodeClasses, NodeGraph } from './shaderGraph'
import { DrawEvent } from './nodeGraphEditor'

class UndoData {
  data: JSONAny

  constructor(ctx: TexGenContext) {
    const graph = ctx.graph
    this.data = nstructjs.writeJSON(graph)
  }
}

export abstract class ShaderGraphOp<
  Inputs extends PropertySlots,
  Outputs extends PropertySlots,
> extends ToolOp<Inputs, Outputs, TexGenContext> {
  _undo?: UndoData

  undoPre(ctx: TexGenContext) {
    this._undo = new UndoData(ctx)
  }

  undo(ctx: TexGenContext) {
    if (this._undo) {
      const graph = ctx.graph
      ctx.state.model.graph = nstructjs.readJSON(this._undo.data, NodeGraph)
    }
  }

  execPost(ctx: TexGenContext) {
    ctx.redrawAll()
  }
}

export class AddNodeOp extends ShaderGraphOp<
  { nodeType: StringProperty; pos: Vec2Property },
  { nodeId: IntProperty }
> {
  static tooldef() {
    return {
      toolpath: 'graph.add',
      inputs: {
        nodeType: new StringProperty('error'),
        pos     : new Vec2Property(),
      },
      outputs: {
        nodeId: new IntProperty(-1),
      },
    }
  }

  exec(ctx: TexGenContext) {
    const graph = ctx.graph
    const { nodeType, pos } = this.getInputs()
    const cls = NodeBase.getClass(nodeType)

    console.log('add node!', nodeType, pos)

    if (cls === undefined) {
      ctx.error('Unknown node type: ' + nodeType)
      return
    }
    const node = graph.addNode(new cls())
    node.pos.load(pos)
    this.outputs.nodeId.setValue(node._id)
  }
}
ToolOp.register(AddNodeOp)

export class TranslateNodeOp extends ShaderGraphOp<
  {
    offset: Vec2Property
    startMouse: Vec2Property
  },
  {}
> {
  static tooldef() {
    return {
      toolpath: 'graph.move',
      inputs: {
        offset    : new Vec2Property(),
        startMouse: new Vec2Property(),
      },
      outputs : {},
      is_modal: true,
    }
  }

  static canRun(ctx: TexGenContext, toolop?: ToolOp) {
    return ctx.shaderGraphEditor !== undefined
  }

  lastPos = new Vector2()
  startPos = new Vector2()
  first = true
  startPosMap = new Map<number, Vector2>()

  modalStart(ctx: TexGenContext) {
    if (this.first && this.inputs.startMouse.wasSet) {
      this.first = false
      this.startPos.load(this.inputs.startMouse.getValue())
      this.startPos.load(
        ctx.shaderGraphEditor!.getLocalMouse(this.startPos[0], this.startPos[1]),
      )
      this.lastPos.load(this.startPos)
    }
    for (const node of ctx.graph.nodes) {
      this.startPosMap.set(node._id, node.pos.copy())
    }
    return super.modalStart(ctx)
  }

  on_pointermove(e: PointerEvent) {
    const ctx = this.modal_ctx!

    if (this.first) {
      this.first = false
      this.startPos.load(this.inputs.startMouse.getValue())
      return
    }
    const pos = ctx.shaderGraphEditor!.getLocalMouse(e.x, e.y)
    const offset = pos.copy().sub(this.startPos)
    this.inputs.offset.setValue(offset)

    for (const [id, startPos] of this.startPosMap) {
      const node = ctx.graph.nodes.get(id)
      if (node) {
        node.pos.load(startPos)
      }
    }
    this.exec(ctx)
    ctx.redrawAll()
  }

  on_pointerup(e: PointerEvent) {
    this.modalEnd(false)
  }

  modalEnd(was_cancelled: boolean): void {
    this.startPosMap.clear()
    return super.modalEnd(was_cancelled)
  }

  exec(ctx: TexGenContext) {
    const graph = ctx.graph
    const { offset } = this.getInputs()

    for (const node of graph.nodes.selected) {
      node.pos.add(offset)
    }
  }
}
ToolOp.register(TranslateNodeOp)

export class LinkSocketOp extends ShaderGraphOp<
  {
    startMouse: Vec2Property
    sourceSocket: IntProperty
    targetSocket: IntProperty
  },
  {}
> {
  static tooldef() {
    return {
      toolpath: 'graph.link',
      inputs: {
        startMouse  : new Vec2Property(),
        sourceSocket: new IntProperty(),
        targetSocket: new IntProperty(),
      },
      outputs : {},
      is_modal: true,
    }
  }

  static canRun(ctx: TexGenContext, toolop?: ToolOp) {
    return ctx.shaderGraphEditor !== undefined
  }

  lastPos = new Vector2()
  startPos = new Vector2()
  first = true

  modalStart(ctx: TexGenContext) {
    ctx.shaderGraphEditor!.addEventListener('draw', this.onRedraw)
    if (this.first && this.inputs.startMouse.wasSet) {
      this.first = false
      this.startPos.load(this.inputs.startMouse.getValue())
      this.startPos.load(
        ctx.shaderGraphEditor!.getLocalMouse(this.startPos[0], this.startPos[1]),
      )
      this.lastPos.load(this.startPos)
    }
    return super.modalStart(ctx)
  }

  private onRedrawCB?: (e: DrawEvent) => void
  onRedraw = (e: DrawEvent) => {
    this.onRedrawCB?.(e)
  }

  on_pointermove(e: PointerEvent) {
    const ctx = this.modal_ctx!

    if (this.first) {
      this.first = false
      this.startPos.load(this.inputs.startMouse.getValue())
      return
    }

    const graph = ctx.graph
    const socket1 = graph.nodes.getSocket(this.inputs.sourceSocket.getValue())!
    const local = ctx.shaderGraphEditor!.getLocalMouse(e.x, e.y)

    const hit = ctx.shaderGraphEditor!.hitTest(local)
    let error = false
    if (hit?.socket) {
      const socket2 = hit.socket.sock
      error = !graph.canConnect(socket1, socket2)
      if (!error) {
        this.inputs.targetSocket.setValue(socket2._id)
      } else {
        this.inputs.targetSocket.setValue(-1)
      }
    }

    const drawSocketLine = () => {
      if (socket1.socketType === 'input') {
        ctx.shaderGraphEditor!.drawSocketLine(
          local,
          ctx.shaderGraphEditor!.socketPos(socket1.node, socket1),
        )
      } else {
        ctx.shaderGraphEditor!.drawSocketLine(
          ctx.shaderGraphEditor!.socketPos(socket1.node, socket1),
          local,
        )
      }
    }
    this.onRedrawCB = (e: DrawEvent) => {
      const { canvas, g } = e
      g.save()
      g.lineWidth *= error ? 3 : 2
      g.strokeStyle = error ? 'red' : 'white'
      drawSocketLine()
      g.lineWidth *= 0.5
      g.strokeStyle = error ? 'red' : hit.socket ? 'green' : 'orange'
      drawSocketLine()
      g.restore()
    }
    ctx.redrawAll()
  }

  on_pointerup(e: PointerEvent) {
    this.modalEnd(false)
  }

  modalEnd(was_cancelled: boolean): void {
    const ctx = this.modal_ctx!
    ctx.redrawAll()

    this.modal_ctx!.shaderGraphEditor!.removeEventListener('draw', this.onRedraw)
    this.onRedrawCB = undefined // avoid gc leak of closure

    const result = super.modalEnd(was_cancelled)
    this.exec(ctx)
    return result
  }

  exec(ctx: TexGenContext) {
    const graph = ctx.graph
    const { sourceSocket, targetSocket } = this.getInputs()
    const socket1 = graph.nodes.getSocket(sourceSocket)
    const socket2 = graph.nodes.getSocket(targetSocket)
    if (socket1 && socket2) {
      socket1.connect(socket2)
    }
  }
}
ToolOp.register(LinkSocketOp)
