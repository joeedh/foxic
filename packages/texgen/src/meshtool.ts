import { ToolMode } from '@gametest/vis-tester-base/toolmode/toolmode'
import { MeshToolMode } from '@gametest/vis-tester-base/toolmode/toolmode_mesh'
import { Icons } from '../assets/icon_enum'
import { Container, loadFile, nstructjs } from 'path.ux'
import type { TexGenContext } from './context'

// @ts-ignore — Type instantiation is excessively deep and possibly infinite.
export class MeshTool extends MeshToolMode<TexGenContext> {
  image?: HTMLImageElement

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

  buildSideBar(toolTab: Container<TexGenContext>, propsTab: Container<TexGenContext>) {
    super.buildSideBar(toolTab, propsTab)
    propsTab.button('Load Image', async () => {
      const file = await loadFile('image.png', ['.png', '.jpg', '.bmp', 'webp'])
      const u8 = new Uint8Array(file as ArrayBuffer)
      const img = document.createElement('img')
      img.src = URL.createObjectURL(new Blob([u8], { type: 'image/png' }))

      img.onload = () => {
        this.ctx?.redrawAll()
      }
      this.image = img
    })
  }

  draw(ctx: TexGenContext, canvas: HTMLCanvasElement, g: CanvasRenderingContext2D): void {
    if (this.image) {
      g.drawImage(this.image, 0, 0)
    }
    super.draw(ctx, canvas, g)
  }
}
ToolMode.register(MeshTool)
