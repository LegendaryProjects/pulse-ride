const g = require('./tools/campus_graph_nitk.json');
console.log(`Nodes: ${g.nodes.length}, Edges: ${g.edges.length}`);
console.log('\nEdge samples:');
g.edges.slice(0, 5).forEach(e => {
  console.log(`  ${g.nodes[e.from].name} → ${g.nodes[e.to].name}: ${e.distance}m, ${e.travelTime}min`);
});
