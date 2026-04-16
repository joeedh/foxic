import { InsecureHashDigest } from '../../util/hashDigest'
import { Texture } from './texture'
import { VertexArrayTarget } from './vertexArray'

export const GLType = {
  Float: 0,
  Byte: 1,
  UByte: 2, //unsigned
  Short: 3,
  UShort: 4, //unsigned
  Int: 5,
  UInt: 6, //unsigned
  Bool: 7,
  Vec2: 8,
  Vec3: 9,
  Vec4: 10,
  Mat2: 11,
  Mat3: 12,
  Mat4: 13,
  Sampler2D: 14,
  Sampler3D: 15,
} as const

export const typeElemSize = {
  [GLType.Float]: 1,
  [GLType.Vec2]: 2,
  [GLType.Vec3]: 3,
  [GLType.Vec4]: 4,
  [GLType.Mat2]: 4,
  [GLType.Mat3]: 9,
  [GLType.Mat4]: 16,
  [GLType.Bool]: 1,
  [GLType.Byte]: 1,
  [GLType.UByte]: 1,
  [GLType.Short]: 2,
  [GLType.UShort]: 2,
  [GLType.Int]: 4,
  [GLType.UInt]: 4,
}

export type ExtractEnumKeys<T extends { [k: string]: number }> = keyof {
  [k in keyof T as T[k]]: T[k]
}

export type GLType = ExtractEnumKeys<typeof GLType>

// attributes support all gl types other then texture samplers
export type AttrType = ExtractEnumKeys<
  Omit<typeof GLType, 'Sampler2D' | 'Sampler3D'>
>
export const AttrType = Object.fromEntries(
  Object.entries(GLType).filter(
    (f) => f[0] !== 'Sampler2D' && f[0] !== 'Sampler3D',
  ),
) as unknown as typeof GLType

/** Maps a GLType constant to its corresponding JavaScript value type. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UniformValueFor<T extends GLType> = T extends typeof GLType.Vec2
  ? readonly number[] | Float32Array
  : T extends typeof GLType.Vec3
    ? readonly number[] | Float32Array
    : T extends typeof GLType.Vec4
      ? readonly number[] | Float32Array
      : T extends typeof GLType.Mat2
        ? Float32Array
        : T extends typeof GLType.Mat3
          ? Float32Array
          : T extends typeof GLType.Mat4
            ? Float32Array
            : T extends typeof GLType.Sampler2D
              ? number | Texture
              : T extends typeof GLType.Sampler3D
                ? number | Texture
                : number

export type UniformTypeDef<T extends GLType = GLType> = {
  type: T
  default: UniformValueFor<T>
}
export type AttrTypeDef = {
  type: AttrType
  target?: VertexArrayTarget
  size: number
}
export type UniformSet<SDEF extends IShaderDef> = Partial<
  UniformsFromDef<SDEF['uniforms']>
>

/** definition of shader uniforms */
export type UniformBlock = { [k: string]: UniformTypeDef }

/** definition of shader attributes*/
export type AttrBlock = { [k: string]: AttrTypeDef }

/** defines a glsl preprocessor definition block.
 * if a member is 'defineOnly' it should produce `#define KEY` only,
 * otherwise it should do `#define KEY VALUE`
 */
export type MacroDefinesBlock = { [key: string]: string | 'defineOnly' }

/** note: all shaders are required to be glsl 300 */
export interface IShaderDef<
  UNIFORMS extends UniformBlock = UniformBlock,
  ATTRS extends AttrBlock = AttrBlock,
> {
  vertexSource: string
  fragmentSource: string
  uniforms: UNIFORMS
  attrs: ATTRS
}

export type UniformsFromDef<T extends UniformBlock> = {
  [k in keyof T]: UniformValueFor<T[k]['type']>
}

/** Maps a GLType to the corresponding WebGL enum constant. */
export function glTypeToEnum(gl: WebGL2RenderingContext, type: number): number {
  switch (type) {
    case GLType.Float:
    case GLType.Vec2:
    case GLType.Vec3:
    case GLType.Vec4:
    case GLType.Mat2:
    case GLType.Mat3:
    case GLType.Mat4:
      return gl.FLOAT
    case GLType.Byte:
      return gl.BYTE
    case GLType.UByte:
      return gl.UNSIGNED_BYTE
    case GLType.Short:
      return gl.SHORT
    case GLType.UShort:
      return gl.UNSIGNED_SHORT
    case GLType.Int:
    case GLType.Bool:
      return gl.INT
    case GLType.UInt:
      return gl.UNSIGNED_INT
    default:
      throw new Error(`No GL enum for type ${type}`)
  }
}

function insertDefines(source: string, defineBlock: string): string {
  const match = source.match(/^(#version[^\n]*\n(?:\s*precision[^\n]*\n)*)/)
  if (match) {
    return match[1] + defineBlock + source.slice(match[1].length)
  }
  return defineBlock + source
}

export class ShaderProgramBase<SDEF extends IShaderDef> {
  gl: WebGL2RenderingContext
  public readonly shaderDef: SDEF
  private program: WebGLProgram | undefined = undefined
  private _compiledGL: WebGL2RenderingContext | undefined = undefined
  private uniformLocations = new Map<string, WebGLUniformLocation>()
  private attrLocations = new Map<string, number>()

  constructor(gl: WebGL2RenderingContext, shaderDef: SDEF) {
    this.gl = gl
    this.shaderDef = shaderDef
  }

  compile(gl: WebGL2RenderingContext) {
    if (gl === this._compiledGL && this.program !== undefined) {
      return
    }

    // Context changed or never compiled — clear old references
    this.program = undefined
    this.uniformLocations.clear()
    this.attrLocations.clear()

    const vs = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(vs, this.shaderDef.vertexSource)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(vs)
      gl.deleteShader(vs)
      throw new Error('Vertex shader: ' + log)
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(fs, this.shaderDef.fragmentSource)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(fs)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      throw new Error('Fragment shader: ' + log)
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteProgram(prog)
      throw new Error('Program link: ' + log)
    }

    gl.deleteShader(vs)
    gl.deleteShader(fs)

    this.program = prog

    // Cache uniform locations
    for (const name of Object.keys(this.shaderDef.uniforms)) {
      const loc = gl.getUniformLocation(prog, name)
      if (loc !== null) {
        this.uniformLocations.set(name, loc)
      }
    }

    // Cache attribute locations
    for (const name of Object.keys(this.shaderDef.attrs)) {
      this.attrLocations.set(name, gl.getAttribLocation(prog, name))
    }

    this._compiledGL = gl
    this.gl = gl
  }

  get needsCompile(): boolean {
    return this.program === undefined || this._compiledGL === undefined
  }

  public getTextureSlot(name: keyof SDEF['uniforms']) {
    let index = 0
    for (let k in this.shaderDef.uniforms) {
      if (k === name) {
        return index
      }
      index++
    }
    throw new Error(
      'unreachable code in getTextureSlot: unknown uniform ' + (name as string),
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setUniform(
    gl: WebGL2RenderingContext,
    key: keyof SDEF['uniforms'],
    loc: WebGLUniformLocation,
    type: number,
    value: any,
  ) {
    switch (type) {
      case GLType.Float:
        gl.uniform1f(loc, value)
        break
      case GLType.Int:
      case GLType.Bool:
      case GLType.Sampler2D:
      case GLType.Sampler3D:
        if (value instanceof Texture) {
          const slot = this.getTextureSlot(key)
          gl.uniform1i(loc, slot)
          value.bind(gl, slot)
        } else if (typeof value === 'number') {
          gl.uniform1i(loc, value)
        }
        break
      case GLType.UInt:
        gl.uniform1ui(loc, value)
        break
      case GLType.Vec2:
        gl.uniform2fv(loc, value)
        break
      case GLType.Vec3:
        gl.uniform3fv(loc, value)
        break
      case GLType.Vec4:
        gl.uniform4fv(loc, value)
        break
      case GLType.Mat2:
        gl.uniformMatrix2fv(loc, false, value)
        break
      case GLType.Mat3:
        gl.uniformMatrix3fv(loc, false, value)
        break
      case GLType.Mat4:
        gl.uniformMatrix4fv(loc, false, value)
        break
    }
  }

  bind(gl: WebGL2RenderingContext, uniforms?: UniformSet<SDEF>) {
    if (gl !== this._compiledGL || this.program === undefined) {
      this.compile(gl)
    }

    gl.useProgram(this.program!)

    const defs = this.shaderDef.uniforms
    for (const name in defs) {
      const loc = this.uniformLocations.get(name)
      if (loc === undefined) {
        continue
      }

      const uniformDef = defs[name]
      const value =
        (uniforms as Record<string, unknown> | undefined)?.[name] ??
        uniformDef.default
      this.setUniform(
        gl,
        name as keyof SDEF['uniforms'],
        loc,
        uniformDef.type,
        value,
      )
    }
  }

  getAttrLocation(name: string): number {
    return this.attrLocations.get(name) ?? -1
  }

  destroy(gl: WebGL2RenderingContext) {
    if (gl === this._compiledGL && this.program !== undefined) {
      gl.deleteProgram(this.program)
    }

    this.program = undefined
    this._compiledGL = undefined
    this.uniformLocations.clear()
    this.attrLocations.clear()
  }
}

type MacroDefinesKey = number

const tempDigest = new InsecureHashDigest()
export class ShaderWithMacros<SDEF extends IShaderDef> {
  shaderDef: IShaderDef
  gl: WebGL2RenderingContext

  currentMacroKey?: MacroDefinesKey
  macroShaders = new Map<MacroDefinesKey, ShaderProgramBase<SDEF>>()
  private macroDefines = new Map<string, string | 'defineOnly'>()

  constructor(gl: WebGL2RenderingContext, shaderDef: IShaderDef) {
    this.shaderDef = shaderDef
    this.gl = gl
  }

  setDefine(name: string, value: string | 'defineOnly') {
    this.macroDefines.set(name, value)
    this.onUpdateMacros()
  }

  deleteDefine(name: string) {
    this.macroDefines.delete(name)
    this.onUpdateMacros()
  }

  compile(gl: WebGL2RenderingContext) {
    if (this.currentMacroKey !== undefined) {
      return this.macroShaders.get(this.currentMacroKey)!.compile(gl)
    }
  }

  bind(
    gl: WebGL2RenderingContext,
    uniforms?: Partial<UniformsFromDef<SDEF['uniforms']>>,
  ) {
    if (this.currentMacroKey !== undefined) {
      return this.macroShaders.get(this.currentMacroKey)!.bind(gl, uniforms)
    }
  }

  getAttrLocation(name: string): number {
    if (this.currentMacroKey !== undefined) {
      return this.macroShaders.get(this.currentMacroKey)!.getAttrLocation(name)
    }
    return -1
  }

  private onUpdateMacros() {
    this.currentMacroKey = this.calcMacroKey(this.macroDefines)

    if (this.macroShaders.has(this.currentMacroKey)) {
      return
    }

    // Build #define block
    let defineBlock = ''
    for (const [key, value] of this.macroDefines) {
      if (value === 'defineOnly') {
        defineBlock += `#define ${key}\n`
      } else {
        defineBlock += `#define ${key} ${value}\n`
      }
    }

    // Fork shader def with defines inserted after #version/precision lines
    const modifiedDef: IShaderDef = {
      ...this.shaderDef,
      vertexSource: insertDefines(this.shaderDef.vertexSource, defineBlock),
      fragmentSource: insertDefines(this.shaderDef.fragmentSource, defineBlock),
    }

    const program = new ShaderProgramBase<SDEF>(this.gl, modifiedDef as SDEF)
    this.macroShaders.set(this.currentMacroKey, program)
  }

  private calcMacroKey(defines: Map<string, string | 'defineOnly'>): number {
    tempDigest.reset()
    for (const [key, item] of defines) {
      tempDigest.addString(key)
      tempDigest.addString(item)
    }
    return tempDigest.digest()
  }
}

export type Shader<SDEF extends IShaderDef = IShaderDef> =
  | ShaderProgramBase<SDEF>
  | ShaderWithMacros<SDEF>
