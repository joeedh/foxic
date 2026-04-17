import {
  NumberConstraints,
  nstructjs,
  PropTypes,
  util,
  simple,
  DataStruct,
  PropSubTypes,
  UIBase,
  Container,
  saveUIData,
  loadUIData,
  Vector2,
  Vector3,
  ToolProperty,
  DataAPI,
  FloatProperty,
  RowFrame,
  FloatConstrinats,
  Vec2Property,
  Vec3Property,
  Vec4Property,
  FloatConstraint,
  IntegerConstraint,
  IntegerConstraints,
} from 'path.ux'
import type { AppContext } from './context'
import { registerDataClass } from './register'
import type { StructReader } from 'path.ux/scripts/util/nstructjs'

/* maps both name -> proptype and proptype -> name */
export const PropTypeMap = {
  float : PropTypes.FLOAT,
  int   : PropTypes.INT,
  vec2  : PropTypes.VEC2,
  vec3  : PropTypes.VEC3,
  vec4  : PropTypes.VEC4,
  color3: PropTypes.VEC3,
  color4: PropTypes.VEC4,
  string: PropTypes.STRING,
  enum  : PropTypes.ENUM,
  flags : PropTypes.FLAG,
  bool  : PropTypes.BOOL,
} as any

for (let k in PropTypeMap) {
  //colors are a PropSubType .subtype field
  if (k !== 'color3' && k !== 'color4') {
    PropTypeMap[PropTypeMap[k]] = k
  }
}

let idgen = 0

interface IDefBase<T extends string, V> {
  type: T
  value: V
  uiName?: string
  description?: string
  onchange?: (this: ToolProperty<V>) => void
}

interface IBoolean extends IDefBase<'bool', boolean> {}
interface IString extends IDefBase<'string', string> {}
interface INumBase<T extends string, V = number> extends IDefBase<T, V> {
  min?: number
  max?: number
  uiMin?: number
  uiMax?: number
  /** alternative to setting min/max */
  range?: [number, number]
  /** alternative to setting uiMin/uiMax */
  uiRange?: [number, number]
  stepIsRelative?: boolean
  step?: number
  sliderDisplayExp?: number
  slideSpeed?: number
  expRate?: number
  slider?: boolean
  baseUnit?: string
  displayUnit?: string
  unit?: string
}

interface IFloatBase<T extends string, V = number> extends INumBase<T, V> {
  decimalPlaces?: number
}
interface IIntBase<T extends string, V = number> extends INumBase<T, V> {
  radix?: number
}

interface IFloat extends IFloatBase<'float'> {}
interface IInt extends IIntBase<'int'> {}
interface IVec2 extends IFloatBase<'vec2', Vector2> {}
interface IVec3 extends IFloatBase<'vec3', Vector3> {}
interface IVec4 extends IFloatBase<'vec4', Vector3> {}
interface IColor3 extends IFloatBase<'color3', Vector3> {}
interface IColor4 extends IFloatBase<'color4', Vector3> {}
interface IEnumBase<T extends string, K extends string, V> extends IDefBase<T, V> {
  checkStrip?: boolean
  iconMap: {
    [k in K]: number
  }
  descriptions: {
    [k in K]: number
  }
  def: {
    [k in K]: V
  }
}
interface IEnum<K extends string = string, V = number> extends IEnumBase<'enum', K, V> {}
interface IFlag<K extends string = string, V = number> extends IEnumBase<'flag', K, V> {}

export type IPropertyValue =
  | IBoolean
  | IString
  | IFloat
  | IInt
  | IVec2
  | IVec3
  | IVec4
  | IColor3
  | IColor4
  | IEnum
  | IFlag

/** Note: we do not support nested panels*/
export type IPanel = {
  type: 'panel'
  panel: string
  children: { [k: string]: IPropertyValue }
}

type IProperty = IPropertyValue | IPanel

export type ITemplateDef = {
  [k: string]: IProperty
}

type ExtractNumberArray<T> = T extends number[] ? number[] : T
type ExtractBasicString<T> = T extends string ? string : ExtractNumberArray<T>
type ExtractBool<T> = T extends boolean ? boolean : ExtractBasicString<T>
type ExtractBasic<T> = T extends number ? number : ExtractBool<T>

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

type FilterPanels<T extends ITemplateDef> = {
  [K in keyof T as T[K] extends IPanel ? K : never]: T[K] extends IPanel ? T[K] : never
}

type FilterProps<T extends ITemplateDef> = {
  [K in keyof T as T[K] extends IPropertyValue ? K : never]: T[K] extends IPropertyValue
    ? T[K]
    : never
}

type FlattenPanels<T extends ITemplateDef> =
  FilterPanels<T>[keyof FilterPanels<T>]['children']

type ConvertType<T extends ITemplateDef> = Prettify<
  {
    -readonly [K in keyof FilterProps<T>]: ExtractBasic<FilterProps<T>[K]['value']>
  } & Prettify<{
    -readonly [K in keyof FlattenPanels<T>]: ExtractBasic<FlattenPanels<T>[K]['value']>
  }>
>

export type { ConvertType as PropBagAccessor }

interface PropertiesBagConstructor<T extends ITemplateDef = {}> {
  new (template?: T): PropertiesBag<T, AppContext>
  defineAPI(api: DataAPI): void
  templateFromProps<T extends ITemplateDef = {}>(props: ToolProperty<any>[]): T
}
export class PropertiesBag<T extends ITemplateDef, CTX extends AppContext> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    PropertiesBag {
      _props : array(abstract(ToolProperty)) | this._save();
    }
  `,
  )

  _save() {
    return this._props
  }

  static defineAPI(api: DataAPI) {
    return api.mapStructCustom(this, this.getStruct.bind(this))
  }

  static getStruct(obj: any) {
    return obj._struct
  }

  ['constructor']: PropertiesBagConstructor = this['constructor']

  onChange?: (key: string) => void

  sourceTemplate: T

  //these two are used by props widget to detect updates
  _updateGen = 0
  _id = idgen++

  _struct: DataStruct
  _props: ToolProperty<any>[]

  boundProps: ConvertType<T>
  _propMap = new Map<string, ToolProperty<any>>()

  constructor(template?: Readonly<T>) {
    this._props = []
    this._struct = new DataStruct()
    this.sourceTemplate = {} as unknown as T
    this.boundProps = new Proxy(
      {},
      {
        get: (target, key: any) => {
          return this._propMap.get(key)?.getValue()
        },
        set: (target, key: any, value: any) => {
          this._propMap.get(key)?.setValue(value)
          return this._propMap.has(key)
        },
        has: (target, key: any) => this._propMap.has(key),
      },
    ) as unknown as ConvertType<T>

    if (template) {
      this.loadTemplate(template)
    }
  }

  _getProp(name: string) {}
  get asFullyTypedBag() {
    return this.boundProps as unknown as ConvertType<T>
  }

  _getTemplValue(item: any): any {
    let val = item.value

    if (val === undefined) {
      if (item.type === 'string') {
        val = ''
      } else if (item.type === 'vec2') {
        val = [0, 0]
      } else if (item.type === 'vec3' || item.type === 'color3') {
        val = [0, 0, 0]
      } else if (item.type === 'vec4' || item.type === 'color4') {
        val = [0, 0, 0, 1]
      } else {
        val = 0
      }
    }

    return val
  }

  #getPropDefs(templ: ITemplateDef, flat_templ: { [k: string]: IPropertyValue } = {}) {
    for (let k in templ) {
      if (typeof k !== 'string') {
        continue
      }

      let v = templ[k]

      if (typeof v === 'object' && v.type === 'panel') {
        this.#getPropDefs(v.children, flat_templ)
      } else {
        flat_templ[k] = v
      }
    }

    return flat_templ
  }

  patchTemplate(templ: any) {
    this.sourceTemplate = templ

    this._updateGen++

    let flat_templ = this.#getPropDefs(templ)

    for (let k in flat_templ) {
      let item = flat_templ[k]

      const genericThis = this as unknown as any
      if (genericThis[k] === undefined) {
        genericThis[k] = this._getTemplValue(item)
      }
    }

    let st = this._struct
    const oldPaths = st.pathmap
    const oldProps = this._props
    const oldPropMap = this._propMap

    this._props = []
    this._propMap = new Map()

    st.clear()

    // use forEach so we can capture k in closures
    Object.keys(flat_templ).forEach((k) => {
      let item = flat_templ[k]

      let uiname = item.uiName ?? ToolProperty.makeUIName(k)
      let descr = item.description ?? ''
      let def

      const path = 'boundProps.' + k

      if (item.type === 'float') {
        def = st.float(path, k, uiname, descr)
      } else if (item.type === 'int') {
        def = st.int(path, k, uiname, descr)
      } else if (item.type === 'vec2') {
        def = st.vec2(path, k, uiname, descr)
      } else if (item.type === 'vec3') {
        def = st.vec3(path, k, uiname, descr)
      } else if (item.type === 'vec4') {
        def = st.vec4(path, k, uiname, descr)
      } else if (item.type === 'color3') {
        def = st.color3(path, k, uiname, descr)
      } else if (item.type === 'color4') {
        def = st.color4(path, k, uiname, descr)
      } else if (item.type === 'string') {
        def = st.string(path, k, uiname, descr)
      } else if (item.type === 'enum') {
        def = st.enum(path, k, item.def, uiname, descr)
      } else if (item.type === 'flag') {
        def = st.flags(path, k, item.def, uiname, descr)
      } else if (item.type === 'bool') {
        def = st.bool(path, k, uiname, descr)
      }

      if (def === undefined) {
        console.warn('properties template error', k, item)
        return
      }

      const defProp = def.data as ToolProperty<unknown>
      const oldProp = oldPropMap.get(defProp.apiname!)

      if (oldProp !== undefined && oldProp.type === defProp.type) {
        defProp.setValue(oldProp.getValue())
      } else if (item.value !== undefined) {
        defProp.setValue(item.value)
      }

      if (oldProp !== undefined && oldProp.type !== defProp.type) {
        console.warn('Property type mismatch during load:', k, oldProp.type, defProp.type)
      }

      if (item.type === 'enum' || item.type === 'flag') {
        def.checkStrip(item.checkStrip ?? false)
      }

      if (!def) {
        console.error('Unknown property type ' + item.type, item)
        return
      }

      if (item.onchange) {
        def.on('change', item.onchange)
      }

      const this2 = this
      def.on('change', function (this: ToolProperty<any>) {
        if (this2.onChange !== undefined) {
          this2.onChange(k)
        }
      })

      this._props.push(defProp)
      this._propMap.set(defProp.apiname!, defProp)

      let pr = PropTypes
      let numberTypes = pr.FLOAT | pr.INT | pr.VEC2 | pr.VEC3 | pr.VEC4

      defProp.apiname = k

      if (
        item.type === 'float' ||
        item.type === 'vec2' ||
        item.type === 'vec3' ||
        item.type === 'vec4'
      ) {
        const numberCast = defProp as unknown as {
          [k in FloatConstraint as k]: any
        }
        for (let key of FloatConstrinats) {
          numberCast[key] = item[key]
        }
      } else if (item.type === 'int') {
        const numberCast = defProp as unknown as {
          [k in IntegerConstraint as k]: any
        }
        for (let key of IntegerConstraints) {
          numberCast[key] = item[key]
        }
      }

      if (defProp.type & numberTypes) {
        const numberCast = defProp as FloatProperty
        const numberItem = item as INumBase<string, number>
        numberCast.baseUnit = numberCast.displayUnit = 'none'

        if (numberItem.slider) {
          def.simpleSlider()
        }

        if (numberItem.unit !== undefined) {
          numberCast.baseUnit = numberCast.displayUnit = numberItem.unit
        }

        if (numberItem.min !== undefined) {
          numberCast.range[0] = numberItem.min
        }

        if (numberItem.max !== undefined) {
          numberCast.range[1] = numberItem.max
        }

        if (numberItem.uiMin !== undefined) {
          if (!numberCast.uiRange) {
            numberCast.uiRange = Array.from(numberCast.range) as [number, number]
          }
          numberCast.uiRange[0] = numberItem.uiMin
        }

        if (numberItem.uiMax !== undefined) {
          if (!numberCast.uiRange) {
            numberCast.uiRange = Array.from(numberCast.range) as [number, number]
          }
          numberCast.uiRange[1] = numberItem.uiMax
        }
      }
    })
  }

  loadTemplate(templ: Readonly<T>) {
    this.sourceTemplate = { ...templ }
    this.patchTemplate(this.sourceTemplate)
  }

  static templateFromProps(props: ToolProperty<any>[]) {
    let templ = {} as any

    for (let prop of props) {
      let item = {} as any
      templ[prop.apiname as string] = item

      let type = PropTypeMap[prop.type]

      if (prop.subtype === PropSubTypes.COLOR) {
        type = prop.type === PropTypes.VEC3 ? 'color3' : 'color4'
      }

      item.type = type
      item.uiName = prop.uiname
      item.value = prop.getValue()

      let pr = PropTypes
      let numberTypes = pr.FLOAT | pr.INT | pr.VEC2 | pr.VEC3 | pr.VEC4

      if (prop.type & numberTypes) {
        const numProp = prop as FloatProperty
        for (let key of NumberConstraints) {
          if ((prop as any)[key] === undefined) {
            continue
          }

          if (key === 'range') {
            ;[item.min, item.max] = numProp.range
          } else if (key === 'uiRange') {
            ;[item.uiMin, item.uiMax] = numProp.uiRange!
          } else {
            item[key] = (numProp as any)[key]
          }
        }
      }
    }

    return templ
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this)

    const oldProps = this._props
    console.log(oldProps)

    this._props = []

    let templ = this.constructor.templateFromProps<T>(oldProps)
    this.loadTemplate(templ)

    for (const prop of oldProps) {
      const boundAny = this.boundProps as any
      boundAny[prop.apiname!] = prop.getValue()
    }
  }

  testStruct() {
    let json = nstructjs.writeJSON(this)
    console.log(json)

    let obj = nstructjs.readJSON(json, this.constructor)
    console.log(obj)

    return obj
  }
}
registerDataClass(PropertiesBag)

export class PropsEditor<
  T extends ITemplateDef,
  CTX extends AppContext,
> extends RowFrame<CTX> {
  private needsRebuild = true
  private _last_update_key = ''

  constructor() {
    super()
  }

  static define() {
    return {
      tagname: 'props-bag-editor-x',
    }
  }

  init() {
    super.init()

    if (this.ctx && this.hasAttribute('datapath')) {
      this.rebuild()
    }
  }

  get columns() {
    if (this.hasAttribute('columns')) {
      return parseInt(this.getAttribute('columns')!)
    } else {
      return 1
    }
  }

  set columns(v) {
    this.setAttribute('columns', '' + v)
  }

  rebuild() {
    let uidata = saveUIData(this, 'props editor')

    let colsCount = this.columns
    let path = this.getAttribute('datapath')!
    let props = this.ctx.api.getValue(this.ctx, path) as PropertiesBag<T, CTX>

    if (!props) {
      console.warn('Bad datapath', path)
      return
    }

    this.needsRebuild = false
    this.dataPrefix = path

    this.clear()

    console.log('Columns', colsCount)
    const cols = new Array(colsCount).fill(1).map(() => this.col())
    let cur = 0

    const panels = new Map<string, Container<CTX>>()

    const recurse = (
      getContainer: () => Container<CTX>,
      templ: ITemplateDef,
      depth = 0,
    ) => {
      for (let k in templ) {
        let v = templ[k]

        if (typeof v === 'object' && 'type' in v && v.type === 'panel') {
          let panel = panels.get(v.panel)

          if (panel === undefined) {
            panel = getContainer().panel(
              ToolProperty.makeUIName(v.panel),
            ) as Container<CTX>
            panels.set(v.panel, panel)
          }
          recurse(() => panel, v.children, depth + 1)
        } else {
          getContainer().prop(k)
        }
      }
    }

    recurse(() => {
      let ci = cur++ % colsCount
      return cols[ci]
    }, props.sourceTemplate)

    /*
    for (let prop of props._props) {
      let col = cols[i%cols.length]

      col.prop(prop.apiname);
      i++;
    }*/

    loadUIData(this, uidata)
  }

  update() {
    super.update()

    if (!this.ctx) {
      return
    }

    let path = this.getAttribute('datapath')

    let props = this.ctx.api.getValue(this.ctx, path!) as PropertiesBag<T, CTX>
    if (!props) {
      console.warn('Bad datapath', path)
      return
    }

    let key = '' + props._updateGen + ':' + props._id + ':' + props._props.length

    if (key !== this._last_update_key) {
      this._last_update_key = key
      this.needsRebuild = true
    }

    if (this.needsRebuild) {
      this.rebuild()
    }
  }
}

UIBase.register(PropsEditor)
registerDataClass(PropertiesBag)
