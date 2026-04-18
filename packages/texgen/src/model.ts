import { DataAPI, nstructjs, Vector3 } from "path.ux"
import { registerDataClass } from "@gametest/vis-tester-base/core/register"
import { Mesh } from "@gametest/meshlib"
import { NodeGraph } from "./shaderGraph"

export class TexGenFile {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    MyModel {
      mesh  : mesh.Mesh;
      graph : texgen.NodeGraph;
    }`,
  )

  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    st.struct("mesh", "mesh", "Mesh", api.mapStruct(Mesh))
    st.struct("graph", "graph", "Graph", api.mapStruct(NodeGraph))
  }

  mesh: Mesh
  graph: NodeGraph

  constructor() {
    this.mesh = new Mesh()
    this.graph = new NodeGraph()
    this.graph.addDefaultNodes()

    const mesh = this.mesh
    const d1 = 100
    const d2 = 300
    const vs = [
      mesh.makeVertex(new Vector3().loadXYZ(d1, d1, 0.0)),
      mesh.makeVertex(new Vector3().loadXYZ(d1, d2, 0.0)),
      mesh.makeVertex(new Vector3().loadXYZ(d2, d2, 0.0)),
      mesh.makeVertex(new Vector3().loadXYZ(d2, d1, 0.0)),
    ]
    mesh.makeFace(vs)
  }
}
registerDataClass(TexGenFile)
