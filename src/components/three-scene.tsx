"use client"

import { useRef, useMemo, useEffect, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

export type SceneState =
  | "idle"
  | "requesting"
  | "dns_challenge"
  | "dns_verified"
  | "validating"
  | "certificate_ready"
  | "unlocking"

interface BackgroundSceneProps {
  sceneState?: SceneState
}

function useReducedMotion() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setV(mq.matches)
    const h = (e: MediaQueryListEvent) => setV(e.matches)
    mq.addEventListener("change", h)
    return () => mq.removeEventListener("change", h)
  }, [])
  return v
}

/* ─── Palette ─────────────────────────────────────────────────── */
const C = {
  BG: "#07101c",
  CRIMSON: "#ff2d2d",
  CYAN: "#2ec7ff",
  EMERALD: "#00d26a",
  AMBER: "#f0b429",
  PURPLE: "#7b68ee",
  TEAL: "#2dd4a7",
  TEAL_DIM: "#1a7a6a",
  BLUE: "#3b6cb4",
  BLUE_DIM: "#2a5080",
  GOLD: "#c9a84c",
  TEXT: "#f5f7fa",
  MUTED: "#5a6a80",
}

/* ─── Node definition ─────────────────────────────────────────── */
interface NodeDef {
  name: string
  x: number
  y: number
  z: number
  type: "domain" | "dns" | "verify" | "ca" | "cert" | "relay"
}

const NODES: NodeDef[] = [
  // Primary SSL path (left → right with slight Y variation)
  { name: "domain",      x: -4.2, y: 0.3,  z: -1.8, type: "domain" },
  { name: "dns",         x: -1.8, y: -0.2, z: -2.2, type: "dns" },
  { name: "verify",      x: 0.8,  y: 0.5,  z: -2.5, type: "verify" },
  { name: "ca",          x: 3.0,  y: 0.0,  z: -2.0, type: "ca" },
  { name: "certificate", x: 5.2,  y: 0.6,  z: -1.5, type: "cert" },

  // Relay / ambient nodes
  { name: "r1",  x: -2.8, y: 1.8,  z: -3.5, type: "relay" },
  { name: "r2",  x: -0.5, y: -1.6, z: -3.0, type: "relay" },
  { name: "r3",  x: 1.8,  y: -1.4, z: -3.2, type: "relay" },
  { name: "r4",  x: 4.0,  y: 1.8,  z: -3.8, type: "relay" },
  { name: "r5",  x: -5.5, y: -0.8, z: -4.5, type: "relay" },
  { name: "r6",  x: 0,    y: 2.5,  z: -4.0, type: "relay" },
  { name: "r7",  x: 5.8,  y: -1.2, z: -4.2, type: "relay" },
  { name: "r8",  x: -3.5, y: -2.2, z: -5.0, type: "relay" },
  { name: "r9",  x: 2.5,  y: 2.8,  z: -5.0, type: "relay" },
  { name: "r10", x: -1.0, y: 0.8,  z: -5.5, type: "relay" },
  { name: "r11", x: 4.5,  y: 2.5,  z: -5.5, type: "relay" },
  { name: "r12", x: -5.0, y: 2.5,  z: -6.0, type: "relay" },
  { name: "r13", x: 6.0,  y: 0.5,  z: -6.5, type: "relay" },
  { name: "r14", x: 0,    y: -3.0, z: -6.0, type: "relay" },
  { name: "r15", x: -6.0, y: 0,    z: -7.0, type: "relay" },
  { name: "r16", x: 6.5,  y: -0.5, z: -7.0, type: "relay" },
]

// Connection pairs (by node name)
const CONNECTION_NAMES: [string, string][] = [
  // Primary path
  ["domain", "dns"], ["dns", "verify"], ["verify", "ca"], ["ca", "certificate"],
  // Path to relays
  ["domain", "r1"], ["domain", "r5"], ["dns", "r2"], ["dns", "r6"],
  ["verify", "r3"], ["verify", "r6"], ["ca", "r4"], ["ca", "r7"],
  ["certificate", "r4"], ["certificate", "r7"],
  // Relay web
  ["r1", "r5"], ["r1", "r6"], ["r2", "r3"], ["r2", "r8"],
  ["r3", "r4"], ["r3", "r9"], ["r4", "r7"], ["r4", "r11"],
  ["r5", "r8"], ["r5", "r12"], ["r6", "r9"], ["r6", "r10"],
  ["r7", "r11"], ["r7", "r13"], ["r8", "r14"], ["r9", "r11"],
  ["r10", "r14"], ["r10", "r15"], ["r12", "r15"], ["r13", "r16"],
  ["r14", "r15"], ["r14", "r16"],
]

// State-driven packet path definitions
interface PacketDef {
  path: string[]
  color: string
  speed: number
}

const PKT_IDLE: PacketDef[] = [
  { path: ["r1", "r5", "r8", "r14"], color: C.BLUE_DIM, speed: 0.12 },
  { path: ["r4", "r11", "r13", "r16"], color: C.BLUE_DIM, speed: 0.10 },
]

const PKT_REQUESTING: PacketDef[] = [
  { path: ["domain", "dns"], color: C.CYAN, speed: 0.35 },
]

const PKT_DNS: PacketDef[] = [
  { path: ["dns", "verify"], color: C.CYAN, speed: 0.30 },
]

const PKT_VERIFIED: PacketDef[] = [
  { path: ["verify", "ca"], color: C.EMERALD, speed: 0.28 },
]

const PKT_VALIDATING: PacketDef[] = [
  { path: ["ca", "certificate"], color: C.GOLD, speed: 0.32 },
  { path: ["domain", "dns"], color: C.CYAN, speed: 0.15 },
]

const PKT_READY: PacketDef[] = [
  { path: ["certificate", "ca", "verify", "dns", "domain"], color: C.EMERALD, speed: 0.5 },
]

const NODE_COLORS: Record<NodeDef["type"], string> = {
  domain: C.CRIMSON,
  dns: C.CYAN,
  verify: C.EMERALD,
  ca: C.PURPLE,
  cert: C.TEAL,
  relay: C.BLUE,
}

const NODE_SIZES: Record<NodeDef["type"], number> = {
  domain: 0.18,
  dns: 0.22,
  verify: 0.20,
  ca: 0.20,
  cert: 0.24,
  relay: 0.05,
}

const HUD_LABELS = ["DNS-01", "ACME v2", "Let's Encrypt"]

/* ═══════════════════════════════════════════════════════════════
   3D SCENE
   ═══════════════════════════════════════════════════════════════ */

function NetworkScene({
  sceneState,
  reduced,
}: {
  sceneState: SceneState
  reduced: boolean
}) {
  const { camera, size } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const nodeGroupRef = useRef<THREE.Group>(null)
  const packetGroupRef = useRef<THREE.Group>(null)
  const certGroupRef = useRef<THREE.Group>(null)
  const mouse = useRef({ x: 0, y: 0 })

  // Node lookup map
  const nodeMap = useMemo(() => {
    const m = new Map<string, NodeDef>()
    NODES.forEach((n) => m.set(n.name, n))
    return m
  }, [])

  // Resolved connection positions
  const connPositions = useMemo(() => {
    const arr = new Float32Array(CONNECTION_NAMES.length * 6)
    CONNECTION_NAMES.forEach(([a, b], i) => {
      const na = nodeMap.get(a)!
      const nb = nodeMap.get(b)!
      arr[i * 6] = na.x; arr[i * 6 + 1] = na.y; arr[i * 6 + 2] = na.z
      arr[i * 6 + 3] = nb.x; arr[i * 6 + 4] = nb.y; arr[i * 6 + 5] = nb.z
    })
    return arr
  }, [nodeMap])

  // Primary path connection indices (for highlighted lines)
  const primaryPathIndices = useMemo(() => {
    return CONNECTION_NAMES
      .map(([a, b], i) => ({ a, b, i }))
      .filter(({ a, b }) =>
        (a === "domain" && b === "dns") ||
        (a === "dns" && b === "verify") ||
        (a === "verify" && b === "ca") ||
        (a === "ca" && b === "certificate")
      )
      .map(({ i }) => i)
  }, [])

  // Mouse parallax
  useEffect(() => {
    if (reduced) return
    const h = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener("mousemove", h)
    return () => window.removeEventListener("mousemove", h)
  }, [reduced])

  // Camera
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (size.width < 640) {
      cam.position.set(0, 0, 10); cam.fov = 62
    } else if (size.width < 1024) {
      cam.position.set(0.5, 0, 8.5); cam.fov = 52
    } else {
      cam.position.set(0.8, 0, 7.5); cam.fov = 48
    }
    cam.updateProjectionMatrix()
  }, [camera, size.width])

  const isEmerald = sceneState === "dns_verified" || sceneState === "certificate_ready" || sceneState === "unlocking"
  const isActive = sceneState !== "idle"

  // Parallax + gentle float
  useFrame((_, delta) => {
    if (reduced) return
    const mx = mouse.current.x
    const my = mouse.current.y
    // Network layer — slow parallax
    if (nodeGroupRef.current) {
      nodeGroupRef.current.position.x += (mx * 0.25 - nodeGroupRef.current.position.x) * 0.012
      nodeGroupRef.current.position.y += (my * 0.12 - nodeGroupRef.current.position.y) * 0.012
    }
    // Packet layer — medium
    if (packetGroupRef.current) {
      packetGroupRef.current.position.x += (mx * 0.35 - packetGroupRef.current.position.x) * 0.015
      packetGroupRef.current.position.y += (my * 0.18 - packetGroupRef.current.position.y) * 0.015
    }
    // Certificate layer — faster parallax
    if (certGroupRef.current) {
      certGroupRef.current.position.x += (mx * 0.5 - certGroupRef.current.position.x) * 0.02
      certGroupRef.current.position.y += (my * 0.25 - certGroupRef.current.position.y) * 0.02
    }
    // Whole group gentle rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.008 * delta
    }
  })

  return (
    <>
      <color attach="background" args={[C.BG]} />
      <fog attach="fog" args={[C.BG, 5, 18]} />

      <ambientLight intensity={0.18} color="#3a6a90" />
      <directionalLight position={[5, 4, 5]} intensity={0.35} color="#4a9fd4" />
      <pointLight position={[0, 0, 2]} intensity={isEmerald ? 0.7 : 0.4} color={isEmerald ? C.EMERALD : C.CYAN} distance={12} decay={2} />
      <pointLight position={[-5, 2, -4]} intensity={0.25} color={C.BLUE} distance={14} decay={2} />
      <pointLight position={[5, -1, -3]} intensity={0.2} color={C.PURPLE} distance={12} decay={2} />

      <group ref={groupRef}>
        <GridPlane />

        <group ref={nodeGroupRef}>
          <ConnectionLines positions={connPositions} primaryIndices={primaryPathIndices} isActive={isActive} isEmerald={isEmerald} reduced={reduced} />
          <AllNodes isEmerald={isEmerald} isActive={isActive} sceneState={sceneState} reduced={reduced} />
        </group>

        <group ref={packetGroupRef}>
          <DataPackets nodeMap={nodeMap} sceneState={sceneState} reduced={reduced} />
        </group>

        <group ref={certGroupRef}>
          <FloatingCertificate sceneState={sceneState} reduced={reduced} />
        </group>

        <BgParticles isEmerald={isEmerald} reduced={reduced} />
        <HudLabels reduced={reduced} />
      </group>
    </>
  )
}

/* ─── Grid Plane ──────────────────────────────────────────────── */
function GridPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, -4]} receiveShadow={false}>
      <planeGeometry args={[30, 30, 1, 1]} />
      <meshBasicMaterial color="#0c1a2e" transparent opacity={0.18} />
    </mesh>
  )
}

/* ─── Connection Lines ────────────────────────────────────────── */
function ConnectionLines({
  positions,
  primaryIndices,
  isActive,
  isEmerald,
  reduced,
}: {
  positions: Float32Array
  primaryIndices: number[]
  isActive: boolean
  isEmerald: boolean
  reduced: boolean
}) {
  const primaryRef = useRef<THREE.LineSegments>(null)
  const ambientRef = useRef<THREE.LineSegments>(null)

  // Build primary and ambient position arrays
  const { primaryPos, ambientPos } = useMemo(() => {
    const primary: number[] = []
    const ambient: number[] = []
    const primarySet = new Set(primaryIndices)
    for (let i = 0; i < positions.length / 6; i++) {
      const slice = positions.slice(i * 6, i * 6 + 6)
      if (primarySet.has(i)) {
        primary.push(...slice)
      } else {
        ambient.push(...slice)
      }
    }
    return {
      primaryPos: new Float32Array(primary),
      ambientPos: new Float32Array(ambient),
    }
  }, [positions, primaryIndices])

  useFrame(() => {
    if (reduced) return
    if (primaryRef.current) {
      const mat = primaryRef.current.material as THREE.LineBasicMaterial
      const target = isActive ? 0.18 : 0.08
      mat.opacity += (target - mat.opacity) * 0.03
    }
    if (ambientRef.current) {
      const mat = ambientRef.current.material as THREE.LineBasicMaterial
      const target = isActive ? 0.09 : 0.04
      mat.opacity += (target - mat.opacity) * 0.03
    }
  })

  return (
    <>
      {/* Primary path */}
      <lineSegments ref={primaryRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[primaryPos, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={isEmerald ? C.EMERALD : C.CYAN}
          transparent
          opacity={0.08}
        />
      </lineSegments>
      {/* Ambient web */}
      <lineSegments ref={ambientRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ambientPos, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={C.BLUE_DIM} transparent opacity={0.04} />
      </lineSegments>
    </>
  )
}

/* ─── All Nodes ───────────────────────────────────────────────── */
function AllNodes({
  isEmerald,
  isActive,
  sceneState,
  reduced,
}: {
  isEmerald: boolean
  isActive: boolean
  sceneState: SceneState
  reduced: boolean
}) {
  return (
    <>
      {NODES.map((n) => {
        if (n.type === "relay") {
          return <RelayNode key={n.name} node={n} isEmerald={isEmerald} isActive={isActive} reduced={reduced} />
        }
        if (n.type === "domain") {
          return <DomainNode key={n.name} node={n} sceneState={sceneState} reduced={reduced} />
        }
        if (n.type === "dns") {
          return <DnsNode key={n.name} node={n} sceneState={sceneState} reduced={reduced} />
        }
        if (n.type === "verify") {
          return <VerifyNode key={n.name} node={n} sceneState={sceneState} reduced={reduced} />
        }
        if (n.type === "ca") {
          return <CaNode key={n.name} node={n} sceneState={sceneState} reduced={reduced} />
        }
        return null // cert is handled by FloatingCertificate
      })}
    </>
  )
}

/* ─── Domain Node — small sphere ──────────────────────────────── */
function DomainNode({ node, sceneState, reduced }: { node: NodeDef; sceneState: SceneState; reduced: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  const active = sceneState === "requesting"

  useFrame(() => {
    if (reduced) return
    const t = performance.now() * 0.001
    if (meshRef.current) {
      meshRef.current.position.set(
        node.x + Math.sin(t * 0.3) * 0.03,
        node.y + Math.cos(t * 0.2) * 0.03,
        node.z
      )
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = active ? 0.8 + Math.sin(t * 3) * 0.2 : 0.2
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      const target = active ? 0.12 : 0.04
      mat.opacity += (target - mat.opacity) * 0.04
    }
  })

  return (
    <group>
      <mesh ref={meshRef} position={[node.x, node.y, node.z]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial
          color={C.CRIMSON}
          emissive={C.CRIMSON}
          emissiveIntensity={0.2}
          transparent
          opacity={0.6}
          roughness={0.3}
        />
      </mesh>
      <mesh ref={glowRef} position={[node.x, node.y, node.z]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial color={C.CRIMSON} transparent opacity={0.04} />
      </mesh>
    </group>
  )
}

/* ─── DNS Node — hexagonal prism ──────────────────────────────── */
function DnsNode({ node, sceneState, reduced }: { node: NodeDef; sceneState: SceneState; reduced: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const outerRef = useRef<THREE.Mesh>(null)

  const hexGeo = useMemo(() => {
    const shape = new THREE.Shape()
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6
      const x = Math.cos(angle) * 0.22
      const y = Math.sin(angle) * 0.22
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false })
  }, [])

  const active = sceneState === "dns_challenge" || sceneState === "dns_verified"
  const verified = sceneState === "dns_verified"

  useFrame(() => {
    if (reduced) return
    const t = performance.now() * 0.001
    if (meshRef.current) {
      meshRef.current.position.set(
        node.x + Math.sin(t * 0.25) * 0.025,
        node.y + Math.cos(t * 0.18) * 0.025,
        node.z
      )
      meshRef.current.rotation.z = t * 0.08
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      const col = verified ? new THREE.Color(C.EMERALD) : new THREE.Color(C.CYAN)
      mat.emissive.lerp(col, 0.04)
      mat.emissiveIntensity = active ? 0.7 : 0.15
    }
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      const target = active ? 0.25 : 0.06
      mat.opacity += (target - mat.opacity) * 0.04
    }
    if (outerRef.current) {
      outerRef.current.rotation.z = -t * 0.05
      const mat = outerRef.current.material as THREE.MeshBasicMaterial
      const target = active ? 0.15 : 0.03
      mat.opacity += (target - mat.opacity) * 0.04
    }
  })

  const nodeColor = verified ? C.EMERALD : C.CYAN

  return (
    <group>
      <mesh ref={meshRef} position={[node.x, node.y, node.z]} rotation={[Math.PI / 2, 0, 0]} geometry={hexGeo}>
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={0.15}
          transparent
          opacity={0.55}
          roughness={0.4}
        />
      </mesh>
      <mesh ref={ringRef} position={[node.x, node.y, node.z]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.005, 6, 6]} />
        <meshBasicMaterial color={nodeColor} transparent opacity={0.06} />
      </mesh>
      <mesh ref={outerRef} position={[node.x, node.y, node.z]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.003, 6, 6]} />
        <meshBasicMaterial color={nodeColor} transparent opacity={0.03} />
      </mesh>
    </group>
  )
}

/* ─── Verify Node — shield ────────────────────────────────────── */
function VerifyNode({ node, sceneState, reduced }: { node: NodeDef; sceneState: SceneState; reduced: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  const shieldGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0.28)
    s.lineTo(0.20, 0.20)
    s.lineTo(0.20, -0.02)
    s.quadraticCurveTo(0.20, -0.22, 0, -0.30)
    s.quadraticCurveTo(-0.20, -0.22, -0.20, -0.02)
    s.lineTo(-0.20, 0.20)
    s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false })
  }, [])

  const active = sceneState === "validating" || sceneState === "dns_verified"
  const verified = sceneState === "dns_verified" || sceneState === "certificate_ready" || sceneState === "unlocking"

  useFrame(() => {
    if (reduced) return
    const t = performance.now() * 0.001
    if (meshRef.current) {
      meshRef.current.position.set(
        node.x + Math.sin(t * 0.22) * 0.02,
        node.y + Math.cos(t * 0.16) * 0.02,
        node.z
      )
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      const col = verified ? new THREE.Color(C.EMERALD) : new THREE.Color(C.CYAN)
      mat.emissive.lerp(col, 0.03)
      mat.emissiveIntensity = active ? 0.6 : 0.12
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      const target = active ? 0.10 : 0.03
      mat.opacity += (target - mat.opacity) * 0.04
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.06
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      const target = active ? 0.15 : 0.04
      mat.opacity += (target - mat.opacity) * 0.04
    }
  })

  const nodeColor = verified ? C.EMERALD : C.CYAN

  return (
    <group>
      <mesh ref={meshRef} position={[node.x, node.y, node.z]} geometry={shieldGeo}>
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={0.12}
          transparent
          opacity={0.50}
          roughness={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={glowRef} position={[node.x, node.y, node.z]}>
        <sphereGeometry args={[0.30, 10, 10]} />
        <meshBasicMaterial color={nodeColor} transparent opacity={0.03} />
      </mesh>
      <mesh ref={ringRef} position={[node.x, node.y, node.z]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.004, 8, 32]} />
        <meshBasicMaterial color={nodeColor} transparent opacity={0.04} />
      </mesh>
    </group>
  )
}

/* ─── CA Node — server cluster ────────────────────────────────── */
function CaNode({ node, sceneState, reduced }: { node: NodeDef; sceneState: SceneState; reduced: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const active = sceneState === "validating" || sceneState === "certificate_ready"

  useFrame(() => {
    if (reduced) return
    const t = performance.now() * 0.001
    if (groupRef.current) {
      groupRef.current.position.set(
        node.x + Math.sin(t * 0.2) * 0.02,
        node.y + Math.cos(t * 0.15) * 0.02,
        node.z
      )
    }
    if (lightRef.current) {
      const target = active ? 0.5 : 0.15
      lightRef.current.intensity += (target - lightRef.current.intensity) * 0.03
    }
  })

  return (
    <group ref={groupRef} position={[node.x, node.y, node.z]}>
      {/* Three stacked server blocks */}
      {[0, 0.12, 0.24].map((y, i) => (
        <mesh key={i} position={[0, y - 0.12, 0]}>
          <boxGeometry args={[0.28, 0.08, 0.18]} />
          <meshStandardMaterial
            color={C.PURPLE}
            emissive={C.PURPLE}
            emissiveIntensity={active ? 0.5 : 0.1}
            transparent
            opacity={0.50}
            roughness={0.4}
          />
        </mesh>
      ))}
      {/* Front panel indicator */}
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[0.04, 0.24, 0.01]} />
        <meshBasicMaterial color={active ? C.PURPLE : C.BLUE_DIM} transparent opacity={0.5} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0, 0.3]} intensity={0.15} color={C.PURPLE} distance={3} decay={2} />
    </group>
  )
}

/* ─── Relay Node — tiny sphere ────────────────────────────────── */
function RelayNode({ node, isEmerald, isActive, reduced }: { node: NodeDef; isEmerald: boolean; isActive: boolean; reduced: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (reduced || !meshRef.current) return
    const t = performance.now() * 0.001
    meshRef.current.position.set(
      node.x + Math.sin(t * 0.15 + node.x) * 0.02,
      node.y + Math.cos(t * 0.12 + node.y) * 0.02,
      node.z
    )
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    const target = isActive ? 0.35 : 0.15
    mat.opacity += (target - mat.opacity) * 0.02
  })

  return (
    <mesh ref={meshRef} position={[node.x, node.y, node.z]}>
      <sphereGeometry args={[0.04, 6, 6]} />
      <meshBasicMaterial
        color={isEmerald ? C.EMERALD : C.BLUE}
        transparent
        opacity={0.15}
      />
    </mesh>
  )
}

/* ─── Data Packets ────────────────────────────────────────────── */
function DataPackets({
  nodeMap,
  sceneState,
  reduced,
}: {
  nodeMap: Map<string, NodeDef>
  sceneState: SceneState
  reduced: boolean
}) {
  // Resolve packet paths based on state
  const packetDefs = useMemo(() => {
    switch (sceneState) {
      case "idle": return PKT_IDLE
      case "requesting": return PKT_REQUESTING
      case "dns_challenge": return PKT_DNS
      case "dns_verified": return PKT_VERIFIED
      case "validating": return PKT_VALIDATING
      case "certificate_ready": return PKT_READY
      case "unlocking": return PKT_READY
      default: return PKT_IDLE
    }
  }, [sceneState])

  // Resolve positions for each packet path
  const resolvedPaths = useMemo(() => {
    return packetDefs.map((pd) => {
      const pts = pd.path.map((name) => nodeMap.get(name)!)
      return { points: pts, color: pd.color, speed: pd.speed }
    })
  }, [packetDefs, nodeMap])

  return (
    <>
      {resolvedPaths.map((rp, i) => (
        <SinglePacket key={`${sceneState}-${i}`} path={rp} reduced={reduced} />
      ))}
    </>
  )
}

function SinglePacket({
  path,
  reduced,
}: {
  path: { points: NodeDef[]; color: string; speed: number }
  reduced: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Mesh>(null)
  const progress = useRef(Math.random() * 0.5)

  useFrame((_, delta) => {
    if (reduced || !meshRef.current) return
    const t = performance.now() * 0.001

    progress.current += path.speed * delta
    if (progress.current > 1) progress.current -= 1

    const totalSegs = path.points.length - 1
    if (totalSegs <= 0) return
    const globalT = progress.current * totalSegs
    const segIdx = Math.min(Math.floor(globalT), totalSegs - 1)
    const segT = globalT - segIdx

    const a = path.points[segIdx]
    const b = path.points[segIdx + 1]
    const px = a.x + (b.x - a.x) * segT
    const py = a.y + (b.y - a.y) * segT
    const pz = a.z + (b.z - a.z) * segT

    meshRef.current.position.set(px, py, pz)
    meshRef.current.visible = true

    // Pulse size
    const s = 0.04 + Math.sin(t * 6) * 0.008
    meshRef.current.scale.setScalar(s / 0.04)

    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.7 + Math.sin(t * 4) * 0.15

    // Trail
    if (trailRef.current) {
      const prevT = Math.max(0, progress.current - 0.03) * totalSegs
      const prevSeg = Math.min(Math.floor(prevT), totalSegs - 1)
      const prevSegT = prevT - prevSeg
      const pa = path.points[prevSeg]
      const pb = path.points[Math.min(prevSeg + 1, totalSegs)]
      trailRef.current.position.set(
        pa.x + (pb.x - pa.x) * prevSegT,
        pa.y + (pb.y - pa.y) * prevSegT,
        pa.z + (pb.z - pa.z) * prevSegT,
      )
    }
  })

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={path.color} transparent opacity={0.7} />
      </mesh>
      <mesh ref={trailRef}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshBasicMaterial color={path.color} transparent opacity={0.25} />
      </mesh>
    </>
  )
}

/* ─── Floating Certificate ────────────────────────────────────── */
function FloatingCertificate({
  sceneState,
  reduced,
}: {
  sceneState: SceneState
  reduced: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const shieldRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const [certTexture, setCertTexture] = useState<THREE.CanvasTexture | null>(null)

  useEffect(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 256
    canvas.height = 360
    const ctx = canvas.getContext("2d")!

    // Dark glass background
    ctx.fillStyle = "rgba(10,18,32,0.92)"
    ctx.fillRect(0, 0, 256, 360)

    // Border
    ctx.strokeStyle = "rgba(46,199,255,0.25)"
    ctx.lineWidth = 2
    ctx.strokeRect(8, 8, 240, 344)

    // Inner border
    ctx.strokeStyle = "rgba(45,212,167,0.12)"
    ctx.lineWidth = 1
    ctx.strokeRect(14, 14, 228, 332)

    // Shield emblem
    ctx.fillStyle = "rgba(45,212,167,0.20)"
    ctx.beginPath()
    ctx.moveTo(128, 50)
    ctx.lineTo(148, 60)
    ctx.lineTo(148, 80)
    ctx.quadraticCurveTo(148, 100, 128, 110)
    ctx.quadraticCurveTo(108, 100, 108, 80)
    ctx.lineTo(108, 60)
    ctx.closePath()
    ctx.fill()

    // Shield outline
    ctx.strokeStyle = "rgba(45,212,167,0.40)"
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Lock inside shield
    ctx.fillStyle = "rgba(45,212,167,0.50)"
    ctx.fillRect(120, 75, 16, 14)
    ctx.strokeStyle = "rgba(45,212,167,0.60)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(128, 75, 6, Math.PI, 0)
    ctx.stroke()

    // Title
    ctx.font = "600 13px sans-serif"
    ctx.fillStyle = "rgba(245,247,250,0.85)"
    ctx.textAlign = "center"
    ctx.fillText("SSL CERTIFICATE", 128, 140)

    // Divider
    ctx.strokeStyle = "rgba(46,199,255,0.20)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(30, 155)
    ctx.lineTo(226, 155)
    ctx.stroke()

    // Details
    ctx.font = "10px sans-serif"
    ctx.fillStyle = "rgba(138,160,185,0.65)"
    ctx.fillText("RSA 2048-bit", 128, 175)
    ctx.fillText("SHA-256 with RSA", 128, 192)
    ctx.fillText("DNS-01 Validation", 128, 209)

    // Signature lines
    ctx.strokeStyle = "rgba(100,160,200,0.12)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(30, 235)
    ctx.lineTo(226, 235)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(30, 250)
    ctx.lineTo(226, 250)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(30, 265)
    ctx.lineTo(160, 265)
    ctx.stroke()

    // Seal
    ctx.beginPath()
    ctx.arc(128, 305, 20, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(45,212,167,0.08)"
    ctx.fill()
    ctx.strokeStyle = "rgba(45,212,167,0.25)"
    ctx.lineWidth = 1
    ctx.stroke()

    // Seal text
    ctx.font = "600 7px sans-serif"
    ctx.fillStyle = "rgba(45,212,167,0.50)"
    ctx.fillText("VERIFIED", 128, 308)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    setCertTexture(tex)
  }, [])

  const isReady = sceneState === "certificate_ready" || sceneState === "unlocking"
  const isActive = sceneState === "validating"
  const isDns = sceneState === "dns_verified"

  useFrame(() => {
    if (reduced) return
    const t = performance.now() * 0.001

    // Float + rotate group
    if (groupRef.current) {
      groupRef.current.position.y = 0.3 + Math.sin(t * 0.4) * 0.12
      const rotSpeed = isReady ? 0.15 : isActive ? 0.1 : 0.04
      groupRef.current.rotation.y = 0.3 + t * rotSpeed * 0.04
    }

    // Material brightness on the mesh
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      if (isReady) {
        mat.emissiveIntensity = 0.6 + Math.sin(t * 2) * 0.15
      } else if (isActive) {
        mat.emissiveIntensity = 0.35 + Math.sin(t * 1.5) * 0.1
      } else if (isDns) {
        mat.emissiveIntensity = 0.3
      } else {
        mat.emissiveIntensity = 0.08 + Math.sin(t * 0.5) * 0.03
      }
    }

    // Inner shield glow
    if (shieldRef.current) {
      const sm = shieldRef.current.material as THREE.MeshBasicMaterial
      const target = isReady ? 0.35 : isActive ? 0.2 : 0.08
      sm.opacity += (target - sm.opacity) * 0.03
    }

    // Light
    if (lightRef.current) {
      const target = isReady ? 0.4 : isActive ? 0.2 : 0.05
      lightRef.current.intensity += (target - lightRef.current.intensity) * 0.03
    }
  })

  return (
    <group ref={groupRef} position={[3.8, 0.3, -1.2]} rotation={[0, 0.3, 0]}>
      {/* Main card */}
      {certTexture && (
      <mesh ref={meshRef}>
        <planeGeometry args={[1.0, 1.4]} />
        <meshStandardMaterial
          map={certTexture}
          transparent
          opacity={0.35}
          emissive={new THREE.Color(C.TEAL)}
          emissiveIntensity={0.08}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      )}
      {/* Cyan edge highlight */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.02, 1.42]} />
        <meshBasicMaterial color={C.CYAN} transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
      {/* Shield emblem overlay */}
      <mesh ref={shieldRef} position={[0, 0.25, 0.01]}>
        <circleGeometry args={[0.1, 6]} />
        <meshBasicMaterial color={C.EMERALD} transparent opacity={0.08} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0, 0.5]} intensity={0.05} color={C.TEAL} distance={4} decay={2} />
    </group>
  )
}

/* ─── HUD Labels ──────────────────────────────────────────────── */
function HudLabels({ reduced }: { reduced: boolean }) {
  const refs = useRef<(THREE.Sprite | null)[]>([])

  const positions = useMemo(() => [
    [-6.2, 2.5, -6.5],
    [6.5, -2.5, -7.0],
    [0, 3.5, -7.5],
  ], [])

  useEffect(() => {
    if (reduced) return
    refs.current.forEach((sprite, i) => {
      if (!sprite) return
      const canvas = document.createElement("canvas")
      canvas.width = 200
      canvas.height = 32
      const ctx = canvas.getContext("2d")!
      ctx.font = "600 11px monospace"
      ctx.fillStyle = "rgba(90,120,160,0.30)"
      ctx.fillText(HUD_LABELS[i], 4, 20)
      const tex = new THREE.CanvasTexture(canvas)
      tex.needsUpdate = true
      sprite.material.map = tex
      sprite.material.needsUpdate = true
      sprite.position.set(positions[i][0], positions[i][1], positions[i][2])
    })
  }, [reduced, positions])

  return (
    <>
      {HUD_LABELS.map((_, i) => (
        <sprite
          key={i}
          ref={(el) => { refs.current[i] = el }}
          scale={[1.5, 0.25, 1]}
          position={[positions[i][0], positions[i][1], positions[i][2]]}
        />
      ))}
    </>
  )
}

/* ─── Background Particles ────────────────────────────────────── */
function BgParticles({
  isEmerald,
  reduced,
}: {
  isEmerald: boolean
  reduced: boolean
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const count = 60
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 22,
        y: (Math.random() - 0.5) * 16,
        z: (Math.random() - 0.5) * 12 - 5,
        vx: (Math.random() - 0.5) * 0.001,
        vy: (Math.random() - 0.5) * 0.001,
        s: 0.005 + Math.random() * 0.012,
      })),
    [count],
  )

  useFrame(() => {
    if (reduced || !meshRef.current) return
    const t = performance.now() * 0.001
    data.forEach((p, i) => {
      p.x += p.vx
      p.y += p.vy
      if (p.x > 11) p.x = -11
      if (p.x < -11) p.x = 11
      if (p.y > 8) p.y = -8
      if (p.y < -8) p.y = 8
      dummy.position.set(p.x, p.y, p.z)
      const s = p.s * (1 + Math.sin(t * 0.3 + i) * 0.2)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color={isEmerald ? C.EMERALD : C.CYAN} transparent opacity={0.15} />
    </instancedMesh>
  )
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTED WRAPPER
   ═══════════════════════════════════════════════════════════════ */

export function BackgroundScene({ sceneState = "idle" }: BackgroundSceneProps) {
  const reduced = useReducedMotion()

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0.8, 0, 7.5], fov: 48, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
      >
        <NetworkScene sceneState={sceneState} reduced={reduced} />
      </Canvas>
    </div>
  )
}
