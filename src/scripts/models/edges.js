import Edge from '@components/map-editor/edge';

export default class Edges {

  constructor(params = {}) {
    this.params = params;
    this.edges = {};
  }
  /**
   * Add edge.
   *
   * @param {object} params Parameters.
   */
  addEdge(params = {}) {
    if (this.edges[params.from] && this.edges[params.from][params.to]) {
      return; // Edge already exists.
    }

    this.edges[params.from] = this.edges[params.from] || {};
    const edge = new Edge();

    this.edges[params.from][params.to] = edge;
    this.params.map.addEdge(edge.getDOM());
  }

  /**
   * Remove edge.
   *
   * @param {object} params Parameters.
   */
  removeEdge(params = {}) {
    if (this.edges[params.from] && this.edges[params.from][params.to]) {
      this.edges[params.from][params.to].remove(); // Remove dom from map
      delete this.edges[params.from][params.to];
    }

    if (!Object.keys(this.edges[params.from]).length) {
      delete this.edges[params.from];
    }
  }

  updateEdge(params = {}) {
    const from = parseInt(params.from);
    const to = parseInt(params.to);

    // Add edge if not already present
    this.addEdge({ from: from, to: to });

    this.edges[from][to].update(params.edgeTelemetry);
  }

  update(params = {}) {
    // Add/update existing edges
    params.edges.forEach((edge) => {
      this.updateEdge(edge);
    });

    // Delete obsolete edges
    for (const from in this.edges) {
      for (const to in this.edges[from]) {
        const isRequired = params.edges.some((edge) => {
          return (
            edge.from === parseInt(from) && edge.to === parseInt(to) ||
            edge.to === parseInt(from) && edge.from === parseInt(to)
          );
        });

        if (!isRequired) {
          this.removeEdge({ from: from, to: to });
        }
      }
    }
  }
}
