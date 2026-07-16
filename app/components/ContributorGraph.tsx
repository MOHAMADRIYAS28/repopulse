"use client";

import { useEffect, useRef, useState } from "react";
import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide } from "d3-force";

type GraphNode = { id: string; commits: number; x?: number; y?: number };
type GraphLink = { source: string; target: string; weight: number };

const WIDTH = 600;
const HEIGHT = 360;

export default function ContributorGraph({ owner, repo }: { owner: string; repo: string }) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError("");

    fetch(`/api/collaboration/${repo}?owner=${owner}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setNodes([]);
          setLinks([]);
        } else {
          runSimulation(data.nodes, data.links);
        }
      })
      .catch(() => setError("Failed to load collaboration data"))
      .finally(() => setLoading(false));
  }, [owner, repo]);

  function runSimulation(rawNodes: GraphNode[], rawLinks: GraphLink[]) {
    const simNodes = rawNodes.map((n) => ({ ...n }));
    const simLinks = rawLinks.map((l) => ({ ...l }));

    const simulation = forceSimulation(simNodes as any)
      .force("charge", forceManyBody().strength(-180))
      .force(
        "link",
        forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance(90)
      )
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .force("collide", forceCollide(28))
      .stop();

    // Run enough ticks for the layout to settle
    for (let i = 0; i < 300; i++) simulation.tick();

    setNodes(simNodes as any);
    setLinks(simLinks as any);
  }

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        Analyzing collaboration patterns...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
        {error}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        Not enough commit history to map collaboration
      </div>
    );
  }

  const maxCommits = Math.max(...nodes.map((n) => n.commits), 1);
  const maxWeight = Math.max(...links.map((l) => l.weight), 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg width={WIDTH} height={HEIGHT} className="bg-gray-50 rounded-lg border border-gray-100">
        {links.map((link: any, i) => {
          const source = typeof link.source === "object" ? link.source : nodes.find((n) => n.id === link.source);
          const target = typeof link.target === "object" ? link.target : nodes.find((n) => n.id === link.target);
          if (!source || !target) return null;

          const isHighlighted =
            hoveredNode && (source.id === hoveredNode || target.id === hoveredNode);

          return (
            <line
              key={i}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={isHighlighted ? "#4f46e5" : "#d1d5db"}
              strokeWidth={1 + (link.weight / maxWeight) * 3}
              opacity={isHighlighted ? 0.9 : 0.5}
            />
          );
        })}

        {nodes.map((node: any) => {
          const radius = 10 + (node.commits / maxCommits) * 16;
          const isHovered = hoveredNode === node.id;

          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={isHovered ? "#4338ca" : "#6366f1"}
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={node.x}
                y={node.y + radius + 12}
                textAnchor="middle"
                fontSize={11}
                fill="#374151"
                fontWeight={isHovered ? 700 : 500}
              >
                {node.id}
              </text>
              {isHovered && (
                <text
                  x={node.x}
                  y={node.y - radius - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#4338ca"
                  fontWeight={600}
                >
                  {node.commits} commits
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-gray-400 mt-2">
        Node size = commit count · Line thickness = shared files edited · Hover to highlight
      </p>
    </div>
  );
}