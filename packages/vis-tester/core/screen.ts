import { ContextLike, HotKey, KeyMap, nstructjs, Screen, UIBase } from 'path.ux'
import type { AppContext } from './context'
import { redrawAll } from '../editors/redraw'

export class AppScreen extends Screen<any> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
AppScreen {
}
`,
  )

  constructor() {
    super()
    this.keymap = new KeyMap<ContextLike>([
      new HotKey('Z', ['ctrl'], () => {
        this.ctx.toolstack.undo(this.ctx)
        redrawAll()
      }),
      new HotKey('Z', ['ctrl', 'shift'], () => {
        this.ctx.toolstack.redo(this.ctx)
        redrawAll()
      }),
    ])
  }

  init() {
    super.init()
    this.playwrightId('tester-vis-app')
  }

  static define() {
    return {
      tagname: 'tester-vis-app',
    }
  }
}
UIBase.register(AppScreen)
