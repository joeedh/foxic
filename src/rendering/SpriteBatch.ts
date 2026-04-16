import { ShaderProgramBase } from './WebGL/shaderprogram'
import { GPUDrawElements } from './WebGL/gpuDrawElements'
import type { Texture } from './WebGL/texture'
import { spriteDef } from './spriteShaders'

const VERTS_PER_QUAD = 4
const INDICES_PER_QUAD = 6
const INITIAL_QUADS = 256

export interface RenderStats {
  drawCalls: number
  quads: number
  batchBreaks: number
}

/**
 * Manages a dynamic GPU quad batch for sprite rendering.
 * Starts with INITIAL_QUADS capacity and grows as needed,
 * flushing only on texture changes or end-of-frame.
 */
export class SpriteBatch {
  private shader: ShaderProgramBase<typeof spriteDef>
  private batch: GPUDrawElements<(typeof spriteDef)['attrs']>
  private posArr: Float32Array
  private uvArr: Float32Array
  private colArr: Float32Array
  private quadCount = 0
  private capacity = 0
  private currentTexture: Texture | undefined = undefined

  /** Mutable — WebGLRenderer writes here when changing camera offset. */
  readonly currentOffset: [number, number] = [0, 0]
  /** Mutable — WebGLRenderer writes here when changing render target. */
  readonly currentResolution: [number, number] = [0, 0]

  readonly stats: RenderStats = { drawCalls: 0, quads: 0, batchBreaks: 0 }

  constructor(gl: WebGL2RenderingContext) {
    this.shader = new ShaderProgramBase(gl, spriteDef)
    this.batch = new GPUDrawElements(spriteDef.attrs, INDICES_PER_QUAD)
    // Placeholders; will be set in ensureCapacity
    this.posArr = new Float32Array(0)
    this.uvArr = new Float32Array(0)
    this.colArr = new Float32Array(0)
    this.ensureCapacity(INITIAL_QUADS)
  }

  begin(): void {
    this.quadCount = 0
    this.currentTexture = undefined
    this.stats.drawCalls = 0
    this.stats.quads = 0
    this.stats.batchBreaks = 0
  }

  end(gl: WebGL2RenderingContext): void {
    this.flush(gl)
  }

  /** Flush any pending quads, then update the camera offset. */
  setOffset(gl: WebGL2RenderingContext, x: number, y: number): void {
    this.flush(gl)
    this.currentOffset[0] = x
    this.currentOffset[1] = y
  }

  /** Upload + draw all pending quads. */
  flush(gl: WebGL2RenderingContext): void {
    if (this.quadCount === 0) return
    const nv = this.quadCount * VERTS_PER_QUAD
    this.batch.vertexData.aPosition.flagRangeUpdated(0, nv * 2)
    this.batch.vertexData.aTexCoord.flagRangeUpdated(0, nv * 2)
    this.batch.vertexData.aColor.flagRangeUpdated(0, nv * 4)
    this.batch.lastElement = this.quadCount
    // currentTexture is always set when quadCount > 0
    this.batch.bind(gl, this.shader, {
      uResolution: this.currentResolution,
      uOffset: this.currentOffset,
      uTexture: this.currentTexture!,
    })
    this.stats.drawCalls++
    this.stats.quads += this.quadCount
    this.quadCount = 0
  }

  /** Switch active texture; flushes if the texture changes. */
  setTexture(gl: WebGL2RenderingContext, tex: Texture): void {
    if (this.currentTexture === tex) return
    this.flush(gl)
    this.stats.batchBreaks++
    this.currentTexture = tex
  }

  /** Write one quad (4 vertices) into the batch. */
  writeQuad(
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
    r: number,
    g: number,
    b: number,
    a: number,
  ): void {
    this.ensureCapacity(this.quadCount + 1)
    const base = this.quadCount * VERTS_PER_QUAD
    this.writeVertex(base, x0, y0, u0, v0, r, g, b, a)
    this.writeVertex(base + 1, x1, y1, u1, v0, r, g, b, a)
    this.writeVertex(base + 2, x2, y2, u0, v1, r, g, b, a)
    this.writeVertex(base + 3, x3, y3, u1, v1, r, g, b, a)
    this.quadCount++
  }

  /**
   * Ensure at least `needed` quads can be held without flushing.
   * Doubles capacity each time the limit is hit.
   */
  private ensureCapacity(needed: number): void {
    if (needed <= this.capacity) return
    const newCap = Math.max(needed, this.capacity * 2, INITIAL_QUADS)
    const add = newCap - this.capacity

    this.batch.vertexData.aPosition.growData(add * VERTS_PER_QUAD)
    this.batch.vertexData.aTexCoord.growData(add * VERTS_PER_QUAD)
    this.batch.vertexData.aColor.growData(add * VERTS_PER_QUAD)
    this.batch.growElements(add)

    // Fill the newly allocated index entries
    const idx = this.batch.vertexData.aIndices.data
    for (let i = this.capacity; i < newCap; i++) {
      const vi = i * VERTS_PER_QUAD
      const ii = i * INDICES_PER_QUAD
      idx[ii] = vi
      idx[ii + 1] = vi + 1
      idx[ii + 2] = vi + 2
      idx[ii + 3] = vi + 1
      idx[ii + 4] = vi + 3
      idx[ii + 5] = vi + 2
    }

    // Re-cache array refs: growData may have reallocated the underlying buffers
    this.posArr = this.batch.getArray('aPosition') as Float32Array
    this.uvArr = this.batch.getArray('aTexCoord') as Float32Array
    this.colArr = this.batch.getArray('aColor') as Float32Array

    this.capacity = newCap
  }

  private writeVertex(
    vi: number,
    x: number,
    y: number,
    u: number,
    v: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): void {
    const pi = vi * 2
    const ci = vi * 4
    this.posArr[pi] = x
    this.posArr[pi + 1] = y
    this.uvArr[pi] = u
    this.uvArr[pi + 1] = v
    this.colArr[ci] = r
    this.colArr[ci + 1] = g
    this.colArr[ci + 2] = b
    this.colArr[ci + 3] = a
  }
}
