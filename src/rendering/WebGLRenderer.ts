import type { Frame } from './SpriteSheet'
import { ShaderProgramBase } from './WebGL/shaderprogram'
import { GPUDrawElements } from './WebGL/gpuDrawElements'
import { Texture } from './WebGL/texture'
import { SpriteBatch } from './SpriteBatch'
import type { RenderStats } from './SpriteBatch'
import { chromakeyDef } from './spriteShaders'

export { Texture }
export type { RenderStats }

export interface DrawOptions {
  alpha?: number
  flipX?: boolean
  chromaKey?: boolean
  rotation?: number
  tintR?: number
  tintG?: number
  tintB?: number
}

export interface RenderTarget {
  framebuffer: WebGLFramebuffer
  texture: Texture
}

export class WebGLRenderer {
  readonly canvas: HTMLCanvasElement
  readonly gl: WebGL2RenderingContext

  private batch: SpriteBatch
  private chromakeyShader: ShaderProgramBase<typeof chromakeyDef>
  private chromaBatch: GPUDrawElements<(typeof chromakeyDef)['attrs']>
  private whiteTexture: Texture
  private bgColor: [number, number, number]
  private logicalWidth: number
  private logicalHeight: number

  private renderTargetStack: Array<{
    framebuffer: WebGLFramebuffer | null
    viewport: [number, number, number, number]
    resolution: [number, number]
  }> = []

  get stats(): Readonly<RenderStats> {
    return this.batch.stats
  }

  constructor(
    width: number,
    height: number,
    bgColor: [number, number, number] = [0, 0, 0],
  ) {
    this.bgColor = bgColor
    this.logicalWidth = width
    this.logicalHeight = height
    this.canvas = document.createElement('canvas')
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`

    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
    })
    if (!gl) throw new Error('WebGL2 not supported')
    this.gl = gl

    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    this.batch = new SpriteBatch(gl)
    this.batch.currentResolution[0] = width
    this.batch.currentResolution[1] = height

    this.chromakeyShader = new ShaderProgramBase(gl, chromakeyDef)
    this.chromaBatch = new GPUDrawElements(
      chromakeyDef.attrs,
      6 /* INDICES_PER_QUAD */,
    )
    this.chromaBatch.vertexData.aPosition.growData(4)
    this.chromaBatch.vertexData.aTexCoord.growData(4)
    this.chromaBatch.growElements(1)
    const ckIdx = this.chromaBatch.vertexData.aIndices.data
    ckIdx[0] = 0
    ckIdx[1] = 1
    ckIdx[2] = 2
    ckIdx[3] = 1
    ckIdx[4] = 3
    ckIdx[5] = 2

    this.whiteTexture = new Texture(gl, 1, 1)
    this.whiteTexture.uploadBuffer(
      gl,
      gl.UNSIGNED_BYTE,
      1,
      1,
      new Uint8Array([255, 255, 255, 255]),
    )
  }

  // --- Frame lifecycle ---

  begin(): void {
    const gl = this.gl
    gl.clearColor(this.bgColor[0], this.bgColor[1], this.bgColor[2], 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    this.batch.begin()
  }

  end(): void {
    this.batch.end(this.gl)
  }

  // --- Draw calls ---

  drawSprite(
    texture: Texture,
    x: number,
    y: number,
    w: number,
    h: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    alpha: number = 1,
    flipX: boolean = false,
    _chromaKey: boolean = false,
    rotation: number = 0,
    tintR: number = 1,
    tintG: number = 1,
    tintB: number = 1,
  ): void {
    // _chromaKey ignored: baked at load time via bakeChromaKey
    this.batch.setTexture(this.gl, texture)

    if (flipX) {
      const tmp = u0
      u0 = u1
      u1 = tmp
    }

    let px0: number,
      py0: number,
      px1: number,
      py1: number,
      px2: number,
      py2: number,
      px3: number,
      py3: number

    if (rotation !== 0) {
      const cx = x + w / 2
      const cy = y + h / 2
      const cos = Math.cos(rotation)
      const sin = Math.sin(rotation)
      const hw = w / 2
      const hh = h / 2
      px0 = cx + (-hw * cos - -hh * sin)
      py0 = cy + (-hw * sin + -hh * cos)
      px1 = cx + (hw * cos - -hh * sin)
      py1 = cy + (hw * sin + -hh * cos)
      px2 = cx + (-hw * cos - hh * sin)
      py2 = cy + (-hw * sin + hh * cos)
      px3 = cx + (hw * cos - hh * sin)
      py3 = cy + (hw * sin + hh * cos)
    } else {
      px0 = x
      py0 = y
      px1 = x + w
      py1 = y
      px2 = x
      py2 = y + h
      px3 = x + w
      py3 = y + h
    }

    this.batch.writeQuad(
      px0,
      py0,
      px1,
      py1,
      px2,
      py2,
      px3,
      py3,
      u0,
      v0,
      u1,
      v1,
      tintR,
      tintG,
      tintB,
      alpha,
    )
  }

  drawFrame(
    frame: Frame,
    x: number,
    y: number,
    w: number,
    h: number,
    opts?: DrawOptions,
  ): void {
    this.drawSprite(
      frame.texture,
      x,
      y,
      w,
      h,
      frame.u0,
      frame.v0,
      frame.u1,
      frame.v1,
      opts?.alpha,
      opts?.flipX,
      opts?.chromaKey,
      opts?.rotation,
      opts?.tintR,
      opts?.tintG,
      opts?.tintB,
    )
  }

  drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): void {
    this.batch.setTexture(this.gl, this.whiteTexture)
    this.batch.writeQuad(
      x,
      y,
      x + w,
      y,
      x,
      y + h,
      x + w,
      y + h,
      0,
      0,
      1,
      1,
      r,
      g,
      b,
      a,
    )
  }

  // --- Camera offset ---

  setOffset(x: number, y: number): void {
    this.batch.setOffset(this.gl, x, y)
  }

  resetOffset(): void {
    this.setOffset(0, 0)
  }

  // --- Render targets (FBO) ---

  createRenderTarget(width: number, height: number): RenderTarget {
    const gl = this.gl
    const texture = new Texture(gl, width, height)
    texture.allocate(gl, width, height)

    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    texture.attachToFramebuffer(gl)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    return { framebuffer: fbo, texture }
  }

  pushRenderTarget(target: RenderTarget): void {
    this.batch.flush(this.gl)
    const gl = this.gl
    this.renderTargetStack.push({
      framebuffer: gl.getParameter(gl.FRAMEBUFFER_BINDING),
      viewport: gl.getParameter(gl.VIEWPORT),
      resolution: [this.logicalWidth, this.logicalHeight],
    })
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
    gl.viewport(0, 0, target.texture.width, target.texture.height)
    this.batch.currentResolution[0] = target.texture.width
    this.batch.currentResolution[1] = target.texture.height
  }

  popRenderTarget(): void {
    this.batch.flush(this.gl)
    const gl = this.gl
    const prev = this.renderTargetStack.pop()
    if (prev) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, prev.framebuffer)
      gl.viewport(
        prev.viewport[0],
        prev.viewport[1],
        prev.viewport[2],
        prev.viewport[3],
      )
      this.batch.currentResolution[0] = prev.resolution[0]
      this.batch.currentResolution[1] = prev.resolution[1]
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, this.canvas.width, this.canvas.height)
      this.batch.currentResolution[0] = this.logicalWidth
      this.batch.currentResolution[1] = this.logicalHeight
    }
  }

  // --- Chroma key baking ---

  bakeChromaKey(source: Texture): Texture {
    const gl = this.gl
    const { width: w, height: h } = source
    const target = this.createRenderTarget(w, h)

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.BLEND)

    // Fill one quad covering the source (UV Y-flipped: texture Y=0 is bottom)
    const cp = this.chromaBatch.vertexData.aPosition.data
    const ct = this.chromaBatch.vertexData.aTexCoord.data
    cp[0] = 0
    cp[1] = 0 // TL pos
    cp[2] = w
    cp[3] = 0 // TR pos
    cp[4] = 0
    cp[5] = h // BL pos
    cp[6] = w
    cp[7] = h // BR pos
    ct[0] = 0
    ct[1] = 1 // TL uv
    ct[2] = 1
    ct[3] = 1 // TR uv
    ct[4] = 0
    ct[5] = 0 // BL uv
    ct[6] = 1
    ct[7] = 0 // BR uv
    this.chromaBatch.vertexData.aPosition.flagRangeUpdated(0, 8)
    this.chromaBatch.vertexData.aTexCoord.flagRangeUpdated(0, 8)

    this.chromaBatch.bind(gl, this.chromakeyShader, {
      uResolution: [w, h],
      uTexture: source,
    })

    gl.enable(gl.BLEND)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)

    gl.deleteFramebuffer(target.framebuffer)
    source.destroy(gl)

    return target.texture
  }

  // --- Texture management ---

  async loadTexture(url: string): Promise<Texture> {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    await img.decode()
    const texture = new Texture(this.gl, 0, 0)
    texture.uploadMedia(this.gl, img)
    return texture
  }

  createTextureFromCanvas(canvas: HTMLCanvasElement): Texture {
    const texture = new Texture(this.gl, canvas.width, canvas.height)
    texture.uploadMedia(this.gl, canvas, { filter: 'linear' })
    return texture
  }

  updateTextureFromCanvas(texture: Texture, canvas: HTMLCanvasElement): void {
    texture.uploadMedia(this.gl, canvas, { filter: 'linear' })
  }

  deleteTexture(texture: Texture): void {
    texture.destroy(this.gl)
  }
}
