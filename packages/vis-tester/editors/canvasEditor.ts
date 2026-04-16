import {
  Container,
  DataAPI,
  loadUIData,
  nstructjs,
  saveUIData,
  UIBase,
} from 'path.ux'
import { Editor, EditorSideBar } from '.'
import { AppContext } from '../core/context'
import {
  IToolModeConstructor,
  ToolMode,
  ToolModeClasses,
} from '../toolmode/toolmode'
import { PropsEditor } from '../core/props'

export class CanvasEditor<
  CTX extends AppContext = AppContext,
> extends Editor<CTX> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    CanvasEditor {
      toolmode: abstract(ToolMode);
    }
    `,
  )

  canvas: HTMLCanvasElement
  toolmode?: ToolMode<CTX>
  sidebar?: EditorSideBar<CTX>
  private needsSidebarRebuild = false

  get toolmode_i() {
    return ToolModeClasses.indexOf(this.toolmode?.constructor)
  }
  set toolmode_i(i: number) {
    if (i === this.toolmode_i || !ToolModeClasses[i]) return
    this.switchToolMode(ToolModeClasses[i])
  }

  constructor() {
    super()
    this.canvas = document.createElement('canvas')
  }

  switchToolMode<T extends ToolMode<CTX>>(cls: IToolModeConstructor<T>): T {
    this.needsSidebarRebuild = true
    if (this.toolmode !== undefined) {
      this.toolmode.onInactive()
    }
    const toolmode = new cls()
    this.toolmode = toolmode
    this.toolmode.ctx = this.ctx
    this.toolmode.onActive()
    return toolmode
  }

  init(): void {
    super.init()
    this.toolmode = this.switchToolMode(ToolModeClasses[0])
    this.rebuildSideBar()
    this.shadow.appendChild(this.canvas)
  }

  rebuildSideBar() {
    this.needsSidebarRebuild = false
    
    //save transient ui state (e.g. panel collapse state, active tabs, etc
    let uidata: string | undefined
    if (this.sidebar !== undefined) {
      uidata = saveUIData(this, 'editor sidebar')
      this.sidebar.remove()
    }

    const sidebar = UIBase.createElement(
      EditorSideBar.define().tagname,
    ) as EditorSideBar<CTX>

    this.sidebar = sidebar
    this.shadow.appendChild(sidebar)
    
    const tabs = this.sidebar.tabs('right')
    let tab = tabs.tab('Properties')

    const props = UIBase.createElement(
      PropsEditor.define().tagname,
    ) as PropsEditor<CTX['_settings']['sourceTemplate'], CTX>
    props.setAttribute('datapath', '_settings')
    tab.add(props)

    tab = tabs.tab('Tool')
    const toolmode = this.toolmode
    if (toolmode?.buildSideBar) {
      toolmode.buildSideBar(tab)
    }

    // restore stored transient ui state
    if (uidata !== undefined) {
      loadUIData(this, uidata)
    }
    return { sidebar, tabs }
  }

  makeHeader(
    container: Container<CTX>,
    add_note_area?: boolean,
    make_draggable?: boolean,
  ): Container<CTX> {
    const header = super.makeHeader(container, add_note_area, make_draggable)
    const strip = header.strip()
    strip.useIcons()
    strip.prop('canvas.toolmode')
    return header
  }

  setCSS() {
    super.setCSS()
  }

  update(): void {
    super.update()
    if (this.ctx === undefined) {
      return
    }

    if (this.needsSidebarRebuild) {
      this.rebuildSideBar()
    }

    this.push_ctx_active()
    this.toolmode?.onUpdate()
    this.pop_ctx_active()
  }

  static define() {
    return {
      tagname: 'canvas-editor-x',
      areaname: 'canvasEditor',
      uiname: 'Canvas',
      icon: -1,
    }
  }

  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    st.enum(
      'toolmode_i',
      'toolmode',
      ToolMode.createToolModeEnum(),
      'Tool Mode',
    )
    return st
  }
}
Editor.register(CanvasEditor)
