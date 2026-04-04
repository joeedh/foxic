import { AttrType, GLType } from './shaderprogram'

type VertexData = { [k: number]: number; length: number }
type TypedArrayFromGL = {
  [GLType.Float]: Float32Array
  [GLType.Byte]: Int8Array
  [GLType.UByte]: Uint8Array
  [GLType.Short]: Int16Array
  [GLType.UShort]: Uint16Array
  [GLType.Int]: Int32Array
  [GLType.UInt]: Uint32Array
  [GLType.Vec2]: Float32Array
  [GLType.Vec3]: Float32Array
  [GLType.Vec4]: Float32Array
  [GLType.Mat2]: Float32Array
  [GLType.Mat3]: Float32Array
  [GLType.Mat4]: Float32Array
  [GLType.Bool]: Uint8Array
}

interface ITypedArrayConstructor<T> {
  new (size: number): T
  new (
    arrayOrArrayBuffer: number[] | T | ArrayBuffer,
    byteOffset?: number,
    length?: number,
  ): T
}

export function getTypedArrayClsFromType<T extends AttrType>(
  type: T,
): ITypedArrayConstructor<TypedArrayFromGL[T]> {
  type CLS = ITypedArrayConstructor<TypedArrayFromGL[T]>
  switch (type) {
    case AttrType.Float:
      return Float32Array as unknown as CLS
    case AttrType.Byte:
      return Int8Array as unknown as CLS
    case AttrType.UByte:
      return Uint8Array as unknown as CLS
    case AttrType.Short:
      return Int16Array as unknown as CLS
    case AttrType.UShort:
      return Uint16Array as unknown as CLS
    case AttrType.Int:
      return Int32Array as unknown as CLS
    case AttrType.UInt:
      return Uint32Array as unknown as CLS
    case AttrType.Vec2:
      return Float32Array as unknown as CLS
    case AttrType.Vec3:
      return Float32Array as unknown as CLS
    case AttrType.Vec4:
      return Float32Array as unknown as CLS
    case AttrType.Mat2:
      return Float32Array as unknown as CLS
    case AttrType.Mat3:
      return Float32Array as unknown as CLS
    case AttrType.Mat4:
      return Float32Array as unknown as CLS
    case AttrType.Bool:
      return Uint8Array as unknown as CLS
    default:
      throw new Error('Unknown type')
  }
}

export enum VertexArrayTarget {
  ArrayBuffer = 34962,
  ElementArrayBuffer = 34963,
}

/**
 * Stores vertex array data.  Data is cached in JS
 * and uploaded to GL when needed.
 */
export class VertexArray<T extends AttrType> {
  data: TypedArrayFromGL[T]
  target: VertexArrayTarget
  readonly size: number
  length = 0
  readonly type: T

  private glBuffer: WebGLBuffer | undefined
  private bufferGL: WebGL2RenderingContext | undefined
  private dirtyStart = 0
  private dirtyEnd = 0
  private dirty = false
  private uploaded = false

  /** size is number of elements per vertex*/
  constructor(
    type: T,
    target: VertexArrayTarget,
    size: number,
    data?: VertexData,
  ) {
    this.type = type
    const cls = getTypedArrayClsFromType(type)
    this.data = new cls(data as TypedArrayFromGL[T] | number[])
    this.target = target
    this.size = size
  }

  flagRangeUpdated(start: number, end: number) {
    if (!this.dirty) {
      this.dirtyStart = start
      this.dirtyEnd = end
      this.dirty = true
    } else {
      this.dirtyStart = Math.min(this.dirtyStart, start)
      this.dirtyEnd = Math.max(this.dirtyEnd, end)
    }
  }

  growData(elements: number) {
    const oldLength = this.length
    this.length += elements * this.size

    if (this.data.length < this.length) {
      const cls = getTypedArrayClsFromType<T>(this.type)
      const newData = new cls((this.length << 1) - (this.length >> 1) + 2)
      newData.set(this.data)
      newData.fill(0, this.data.length, newData.length)
      this.data = newData
      this.uploaded = false
    }

    this.flagRangeUpdated(oldLength, this.length)
  }

  bind(gl: WebGL2RenderingContext) {
    if (gl !== this.bufferGL || this.glBuffer === undefined) {
      this.glBuffer = gl.createBuffer()!
      this.bufferGL = gl
      this.uploaded = false
    }

    gl.bindBuffer(this.target, this.glBuffer)

    if (!this.uploaded) {
      gl.bufferData(this.target, this.data, gl.DYNAMIC_DRAW)
      this.uploaded = true
      this.dirty = false
    } else if (this.dirty) {
      gl.bufferSubData(
        this.target,
        this.dirtyStart * this.data.BYTES_PER_ELEMENT,
        this.data,
        this.dirtyStart,
        this.dirtyEnd - this.dirtyStart,
      )
      this.dirty = false
    }
  }

  destroy(gl: WebGL2RenderingContext) {
    if (this.glBuffer !== undefined && gl === this.bufferGL) {
      gl.deleteBuffer(this.glBuffer)
    }
    this.glBuffer = undefined
    this.bufferGL = undefined
  }
}
