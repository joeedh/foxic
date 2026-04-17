import {
  DataAPI,
  IconManager,
  nstructjs,
  setBaseUnit,
  setIconManager,
  setMetric,
  startEvents,
  ToolStack,
  UIBase,
  cconst,
  ScreenArea,
  setTheme,
  util,
} from 'path.ux'
import { AppContext } from './context'
import { AppScreen } from './screen'
import { buildAPI } from './register'
import { theme } from '../assets/theme'
import { Icons } from '../assets/icon_enum'
import { IPathUXConstants } from 'path.ux/scripts/config/const'
import { CanvasEditor, MainMenuBar } from '../editors'
import '../editors'
import { FileHeader } from 'path.ux/scripts/simple/file'
import { PropertiesBag, type ITemplateDef } from './props'

export interface IFileOptions {
  screen?: boolean
  json?: boolean
}

class MyFileExport extends FileHeader {
  model?: any
  screen?: any

  static STRUT = nstructjs.inlineRegister(
    this,
    `
    MyFileExport {
      model: optional(abstract(Object));
      screen: optional(abstract(Object));
    }
    `,
  )

  constructor(version?: number[], magic = '', flags = 0) {
    super(version, magic, flags)
  }
}
export abstract class AppState<
  SETTINGS extends
    | ITemplateDef
    | (ITemplateDef & { autoSave: { type: 'bool'; value: boolean } }) = {},
  DataModelRoot = unknown,
  CTX extends AppContext = AppContext,
> {
  toolstack = new ToolStack()
  api: DataAPI
  declare screen: AppScreen
  ctx: CTX
  declare model: DataModelRoot

  abstract readonly localStorageKey: string
  abstract readonly version: Readonly<[number, number, number]>
  abstract readonly saveStartupOnSettingsChange: boolean
  settings: PropertiesBag<SETTINGS, CTX>
  private settingsTemplate: SETTINGS

  constructor(ctxClass: any = AppContext, settings: Readonly<SETTINGS>) {
    this.settingsTemplate = settings
    this.ctx = new ctxClass(this) as unknown as CTX
    this.settings = new PropertiesBag(settings)
    this.api = buildAPI()
    if (!this.api.hasStruct(ctxClass)) {
      ctxClass.defineAPI(this.api)
    }
    this.api.rootContextStruct = this.api.mapStruct(ctxClass)
    this.onSettingsLoad()
  }

  onSettingsLoad() {
    this.settings.patchTemplate(this.settingsTemplate)
    this.settings.onChange = () => {
      this.ctx.redrawAll()
      if (this.saveStartupOnSettingsChange) {
        this.saveSettings()
      }
    }
  }

  createDefaultScreen() {
    this.screen = UIBase.createElement(AppScreen.define().tagname) as AppScreen
    this.screen.ctx = this.ctx
    const sarea = UIBase.createElement('screenarea-x') as ScreenArea<AppContext>
    this.screen.appendChild(sarea)

    const newarea = this.screen.splitArea(sarea)

    sarea.switchEditor(MainMenuBar)
    newarea.switchEditor(CanvasEditor)

    return this.screen
  }

  doMigrations(fileVersion: [number, number, number], model: DataModelRoot) {
    //
  }

  save(args: IFileOptions = {}) {
    const file = new MyFileExport(Array.from(this.version), 'VIST')

    if (args.screen) file.screen = this.screen
    file.model = this.model

    if (args.json) {
      return JSON.stringify(nstructjs.writeJSON(file), undefined, 1)
    }

    const data = [] as number[]
    nstructjs.writeObject(data, file)
    return new Uint8Array(data).buffer
  }

  load(data: ArrayBuffer | string, args: IFileOptions = {}) {
    let file: MyFileExport

    if (args.json && typeof data === 'string') {
      file = nstructjs.readJSON(JSON.parse(data), MyFileExport) as MyFileExport
    } else {
      let array: ArrayBuffer

      if (typeof data === 'string') {
        data = atob(data)
        const u8 = new Uint8Array(data.length)
        for (let i = 0; i < u8.length; i++) {
          u8[i] = data.charCodeAt(i)
        }
        array = u8.buffer
      } else {
        array = data
      }

      file = nstructjs.readObject(new DataView(array), MyFileExport) as MyFileExport
    }

    console.log(file)
    if (this.screen) {
      this.screen.unlisten()
      this.screen.remove()
    }

    this.onSettingsLoad()
    this.model = file.model
    this.screen = file.screen
    this.screen.ctx = this.ctx
    this.doMigrations(
      [file.version_major, file.version_minor, file.version_micro],
      this.model,
    )
    this.screen._init()
    document.body.appendChild(this.screen)
    this.screen.listen()
    for (let i = 0; i < 3; i++) {
      this.screen.completeUpdate()
    }
  }

  saveSettings() {
    const key = this.localStorageKey + '_settings'
    const settings = nstructjs.writeJSON(this.settings)
    localStorage[key] = JSON.stringify(settings)
  }

  loadSettings() {
    const key = this.localStorageKey + '_settings'
    if (!(key in localStorage)) return
    try {
      const settings = JSON.parse(localStorage[key])
      this.settings = nstructjs.readJSON(settings, PropertiesBag) as PropertiesBag<
        SETTINGS,
        CTX
      >
      this.onSettingsLoad()
    } catch (err: any) {
      this.settings = new PropertiesBag<SETTINGS, CTX>(this.settingsTemplate)
      this.onSettingsLoad()
      console.error(err.stack)
      console.error('Failed to load settings from localStorage')
    }
  }

  testSaveLoad() {
    const data = this.save({ json: true, screen: true })
    this.load(data, { json: true, screen: true })
  }

  saveLocalStorage() {
    const save = this.save({ json: true, screen: true }) as string
    localStorage[this.localStorageKey] = save
    console.log('saved to local storgae', (save.length / 1024).toFixed(2) + 'kb')
  }

  loadLocalStorage() {
    if (!(this.localStorageKey in localStorage)) return false
    try {
      this.load(localStorage[this.localStorageKey], {
        json  : true,
        screen: true,
      })
      return true
    } catch (error) {
      util.print_stack(error as Error)
      console.log('failed to load startup file')
    }
    return false
  }

  clearLocalStorage() {
    delete localStorage[this.localStorageKey]
    console.log('deleted startup file')
  }

  getTheme() {
    return theme
  }

  getIconSheet() {
    const img = document.createElement('img')
    img.src = 'assets/iconsheet.svg'
    return img
  }

  abstract createModel(): DataModelRoot

  createDefaultFile() {
    this.model = this.createModel()
    this.screen = this.createDefaultScreen()
    this.screen.ctx = this.ctx
    this.screen.init()
  }

  getIconSizes(): [number, number][] {
    return [
      [32, 16],
      [32, 22],
      [32, 52],
      [32, 64],
    ]
  }
  getIconEnum() {
    return Icons
  }
  getPathuxConfig(): IPathUXConstants {
    return {
      autoSizeUpdate     : true,
      useAreaTabSwitcher : true,
      showPathsInToolTips: true,
      colorSchemeType    : 'dark',
      DEBUG: {
        modalEvents: true,
      },
    }
  }

  start() {
    // define console debug global
    Object.defineProperty(window, 'C', {
      get() {
        return _appstate.ctx
      },
      configurable: true,
    })

    nstructjs.validateStructs()

    cconst.loadConstants(this.getPathuxConfig())

    setBaseUnit('meter')
    setMetric(true)

    setTheme(this.getTheme())

    // setup icons
    const svg = this.getIconSheet()
    const sizes = this.getIconSizes()
    const iconManager = new IconManager(
      sizes.map(() => svg),
      sizes,
    )
    setIconManager(iconManager, this.getIconEnum())

    this.loadSettings()

    if (!this.loadLocalStorage()) {
      this.createDefaultFile()
      document.body.appendChild(this.screen)
      // start events
      this.screen.listen()
      this.screen.completeUpdate()
    }

    window.setInterval(() => {
      if (
        'autoSave' in _appstate.settings.boundProps &&
        _appstate.settings.boundProps.autoSave
      ) {
        this.saveLocalStorage()
      }
    }, 500)
  }
}
