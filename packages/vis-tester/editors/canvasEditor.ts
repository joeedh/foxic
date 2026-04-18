import {
  Container,
  DataAPI,
  HotKey,
  KeyMap,
  loadUIData,
  nstructjs,
  saveUIData,
  TabContainer,
  TabItemContainer,
  UIBase,
  util,
  Vector2,
  Vector2Like,
} from 'path.ux'
import { Editor, EditorSideBar } from '.'
import type { AppContext } from '../core/context'
import { IToolModeConstructor, ToolMode, ToolModeClasses } from '../toolmode/toolmode'
import { PropsEditor } from '../core/props'
import { redrawEmitter, redrawAll } from './redraw'
import { MeshToolMode } from '../toolmode/toolmode_mesh'

const getlocaltemps = util.cachering.fromConstructor(Vector2, 512)
const getglobaltemps = util.cachering.fromConstructor(Vector2, 512)

class ToolModeUIState {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    ToolModeUIState {
      toolModeType : string;
      toolTabState : string;
    }
    `,
  )
  toolModeType: string
  toolTabState: string

  constructor(toolModeType?: string, toolTabState?: string) {
    this.toolModeType = toolModeType ?? ''
    this.toolTabState = toolTabState ?? ''
  }
}

export class CanvasEditor<CTX extends AppContext = AppContext> extends Editor<CTX> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    CanvasEditor {
      _toolmode_i       :   int | this.toolmodes.indexOf(this.toolmode);
      toolmodes         :   array(abstract(ToolMode));
      selectMask        :   int;
      _toolModeUIStates :   iterkeys(ToolModeUIState) | Object.fromEntries(Array.from(this._toolModeUIStates.entries()));
    }
    `,
  )

  static define() {
    return {
      tagname : 'canvas-editor-x',
      areaname: 'canvasEditor',
      uiname  : 'Canvas',
      icon    : -1,
    }
  }

  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    st.enum('toolmode_i', 'toolmode', ToolMode.createToolModeEnum(), 'Tool Mode')
    return st
  }

  selectMask: number

  lastLocalMouse = new Vector2()
  private firstLastMouse = true
  _toolModeUIStates = new Map<ToolMode<CTX>, ToolModeUIState>()

  canvas: HTMLCanvasElement
  toolmode?: ToolMode<CTX>
  toolmodes: ToolMode<CTX>[] = []
  sidebar?: {
    sidebar: EditorSideBar<CTX>
    tabs: TabContainer<CTX>
    propsTab: TabItemContainer<CTX>
    propsTabExtra: Container<CTX>
    toolTab: TabItemContainer<CTX>
  }

  private needsSidebarRebuild = false

  private redrawCB = () => this.draw()
  g: CanvasRenderingContext2D

  get toolmode_i() {
    return ToolModeClasses.indexOf(this.toolmode?.constructor)
  }
  set toolmode_i(i: number) {
    if (i === this.toolmode_i || !ToolModeClasses[i]) return
    this.switchToolMode(ToolModeClasses[i])
  }

  constructor() {
    super()
    this.selectMask = 0
    this.canvas = document.createElement('canvas')
    this.g = this.canvas.getContext('2d')!

    const checkLastMouse = (e: PointerEvent) => {
      if (this.firstLastMouse) {
        this.firstLastMouse = false
        this.lastLocalMouse.load(this.getLocalMouse(e.x, e.y))
      }
    }

    this.canvas.addEventListener('pointerdown', (e) => {
      checkLastMouse(e)
      this.toolmode?.onPointerDown(e)
      this.lastLocalMouse.load(this.getLocalMouse(e.x, e.y))
    })
    this.canvas.addEventListener('pointermove', (e) => {
      checkLastMouse(e)
      this.toolmode?.onPointerMove(e)
      this.lastLocalMouse.load(this.getLocalMouse(e.x, e.y))
    })
    this.canvas.addEventListener('pointerup', (e) => {
      checkLastMouse(e)
      this.toolmode?.onPointerUp(e)
      this.lastLocalMouse.load(this.getLocalMouse(e.x, e.y))
    })
  }

  findElement(selectMask: number, localMouse2d: Vector2Like, limit?: number) {
    return this.toolmode?.findElement(selectMask, localMouse2d, limit)
  }

  redrawAll() {
    redrawAll()
  }

  private getToolMode<T extends ToolMode<CTX>>(cls: IToolModeConstructor<T>): T {
    let toolmode = this.toolmodes.find((t) => t.constructor === undefined) as
      | T
      | undefined
    if (toolmode === undefined) {
      toolmode = new cls()
      toolmode.ctx = this.ctx
      this.toolmodes.push(toolmode)
    }
    return toolmode!
  }

  switchToolMode<T extends ToolMode<CTX>>(cls: IToolModeConstructor<T>): T {
    if (this.toolmode !== undefined && this.sidebar !== undefined) {
      this._toolModeUIStates.set(
        this.toolmode,
        new ToolModeUIState(
          this.toolmode.toolModeDef.typeName,
          saveUIData(this.sidebar.toolTab, 'toolmode toolsTab'),
        ),
      )
    }

    let toolmode = this.toolmodes.find((t) => t.constructor === undefined) as
      | T
      | undefined
    if (toolmode === undefined) {
      toolmode = new cls()
      this.toolmodes.push(toolmode)
    }

    this.needsSidebarRebuild = true
    if (this.toolmode !== undefined) {
      this.toolmode.onInactive()
    }
    this.toolmode = toolmode
    this.toolmode.ctx = this.ctx
    this.toolmode.onActive()

    redrawAll()
    return toolmode as T
  }

  init(): void {
    super.init()

    this.checkRedrawEvent()
    // forcably draw syncronously on initialization
    this.redrawCB()

    if (this.toolmode === undefined) {
      this.toolmode = this.switchToolMode(ToolModeClasses[0])
    } else {
      this.toolmode.onActive()
    }
    this.rebuildSideBar()
    this.shadow.appendChild(this.canvas)
  }

  rebuildSideBar() {
    this.needsSidebarRebuild = false

    //save transient ui state (e.g. panel collapse state, active tabs, etc
    let uidata: string | undefined
    if (this.sidebar !== undefined) {
      uidata = saveUIData(this.sidebar.sidebar, 'editor sidebar')
    } else {
      const sidebar = UIBase.createElement(
        EditorSideBar.define().tagname,
      ) as EditorSideBar<CTX>
      const tabs = sidebar.tabs('right')
      const propsTab = tabs.tab('Properties')

      // create settings editor
      const props = UIBase.createElement(PropsEditor.define().tagname) as PropsEditor<
        CTX['_settings']['sourceTemplate'],
        CTX
      >
      props.setAttribute('datapath', '_settings')
      propsTab.add(props)

      this.sidebar = {
        sidebar,
        tabs,
        propsTab,
        propsTabExtra: propsTab.col(),
        toolTab      : tabs.tab('Tool'),
      }
      this.shadow.appendChild(sidebar)
    }

    const { toolTab, propsTab } = this.sidebar!

    toolTab.clear()
    const toolmode = this.toolmode
    if (toolmode?.buildSideBar) {
      toolmode.buildSideBar(toolTab, propsTab)
    }

    // restore stored transient ui state
    if (uidata !== undefined) {
      loadUIData(this.sidebar.sidebar, uidata)
    }
    const toolUIState = this.toolmode
      ? this._toolModeUIStates.get(this.toolmode)
      : undefined
    if (toolUIState !== undefined) {
      loadUIData(toolTab, toolUIState.toolTabState)
      // delete stored state so we don't reuse it when
      // e.g. rebuilding the sidebar for some reason other then
      // switching toolmodes.
      // it will be saved again on switching to another toolmode.
      this._toolModeUIStates.delete(this.toolmode!)
    }

    this.flushUpdate()
    return this.sidebar!
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

  private checkRedrawEvent() {
    const subscribed = redrawEmitter.has('redraw', this.redrawCB)
    if (subscribed && !this.isConnected) {
      redrawEmitter.off('redraw', this.redrawCB)
    } else if (!subscribed && this.isConnected) {
      redrawEmitter.on('redraw', this.redrawCB)
    }
  }

  update(): void {
    this.checkRedrawEvent()

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

  loadSTRUCT(reader: nstructjs.StructReader<this>): void {
    super.loadSTRUCT(reader)

    const anyThis = this as any
    const i = (anyThis._toolmode_i as number | undefined) ?? -1
    delete anyThis._toolmode_i

    if (i !== -1) {
      this.toolmode = this.toolmodes[i]
    }

    // struct script stored _toolModeUIStates as an array of strings
    const savedUIState = this._toolModeUIStates as unknown as ToolModeUIState[]
    this._toolModeUIStates = new Map()

    for (const state of savedUIState) {
      const toolmode = this.toolmodes.find(
        (tool) => tool.toolModeDef.typeName === state.toolModeType,
      )
      if (toolmode !== undefined) {
        this._toolModeUIStates.set(toolmode, state)
      }
    }
  }

  checkSize() {
    const size = this.size
    if (size === undefined) return

    const dpi = devicePixelRatio
    const w = ~~(size[0] * dpi)
    const h = ~~(size[1] * dpi)
    const canvas = this.canvas

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      canvas.style.width = w / dpi + 'px'
      canvas.style.height = h / dpi + 'px'
    }
  }

  draw() {
    if (this.toolmode !== undefined) {
      this.toolmode.ctx = this.ctx
    }
    this.checkSize()

    console.log('draw!')
    const { canvas, g } = this

    g.clearRect(0, 0, canvas.width, canvas.height)
    this.toolmode?.draw(this.ctx, this.canvas, this.g)
  }

  getKeyMaps(): KeyMap<CTX>[] {
    return ([] as KeyMap<CTX>[]).concat(this.toolmode?.getKeyMaps?.() ?? [])
  }
  getGlobalMouse(x: number, y: number) {
    const pos = getglobaltemps.next()
    const r = this.canvas.getBoundingClientRect()

    pos[0] = x / devicePixelRatio + r.x
    pos[1] = y / devicePixelRatio + r.y

    return pos
  }

  getLocalMouse(x: number, y: number) {
    const pos = getlocaltemps.next()
    const r = this.canvas.getBoundingClientRect()

    pos[0] = (x - r.x) * devicePixelRatio
    pos[1] = (y - r.y) * devicePixelRatio

    return pos
  }
}
Editor.register(CanvasEditor)
