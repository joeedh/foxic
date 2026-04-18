import { AppContext } from "@gametest/vis-tester-base/core/context"
import type { Texture } from "@gametest/webgl"
import type { TexGenFile } from "./model"
import type { SettingsTemplate } from "./settings"

export class TexGenContext extends AppContext<TexGenFile, typeof SettingsTemplate> {
  sdfTexture?: Texture
  gl?: WebGL2RenderingContext

  get mesh() {
    return this.state.model.mesh
  }
  get graph() {
    return this.state.model.graph
  }
}
