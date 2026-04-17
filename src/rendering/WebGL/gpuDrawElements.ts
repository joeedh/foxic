import type { AttrBlock, AttrType, AttrTypeDef, UniformSet } from './shaderprogram'
import { glTypeToEnum, type Shader } from './shaderprogram'
import { VertexArray, VertexArrayTarget } from './vertexArray'

type VertexBlock<ATTRS extends AttrBlock> = {
  [key in keyof ATTRS]: VertexArray<ATTRS[key]['type']>
}

export class GPUDrawElements<ATTRS extends AttrBlock> {
  vertexData: VertexBlock<ATTRS>
  vertsPerElement: number
  lastElement = 0

  elementIndexAttr?: keyof {
    [k in keyof ATTRS as ATTRS[k]['type'] extends VertexArrayTarget.ElementArrayBuffer
      ? k
      : never]: AttrTypeDef
  }

  get isIndexed() {
    return this.elementIndexAttr !== undefined
  }

  constructor(attrs: ATTRS, vertsPerElement: number) {
    this.vertexData = {} as VertexBlock<ATTRS>
    for (let k in attrs) {
      this.vertexData[k] = new VertexArray(
        attrs[k]['type'],
        attrs[k]['target'] ?? VertexArrayTarget.ArrayBuffer,
        attrs[k]['size'],
      )
    }
    this.vertsPerElement = vertsPerElement
  }

  growElements(n: number): number {
    for (const k in this.vertexData) {
      const varray = this.vertexData[k]
      if (varray.target === VertexArrayTarget.ElementArrayBuffer) {
        varray.growData(this.vertsPerElement * n)
      }
    }
    const lastElement = this.lastElement
    this.lastElement += n

    return lastElement
  }

  getArray<KEY extends keyof ATTRS>(key: KEY): VertexArray<ATTRS[KEY]['type']>['data'] {
    return this.vertexData[key].data
  }

  bind<SHADER extends Shader>(
    gl: WebGL2RenderingContext,
    shader: SHADER,
    uniforms?: UniformSet<SHADER['shaderDef']>,
  ) {
    shader.bind(gl, uniforms)

    let elementBuffer: VertexArray<AttrType> | undefined

    for (const k in this.vertexData) {
      const varray = this.vertexData[k]

      if (varray.target === VertexArrayTarget.ElementArrayBuffer) {
        elementBuffer = varray
        continue
      }

      varray.bind(gl)
      const loc = shader.getAttrLocation(k)
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(
          loc,
          varray.size,
          glTypeToEnum(gl, varray.type),
          false,
          0,
          0,
        )
      }
    }

    if (elementBuffer) {
      elementBuffer.bind(gl)
      gl.drawElements(
        gl.TRIANGLES,
        this.lastElement * this.vertsPerElement,
        glTypeToEnum(gl, elementBuffer.type),
        0,
      )
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, this.lastElement * this.vertsPerElement)
    }
  }

  destroy(gl: WebGL2RenderingContext) {
    for (const k in this.vertexData) {
      this.vertexData[k].destroy(gl)
    }
  }
}
