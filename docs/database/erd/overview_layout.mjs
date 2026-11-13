import ELK from 'elkjs';
import fs from 'fs';
const inp = JSON.parse(fs.readFileSync('in.json','utf8'));
const graph = {
  id: 'root',
  layoutOptions: {
    'elk.algorithm': 'layered', 'elk.direction': 'RIGHT',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.layered.spacing.nodeNodeBetweenLayers': '110',
    'elk.spacing.nodeNode': '40',
    'elk.layered.spacing.edgeNodeBetweenLayers': '30',
    'elk.spacing.edgeEdge': '14',
    'elk.layered.spacing.edgeEdgeBetweenLayers': '14',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.separateConnectedComponents': 'true',
    'elk.layered.thoroughness': '30',
  },
  children: inp.nodes.map(n => ({ id: n.id, width: inp.width, height: n.h })),
  edges: inp.edges.map(([p, c, col], i) => ({ id: 'e' + i, sources: [p], targets: [c] })),
};
const elk = new ELK();
const out = await elk.layout(graph);
fs.writeFileSync('out.json', JSON.stringify(out));
console.log('ok', out.width, out.height);
process.exit(0);
