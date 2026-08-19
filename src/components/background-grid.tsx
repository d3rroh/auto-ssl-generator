"use client"

const CIRCUIT_PATHS = [
  // ── Horizontal trunks ──────────────────────
  "M 0,180 H 320 L 340,200 H 520",
  "M 520,200 H 740 L 760,180 H 1000",
  "M 0,520 H 180 L 200,540 H 380",
  "M 380,540 H 560 L 580,520 H 800",
  "M 800,520 H 980 L 1000,540 H 1280",
  "M 200,360 H 400 L 420,380 H 640",
  "M 640,380 H 860 L 880,360 H 1080",
  "M 100,680 H 300 L 320,700 H 520",
  "M 740,100 H 940 L 960,120 H 1140",
  "M 0,80 H 140 L 160,100 H 300",

  // ── Vertical trunks ────────────────────────
  "M 240,0 V 140 L 260,160 V 340",
  "M 260,340 V 440 L 240,460 V 620",
  "M 680,0 V 100 L 700,120 V 280",
  "M 700,280 V 420 L 680,440 V 600",
  "M 1040,60 V 180 L 1020,200 V 380",
  "M 480,200 V 340 L 500,360 V 520",
  "M 140,300 V 440 L 160,460 V 620",
  "M 900,240 V 380 L 880,400 V 560",

  // ── Branches & connectors ──────────────────
  "M 320,180 L 240,140",
  "M 240,140 L 260,120",
  "M 760,180 L 700,120",
  "M 700,120 L 720,80",
  "M 180,520 L 140,440",
  "M 140,440 L 160,400",
  "M 560,540 L 500,460",
  "M 500,460 L 520,400",
  "M 400,360 L 260,340",
  "M 860,380 L 700,420",
  "M 1040,180 L 960,120",
  "M 300,700 L 240,620",
  "M 520,700 L 480,600",
  "M 480,200 L 520,200",
  "M 340,200 L 260,160",
  "M 740,100 L 700,100",
  "M 1140,120 L 1040,180",
  "M 940,100 L 900,120",
  "M 160,100 L 140,80",
  "M 880,360 L 900,340",
  "M 900,340 L 1040,380",
]

interface Node {
  cx: number
  cy: number
  r: number
  opacity: number
  color: string
}

const NODES: Node[] = [
  // ── Muted base nodes ───────────────────────
  { cx: 240, cy: 140, r: 2,   opacity: 0.12, color: "#8B93A7" },
  { cx: 320, cy: 180, r: 2.5, opacity: 0.15, color: "#8B93A7" },
  { cx: 520, cy: 200, r: 2,   opacity: 0.12, color: "#8B93A7" },
  { cx: 700, cy: 120, r: 2,   opacity: 0.12, color: "#8B93A7" },
  { cx: 260, cy: 340, r: 2.5, opacity: 0.15, color: "#8B93A7" },
  { cx: 680, cy: 440, r: 2,   opacity: 0.12, color: "#8B93A7" },
  { cx: 180, cy: 520, r: 2,   opacity: 0.15, color: "#8B93A7" },
  { cx: 560, cy: 540, r: 2.5, opacity: 0.12, color: "#8B93A7" },
  { cx: 1040, cy: 180, r: 2,  opacity: 0.12, color: "#8B93A7" },
  { cx: 400, cy: 360, r: 2,   opacity: 0.15, color: "#8B93A7" },
  { cx: 860, cy: 380, r: 2,   opacity: 0.12, color: "#8B93A7" },
  { cx: 140, cy: 440, r: 2,   opacity: 0.12, color: "#8B93A7" },
  { cx: 480, cy: 200, r: 2.5, opacity: 0.15, color: "#8B93A7" },
  { cx: 760, cy: 180, r: 2,   opacity: 0.12, color: "#8B93A7" },
  { cx: 940, cy: 100, r: 2,   opacity: 0.12, color: "#8B93A7" },
  { cx: 300, cy: 700, r: 2.5, opacity: 0.15, color: "#8B93A7" },
  { cx: 520, cy: 700, r: 2,   opacity: 0.12, color: "#8B93A7" },
  { cx: 160, cy: 100, r: 2,   opacity: 0.15, color: "#8B93A7" },
  { cx: 1140, cy: 120, r: 2,  opacity: 0.12, color: "#8B93A7" },
  { cx: 900, cy: 340, r: 2,   opacity: 0.15, color: "#8B93A7" },
  { cx: 340, cy: 200, r: 2,   opacity: 0.12, color: "#8B93A7" },
  { cx: 240, cy: 460, r: 2.5, opacity: 0.15, color: "#8B93A7" },
  { cx: 700, cy: 280, r: 2,   opacity: 0.12, color: "#8B93A7" },
  { cx: 500, cy: 460, r: 2,   opacity: 0.12, color: "#8B93A7" },
  { cx: 1020, cy: 200, r: 2,  opacity: 0.15, color: "#8B93A7" },

  // ── Teal signal nodes (~1 in 15) ───────────
  { cx: 740, cy: 100, r: 3,   opacity: 0.22, color: "#2DD4A7" },
  { cx: 800, cy: 520, r: 2.5, opacity: 0.18, color: "#2DD4A7" },

  // ── Amber signal nodes (~1 in 15) ──────────
  { cx: 640, cy: 380, r: 2.5, opacity: 0.20, color: "#F0B429" },
  { cx: 1000, cy: 540, r: 3,  opacity: 0.18, color: "#F0B429" },

  // ── Additional muted (corner density) ──────
  { cx: 60, cy: 60, r: 2,     opacity: 0.10, color: "#8B93A7" },
  { cx: 1220, cy: 60, r: 2,   opacity: 0.10, color: "#8B93A7" },
  { cx: 60, cy: 740, r: 2,    opacity: 0.10, color: "#8B93A7" },
  { cx: 1220, cy: 740, r: 2,  opacity: 0.10, color: "#8B93A7" },
]

export function BackgroundGrid() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <svg
        viewBox="0 0 1280 800"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="depth-gradient" cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor="rgba(20,27,46,0.06)" />
            <stop offset="100%" stopColor="rgba(11,17,32,0)" />
          </radialGradient>

          <style>{`
            @keyframes node-pulse {
              0%, 100% { opacity: var(--node-base); }
              50% { opacity: var(--node-peak); }
            }
            @media (prefers-reduced-motion: reduce) {
              .circuit-node { animation: none !important; }
            }
          `}</style>
        </defs>

        {/* Depth gradient */}
        <rect width="1280" height="800" fill="url(#depth-gradient)" />

        {/* Circuit paths */}
        {CIRCUIT_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke="rgba(139,147,167,0.10)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Nodes with independent pulse timing */}
        {NODES.map((node, i) => {
          const dur = 4 + (i * 1.618) % 3 // 4–7s
          const delay = (i * 0.73) % dur    // staggered offset
          return (
            <circle
              key={i}
              cx={node.cx}
              cy={node.cy}
              r={node.r}
              fill={node.color}
              className="circuit-node"
              style={{
                opacity: node.opacity,
                ["--node-base" as string]: node.opacity,
                ["--node-peak" as string]: Math.min(node.opacity * 2.5, 0.40),
                animation: `node-pulse ${dur}s ease-in-out ${delay}s infinite`,
              }}
            />
          )
        })}
      </svg>
    </div>
  )
}
