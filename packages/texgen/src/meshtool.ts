import { ToolMode } from '@gametest/vis-tester-base/toolmode/toolmode'
import { MeshToolMode } from '@gametest/vis-tester-base/toolmode/toolmode_mesh'
import { Icons } from '../assets/icon_enum'
import { nstructjs } from 'path.ux'
import { TexGenContext } from './context'

export class MeshTool extends MeshToolMode<TexGenContext> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `texgen.MeshTool {
    }`,
  )
  static readonly toolModeDef = {
    typeName   : 'mesh',
    uiName     : 'Mesh',
    description: 'Mesh tool mode',
    icon       : Icons.MESH,
  }

  constructor() {
      super()
  }

  get mesh() {
    return this.ctx?.mesh
  }

  loadStruct(reader: nstructjs.StructReader<this>): void {
    super.loadStruct(reader)
    reader(this)
  }
}
ToolMode.register(MeshTool)
