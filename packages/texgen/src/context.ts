import { AppContext } from '@gametest/vis-tester-base/core/context'
import type { Texture } from '@gametest/webgl'
import type { TexGenFile } from './model'
import type { SettingsTemplate } from './settings'
import { contextWrangler } from 'path.ux'
import { NodeGraphEditor } from './nodeGraphEditor'

export class TexGenContext extends AppContext<TexGenFile, typeof SettingsTemplate> {
  sdfTexture?: Texture
  gl?: WebGL2RenderingContext

  mesh_save() {
    return AppContext.NotLocked
  }
  get mesh() {
    return this.state.model.mesh
  }

  graph_save() {
    return AppContext.NotLocked
  }
  get graph() {
    return this.state.model.graph
  }

  public get shaderGraphEditor() {
    return contextWrangler.getLastArea(NodeGraphEditor)
  }
}
