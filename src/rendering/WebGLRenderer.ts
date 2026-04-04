import type { Frame } from "./SpriteSheet"

export interface GLTexture {
  glTexture: WebGLTexture
  width: number
  height: number
}

export interface RenderTarget {
  framebuffer: WebGLFramebuffer
  texture: GLTexture
}

export interface DrawOptions {
  alpha?: number
  flipX?: boolean
  chromaKey?: boolean
  rotation?: number
  tintR?: number
  tintG?: number
  tintB?: number
}

export interface RenderStats {
  drawCalls: number
  quads: number
  batchBreaks: number
}

const VERTEX_SIZE = 9 // pos(2) + uv(2) + color(4) + chromaKey(1)
const MAX_QUADS = 4000
const VERTS_PER_QUAD = 4
const INDICES_PER_QUAD = 6
const VBO_SIZE = MAX_QUADS * VERTS_PER_QUAD * VERTEX_SIZE

const VERT_SRC = `#version 300 es
in vec2 aPosition;
in vec2 aTexCoord;
in vec4 aColor;
in float aChromaKey;

uniform vec2 uResolution;
uniform vec2 uOffset;

out vec2 vTexCoord;
out vec4 vColor;
out float vChromaKey;

void main() {
  vec2 pos = aPosition + uOffset;
  vec2 clip = (pos / uResolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  vTexCoord = aTexCoord;
  vColor = aColor;
  vChromaKey = aChromaKey;
}
`

const FRAG_SRC = `#version 300 es
precision mediump float;

in vec2 vTexCoord;
in vec4 vColor;
in float vChromaKey;

uniform sampler2D uTexture;

out vec4 fragColor;

void main() {
  vec4 texColor = texture(uTexture, vTexCoord);

  if (vChromaKey > 0.5) {
    float dist = distance(texColor.rgb, vec3(1.0, 0.0, 1.0));
    float alpha = dist * dist * dist;
    texColor = vec4(texColor.rgb, alpha);
  }

  fragColor = texColor * vColor;
}
`

export class WebGLRenderer {
  readonly canvas: HTMLCanvasElement
  readonly gl: WebGL2RenderingContext

  private program: WebGLProgram
  private vao: WebGLVertexArrayObject
  private vbo: WebGLBuffer
  private ebo: WebGLBuffer
  private buffer: Float32Array
  private quadCount = 0

  private uResolution: WebGLUniformLocation
  private uOffset: WebGLUniformLocation
  private uTexture: WebGLUniformLocation

  private currentTexture: WebGLTexture | null = null
  private whiteTexture!: GLTexture
  private bgColor: [number, number, number]
  private logicalWidth: number
  private logicalHeight: number

  private renderTargetStack: Array<{
    framebuffer: WebGLFramebuffer | null
    viewport: [number, number, number, number]
    resolution: [number, number]
  }> = []

  private _stats: RenderStats = { drawCalls: 0, quads: 0, batchBreaks: 0 }

  get stats(): Readonly<RenderStats> {
    return this._stats
  }

  constructor(
    width: number,
    height: number,
    bgColor: [number, number, number] = [0, 0, 0],
  ) {
    this.bgColor = bgColor
    this.logicalWidth = width
    this.logicalHeight = height
    this.canvas = document.createElement("canvas")
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`

    const gl = this.canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
    })
    if (!gl) throw new Error("WebGL2 not supported")
    this.gl = gl

    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    this.program = this.createProgram(VERT_SRC, FRAG_SRC)
    gl.useProgram(this.program)

    this.uResolution = gl.getUniformLocation(this.program, "uResolution")!
    this.uOffset = gl.getUniformLocation(this.program, "uOffset")!
    this.uTexture = gl.getUniformLocation(this.program, "uTexture")!

    gl.uniform2f(this.uResolution, width, height)
    gl.uniform2f(this.uOffset, 0, 0)
    gl.uniform1i(this.uTexture, 0)

    // Create VAO + VBO + EBO
    this.buffer = new Float32Array(VBO_SIZE)
    this.vao = gl.createVertexArray()!
    gl.bindVertexArray(this.vao)

    this.vbo = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
    gl.bufferData(gl.ARRAY_BUFFER, this.buffer.byteLength, gl.DYNAMIC_DRAW)

    // Pre-build index buffer for all quads
    const indices = new Uint16Array(MAX_QUADS * INDICES_PER_QUAD)
    for (let i = 0; i < MAX_QUADS; i++) {
      const vi = i * 4
      const ii = i * 6
      indices[ii] = vi // TL
      indices[ii + 1] = vi + 1 // TR
      indices[ii + 2] = vi + 2 // BL
      indices[ii + 3] = vi + 1 // TR
      indices[ii + 4] = vi + 3 // BR
      indices[ii + 5] = vi + 2 // BL
    }
    this.ebo = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    const stride = VERTEX_SIZE * 4
    const aPosition = gl.getAttribLocation(this.program, "aPosition")
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0)

    const aTexCoord = gl.getAttribLocation(this.program, "aTexCoord")
    gl.enableVertexAttribArray(aTexCoord)
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, stride, 8)

    const aColor = gl.getAttribLocation(this.program, "aColor")
    gl.enableVertexAttribArray(aColor)
    gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, stride, 16)

    const aChromaKey = gl.getAttribLocation(this.program, "aChromaKey")
    gl.enableVertexAttribArray(aChromaKey)
    gl.vertexAttribPointer(aChromaKey, 1, gl.FLOAT, false, stride, 32)

    gl.bindVertexArray(null)

    this.whiteTexture = this.createWhiteTexture()
  }

  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl
    const vs = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(vs, vertSrc)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      throw new Error("Vertex shader: " + gl.getShaderInfoLog(vs))
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(fs, fragSrc)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      throw new Error("Fragment shader: " + gl.getShaderInfoLog(fs))
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error("Program link: " + gl.getProgramInfoLog(prog))
    }

    gl.deleteShader(vs)
    gl.deleteShader(fs)
    return prog
  }

  private createWhiteTexture(): GLTexture {
    const gl = this.gl
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    return { glTexture: tex, width: 1, height: 1 }
  }

  // --- Frame lifecycle ---

  begin(): void {
    const gl = this.gl
    gl.clearColor(this.bgColor[0], this.bgColor[1], this.bgColor[2], 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)
    this.quadCount = 0
    this.currentTexture = null
    this._stats = { drawCalls: 0, quads: 0, batchBreaks: 0 }
  }

  end(): void {
    this.flush()
    this.gl.bindVertexArray(null)
  }

  // --- Batching ---

  private flush(): void {
    if (this.quadCount === 0) return
    const gl = this.gl
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      this.buffer,
      0,
      this.quadCount * VERTS_PER_QUAD * VERTEX_SIZE,
    )
    gl.drawElements(
      gl.TRIANGLES,
      this.quadCount * INDICES_PER_QUAD,
      gl.UNSIGNED_SHORT,
      0,
    )
    this._stats.drawCalls++
    this._stats.quads += this.quadCount
    this.quadCount = 0
  }

  private bindTexture(glTex: WebGLTexture): void {
    if (this.currentTexture === glTex) return
    this.flush()
    this._stats.batchBreaks++
    this.gl.activeTexture(this.gl.TEXTURE0)
    this.gl.bindTexture(this.gl.TEXTURE_2D, glTex)
    this.currentTexture = glTex
  }

  private writeVertex(
    offset: number,
    x: number,
    y: number,
    u: number,
    v: number,
    r: number,
    g: number,
    b: number,
    a: number,
    ck: number,
  ): void {
    this.buffer[offset] = x
    this.buffer[offset + 1] = y
    this.buffer[offset + 2] = u
    this.buffer[offset + 3] = v
    this.buffer[offset + 4] = r
    this.buffer[offset + 5] = g
    this.buffer[offset + 6] = b
    this.buffer[offset + 7] = a
    this.buffer[offset + 8] = ck
  }

  private pushQuad(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    u2: number,
    v2: number,
    u3: number,
    v3: number,
    r: number,
    g: number,
    b: number,
    a: number,
    ck: number,
  ): void {
    const base = this.quadCount * VERTS_PER_QUAD * VERTEX_SIZE
    this.writeVertex(base, x0, y0, u0, v0, r, g, b, a, ck)
    this.writeVertex(base + VERTEX_SIZE, x1, y1, u1, v1, r, g, b, a, ck)
    this.writeVertex(base + VERTEX_SIZE * 2, x2, y2, u2, v2, r, g, b, a, ck)
    this.writeVertex(base + VERTEX_SIZE * 3, x3, y3, u3, v3, r, g, b, a, ck)
    this.quadCount++
    if (this.quadCount >= MAX_QUADS) {
      this.flush()
    }
  }

  // --- Draw calls ---

  drawSprite(
    texture: GLTexture,
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
    chromaKey: boolean = false,
    rotation: number = 0,
    tintR: number = 1,
    tintG: number = 1,
    tintB: number = 1,
  ): void {
    this.bindTexture(texture.glTexture)

    if (flipX) {
      const tmp = u0
      u0 = u1
      u1 = tmp
    }

    const ck = chromaKey ? 1.0 : 0.0
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

    this.pushQuad(
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
      v0,
      u0,
      v1,
      u1,
      v1,
      tintR,
      tintG,
      tintB,
      alpha,
      ck,
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
    this.bindTexture(this.whiteTexture.glTexture)
    this.pushQuad(
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
      0,
      0,
      1,
      1,
      1,
      r,
      g,
      b,
      a,
      0,
    )
  }

  // --- Camera offset ---

  setOffset(x: number, y: number): void {
    this.flush()
    this.gl.uniform2f(this.uOffset, x, y)
  }

  resetOffset(): void {
    this.setOffset(0, 0)
  }

  // --- Render targets (FBO) ---

  createRenderTarget(width: number, height: number): RenderTarget {
    const gl = this.gl
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0,
    )
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    return {
      framebuffer: fbo,
      texture: { glTexture: tex, width, height },
    }
  }

  pushRenderTarget(target: RenderTarget): void {
    this.flush()
    const gl = this.gl
    this.renderTargetStack.push({
      framebuffer: gl.getParameter(gl.FRAMEBUFFER_BINDING),
      viewport: gl.getParameter(gl.VIEWPORT),
      resolution: [this.logicalWidth, this.logicalHeight],
    })
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
    gl.viewport(0, 0, target.texture.width, target.texture.height)
    gl.uniform2f(
      this.uResolution,
      target.texture.width,
      target.texture.height,
    )
    this.currentTexture = null
  }

  popRenderTarget(): void {
    this.flush()
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
      gl.uniform2f(this.uResolution, prev.resolution[0], prev.resolution[1])
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, this.canvas.width, this.canvas.height)
      gl.uniform2f(this.uResolution, this.logicalWidth, this.logicalHeight)
    }
    this.currentTexture = null
  }

  // --- Chroma key baking ---

  bakeChromaKey(source: GLTexture): GLTexture {
    const gl = this.gl
    const target = this.createRenderTarget(source.width, source.height)

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
    gl.viewport(0, 0, source.width, source.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.BLEND)

    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)
    gl.uniform2f(this.uResolution, source.width, source.height)
    gl.uniform2f(this.uOffset, 0, 0)

    this.quadCount = 0
    this.currentTexture = null
    this.drawSprite(
      source,
      0,
      0,
      source.width,
      source.height,
      0,
      1,
      1,
      0,
      1,
      false,
      true,
    )
    this.flush()

    // Restore state
    gl.enable(gl.BLEND)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.uniform2f(this.uResolution, this.logicalWidth, this.logicalHeight)
    gl.bindVertexArray(null)

    gl.deleteFramebuffer(target.framebuffer)
    gl.deleteTexture(source.glTexture)

    return target.texture
  }

  // --- Texture management ---

  async loadTexture(url: string): Promise<GLTexture> {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = url
    await img.decode()

    const gl = this.gl
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    return {
      glTexture: tex,
      width: img.naturalWidth,
      height: img.naturalHeight,
    }
  }

  createTextureFromCanvas(canvas: HTMLCanvasElement): GLTexture {
    const gl = this.gl
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return { glTexture: tex, width: canvas.width, height: canvas.height }
  }

  updateTextureFromCanvas(texture: GLTexture, canvas: HTMLCanvasElement): void {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, texture.glTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
    texture.width = canvas.width
    texture.height = canvas.height
  }

  deleteTexture(texture: GLTexture): void {
    this.gl.deleteTexture(texture.glTexture)
  }
}
