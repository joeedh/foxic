import { Container, DataAPI, nstructjs, UIBase } from 'path.ux'
import { Editor, EditorSideBar } from '.'
import { AppContext } from '../core/context'
import {
  IToolModeConstructor,
  ToolMode,
  ToolModeClasses,
} from '../toolmode/toolmode'

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
  toolmode?: ToolMode
  sidebar?: EditorSideBar<CTX>

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

  switchToolMode<T extends ToolMode>(cls: IToolModeConstructor<T>): T {
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
    this.makeSideBar()
    this.shadow.appendChild(this.canvas)
  }

  makeSideBar() {
    const sidebar = UIBase.createElement(EditorSideBar.define().tagname) as EditorSideBar<CTX>
    this.sidebar = sidebar
    this.shadow.appendChild(sidebar)
    const tabs = this.sidebar.tabs('right')
    const tab = tabs.tab('Properties')
    tab.label("test")

    return {sidebar, tabs}
  }

  makeHeader(container: Container<CTX>, add_note_area?: boolean, make_draggable?: boolean): Container<CTX> {
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
    st.enum('toolmode_i', 'toolmode', ToolMode.createToolModeEnum(), 'Tool Mode')
    return st
  }
}
Editor.register(CanvasEditor)
