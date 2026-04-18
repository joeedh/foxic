import { nstructjs, Screen, UIBase } from 'path.ux'
import type { AppContext } from './context'

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
