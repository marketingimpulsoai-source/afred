import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Language, SubAgent } from '../types';

interface Props { language: Language; subAgents: SubAgent[]; }

export const NeuralNetworkMap: React.FC<Props> = ({ language, subAgents }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const width = 800, height = 500;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const centerNode = { id: 'alfred', name: 'ALFRED', x: width / 2, y: height / 2 };
    const nodes = [
      centerNode,
      ...subAgents.map((a, i) => {
        const angle = (i / subAgents.length) * 2 * Math.PI;
        const radius = 190;
        return {
          id: a.id,
          name: language === 'es' ? a.nameES : a.nameEN,
          color: a.neonColor,
          status: a.status,
          x: width / 2 + radius * Math.cos(angle),
          y: height / 2 + radius * Math.sin(angle),
        };
      }),
    ];

    const links = subAgents.map(a => ({ source: centerNode, target: nodes.find(n => n.id === a.id)! }));

    // Líneas de conexión
    svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)
      .attr('stroke', (d: any) => d.target.color || '#22D3EE')
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', 1);

    // Nodo central Alfred
    const centerG = svg.append('g').attr('transform', `translate(${centerNode.x}, ${centerNode.y})`);
    centerG.append('circle').attr('r', 28).attr('fill', 'rgba(234,179,8,0.1)').attr('stroke', '#EAB308').attr('stroke-width', 1.5);
    centerG.append('text').attr('text-anchor', 'middle').attr('dy', 4).attr('fill', '#EAB308').attr('font-family', 'Playfair Display, serif').attr('font-size', 12).text('ALFRED');

    // Nodos de sub-agentes
    const agentNodes = svg.append('g')
      .selectAll('g')
      .data(nodes.filter(n => n.id !== 'alfred'))
      .join('g')
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);

    agentNodes.append('circle')
      .attr('r', 18)
      .attr('fill', (d: any) => `${d.color}20`)
      .attr('stroke', (d: any) => d.color)
      .attr('stroke-width', (d: any) => d.status === 'ACTIVE' ? 1.5 : 0.75)
      .attr('opacity', (d: any) => d.status === 'ACTIVE' ? 1 : 0.4);

    agentNodes.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 32)
      .attr('fill', (d: any) => d.color)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', 9)
      .text((d: any) => d.name.toUpperCase());
  }, [subAgents, language]);

  return (
    <div className="hud-card chamfer p-6" data-sector="NET-MAP">
      <h2 className="font-display text-lg text-cyan-200 mt-2 mb-4">
        {language === 'es' ? 'MAPA DE CONECTIVIDAD NEURONAL' : 'NEURAL CONNECTIVITY MAP'}
      </h2>
      <div className="w-full overflow-x-auto">
        <svg ref={svgRef} viewBox="0 0 800 500" className="w-full h-auto min-w-[600px]" />
      </div>
    </div>
  );
};
