import {
  color2css,
  eventWasMouseDown,
  nstructjs,
  Vector2,
  Vector3,
} from 'path.ux'
import {
  getElemColor,
  Handle,
  MeshFlags,
  MeshTypes,
  SelectOneOp,
  SelToolModes,
  TranslateOp,
  Vertex,
  meshRedrawEmitter,
} from '@gametest/meshlib'
import { ToolMode } from '@gametest/vis-tester-base/toolmode/toolmode'
import { MeshToolMode } from '@gametest/vis-tester-base/toolmode/toolmode_mesh'
import { Icons } from '../assets/icon_enum'
import type { TexGenContext } from './context'

const HIT_LIMIT = 14

// @ts-ignore — Type instantiation is excessively deep and possibly infinite.
export class CurveTool extends MeshToolMode<TexGenContext> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `texgen.CurveTool {
    }`,
  )
  static readonly toolModeDef = {
    typeName: "curve",
    uiName: "Curve",
    description: "Draw bezier curves",
    icon: Icons.MESH,
  }

  constructor() {
    super()
    ;(this as { selectMask: number }).selectMask =
      MeshTypes.VERTEX | MeshTypes.HANDLE
  }

  get mesh() {
    return this.ctx?.mesh
  }

  loadStruct(reader: nstructjs.StructReader<this>): void {
    super.loadStruct(reader)
    reader(this)
  }

  onPointerDown(e: PointerEvent) {
    if (!eventWasMouseDown(e) || !this.ctx?.canvas || !this.mesh) {
      return
    }

    const mesh = this.mesh
    const local = this.ctx.canvas.getLocalMouse(e.x, e.y)

    // 1. Hit-test handles first (small targets) so user can drag them.
    let handle: Handle | undefined
    let mindist = HIT_LIMIT
    for (const h of mesh.handles) {
      const d = h.co.vectorDistance(new Vector3().load2(local))
      if (d < mindist) {
        mindist = d
        handle = h
      }
    }
    if (handle) {
      mesh.selectNone()
      mesh.handles.setSelect(handle, true)
      this.ctx.api.execTool(this.ctx, new TranslateOp<TexGenContext>(), {
        startMouse: new Vector2(local),
        selMask: MeshTypes.HANDLE,
      })
      return
    }

    // 2. Hit-test vertices.
    let vert: Vertex | undefined
    mindist = HIT_LIMIT
    for (const v of mesh.verts) {
      const d = v.co.vectorDistance(new Vector3().load2(local))
      if (d < mindist) {
        mindist = d
        vert = v
      }
    }
    if (vert) {
      this.ctx.api.execTool(this.ctx, new SelectOneOp<TexGenContext>(), {
        mode: SelToolModes.ADD,
        elemEid: vert.eid,
        flush: true,
        selectMask: MeshTypes.VERTEX,
        setActive: true,
        unique: !(e.shiftKey || e.ctrlKey || e.metaKey),
      })
      return
    }

    // 3. Empty space — extend curve from active vertex.
    const co = new Vector3().loadXY(local[0], local[1])
    const newv = mesh.makeVertex(co)
    const active = mesh.verts.active
    if (active && active.flag & MeshFlags.SELECT) {
      mesh.makeEdge(active, newv)
    }

    mesh.selectNone()
    mesh.verts.setSelect(newv, true)
    mesh.verts.active = newv
    mesh.regenRender()
  }

  onPointerMove(e: PointerEvent) {
    const canvas = this.ctx?.canvas
    if (canvas === undefined) return
    this.updateHighlight(canvas.getLocalMouse(e.x, e.y))
  }

  onPointerUp(_e: PointerEvent) {}

  draw(
    ctx: TexGenContext,
    canvas: HTMLCanvasElement,
    g: CanvasRenderingContext2D,
  ) {
    super.draw(ctx, canvas, g)
    const mesh = this.mesh
    if (!mesh) return

    // Render bezier paths over straight edges drawn by base.
    g.lineWidth = 2
    for (const e of mesh.edges) {
      g.strokeStyle = color2css(getElemColor(mesh.edges, e))
      g.beginPath()
      g.moveTo(e.v1.co[0], e.v1.co[1])
      if (e.h1 && e.h2) {
        g.bezierCurveTo(
          e.h1.co[0],
          e.h1.co[1],
          e.h2.co[0],
          e.h2.co[1],
          e.v2.co[0],
          e.v2.co[1],
        )
      } else {
        g.lineTo(e.v2.co[0], e.v2.co[1])
      }
      g.stroke()
    }

    // Handle ribs + handle squares.
    g.lineWidth = 1
    g.setLineDash([4, 4])
    g.strokeStyle = "#888"
    for (const e of mesh.edges) {
      if (!e.h1 || !e.h2) continue
      g.beginPath()
      g.moveTo(e.v1.co[0], e.v1.co[1])
      g.lineTo(e.h1.co[0], e.h1.co[1])
      g.moveTo(e.v2.co[0], e.v2.co[1])
      g.lineTo(e.h2.co[0], e.h2.co[1])
      g.stroke()
    }
    g.setLineDash([])

    const hs = 4
    for (const h of mesh.handles) {
      g.fillStyle = color2css(getElemColor(mesh.handles, h))
      g.fillRect(h.co[0] - hs, h.co[1] - hs, hs * 2, hs * 2)
    }
  }
}
ToolMode.register(CurveTool)

// kick redraws when mesh updates (mirrors meshtool's listener)
meshRedrawEmitter.on("redraw", () => {})
