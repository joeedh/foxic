import { SelectOneOp, SelToolModes } from '@gametest/meshlib'
import {
  ContextLike,
  EnumProperty,
  IntProperty,
  IToolStack,
  PropertySlots,
  ToolDef,
  ToolOp,
} from 'path.ux'
import { TexGenContext } from './context'

export abstract class SelectOpBase<
  Inputs extends PropertySlots = {},
  Outputs extends PropertySlots = {},
> extends ToolOp<
  Inputs & {
    mode: EnumProperty
  },
  Outputs,
  TexGenContext
> {
  static tooldef(): ToolDef {
    return {
      inputs: {
        mode: new EnumProperty(SelToolModes.ADD, SelToolModes),
      },
      outputs: {},
    }
  }

  static canRun(ctx: TexGenContext) {
    return ctx.graph !== undefined
  }

  protected undoData = {
    highlight: -1,
    active   : -1,
    selected : new Set<number>(),
  }

  undoPre(ctx: TexGenContext) {
    this.undoData.highlight = ctx.graph.nodes.highlight?._id ?? -1
    this.undoData.active = ctx.graph.nodes.active?._id ?? -1
    const selected = Array.from(ctx.graph.nodes.selected).map((n) => n._id)
    this.undoData.selected = new Set(selected)
  }

  undo(ctx: TexGenContext): void {
    const graph = ctx.graph
    graph.nodes.highlight = graph.nodes.get(this.undoData.highlight)
    graph.nodes.active = graph.nodes.get(this.undoData.active)
    graph.nodes.selected.clear()
    for (const id of this.undoData.selected) {
      const node = graph.nodes.get(id)
      if (node) {
        graph.nodes.selected.add(node)
      }
    }
    ctx.redrawAll()
  }

  execPost(ctx: TexGenContext): void {
    ctx.redrawAll()
  }
}

export class NodeSelectOp extends SelectOpBase<{ nodeId: IntProperty }> {
  static tooldef() {
    return {
      toolpath: 'graph.selectNode',
      inputs  : { nodeId: new IntProperty(-1) },
      outputs : {},
    }
  }

  exec(ctx: TexGenContext) {
    const { nodeId, mode } = this.getInputs()
    const graph = ctx.graph
    const node = graph.nodes.get(nodeId)

    if (!node) {
      ctx.error(`Node ${nodeId} does not exist`)
      return
    }

    if (mode === SelToolModes.AUTO) {
      graph.nodes.clearSelection()
    }

    switch (mode) {
      case SelToolModes.AUTO:
      case SelToolModes.ADD:
        graph.nodes.setSelect(node, true)
        break
      case SelToolModes.SUB:
        graph.nodes.setSelect(node, true)
        break
      case SelToolModes.TOGGLE:
        graph.nodes.setSelect(node, !graph.nodes.isSelected(node))
        break
    }
  }
}
ToolOp.register(NodeSelectOp)
