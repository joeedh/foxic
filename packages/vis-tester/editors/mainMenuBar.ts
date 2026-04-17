import {
  KeyMap,
  nstructjs,
  UIBase,
  electron_api,
  util,
  Menu,
  AreaFlags,
  DataAPI,
} from 'path.ux'
import { Editor } from '.'
import { AppContext } from '../core/context'
import { Icons } from '../assets/icon_enum'

export class MainMenuBar<CTX extends AppContext = AppContext> extends Editor<CTX> {
  static STRUCT = nstructjs.inlineRegister(this, `MainMenuBar {}`)

  static define() {
    super.define
    return {
      tagname   : 'main-menu-x',
      areaname  : 'MainMenuBar',
      uiname    : 'Main Menu',
      icon      : -1,
      borderLock: 1,
      flag      : AreaFlags.HIDDEN | AreaFlags.NO_SWITCHER,
    }
  }

  private _height = 32

  constructor() {
    super()

    this.borderLock = 1 | 2 | 4 | 8
    this.areaDragToolEnabled = false
  }

  copy() {
    let ret = UIBase.createElement(this.constructor.define().tagname) as this
    ret.ctx = this.ctx
    return ret
  }

  init() {
    super.init()

    this.background = this.getDefault('AreaHeaderBG')

    if (this.helppicker && !util.isMobile()) {
      this.helppicker.iconsheet = 0
    }

    let header = this.header!
    let span = header.row()

    span
      .menu('File', [
        [
          'New',
          () => {
            // implement me!
          },
        ],
        Menu.SEP,
        [
          'Save As',
          () => {
            // implement me!
          },
        ],
        [
          'Open',
          () => {
            // implement me!
          },
        ],
      ])
      .playwrightId('menu-file')

    span
      .menu('Edit', [
        ['Undo', () => this.ctx.toolstack.undo(), 'CTRL-Z', Icons.UNDO],
        ['Redo', () => this.ctx.toolstack.redo(), 'CTRL-SHIFT-Z', Icons.REDO],
      ])
      .playwrightId('menu-edit')

    span
      .menu('Session', [
        [
          'Save Default File',
          () => {
            this.ctx.state.saveLocalStorage()
          },
        ],
        [
          'Clear Default File',
          () => {
            this.ctx.state.clearLocalStorage()
          },
        ],
      ])
      .playwrightId('menu-session')

    this.setCSS()
  }

  updateHeight() {
    if (!this.header) return

    if (window.haveElectron) {
      this.maxSize[1] = this.minSize[1] = 1
      electron_api.initMenuBar(this)
      return
    }

    let rect = this.header.getClientRects()[0]
    if (rect) {
      this._height = rect.height
    }

    let update = this._height !== this.minSize[1]
    this.minSize[1] = this.maxSize[1] = this._height

    if (update && this.ctx && this.getScreen()) {
      this.ctx.screen.solveAreaConstraints()
      this.ctx.screen.completeUpdate()
    }
  }

  update() {
    super.update()
    this.updateHeight()
  }

  getKeyMaps(): KeyMap<AppContext>[] {
    return []
  }

  static defineAPI(api: DataAPI) {
    return api.mapStruct(this)
  }
}
Editor.register(MainMenuBar)
