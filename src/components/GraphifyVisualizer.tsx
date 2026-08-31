"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import { Search, X, Network } from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  type: 'page' | 'component' | 'action' | 'model' | 'doc';
  group: string;
  filepath: string;
  details?: string;
  // Physics properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  radius?: number;
  color?: string;
  degree?: number;
}

interface GraphLink {
  source: string;
  target: string;
  relation: string;
  confidence: 'EXTRACTED' | 'INFERRED';
}

interface GraphData {
  version: string;
  generatedAt: string;
  nodes: GraphNode[];
  links: GraphLink[];
}

const COMMUNITY_COLORS: Record<string, string> = {
  'App Router Pages': '#ff5e1f', // Cloudflare Orange Accent
  'React Components': '#06B6D4', // Cyan/Teal
  'Server Actions & Lib': '#3B82F6', // Blue
  'Prisma DB Models': '#A855F7', // Purple
  'Knowledge Base': '#EC4899', // Pink
};

const DEFAULT_COLOR = '#64748B';

export default function GraphifyVisualizer() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [isDark, setIsDark] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Theme Detection Effect
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Physics simulation state
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<{ sourceNode: GraphNode; targetNode: GraphNode; relation: string; confidence: string }[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Pan and Zoom state
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const isDraggingRef = useRef(false);
  const draggedNodeRef = useRef<GraphNode | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Fetch Graphify JSON
  useEffect(() => {
    fetch('/api/knowledge-graph')
      .then(res => res.json())
      .then((graphData: GraphData) => {
        setData(graphData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load graphify graph:', err);
        setLoading(false);
      });
  }, []);

  // Compute Communities / Groups stats
  const communities = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, { count: number; color: string }> = {};
    data.nodes.forEach(n => {
      const group = n.group || 'Other';
      const color = COMMUNITY_COLORS[group] || DEFAULT_COLOR;
      if (!counts[group]) {
        counts[group] = { count: 0, color };
      }
      counts[group].count += 1;
    });
    return Object.entries(counts)
      .map(([name, stat]) => ({ name, count: stat.count, color: stat.color }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  // Initialize Force Simulation
  useEffect(() => {
    if (!data || !canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    // Map degrees and colors
    const nodeMap = new Map<string, GraphNode>();
    const preparedNodes: GraphNode[] = data.nodes.map(n => {
      const color = COMMUNITY_COLORS[n.group] || DEFAULT_COLOR;
      const newNode: GraphNode = {
        ...n,
        x: width / 2 + (Math.random() - 0.5) * 300,
        y: height / 2 + (Math.random() - 0.5) * 300,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color,
        degree: 0,
        radius: 6,
      };
      nodeMap.set(n.id, newNode);
      return newNode;
    });

    const preparedLinks: { sourceNode: GraphNode; targetNode: GraphNode; relation: string; confidence: string }[] = [];

    data.links.forEach(l => {
      const sourceNode = nodeMap.get(l.source);
      const targetNode = nodeMap.get(l.target);
      if (sourceNode && targetNode) {
        preparedLinks.push({ sourceNode, targetNode, relation: l.relation, confidence: l.confidence });
        sourceNode.degree = (sourceNode.degree || 0) + 1;
        targetNode.degree = (targetNode.degree || 0) + 1;
      }
    });

    // Set node radius based on degree (hub nodes are larger)
    preparedNodes.forEach(n => {
      n.radius = Math.min(6 + (n.degree || 0) * 1.8, 18);
    });

    nodesRef.current = preparedNodes;
    linksRef.current = preparedLinks;

    // Physics Simulation Loop
    let alpha = 1;
    const alphaDecay = 0.015;
    const alphaMin = 0.001;

    const simulate = () => {
      if (alpha > alphaMin) {
        alpha *= (1 - alphaDecay);

        const nodes = nodesRef.current;
        const links = linksRef.current;

        // 1. Repulsion (Coulomb)
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const n1 = nodes[i];
            const n2 = nodes[j];
            let dx = n2.x! - n1.x!;
            let dy = n2.y! - n1.y!;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 250) {
              const force = (-220 * alpha) / (dist * dist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              n1.vx! += fx;
              n1.vy! += fy;
              n2.vx! -= fx;
              n2.vy! -= fy;
            }
          }
        }

        // 2. Link Attraction (Hooke)
        links.forEach(l => {
          const s = l.sourceNode;
          const t = l.targetNode;
          let dx = t.x! - s.x!;
          let dy = t.y! - s.y!;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 90;
          const force = (dist - targetDist) * 0.04 * alpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          s.vx! += fx;
          s.vy! += fy;
          t.vx! -= fx;
          t.vy! -= fy;
        });

        // 3. Center Gravity
        const cx = width / 2;
        const cy = height / 2;
        nodes.forEach(n => {
          n.vx! += (cx - n.x!) * 0.015 * alpha;
          n.vy! += (cy - n.y!) * 0.015 * alpha;

          // Update position & friction
          n.x! += n.vx!;
          n.y! += n.vy!;
          n.vx! *= 0.85;
          n.vy! *= 0.85;
        });
      }

      renderCanvas();
      animFrameRef.current = requestAnimationFrame(simulate);
    };

    const renderCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = containerRef.current?.clientWidth || 800;
      const h = containerRef.current?.clientHeight || 600;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Canvas background adapting to light/dark theme
      ctx.fillStyle = isDark ? '#0d0e12' : '#F8FAFC';
      ctx.fillRect(0, 0, w, h);

      // Apply zoom & pan transform
      const { x, y, k } = transformRef.current;
      ctx.translate(x, y);
      ctx.scale(k, k);

      // Draw Edges / Links
      linksRef.current.forEach(l => {
        const s = l.sourceNode;
        const t = l.targetNode;
        const isHovered = hoveredNode && (s.id === hoveredNode.id || t.id === hoveredNode.id);
        const isSelected = selectedNode && (s.id === selectedNode.id || t.id === selectedNode.id);

        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);

        if (isSelected || isHovered) {
          ctx.strokeStyle = '#ff5e1f'; // Active bright Cloudflare Orange
          ctx.lineWidth = 2.2 / k;
          ctx.globalAlpha = 0.9;
        } else {
          ctx.strokeStyle = isDark
            ? (l.confidence === 'EXTRACTED' ? '#272a34' : '#1e2029')
            : (l.confidence === 'EXTRACTED' ? '#CBD5E1' : '#E2E8F0');
          ctx.lineWidth = 1 / k;
          ctx.globalAlpha = isDark ? 0.45 : 0.65;
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });

      // Draw Nodes
      nodesRef.current.forEach(n => {
        const isSelected = selectedNode?.id === n.id;
        const isHovered = hoveredNode?.id === n.id;
        const isHighlighted = isSelected || isHovered;

        // Glow ring for selected/hovered node
        if (isHighlighted) {
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, n.radius! + 6 / k, 0, Math.PI * 2);
          ctx.fillStyle = isSelected
            ? 'rgba(255, 94, 31, 0.35)'
            : (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)');
          ctx.fill();
        }

        // Node circle body
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, n.radius!, 0, Math.PI * 2);
        ctx.fillStyle = n.color || DEFAULT_COLOR;
        ctx.fill();

        ctx.strokeStyle = isHighlighted
          ? (isDark ? '#FFFFFF' : '#0F172A')
          : (isDark ? '#0d0e12' : '#FFFFFF');
        ctx.lineWidth = 1.5 / k;
        ctx.stroke();

        // Node Labels (render for hub nodes or hovered/selected nodes)
        if (n.radius! > 10 || isHighlighted) {
          ctx.font = `${isHighlighted ? '600 11px' : '500 9px'} system-ui, sans-serif`;
          ctx.fillStyle = isHighlighted
            ? (isDark ? '#FFFFFF' : '#0F172A')
            : (isDark ? 'rgba(226, 232, 240, 0.75)' : '#475569');
          ctx.fillText(n.label, n.x! + n.radius! + 4, n.y! + 3);
        }
      });

      ctx.restore();
    };

    simulate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [data, hoveredNode, selectedNode, isDark]);

  // Event Handlers for Canvas Interaction (Drag, Hover, Click, Zoom)
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { x, y, k } = transformRef.current;
    return {
      x: (mx - x) / k,
      y: (my - y) / k,
      rawX: mx,
      rawY: my,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);
    const clickedNode = nodesRef.current.find(n => {
      const dx = n.x! - pos.x;
      const dy = n.y! - pos.y;
      return Math.sqrt(dx * dx + dy * dy) <= (n.radius! + 4);
    });

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      setSelectedNode(clickedNode);
    } else {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = pos.x;
      draggedNodeRef.current.y = pos.y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      return;
    }

    if (isDraggingRef.current) {
      transformRef.current.x = e.clientX - dragStartRef.current.x;
      transformRef.current.y = e.clientY - dragStartRef.current.y;
      return;
    }

    // Hover detection
    const hovered = nodesRef.current.find(n => {
      const dx = n.x! - pos.x;
      const dy = n.y! - pos.y;
      return Math.sqrt(dx * dx + dy * dy) <= (n.radius! + 4);
    });
    setHoveredNode(hovered || null);
  };

  const handleMouseUp = () => {
    draggedNodeRef.current = null;
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newK = Math.min(Math.max(transformRef.current.k * zoomFactor, 0.4), 3.0);
    transformRef.current.k = newK;
  };

  const filteredCommunities = communities.filter(c => 
    searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const incomingLinks = selectedNode && data
    ? data.links.filter(l => l.target === selectedNode.id)
    : [];

  const outgoingLinks = selectedNode && data
    ? data.links.filter(l => l.source === selectedNode.id)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white dark:bg-[#0d0e12] rounded-xl border border-[#f0f0f0] dark:border-[#272a34] text-[#ff5e1f]">
        <Network className="w-8 h-8 animate-pulse mr-3" />
        <span className="font-mono text-xs font-bold">Initializing Graphify 2D Engine...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[720px] bg-white dark:bg-[#0d0e12] divide-y lg:divide-y-0 lg:divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
      {/* 2D Canvas Area */}
      <div ref={containerRef} className="relative flex-1 h-full bg-gray-50 dark:bg-[#0d0e12] cursor-grab active:cursor-grabbing overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full block"
        />

        {/* Canvas Bottom Instructions Overlay (Cloudflare Light/Dark Badge) */}
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-[#16181d]/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] text-[11px] font-mono text-gray-700 dark:text-gray-300 flex items-center gap-2.5 shadow-sm select-none pointer-events-none">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e1f]" />
            Scroll to Zoom
          </span>
          <span className="text-gray-400 dark:text-gray-600">•</span>
          <span>Drag to Pan</span>
          <span className="text-gray-400 dark:text-gray-600">•</span>
          <span>Click Node to Inspect</span>
        </div>
      </div>

      {/* Right Sidebar Panel (Cloudflare Continuous Style) */}
      <div className="w-full lg:w-[320px] bg-white dark:bg-[#0d0e12] p-5 flex flex-col justify-between overflow-y-auto scrollbar-none shrink-0 font-mono text-xs">
        <div className="space-y-6">
          {/* Search Box */}
          <div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#ff5e1f] transition-colors font-mono"
              />
            </div>
          </div>

          {/* NODE INFO Section */}
          <div className="space-y-2 border-b border-[#f0f0f0] dark:border-[#272a34] pb-5">
            <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase font-mono block">
              NODE INFO
            </span>
            {selectedNode ? (
              <div className="bg-gray-50 dark:bg-[#16181d] p-3.5 rounded-xl border border-[#f0f0f0] dark:border-[#272a34] space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedNode.color }} />
                    <span className="font-bold text-xs text-gray-900 dark:text-white font-mono truncate">{selectedNode.label}</span>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-gray-600 dark:text-gray-300 space-y-1 font-mono">
                  <div><span className="text-gray-400">Group:</span> {selectedNode.group}</div>
                  <div><span className="text-gray-400">Type:</span> {selectedNode.type}</div>
                  <div className="truncate"><span className="text-gray-400">Path:</span> {selectedNode.filepath}</div>
                </div>

                {(outgoingLinks.length > 0 || incomingLinks.length > 0) && (
                  <div className="pt-2 border-t border-[#f0f0f0] dark:border-[#272a34] space-y-1 text-[11px] font-mono">
                    <span className="text-[#ff5e1f] font-bold block">Connections ({incomingLinks.length + outgoingLinks.length})</span>
                    {outgoingLinks.map((l, idx) => (
                      <div key={idx} className="text-gray-600 dark:text-gray-300 truncate">→ {l.relation} ({l.target})</div>
                    ))}
                    {incomingLinks.map((l, idx) => (
                      <div key={idx} className="text-emerald-600 dark:text-emerald-400 truncate">← {l.source} ({l.relation})</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic font-mono">Click a node to inspect it</p>
            )}
          </div>

          {/* COMMUNITIES Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase font-mono block">
              COMMUNITIES
            </span>
            <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1 scrollbar-none font-mono">
              {filteredCommunities.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 hover:bg-gray-50 dark:hover:bg-[#16181d] px-2.5 rounded-lg transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate text-xs font-mono">{c.name}</span>
                  </div>
                  <span className="text-gray-400 font-mono text-[11px] font-bold">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
