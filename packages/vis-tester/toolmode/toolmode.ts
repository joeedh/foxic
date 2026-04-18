import {
  Container,
  DataAPI,
  EnumDef,
  KeyMap,
  IconMap,
  DescriptionMap,
  UINameMap,
  EnumProperty,
  nstructjs,
  Vector2Like,
} from 'path.ux'
import type { AppContext } from '../core/context'
import { StructReader } from 'path.ux/scripts/util/nstructjs'
import { Icons } from '../assets/icon_enum'
import { registerDataClass } from '../core/register'
export const ToolModeClasses = [] as any[]

export interface IToolModeConstructor<T extends ToolMode<any> = ToolMode> {
  new (): T
  readonly toolModeDef: Readonly<IToolModeDef>
}

export interface IToolModeDef {
  typeName: string
  uiName: string
  description: string
  icon: number
}

export abstract class ToolMode<CTX extends AppContext = AppContext> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `ToolMode {
    selectMask : int;
  }`,
  )
  static readonly toolModeDef: Readonly<IToolModeDef>

  keymaps?: KeyMap<CTX>[] 
  selectMask = 0
  ctx?: CTX

  get toolModeDef() {
    return (this as any).constructor.toolModeDef as IToolModeDef
  }

  static getClass(typeName: string) {
    return ToolModeClasses.find((cls) => cls.toolModeDef.typeName === typeName)
  }

  static register(cls: any) {
    if (!nstructjs.isRegistered(cls)) {
      throw new Error(cls.name + ' is not registered with nstructjs')
    }
    ToolModeClasses.push(cls)
    registerDataClass(cls)
  }
  static unregister(cls: any) {
    const i = ToolModeClasses.indexOf(cls)
    if (i === -1) {
      console.warn(
        `Tried to unregister ToolMode class that was not registered: ${cls.name}`,
      )
    }
    ToolModeClasses.splice(i, 1)
  }
  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    return st
  }
  static createToolModeEnum() {
    let i = 0
    let enumDef = {} as EnumDef
    let iconDef = {} as IconMap
    let uiNameDef = {} as UINameMap
    let descDef = {} as DescriptionMap
    for (const cls of ToolModeClasses) {
      const def = cls.toolModeDef
      enumDef[def.typeName] = i
      iconDef[def.typeName] = def.icon
      uiNameDef[def.typeName] = def.uiName
      descDef[def.typeName] = def.description
      i++
    }

    return new EnumProperty(undefined, enumDef)
      .addIcons(iconDef)
      .addUINames(uiNameDef)
      .addDescriptions(descDef)
  }

  findElement(selectMask: number, localMouse2d: Vector2Like, limit?: number): any {
    return undefined
  }

  buildSideBar(toolTab: Container<CTX>, propsTab: Container<CTX>) {
    //
  }
  buildHeader(container: Container<CTX>) {
    //
  }
  getKeyMaps(): KeyMap<CTX>[] {
    return []
  }

  onActive() {
    //
  }
  onInactive() {
    //
  }

  onUpdate() {
    //
  }

  onPointerDown(e: PointerEvent) {}
  onPointerMove(e: PointerEvent) {}
  onPointerUp(e: PointerEvent) {}
  onKeyDown(e: KeyboardEvent) {}
  onKeyUp(e: KeyboardEvent) {}

  loadStruct(reader: StructReader<this>) {
    reader(this)
  }

  draw(ctx: CTX, canvas: HTMLCanvasElement, g: CanvasRenderingContext2D) {
    this.ctx = ctx
  }
}
