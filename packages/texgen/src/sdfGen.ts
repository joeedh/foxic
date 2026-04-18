import { Mesh } from "@gametest/meshlib"
import { Texture } from "@gametest/webgl"

export interface ISdfOpts {
  strokeWidth: number
  blurRadius: number
}

export function buildSdfCanvas(
  mesh: Mesh,
  width: number,
  height: number,
  opts: ISdfOpts,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const g = canvas.getContext("2d")!
  g.fillStyle = "black"
  g.fillRect(0, 0, width, height)

  g.filter = `blur(${opts.blurRadius}px)`
  g.strokeStyle = "white"
  g.lineWidth = opts.strokeWidth
  g.lineCap = "round"
  g.lineJoin = "round"

  for (const e of mesh.edges) {
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

  return canvas
}

export function uploadSdfTexture(
  gl: WebGL2RenderingContext,
  mesh: Mesh,
  width: number,
  height: number,
  opts: ISdfOpts,
  existing?: Texture,
): Texture {
  const canvas = buildSdfCanvas(mesh, width, height, opts)
  const tex = existing ?? new Texture(gl, width, height)
  tex.uploadMedia(gl, canvas, { filter: "linear" })
  return tex
}
