import { DataAPI, nstructjs, UIBase } from 'path.ux'
import { meshRedrawEmitter } from '@gametest/meshlib'
import { Editor } from '@gametest/vis-tester-base/editors/editorBase'
import { redrawEmitter, redrawAll } from '@gametest/vis-tester-base/editors/redraw'
import { GLType, ShaderProgramBase, type IShaderDef, Texture } from '@gametest/webgl'
import type { TexGenContext } from './context'
import { uploadSdfTexture } from './sdfGen'

const SDF_W = 512
const SDF_H = 512

const shaderUniforms = {
  u_sdf: { type: GLType.Sampler2D, default: 0 as number | Texture },
} as const
const shaderAttrs = {} as const
type PreviewShaderDef = IShaderDef<typeof shaderUniforms, typeof shaderAttrs>

export class WebGLPreviewEditor extends Editor<TexGenContext> {
  static STRUCT = nstructjs.inlineRegister(this, `WebGLPreviewEditor {}`)

  static define() {
    return {
      tagname : 'webgl-preview-x',
      areaname: 'webglPreview',
      uiname  : 'Preview',
      icon    : -1,
    }
  }

  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    return st
  }

  private canvas!: HTMLCanvasElement
  private gl!: WebGL2RenderingContext
  private shader?: ShaderProgramBase<PreviewShaderDef>
  private compiledHash = 0
  private sdfDirty = true
  private redrawCB = () => this.draw()
  private meshCB = () => {
    this.sdfDirty = true
    redrawAll()
  }

  init() {
    super.init()
    this.canvas = document.createElement('canvas')
    this.gl = this.canvas.getContext('webgl2') as WebGL2RenderingContext
    this.shadow.appendChild(this.canvas)

    if (this.ctx) {
      this.ctx.gl = this.gl
    }

    this.checkRedrawEvent()
    meshRedrawEmitter.on('redraw', this.meshCB)
    this.draw()
  }

  private checkRedrawEvent() {
    const subscribed = redrawEmitter.has('redraw', this.redrawCB)
    if (subscribed && !this.isConnected) {
      redrawEmitter.off('redraw', this.redrawCB)
    } else if (!subscribed && this.isConnected) {
      redrawEmitter.on('redraw', this.redrawCB)
    }
  }

  update() {
    this.checkRedrawEvent()
    super.update()
  }

  private checkSize() {
    const size = this.size
    if (!size) return
    const dpi = devicePixelRatio
    const w = ~~(size[0] * dpi)
    const h = ~~(size[1] * dpi)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
      this.canvas.style.width = w / dpi + 'px'
      this.canvas.style.height = h / dpi + 'px'
    }
  }

  private ensureSdf() {
    if (!this.ctx) return
    if (!this.sdfDirty && this.ctx.sdfTexture) return
    this.ctx.sdfTexture = uploadSdfTexture(
      this.gl,
      this.ctx.mesh,
      SDF_W,
      SDF_H,
      { strokeWidth: 8, blurRadius: 6 },
      this.ctx.sdfTexture,
    )
    this.sdfDirty = false
  }

  private ensureShader() {
    if (!this.ctx) return
    const compiled = this.ctx.graph.compile()
    if (!this.shader || compiled.hash !== this.compiledHash) {
      if (this.shader) this.shader.destroy(this.gl)
      const def: PreviewShaderDef = {
        vertexSource  : compiled.vertSrc,
        fragmentSource: compiled.fragSrc,
        uniforms      : shaderUniforms as unknown as PreviewShaderDef['uniforms'],
        attrs         : shaderAttrs as unknown as PreviewShaderDef['attrs'],
      }
      this.shader = new ShaderProgramBase(this.gl, def)
      this.compiledHash = compiled.hash
    }
  }

  draw() {
    if (!this.ctx) return
    this.checkSize()
    this.ensureSdf()
    this.ensureShader()

    const gl = this.gl
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    if (this.shader && this.ctx.sdfTexture) {
      this.shader.bind(gl, { u_sdf: this.ctx.sdfTexture })
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
  }
}
Editor.register(WebGLPreviewEditor)
UIBase.register(WebGLPreviewEditor as unknown as typeof UIBase)
