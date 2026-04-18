import {
  color2css,
  createMenu,
  DataAPI,
  nstructjs,
  ToolMacro,
  UIBase,
  Vector2,
} from 'path.ux'
import { Editor } from '@gametest/vis-tester-base/editors/editorBase'
import { redrawEmitter, redrawAll } from '@gametest/vis-tester-base/editors/redraw'
import type { TexGenContext } from './context'
import {
  AddNode,
  getNodeColor,
  MixNode,
  MultiplyNode,
  NodeBase,
  NodeClasses,
  NodeSocket,
  SdfInputNode,
  ThresholdNode,
} from './shaderGraph'
import { AddNodeOp, LinkSocketOp, TranslateNodeOp } from './shaderGraph_ops'
import { SelectOneOp, SelToolModes } from '@gametest/meshlib'
import { NodeSelectOp } from './shaderGraph_selectOps'

const NODE_W = 210
const NODE_HEADER = 22
const SOCK_R = 6
const ROW_H = 18
const SOCK_WIDTH = 65

interface SocketHit {
  node: NodeBase<any>
  sock: NodeSocket<any>
  pos: Vector2
}

export class DrawEvent extends Event {
  canvas: HTMLCanvasElement
  g: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement, g: CanvasRenderingContext2D) {
    super('draw')
    this.canvas = canvas
    this.g = g
  }
}
type RedrawEventCB = (this: HTMLElement, e: DrawEvent) => any

export class NodeGraphEditor extends Editor<TexGenContext> {
  static STRUCT = nstructjs.inlineRegister(this, `NodeGraphEditor {}`)

  static define() {
    return {
      tagname : 'node-graph-editor-x',
      areaname: 'nodeGraphEditor',
      uiname  : 'Node Graph',
      icon    : -1,
    }
  }

  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    return st
  }

  private canvas!: HTMLCanvasElement
  private g!: CanvasRenderingContext2D
  private redrawCB = () => this.draw()
  private widgetCache = new Map<string, UIBase<TexGenContext>>()

  private linking?: { from: SocketHit; mouse: Vector2 }

  addEventListener(
    type: 'draw',
    cb: RedrawEventCB | { handleEvent: RedrawEventCB },
    options?: AddEventListenerOptions | boolean,
  ): void {
    super.addEventListener(
      type as unknown as keyof HTMLElementEventMap,
      cb as any,
      options,
    )
  }
  removeEventListener(
    type: 'draw',
    cb: RedrawEventCB | { handleEvent: RedrawEventCB },
    options?: AddEventListenerOptions | boolean,
  ): void {
    super.addEventListener(
      type as unknown as keyof HTMLElementEventMap,
      cb as any,
      options,
    )
  }

  init() {
    super.init()
    this.canvas = document.createElement('canvas')
    this.g = this.canvas.getContext('2d')!
    this.shadow.appendChild(this.canvas)

    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e))
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e))
    this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e))
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      this.onRightClick(e)
    })

    this.checkRedrawEvent()
    this.draw()
  }

  private checkRedrawEvent() {
    const subscribed = redrawEmitter.has('redraw', this.redrawCB)
    if (subscribed && !this.isConnected) {
      redrawEmitter.off('redraw', this.redrawCB)
    } else if (!subscribed && this.isConnected) {
      redrawEmitter.on('redraw', this.redrawCB)
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
      this.canvas.style.width = w / dpi + 'px'
      this.canvas.style.height = h / dpi + 'px'
    }
  }

  public getLocalMouse(x: number, y: number): Vector2 {
    const r = this.canvas.getBoundingClientRect()
    return new Vector2().loadXY(
      (x - r.x) * devicePixelRatio,
      (y - r.y) * devicePixelRatio,
    )
  }

  public nodeHeight(n: NodeBase<any>): number {
    const rows = Math.max(Object.keys(n.inputs).length, Object.keys(n.outputs).length, 1)
    return NODE_HEADER + rows * ROW_H + 8
  }

  public socketPos(n: NodeBase<any>, sock: NodeSocket<any>): Vector2 {
    const isInput = sock.socketType === 'input'
    const map = isInput ? n.inputs : n.outputs
    const keys = Object.keys(map)
    const idx = keys.indexOf(sock.name)
    const y = n.pos[1] + NODE_HEADER + idx * ROW_H + ROW_H * 0.5
    const x = isInput ? n.pos[0] : n.pos[0] + NODE_W
    return new Vector2().loadXY(x, y)
  }

  updateHighlight(local: Vector2) {
    const hit = this.hitTest(local)
    const graph = this.ctx.graph

    if (hit?.node !== graph.nodes.highlight) {
      graph.nodes.highlight = hit.node
      redrawAll()
    }

    return hit
  }

  hitTest(
    local: Vector2,
    radius = 5,
  ): {
    node?: NodeBase<any>
    socket?: SocketHit
  } {
    const graph = this.ctx?.graph
    if (!graph) return {}

    let minSock: NodeSocket<any> | undefined = undefined
    let minDist = Infinity

    // sockets first
    for (const n of graph.nodes) {
      for (let i = 0; i < 2; i++) {
        const socks = i ? n.outputs : n.inputs
        for (const k in socks) {
          const s = socks[k]
          const p = this.socketPos(n, s)
          const dist = local.vectorDistance(p)
          if (dist < minDist && dist <= SOCK_R + radius) {
            minDist = dist
            minSock = s
          }
        }
      }
    }

    if (minSock) {
      return {
        node  : minSock.node,
        socket: {
          node: minSock.node,
          sock: minSock,
          pos : this.socketPos(minSock.node, minSock),
        },
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
    const hit = this.updateHighlight(local)

    if (hit.socket) {
      const graph = this.ctx.graph
      graph.nodes.highlight = hit.socket.node
      const tool = new LinkSocketOp()

      this.ctx.api.execTool(this.ctx, tool, {
        sourceSocket: hit.socket.sock._id,
        startMouse  : new Vector2().loadXY(e.x, e.y),
      })
      return
    }

    if (hit.node) {
      let macro = new ToolMacro()

      const tool = new NodeSelectOp()
      tool.inputs.nodeId.setValue(hit.node._id)
      tool.inputs.mode.setValue(e.shiftKey ? SelToolModes.TOGGLE : SelToolModes.AUTO)

      const translate = new TranslateNodeOp()
      translate.inputs.startMouse.setValue(new Vector2().loadXY(e.x, e.y))

      macro.add(tool)
      macro.add(translate)

      this.ctx.api.execTool(this.ctx, macro)
    }
    redrawAll()
  }

  private onPointerMove(e: PointerEvent) {
    const local = this.getLocalMouse(e.x, e.y)
    this.updateHighlight(local)

    if (this.linking) {
      this.linking.mouse = local
      redrawAll()
    }
  }

  private onPointerUp(e: PointerEvent) {
    this.updateHighlight(this.getLocalMouse(e.x, e.y))

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
    redrawAll()
  }

  private onRightClick(e: MouseEvent) {
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

    const on_select = (typeName: string) => {
      console.log('create node!', typeName)
      const tool = new AddNodeOp()
      this.ctx.api.execTool(this.ctx, tool, {
        nodeType: typeName,
        pos     : local,
      })
    }

    // empty space — quick add via prompt
    const menu = createMenu(
      this.ctx,
      'Add Node',
      NodeClasses.map((cls) => [
        cls.nodeDef.uiName,
        (ctx) => on_select(cls.nodeDef.typeName),
      ]),
    )
    this.ctx.screen.popupMenu(menu, e.x, e.y)
  }

  drawSocketLine(p1: Vector2, p2: Vector2) {
    const { canvas, g } = this

    g.beginPath()
    g.moveTo(p1[0], p1[1])
    const dx = Math.max(40, Math.abs(p2[0] - p1[0]) * 0.5)
    g.bezierCurveTo(p1[0] + dx, p1[1], p2[0] - dx, p2[1], p2[0], p2[1])
    g.stroke()
  }

  draw() {
    const widgetCache = this.widgetCache
    const usedWidgets = new Set<UIBase<TexGenContext>>()

    this.checkSize()
    const { canvas, g } = this
    g.fillStyle = '#252b32'
    g.fillRect(0, 0, canvas.width, canvas.height)

    const graph = this.ctx?.graph
    if (!graph) return

    // connections
    g.strokeStyle = '#aaa'
    g.lineWidth = 2
    for (const n of graph.nodes) {
      for (const k in n.outputs) {
        const out = n.outputs[k]
        const p1 = this.socketPos(n, out)
        for (const other of out.edges) {
          if (!other.node) continue
          const p2 = this.socketPos(other.node, other)
          this.drawSocketLine(p1, p2)
        }
      }
    }

    // nodes
    for (const n of graph.nodes) {
      const h = this.nodeHeight(n)
      g.fillStyle = '#3a4350'
      g.strokeStyle = color2css(
        getNodeColor(
          n,
          graph.nodes.isSelected(n),
          n === graph.nodes.highlight,
          n === graph.nodes.active,
        ),
      )
      g.lineWidth = 1
      g.beginPath()
      g.rect(n.pos[0], n.pos[1], NODE_W, h)
      g.fill()
      g.stroke()

      g.fillStyle = '#2a313a'
      g.fillRect(n.pos[0], n.pos[1], NODE_W, NODE_HEADER)
      g.fillStyle = '#fff'
      g.font = '12px sans-serif'
      g.textBaseline = 'middle'
      const def = (n.constructor as any).nodeDef
      g.fillText(def.uiName ?? def.typeName, n.pos[0] + 6, n.pos[1] + NODE_HEADER * 0.5)

      const getSocketUI = (sock: NodeSocket<any>, label: string) => {
        const key = `${n._id}-${sock._id}`
        let widget = widgetCache.get(key)
        if (!widget) {
          widget = sock.makeWidget(this.ctx!)
          widgetCache.set(key, widget!)
          if (widget !== undefined) {
            widget.style.zIndex = '' + (this.ctx.graph.nodes.indexOf(sock.node) + 1)
            widget.parentWidget = this
            this.container.appendChild(widget)
          }
        }
        usedWidgets.add(widget!)
        return widget
      }
      // sockets
      const drawSock = (sock: NodeSocket<any>, label: string) => {
        const p = this.socketPos(n, sock)

        if (sock.edges.length === 0) {
          const widget = getSocketUI(sock, label)
          if (widget) {
            console.log('widget!')

            const dpi = 1.0 / devicePixelRatio
            const x =
              sock.socketType === 'output'
                ? p[0] - SOCK_WIDTH - SOCK_R * 4
                : p[0] + SOCK_R
            const y = p[1] + ROW_H + SOCK_R
            widget.style.position = 'absolute'
            widget.style.left = x * dpi + 'px'
            widget.style.top = y * dpi + 'px'
            widget.overrideDefault('height', ROW_H * dpi)
            widget.overrideDefault('width', SOCK_WIDTH * dpi)
          }
        }

        g.fillStyle = sock.edges.length > 0 ? '#ffcc55' : '#777'
        g.beginPath()
        g.arc(p[0], p[1], SOCK_R, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#ddd'
        g.font = '11px sans-serif'
        if (sock.socketType === 'input') {
          g.textAlign = 'left'
          g.fillText(label, p[0] + SOCK_R + 4, p[1])
        } else {
          g.textAlign = 'right'
          g.fillText(label, p[0] - SOCK_R - 4, p[1])
        }
      }
      for (const k in n.inputs) drawSock(n.inputs[k], k)
      for (const k in n.outputs) drawSock(n.outputs[k], k)
      g.textAlign = 'left'
    }

    this.dispatchEvent(new DrawEvent(this.canvas, g))

    // pending link
    if (this.linking) {
      const p1 = this.linking.from.pos
      const p2 = this.linking.mouse
      g.strokeStyle = '#ffcc55'
      g.beginPath()
      g.moveTo(p1[0], p1[1])
      g.lineTo(p2[0], p2[1])
      g.stroke()
    }

    for (const [key, widget] of widgetCache) {
      if (!usedWidgets.has(widget)) {
        widgetCache.delete(key)
        widget.remove()
      }
    }
  }
}
Editor.register(NodeGraphEditor)
UIBase.register(NodeGraphEditor as unknown as typeof UIBase)
