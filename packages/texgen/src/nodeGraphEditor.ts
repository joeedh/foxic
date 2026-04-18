import { DataAPI, nstructjs, UIBase, Vector2 } from "path.ux"
import { Editor } from "@gametest/vis-tester-base/editors/editorBase"
import { redrawEmitter, redrawAll } from "@gametest/vis-tester-base/editors/redraw"
import type { TexGenContext } from "./context"
import {
  AddNode,
  MixNode,
  MultiplyNode,
  NodeBase,
  NodeSocket,
  SdfInputNode,
  ThresholdNode,
} from "./shaderGraph"

const NODE_W = 140
const NODE_HEADER = 22
const SOCK_R = 6
const ROW_H = 18

interface SocketHit {
  node: NodeBase<any>
  sock: NodeSocket<any>
  pos: Vector2
}

export class NodeGraphEditor extends Editor<TexGenContext> {
  static STRUCT = nstructjs.inlineRegister(this, `NodeGraphEditor {}`)

  static define() {
    return {
      tagname: "node-graph-editor-x",
      areaname: "nodeGraphEditor",
      uiname: "Node Graph",
      icon: -1,
    }
  }

  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    return st
  }

  private canvas!: HTMLCanvasElement
  private g!: CanvasRenderingContext2D
  private redrawCB = () => this.draw()

  private dragging?: { node: NodeBase<any>; offset: Vector2 }
  private linking?: { from: SocketHit; mouse: Vector2 }

  init() {
    super.init()
    this.canvas = document.createElement("canvas")
    this.g = this.canvas.getContext("2d")!
    this.shadow.appendChild(this.canvas)

    this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e))
    this.canvas.addEventListener("pointermove", (e) => this.onPointerMove(e))
    this.canvas.addEventListener("pointerup", (e) => this.onPointerUp(e))
    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault()
      this.onContext(e)
    })

    this.checkRedrawEvent()
    this.draw()
  }

  private checkRedrawEvent() {
    const subscribed = redrawEmitter.has("redraw", this.redrawCB)
    if (subscribed && !this.isConnected) {
      redrawEmitter.off("redraw", this.redrawCB)
    } else if (!subscribed && this.isConnected) {
      redrawEmitter.on("redraw", this.redrawCB)
    }
  }

  update() {
    this.checkRedrawEvent()
    super.update()
  }

  private checkSize() {
    const size = this.size
    if (!size) return
    const dpi = devicePixelRatio
    const w = ~~(size[0] * dpi)
    const h = ~~(size[1] * dpi)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
      this.canvas.style.width = w / dpi + "px"
      this.canvas.style.height = h / dpi + "px"
    }
  }

  private getLocalMouse(x: number, y: number): Vector2 {
    const r = this.canvas.getBoundingClientRect()
    return new Vector2().loadXY((x - r.x) * devicePixelRatio, (y - r.y) * devicePixelRatio)
  }

  private nodeHeight(n: NodeBase<any>): number {
    const rows = Math.max(
      Object.keys(n.inputs).length,
      Object.keys(n.outputs).length,
      1,
    )
    return NODE_HEADER + rows * ROW_H + 8
  }

  private socketPos(n: NodeBase<any>, sock: NodeSocket<any>): Vector2 {
    const isInput = sock.socketType === "input"
    const map = isInput ? n.inputs : n.outputs
    const keys = Object.keys(map)
    const idx = keys.indexOf(sock.name)
    const y = n.pos[1] + NODE_HEADER + idx * ROW_H + ROW_H * 0.5
    const x = isInput ? n.pos[0] : n.pos[0] + NODE_W
    return new Vector2().loadXY(x, y)
  }

  private hitTest(local: Vector2): {
    node?: NodeBase<any>
    socket?: SocketHit
  } {
    const graph = this.ctx?.graph
    if (!graph) return {}

    // sockets first
    for (const n of graph.nodes) {
      for (const k in n.inputs) {
        const s = n.inputs[k]
        const p = this.socketPos(n, s)
        if (local.vectorDistance(p) <= SOCK_R + 3) {
          return { node: n, socket: { node: n, sock: s, pos: p } }
        }
      }
      for (const k in n.outputs) {
        const s = n.outputs[k]
        const p = this.socketPos(n, s)
        if (local.vectorDistance(p) <= SOCK_R + 3) {
          return { node: n, socket: { node: n, sock: s, pos: p } }
        }
      }
    }
    // node body
    for (let i = graph.nodes.length - 1; i >= 0; i--) {
      const n = graph.nodes[i]
      const h = this.nodeHeight(n)
      if (
        local[0] >= n.pos[0] &&
        local[0] <= n.pos[0] + NODE_W &&
        local[1] >= n.pos[1] &&
        local[1] <= n.pos[1] + h
      ) {
        return { node: n }
      }
    }
    return {}
  }

  private onPointerDown(e: PointerEvent) {
    if (!this.ctx) return
    const local = this.getLocalMouse(e.x, e.y)
    const hit = this.hitTest(local)
    if (hit.socket) {
      this.linking = { from: hit.socket, mouse: local }
      return
    }
    if (hit.node) {
      this.dragging = {
        node: hit.node,
        offset: new Vector2().loadXY(
          local[0] - hit.node.pos[0],
          local[1] - hit.node.pos[1],
        ),
      }
    }
    redrawAll()
  }

  private onPointerMove(e: PointerEvent) {
    const local = this.getLocalMouse(e.x, e.y)
    if (this.dragging) {
      this.dragging.node.pos[0] = local[0] - this.dragging.offset[0]
      this.dragging.node.pos[1] = local[1] - this.dragging.offset[1]
      redrawAll()
    } else if (this.linking) {
      this.linking.mouse = local
      redrawAll()
    }
  }

  private onPointerUp(e: PointerEvent) {
    if (this.linking) {
      const local = this.getLocalMouse(e.x, e.y)
      const hit = this.hitTest(local)
      if (hit.socket && hit.socket.sock !== this.linking.from.sock) {
        try {
          this.linking.from.sock.connect(hit.socket.sock)
        } catch (err) {
          console.warn(err)
        }
        this.ctx?.redrawAll()
      }
    }
    this.linking = undefined
    this.dragging = undefined
    redrawAll()
  }

  private onContext(e: MouseEvent) {
    const local = this.getLocalMouse(e.x, e.y)
    const hit = this.hitTest(local)
    if (hit.socket) {
      hit.socket.sock.disconnectAll()
      this.ctx?.redrawAll()
      return
    }
    if (hit.node && this.ctx) {
      this.ctx.graph.removeNode(hit.node)
      this.ctx.redrawAll()
      return
    }
    // empty space — quick add via prompt
    const types: Record<string, new () => NodeBase<any>> = {
      sdf: SdfInputNode,
      mul: MultiplyNode,
      add: AddNode,
      thr: ThresholdNode,
      mix: MixNode,
    }
    const which = window.prompt(
      "Add node (sdf, mul, add, thr, mix):",
      "thr",
    )
    if (which && types[which] && this.ctx) {
      const n = this.ctx.graph.addNode(new types[which]())
      n.pos = [local[0], local[1]]
      this.ctx.redrawAll()
    }
  }

  draw() {
    this.checkSize()
    const { canvas, g } = this
    g.fillStyle = "#252b32"
    g.fillRect(0, 0, canvas.width, canvas.height)

    const graph = this.ctx?.graph
    if (!graph) return

    // connections
    g.strokeStyle = "#aaa"
    g.lineWidth = 2
    for (const n of graph.nodes) {
      for (const k in n.outputs) {
        const out = n.outputs[k]
        const p1 = this.socketPos(n, out)
        for (const other of out.edges) {
          if (!other.node) continue
          const p2 = this.socketPos(other.node, other)
          g.beginPath()
          g.moveTo(p1[0], p1[1])
          const dx = Math.max(40, Math.abs(p2[0] - p1[0]) * 0.5)
          g.bezierCurveTo(p1[0] + dx, p1[1], p2[0] - dx, p2[1], p2[0], p2[1])
          g.stroke()
        }
      }
    }

    // nodes
    for (const n of graph.nodes) {
      const h = this.nodeHeight(n)
      g.fillStyle = "#3a4350"
      g.strokeStyle = "#000"
      g.lineWidth = 1
      g.beginPath()
      g.rect(n.pos[0], n.pos[1], NODE_W, h)
      g.fill()
      g.stroke()

      g.fillStyle = "#2a313a"
      g.fillRect(n.pos[0], n.pos[1], NODE_W, NODE_HEADER)
      g.fillStyle = "#fff"
      g.font = "12px sans-serif"
      g.textBaseline = "middle"
      const def = (n.constructor as any).nodeDef
      g.fillText(def.uiName ?? def.typeName, n.pos[0] + 6, n.pos[1] + NODE_HEADER * 0.5)

      // sockets
      const drawSock = (sock: NodeSocket<any>, label: string) => {
        const p = this.socketPos(n, sock)
        g.fillStyle = sock.edges.length > 0 ? "#ffcc55" : "#777"
        g.beginPath()
        g.arc(p[0], p[1], SOCK_R, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = "#ddd"
        g.font = "11px sans-serif"
        if (sock.socketType === "input") {
          g.textAlign = "left"
          g.fillText(label, p[0] + SOCK_R + 4, p[1])
        } else {
          g.textAlign = "right"
          g.fillText(label, p[0] - SOCK_R - 4, p[1])
        }
      }
      for (const k in n.inputs) drawSock(n.inputs[k], k)
      for (const k in n.outputs) drawSock(n.outputs[k], k)
      g.textAlign = "left"
    }

    // pending link
    if (this.linking) {
      const p1 = this.linking.from.pos
      const p2 = this.linking.mouse
      g.strokeStyle = "#ffcc55"
      g.beginPath()
      g.moveTo(p1[0], p1[1])
      g.lineTo(p2[0], p2[1])
      g.stroke()
    }
  }
}
Editor.register(NodeGraphEditor)
UIBase.register(NodeGraphEditor as unknown as typeof UIBase)
