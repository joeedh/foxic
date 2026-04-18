import { Area, Container, IconButton, PackFlags, TabContainer, UIBase } from 'path.ux'
import type { AppContext } from '../core/context'
import { registerDataClass } from '../core/register'
import { Icons } from '../assets/icon_enum'

export class EditorSideBar<CTX extends AppContext> extends Container<CTX> {
  tabpanel?: TabContainer<CTX>
  _icon?: IconButton<CTX>
  _closed = false

  closedWidth = 25
  openWidth = 250

  _height = 500
  _width = this.openWidth
  private lastUpdateKey = ''

  protected get editor() {
    return this.parentWidget as unknown as Editor<CTX> | undefined
  }

  constructor() {
    super()

    this.clear()
  }

  init() {
    super.init()
    this.updatePos()
  }

  get width() {
    return this._width
  }

  set width(v) {
    this._width = v
    this.updatePos()
  }

  get height() {
    return this._height
  }

  set height(v) {
    this._height = v
  }

  set closed(v: boolean) {
    if (!!v === !!this._closed) {
      return
    }

    if (v) {
      this.collapse()
    } else {
      this.expand()
    }
  }

  static define() {
    return {
      tagname: 'editor-sidebar-x',
      style  : 'sidebar',
    }
  }

  clear() {
    super.clear()

    this._icon = this.iconbutton(
      Icons.SHIFT_RIGHT,
      'Collapse/Expand',
      () => {
        if (this._closed) {
          this.expand()
        } else {
          this.collapse()
        }
      },
      undefined,
      PackFlags.SMALL_ICON,
    )

    this.tabpanel = this.tabs('left')
    //make tabs smaller
    this.tabpanel.tabFontScale = 0.75
  }

  collapse() {
    if (this._closed) {
      return
    }

    console.log('collapse')
    this._closed = true

    this._icon!.icon = Icons.SHIFT_LEFT
    this.animateOld().goto('width', this.closedWidth, 250)
  }

  expand() {
    if (!this._closed) {
      return
    }

    console.log('expand')
    this._closed = false
    this._icon!.icon = Icons.SHIFT_RIGHT
    this.animateOld().goto('width', this.openWidth, 250)
  }

  updatePos() {
    if (!this.editor?.size) {
      return
    }
    this.setCSS()
  }

  update() {
    super.update()

    if (!this.editor?.size) {
      return
    }

    const key = `${this.editor.size[0]}x${this.editor.size[1]}:${this.openWidth}:${this.closedWidth}`
    if (key !== this.lastUpdateKey) {
      this.setCSS()
    }

    this.lastUpdateKey = key
    const h = this.editor.size[1]

    if (h !== this._height) {
      this._height = h
      this.style['height'] = '' + this._height + 'px'
      this.flushUpdate()
    }
  }

  setCSS() {
    this.style.position = 'absolute'
    this.style['height'] = '' + this._height + 'px'
    this.style['width'] = '' + this._width + 'px'
    if (this.editor?.size) {
      this.style.left = this.editor.size[0] - this._width + 'px'
      const h = this.editor.container?.getBoundingClientRect()?.height ?? 0
      this.style.top = h + 'px'
    }
    this.background = this.getDefault('background-color') as string
  }

  saveData() {
    return {
      ...super.saveData(),
      closed: this._closed,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadData(obj: any): this {
    if (!obj) {
      return this
    }

    this._closed = obj.closed
    this._width = this._closed ? this.closedWidth : this.openWidth
    this._icon!.icon = this._closed ? Icons.SHIFT_LEFT : Icons.SHIFT_RIGHT
    this.setCSS()

    return this
  }
}
UIBase.register(EditorSideBar)

export class Editor<CTX extends AppContext> extends Area<CTX> {
  declare container: Container<CTX>
  /** notifications area */
  declare noteArea: UIBase<CTX>

  static register(_cls: any, isInternal?: boolean): void {
    super.register(_cls, isInternal)
    UIBase.register(_cls as unknown as typeof UIBase)
    registerDataClass(_cls)
  }

  init(): void {
    super.init()
    this.container = UIBase.createElement(Container.define().tagname) as Container<CTX>
    this.shadow.appendChild(this.container)
    this.container.ctx = this.ctx
    this.container._init()
    this.header = this.makeHeader(this.container!, false)
    if (this.noteArea) {
      // move to end of header
      this.noteArea.remove()
      this.header.add(this.noteArea)
    }
  }

  getScreen() {
    return this.ctx.screen
  }
}
