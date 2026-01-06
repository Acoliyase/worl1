
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { KnowledgeEntry, KnowledgeCategory } from '../types';

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  title: string;
  category: KnowledgeCategory;
  iteration: number;
}

interface Edge {
  source: string;
  target: string;
  type: 'category' | 'sequence';
}

const CATEGORY_COLORS: Record<KnowledgeCategory, string> = {
  Infrastructure: '#38bdf8',
  Energy: '#fbbf24',
  Environment: '#34d399',
  Architecture: '#a78bfa',
  Synthesis: '#f472b6'
};

export const KnowledgeGraph: React.FC<{ entries: KnowledgeEntry[], width?: number, height?: number }> = ({ entries, width = 350, height = 250 }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    const newNodes: Node[] = entries.map((entry) => {
      const existing = nodes.find(n => n.id === entry.id);
      if (existing) return { ...existing, category: entry.category };
      return {
        id: entry.id,
        x: width / 2 + (Math.random() - 0.5) * 80,
        y: height / 2 + (Math.random() - 0.5) * 80,
        vx: 0,
        vy: 0,
        title: entry.title,
        category: entry.category,
        iteration: entry.iteration
      };
    });

    const newEdges: Edge[] = [];
    // Connect entries in sequence
    for (let i = 0; i < entries.length - 1; i++) {
      newEdges.push({ source: entries[i].id, target: entries[i + 1].id, type: 'sequence' });
    }
    // Cluster by category
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (entries[i].category === entries[j].category) {
          newEdges.push({ source: entries[i].id, target: entries[j].id, type: 'category' });
        }
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [entries]);

  const animate = () => {
    setNodes(prev => {
      const updated = prev.map(n => ({ ...n }));
      const repulsion = 1200;
      const springK = 0.04;
      const damping = 0.85;

      // 1. Repulsion
      for (let i = 0; i < updated.length; i++) {
        for (let j = i + 1; j < updated.length; j++) {
          const n1 = updated[i];
          const n2 = updated[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy || 1;
          const force = repulsion / distSq;
          const fx = (dx / Math.sqrt(distSq)) * force;
          const fy = (dy / Math.sqrt(distSq)) * force;
          n1.vx -= fx; n1.vy -= fy;
          n2.vx += fx; n2.vy += fy;
        }
      }

      // 2. Springs
      edges.forEach(edge => {
        const n1 = updated.find(n => n.id === edge.source);
        const n2 = updated.find(n => n.id === edge.target);
        if (n1 && n2) {
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = edge.type === 'category' ? 60 : 35;
          const force = (dist - targetDist) * springK;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          n1.vx += fx; n1.vy += fy;
          n2.vx -= fx; n2.vy -= fy;
        }
      });

      // 3. Central Gravity & Update
      updated.forEach(n => {
        n.vx += (width / 2 - n.x) * 0.008;
        n.vy += (height / 2 - n.y) * 0.008;
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= damping;
        n.vy *= damping;
        n.x = Math.max(15, Math.min(width - 15, n.x));
        n.y = Math.max(15, Math.min(height - 15, n.y));
      });

      return updated;
    });
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [edges]);

  return (
    <div className="relative overflow-hidden bg-black/60 rounded-3xl border border-white/5 mb-6 group" style={{ width, height }}>
      <div className="absolute top-4 left-5 z-10">
        <div className="text-[10px] font-black uppercase text-white/30 tracking-[0.3em]">Neural Topology</div>
        <div className="flex gap-2 mt-2">
          {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
            <div key={cat} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col }} title={cat} />
          ))}
        </div>
      </div>
      <svg width={width} height={height} className="opacity-80 group-hover:opacity-100 transition-opacity">
        <defs>
          <filter id="nodeGlow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {edges.map((e, idx) => {
          const n1 = nodes.find(n => n.id === e.source);
          const n2 = nodes.find(n => n.id === e.target);
          if (!n1 || !n2) return null;
          return <line key={idx} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke={e.type === 'sequence' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'} strokeWidth={e.type === 'sequence' ? 1.5 : 0.5} />;
        })}
        {nodes.map(n => (
          <g key={n.id} filter="url(#nodeGlow)">
            <circle cx={n.x} cy={n.y} r={4.5} fill={CATEGORY_COLORS[n.category]} className="transition-all duration-500" />
            <circle cx={n.x} cy={n.y} r={8} fill="transparent" stroke={CATEGORY_COLORS[n.category]} strokeWidth="0.5" strokeDasharray="2 2" className="animate-[spin_4s_linear_infinite]" />
          </g>
        ))}
      </svg>
    </div>
  );
};
