import { AppState } from '@gametest/vis-tester-base/core/app'
import { TexGenFile } from './model'
import { SettingsTemplate } from './settings'
import { TexGenContext } from './context'
import './meshtool'
import './curveTool'
import './nodeGraphEditor'
import './webglPreview'
import { UIBase, ScreenArea } from 'path.ux'
import { AppScreen } from '@gametest/vis-tester-base/core/screen'
import { MainMenuBar } from '@gametest/vis-tester-base/editors/mainMenuBar'
import { CanvasEditor } from '@gametest/vis-tester-base/editors/canvasEditor'
import { NodeGraphEditor } from './nodeGraphEditor'
import { WebGLPreviewEditor } from './webglPreview'
import type { AppContext } from '@gametest/vis-tester-base/core/context'

export class TexGenApp extends AppState<
  typeof SettingsTemplate,
  TexGenFile,
  TexGenContext
> {
  readonly localStorageKey = 'TEST1'
  readonly version = [0, 0, 1] as const
  readonly saveStartupOnSettingsChange = true

  constructor() {
    super(TexGenContext, SettingsTemplate)
  }

  createModel() {
    return new TexGenFile()
  }

  createDefaultScreen() {
    this.screen = UIBase.createElement(AppScreen.define().tagname) as AppScreen
    this.screen.ctx = this.ctx

    const sarea = UIBase.createElement('screenarea-x') as ScreenArea<AppContext>
    this.screen.appendChild(sarea)
    sarea.switchEditor(MainMenuBar)

    // split off the main work area below the menu bar
    const work = this.screen.splitArea(sarea, 0.05, true)

    // split work into top (canvas + preview) / bottom (node graph)
    const bottom = this.screen.splitArea(work, 0.65, true)
    bottom.switchEditor(NodeGraphEditor)

    // split top horizontally into curve editor (left) + preview (right)
    const right = this.screen.splitArea(work, 0.6, false)
    work.switchEditor(CanvasEditor)
    right.switchEditor(WebGLPreviewEditor)

    return this.screen
  }

  getFileVersion() {
    return [0, 0, 1] as const
  }
}

declare global {
  interface Window {
    _appstate: TexGenApp
  }
  const _appstate: TexGenApp
}

export function start() {
  console.log('start app!')
  window._appstate = new TexGenApp()
  window._appstate.start()
}
