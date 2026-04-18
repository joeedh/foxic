import {
  color2css,
  nstructjs,
  Vector4,
  math,
  Vector2Like,
  Vector3,
  eventWasMouseDown,
  Vector2,
  KeyMap,
  HotKey,
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
  ExtrudeVertOp,
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
  abstract readonly haveHandles: boolean
  abstract selectMask: number
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
    if (type & MeshTypes.HANDLE) {
      for (const h of mesh!.handles) {
        const dist = h.co.vectorDistance(localMouse)
        if (dist < limit && dist < mindist) {
          mindist = dist
          minElem = h
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

  getKeyMaps(): KeyMap<CTX>[] {
    if (this.keymaps === undefined) {
      this.keymaps = [
        new KeyMap<CTX>([
          new HotKey('C', [], 'mesh.make_edge()'),
          new HotKey('F', [], 'mesh.make_face()'),
          new HotKey('X', [], 'mesh.delete()'),
          new HotKey('Delete', [], 'mesh.delete()'),
          new HotKey('A', [], `mesh.toggle_select_all(mode=${SelToolModes.ADD})`),
          new HotKey('A', ['alt'], `mesh.toggle_select_all(mode=${SelToolModes.SUB})`),
          new HotKey(
            'A',
            ['ctrl', 'shift'],
            `mesh.toggle_select_all(mode=${SelToolModes.SUB})`,
          ),
          new HotKey('L', [], `mesh.select_linked(mode=${SelToolModes.ADD} pick=true)`),
          new HotKey(
            'L',
            ['shift'],
            `mesh.select_linked(mode=${SelToolModes.SUB} pick=true onlyElem=true)`,
          ),
          new HotKey('G', [], 'transform.translate()'),
          new HotKey('S', [], 'transform.scale()'),
          new HotKey('R', [], 'transform.rotate()'),
        ]),
      ]
    }
    return this.keymaps!
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

    const co = this.ctx.canvas.getLocalMouse(e.x, e.y)
    const elem = this.updateHighlight(co)
    this.mouseDown = eventWasMouseDown(e)
    if (this.mouseDown) {
      this.startMouseDown.load(co)
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
    } else {
      const tool = new ExtrudeVertOp<CTX>()
      this.ctx!.api.execTool(this.ctx!, tool, {
        co: new Vector3().load2(co),
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

    if (this.haveHandles) {
      for (const h of mesh.handles) {
        g.fillStyle = color2css(getElemColor(mesh.handles, h))
        g.beginPath()
        g.arc(h.co[0], h.co[1], s, 0, 2 * Math.PI)
        g.fill()
        g.strokeStyle = g.fillStyle
        g.beginPath()
        g.moveTo(h.co[0], h.co[1])
        const v = h.owner.vertex(h)
        g.lineTo(v.co[0], v.co[1])
        g.stroke()
      }
    }

    if (this.haveHandles) {
      for (const e of mesh.edges) {
        g.strokeStyle = color2css(getElemColor(mesh.edges, e))
        g.beginPath()

        const a = e.v1.co
        const b = e.h1!.co
        const c = e.h2!.co
        const d = e.v2.co

        g.moveTo(a[0], a[1])
        g.bezierCurveTo(b[0], b[1], c[0], c[1], d[0], d[1])
        g.stroke()
      }
    } else {
      for (const e of mesh.edges) {
        g.strokeStyle = color2css(getElemColor(mesh.edges, e))
        g.beginPath()

        g.moveTo(e.v1.co[0], e.v1.co[1])
        g.lineTo(e.v2.co[0], e.v2.co[1])
        g.stroke()
      }
    }

    if (this.haveHandles) {
      for (const f of mesh.faces) {
        const clr = new Vector4(getElemColor(mesh.faces, f))
        clr[3] = 0.2
        g.fillStyle = color2css(clr)
        g.beginPath()
        for (const list of f.lists) {
          let first = true
          g.moveTo(list.l.v.co[0], list.l.v.co[1])
          for (const l of list) {
            g.bezierCurveTo(
              l.h1.co[0],
              l.h1.co[1],
              l.h2.co[0],
              l.h2.co[1],
              l.next.v.co[0],
              l.next.v.co[1],
            )
          }
          g.closePath()
        }
        g.fill()
      }
    } else {
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
  }

  loadStruct(reader: nstructjs.StructReader<this>): void {
    super.loadStruct(reader)
    reader(this)
  }
}
