import {Edge, Mesh, MeshTypes, MeshVector, Element, Vertex, Face} from './mesh';

export function vertexSmooth(mesh: Mesh, verts: Iterable<Vertex> = mesh.verts, fac = 0.5, doHandles = true) {
  let co = new MeshVector();

  let edges;
  edges = new Set<Edge>();

  if (mesh.haveHandles && doHandles) {
    for (let v of verts) {
      for (let e of v.edges) {
        edges.add(e);
      }
    }

    for (let e of edges) {
      e.h1!.co.sub(e.v1.co);
      e.h2!.co.sub(e.v2.co);
    }
  }

  for (let v of verts) {
    co.zero();
    let tot = 0.0;

    for (let e of v.edges) {
      let v2 = e.otherVertex(v);

      co.add(v2.co);
      tot += 1.0;
    }

    if (tot !== 0.0) {
      co.mulScalar(1.0/tot);
      v.co.interp(co, 0.5);
    }
  }

  if (mesh.haveHandles && doHandles) {
    for (let e of edges) {
      e.h1!.co.add(e.v1.co);
      e.h2!.co.add(e.v2.co);
    }
  }
}

export function duplicate(mesh: Mesh, geom: Iterable<Element>) {
  let verts = new Set<Vertex>()
  let edges = new Set<Edge>()
  let faces = new Set<Face>()
  let map = new Map()

  for (let elem of geom) {
    switch (elem.type) {
      case MeshTypes.VERTEX:
        verts.add(elem as Vertex);
        break;
      case MeshTypes.EDGE:
        edges.add(elem as Edge);
        break;
      case MeshTypes.FACE:
        faces.add(elem as Face);
        break;
    }
  }

  for (let f of faces) {
    for (let l of f.loops) {
      edges.add(l.e);
    }
  }

  for (let e of edges) {
    verts.add(e.v1);
    verts.add(e.v2);
  }

  for (let v of verts) {
    let v2 = mesh.makeVertex(v.co);
    mesh.copyElemData(v2, v);
    map.set(v, v2)
  }

  for (let e of edges) {
    let e2 = mesh.makeEdge(map.get(e.v1), map.get(e.v2));
    mesh.copyElemData(e2, e);
    map.set(e, e2)

    if (e.h1) {
      e2.h1!.co.load(e.h1!.co);
      e2.h2!.co.load(e.h2!.co);
      mesh.copyElemData(e2.h1!, e.h1!);
      mesh.copyElemData(e2.h2!, e.h2!);
    }
  }

  for (let f of faces) {
    let vs = Array.from(f.lists[0]).map(l => map.get(l.v));

    let f2 = mesh.makeFace(vs)
    for (let i = 1; i < f.lists.length; i++) {
      let list = f.lists[i];
      let vs2 = Array.from(list).map(l => map.get(l.v));

      mesh.addLoopList(f2, vs2);
    }

    mesh.copyElemData(f2, f);
  }

  return {
    oldNewMap: map,
    geom     : Array.from(map.values())
  }
}