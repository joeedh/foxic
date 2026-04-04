declare global {
  interface WebGL2RenderingContext {
    getSupportedExtensions(): string[]
    getExtension(name: string): any
    canvas: HTMLCanvasElement
    contextLost?: boolean
  }
}

export interface IWebGLParams {
  antialias?: boolean
  stencil?: boolean
  debug?: boolean
}

export default WebGL2RenderingContext
export function getContext(
  canvas: HTMLCanvasElement,
  params: IWebGLParams,
): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', {
    antialias: params.antialias,
    stencil: params.stencil,
  }) as WebGL2RenderingContext

  canvas.addEventListener('contextlost', () => {
    gl.contextLost = true
  })

  if (params.debug) {
    patchDebugGL(gl)
  }

  return gl
}

/**
 * Patches gl to more easily access internal state during debugging.
 * Note: we do patch the prototypes for internal webgl types, except for WebGL2RenderingContext;
 * instead we simply patch the gl instance itself.
 **/
export function patchDebugGL(gl: WebGL2RenderingContext) {
  //patch gl for debugging

  function patchClass(cls: any, parent: any) {
    for (const k in Reflect.ownKeys(cls.prototype)) {
      if (typeof k === 'symbol' || k === 'constructor') continue

      const descr = Object.getOwnPropertyDescriptor(cls.prototype, k)!
      const pdescr = Object.getOwnPropertyDescriptor(parent.prototype, k)

      if (pdescr?.configurable === false) {
        console.warn('Cannot override property', k)
        continue
      }

      if (!descr.get && !descr.set && descr.writable !== false) {
        parent.prototype[k] = cls.prototype[k]
      } else {
        Object.defineProperty(parent.prototype, k, descr)
      }
    }
  }

  function patchInstance(cls: any, parent: any) {
    const glAny = gl as any

    // do not patch webgl2renderingcontext directly
    for (const k in Reflect.ownKeys(cls.prototype)) {
      if (typeof k === 'symbol' || k === 'constructor') continue

      const descr = Object.getOwnPropertyDescriptor(cls.prototype, k)!
      const pdescr = Object.getOwnPropertyDescriptor(parent.prototype, k)

      if (pdescr?.configurable === false) {
        console.warn('Cannot override property', k)
        continue
      }

      if (!descr.get && !descr.set && descr.writable !== false) {
        glAny[k] = cls.prototype[k]
      } else {
        Object.defineProperty(glAny, k, descr)
      }
    }
  }

  class DebugTexture extends WebGLTexture {
    getParameter(target: (typeof gl)['TEXTURE_2D'] | number, pname: any) {
      return gl.getTexParameter(target, pname)
    }

    get minFilter2D() {
      return gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER)
    }
    get magFilter2D() {
      return gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER)
    }
    get wrapS2D() {
      return gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S)
    }
    get wrapT2D() {
      return gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T)
    }
    set minFilter2D(v: number) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, v)
    }
    set magFilter2D(v: number) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, v)
    }
    set wrapS2D(v: number) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, v)
    }
    set wrapT2D(v: number) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, v)
    }
  }
  patchClass(DebugTexture, WebGLTexture)

  class DebugBuffer extends WebGLBuffer {
    getParameter(
      target:
        | (typeof gl)['ARRAY_BUFFER']
        | (typeof gl)['ELEMENT_ARRAY_BUFFER']
        | number,
      pname: any,
    ) {
      return gl.getBufferParameter(target, pname)
    }
  }
  patchClass(DebugBuffer, WebGLBuffer)

  class DebugGL extends WebGL2RenderingContext {
    createTexture() {
      return super.createTexture() as DebugTexture
    }
    createBuffer() {
      return super.createBuffer() as DebugBuffer
    }
  }
  patchClass(DebugGL, WebGL2RenderingContext)
  patchInstance(DebugGL, WebGL2RenderingContext)

  return gl as DebugGL
}
