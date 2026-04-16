import { AppContext } from "@gametest/vis-tester-base/core/context";
import type { TexGenFile } from "./model";
import type { SettingsTemplate } from "./settings";

export class TexGenContext extends AppContext<TexGenFile, typeof SettingsTemplate> {
  get mesh() {
    return this.state.model.mesh
  }
}