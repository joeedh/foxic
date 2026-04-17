import {
  color2css,
  nstructjs,
  Vector4,
  math,
  Vector2Like,
  Vector3,
  eventWasMouseDown,
  Vector2,
} from 'path.ux'
import { ToolMode } from './toolmode'
import { Icons } from '../assets/icon_enum'
import type { AppContext } from '../core/context'
import {
  getElemColor,
  Mesh,
  MeshCtx,
  Element,
  MeshTypes,
  SelectOneOp,
  SelToolModes,
  TranslateOp,
  meshRedrawEmitter,
} from '@gametest/meshlib'
import { redrawAll } from '../editors/redraw'

meshRedrawEmitter.on('redraw', () => {
  redrawAll()
})

export abstract class MeshToolMode<
  CTX extends AppContext & MeshCtx,
> extends ToolMode<CTX> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `MeshToolMode {
    }`,
  )
  static readonly toolModeDef = {
    typeName   : 'mesh',
    uiName     : 'Mesh',
    description: 'Mesh tool mode',
    icon       : Icons.MESH,
  }

  constructor() {
    super()
  }

  abstract get mesh(): Mesh | undefined
  selectMask = MeshTypes.VERTEX
  mouseDown = false
  startMouseDown = new Vector2()

  findElement(selectMask: number, localMouse2d: Vector2Like, limit?: number) {
    const mesh = this.mesh
    return mesh
      ? MeshToolMode.findElement(mesh, selectMask, localMouse2d, limit)
      : undefined
  }

  static findElement(mesh: Mesh, type: number, localMouse2d: Vector2Like, limit = 50) {
    const localMouse = new Vector3().load2(localMouse2d)

    let mindist = Number.MAX_SAFE_INTEGER
    let minElem: Element | undefined

    if (type & MeshTypes.VERTEX) {
      for (const v of mesh!.verts) {
        const dist = v.co.vectorDistance(localMouse)
        if (dist < limit && dist < mindist) {
          mindist = dist
          minElem = v
        }
      }
    }
    const edgePad = 10 ** 2
    if (type & MeshTypes.EDGE) {
      for (const e of mesh!.edges) {
        let dist = math.dist_to_line_2d(localMouse, e.v1.co, e.v2.co) + edgePad
        if (dist < mindist) {
          mindist = dist
          minElem = e
        }
      }
    }
    if (type & MeshTypes.FACE) {
      // XXX TODO implement me!
    }
    return minElem
  }

  findHighlight(mpos: Vector2Like) {
    if (this.mesh === undefined) {
      return undefined
    }
    const elem = MeshToolMode.findElement(this.mesh, this.selectMask, mpos)
    return elem
  }

  updateHighlight(mpos: Vector2Like) {
    const elem = this.findHighlight(mpos)
    const mesh = this.mesh!
    if (mesh.setHighlight(elem)) {
      this.ctx?.redrawAll()
    }
    return elem
  }

  onPointerDown(e: PointerEvent) {
    console.log('d')
    if (!eventWasMouseDown(e) || !this.ctx?.canvas || !this.mesh) {
      return
    }

    const elem = this.updateHighlight(this.ctx.canvas.getLocalMouse(e.x, e.y))
    this.mouseDown = eventWasMouseDown(e)
    if (this.mouseDown) {
      this.startMouseDown.load(this.ctx.canvas.getLocalMouse(e.x, e.y))
    }

    if (elem) {
      const tool = new SelectOneOp<CTX>()
      this.ctx!.api.execTool(this.ctx!, tool, {
        mode      : SelToolModes.ADD,
        elemEid   : elem.eid,
        flush     : true,
        selectMask: this.selectMask,
        setActive : true,
        unique    : !(e.shiftKey || e.ctrlKey || e.metaKey),
      })
    }
  }
  onPointerMove(e: PointerEvent) {
    const canvas = this.ctx?.canvas
    if (canvas === undefined) {
      return
    }

    const mpos = canvas.getLocalMouse(e.x, e.y)
    if (!this.mouseDown) {
      this.updateHighlight(mpos)
    } else if (this.startMouseDown.vectorDistance(mpos) > 5) {
      console.log('drag!')
      const tool = new TranslateOp<CTX>()

      this.mouseDown = false
      this.ctx!.api.execTool(this.ctx!, tool, {
        startMouse: this.startMouseDown,
      })
    }
  }
  onPointerUp(e: PointerEvent) {
    this.mouseDown = false
  }
  draw(ctx: CTX, canvas: HTMLCanvasElement, g: CanvasRenderingContext2D) {
    super.draw(ctx, canvas, g)

    const mesh = this.mesh
    if (mesh === undefined) {
      return
    }

    let s = 3
    for (const v of mesh.verts) {
      g.fillStyle = color2css(getElemColor(mesh.verts, v))
      g.beginPath()
      g.arc(v.co[0], v.co[1], s, 0, 2 * Math.PI)
      g.fill()
    }

    for (const e of mesh.edges) {
      g.strokeStyle = color2css(getElemColor(mesh.edges, e))
      g.beginPath()

      g.moveTo(e.v1.co[0], e.v1.co[1])
      g.lineTo(e.v2.co[0], e.v2.co[1])
      g.stroke()
    }

    for (const f of mesh.faces) {
      const clr = new Vector4(getElemColor(mesh.faces, f))
      clr[3] = 0.2
      g.fillStyle = color2css(clr)
      g.beginPath()
      for (const list of f.lists) {
        let first = true
        for (const l of list) {
          if (first) {
            first = false
            g.moveTo(l.next.v.co[0], l.next.v.co[1])
          } else {
            g.lineTo(l.next.v.co[0], l.next.v.co[1])
          }
        }
        g.closePath()
      }
      g.fill()
    }
  }

  loadStruct(reader: nstructjs.StructReader<this>): void {
    super.loadStruct(reader)
    reader(this)
  }
}
