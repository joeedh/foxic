export class Texture {
  private glTexture: WebGLTexture | undefined
  private textureGL: WebGL2RenderingContext | undefined
  width: number
  height: number

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this.glTexture = gl.createTexture()!
    this.textureGL = gl
    this.width = width
    this.height = height
  }

  private ensureTexture(gl: WebGL2RenderingContext) {
    if (gl !== this.textureGL || this.glTexture === undefined) {
      this.glTexture = gl.createTexture()!
      this.textureGL = gl
    }
  }

  destroy(gl: WebGL2RenderingContext) {
    if (gl === this.textureGL && this.glTexture !== undefined) {
      gl.deleteTexture(this.glTexture)
    }
    this.glTexture = undefined
    this.textureGL = undefined
  }

  uploadBuffer(
    gl: WebGL2RenderingContext,
    type: typeof gl.FLOAT | typeof gl.UNSIGNED_BYTE,
    width: number,
    height: number,
    data: Float32Array | Uint8Array,
  ) {
    this.ensureTexture(gl)
    gl.bindTexture(gl.TEXTURE_2D, this.glTexture!)

    const internalFormat = type === gl.FLOAT ? gl.RGBA32F : gl.RGBA
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      width,
      height,
      0,
      gl.RGBA,
      type,
      data,
    )

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    this.width = width
    this.height = height
  }

  uploadMedia(
    gl: WebGL2RenderingContext,
    media: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
  ) {
    this.ensureTexture(gl)
    gl.bindTexture(gl.TEXTURE_2D, this.glTexture!)

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    if (media instanceof HTMLVideoElement) {
      this.width = media.videoWidth
      this.height = media.videoHeight
    } else if (media instanceof HTMLImageElement) {
      this.width = media.naturalWidth
      this.height = media.naturalHeight
    } else {
      this.width = media.width
      this.height = media.height
    }
  }

  bind(gl: WebGL2RenderingContext, slot: number) {
    this.ensureTexture(gl)

    gl.activeTexture(gl.TEXTURE0 + slot)
    gl.bindTexture(gl.TEXTURE_2D, this.glTexture!)
  }
}
