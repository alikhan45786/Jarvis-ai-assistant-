import React, { useEffect, useRef, useState } from "react";
import { VisemeCode } from "../types/jarvis";

interface AvatarMesh3DProps {
  mode: "face_mesh" | "arc_core";
  accent: "cyan" | "amber" | "emerald";
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  audioLevel: number; // 0..1
  currentViseme: VisemeCode;
  statusText: string;
  onToggleMode: () => void;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
  group?:
    | "cranium"
    | "brow_l"
    | "brow_r"
    | "eye_l"
    | "eye_r"
    | "nose"
    | "cheek"
    | "lip_upper"
    | "lip_lower"
    | "mouth_corner_l"
    | "mouth_corner_r"
    | "jaw";
}

// Viseme mouth blendshape parameters (jawOpen, mouthWidth, lipPucker)
const VISEME_SHAPES: Record<VisemeCode, { open: number; width: number; pucker: number }> = {
  SIL: { open: 0.02, width: 0.0, pucker: 0.0 },
  AA: { open: 0.85, width: 0.15, pucker: -0.1 },
  EE: { open: 0.35, width: 0.45, pucker: -0.25 },
  II: { open: 0.28, width: 0.5, pucker: -0.2 },
  OO: { open: 0.65, width: -0.25, pucker: 0.55 },
  UU: { open: 0.4, width: -0.35, pucker: 0.7 },
  MBP: { open: 0.0, width: 0.08, pucker: 0.1 },
  FV: { open: 0.18, width: 0.12, pucker: -0.05 },
  LTD: { open: 0.32, width: 0.1, pucker: 0.0 },
  WR: { open: 0.38, width: -0.2, pucker: 0.45 },
};

// Build symmetric 3D Humanoid Face Mesh (core/face_model.obj + core/avatar_mesh.py)
function buildFaceMeshGeometry(): { vertices: Vec3[]; triangles: [number, number, number][] } {
  const vertices: Vec3[] = [
    // 0: Crown top
    { x: 0, y: 1.38, z: 0.15, group: "cranium" },
    // 1: Forehead center
    { x: 0, y: 1.05, z: 0.72, group: "cranium" },
    // 2, 3: Forehead upper L/R
    { x: -0.52, y: 1.15, z: 0.52, group: "cranium" },
    { x: 0.52, y: 1.15, z: 0.52, group: "cranium" },
    // 4, 5: Temple L/R
    { x: -0.86, y: 0.82, z: 0.18, group: "cranium" },
    { x: 0.86, y: 0.82, z: 0.18, group: "cranium" },
    // 6: Glabella (between brows)
    { x: 0, y: 0.62, z: 0.85, group: "cranium" },
    // 7, 8: Inner Brow L/R
    { x: -0.28, y: 0.66, z: 0.82, group: "brow_l" },
    { x: 0.28, y: 0.66, z: 0.82, group: "brow_r" },
    // 9, 10: Outer Brow L/R
    { x: -0.64, y: 0.62, z: 0.62, group: "brow_l" },
    { x: 0.64, y: 0.62, z: 0.62, group: "brow_r" },
    // 11, 12: Upper Eyelid Center L/R
    { x: -0.38, y: 0.46, z: 0.76, group: "eye_l" },
    { x: 0.38, y: 0.46, z: 0.76, group: "eye_r" },
    // 13, 14: Lower Eyelid Center L/R
    { x: -0.38, y: 0.32, z: 0.75, group: "cranium" },
    { x: 0.38, y: 0.32, z: 0.75, group: "cranium" },
    // 15, 16: Inner Eye Corner L/R
    { x: -0.20, y: 0.39, z: 0.78, group: "cranium" },
    { x: 0.20, y: 0.39, z: 0.78, group: "cranium" },
    // 17, 18: Outer Eye Corner L/R
    { x: -0.58, y: 0.40, z: 0.64, group: "cranium" },
    { x: 0.58, y: 0.40, z: 0.64, group: "cranium" },
    // 19: Nose Bridge mid
    { x: 0, y: 0.28, z: 0.96, group: "nose" },
    // 20: Nose Tip
    { x: 0, y: -0.02, z: 1.08, group: "nose" },
    // 21, 22: Nostril Wing L/R
    { x: -0.22, y: -0.08, z: 0.86, group: "nose" },
    { x: 0.22, y: -0.08, z: 0.86, group: "nose" },
    // 23, 24: Cheekbone High L/R
    { x: -0.78, y: 0.14, z: 0.52, group: "cheek" },
    { x: 0.78, y: 0.14, z: 0.52, group: "cheek" },
    // 25, 26: Mid Cheek Hollow L/R
    { x: -0.62, y: -0.25, z: 0.58, group: "cheek" },
    { x: 0.62, y: -0.25, z: 0.58, group: "cheek" },
    // 27: Upper Lip Center (Philtrum peak)
    { x: 0, y: -0.26, z: 0.94, group: "lip_upper" },
    // 28, 29: Upper Lip Side L/R
    { x: -0.18, y: -0.28, z: 0.88, group: "lip_upper" },
    { x: 0.18, y: -0.28, z: 0.88, group: "lip_upper" },
    // 30, 31: Mouth Corner L/R
    { x: -0.34, y: -0.35, z: 0.76, group: "mouth_corner_l" },
    { x: 0.34, y: -0.35, z: 0.76, group: "mouth_corner_r" },
    // 32: Lower Lip Center
    { x: 0, y: -0.42, z: 0.91, group: "lip_lower" },
    // 33, 34: Lower Lip Side L/R
    { x: -0.18, y: -0.41, z: 0.85, group: "lip_lower" },
    { x: 0.18, y: -0.41, z: 0.85, group: "lip_lower" },
    // 35: Chin Center
    { x: 0, y: -0.82, z: 0.80, group: "jaw" },
    // 36, 37: Jawline Lower L/R
    { x: -0.42, y: -0.74, z: 0.58, group: "jaw" },
    { x: 0.42, y: -0.74, z: 0.58, group: "jaw" },
    // 38, 39: Jaw Angle (Gonion) L/R
    { x: -0.74, y: -0.48, z: 0.22, group: "jaw" },
    { x: 0.74, y: -0.48, z: 0.22, group: "jaw" },
    // 40, 41: Side Cranium / Ear Anchor L/R
    { x: -0.92, y: 0.22, z: -0.05, group: "cranium" },
    { x: 0.92, y: 0.22, z: -0.05, group: "cranium" },
    // 42: Neck Base Center
    { x: 0, y: -1.18, z: 0.25, group: "cranium" },
    // 43, 44: Neck Side L/R
    { x: -0.45, y: -1.15, z: 0.05, group: "cranium" },
    { x: 0.45, y: -1.15, z: 0.05, group: "cranium" },
  ];

  const triangles: [number, number, number][] = [
    // Forehead & Crown
    [0, 2, 1],
    [0, 1, 3],
    [2, 4, 9],
    [3, 10, 5],
    [1, 2, 7],
    [1, 8, 3],
    [1, 7, 6],
    [1, 6, 8],
    [2, 9, 7],
    [3, 8, 10],
    // Brows to Eye Sockets
    [6, 7, 15],
    [6, 16, 8],
    [7, 11, 15],
    [8, 16, 12],
    [7, 9, 11],
    [8, 12, 10],
    [9, 17, 11],
    [10, 12, 18],
    [4, 40, 9],
    [5, 10, 41],
    [9, 40, 23],
    [10, 24, 41],
    [9, 23, 17],
    [10, 18, 24],
    // Eyes
    [15, 11, 13],
    [11, 17, 13],
    [16, 14, 12],
    [12, 14, 18],
    // Nose Bridge & Cheeks
    [6, 15, 19],
    [6, 19, 16],
    [15, 13, 19],
    [16, 19, 14],
    [19, 13, 21],
    [19, 22, 14],
    [19, 21, 20],
    [19, 20, 22],
    [13, 17, 23],
    [14, 24, 18],
    [13, 23, 25],
    [14, 26, 24],
    [13, 25, 21],
    [14, 22, 26],
    // Nose to Upper Lip
    [20, 21, 27],
    [20, 27, 22],
    [21, 28, 27],
    [22, 27, 29],
    [21, 25, 30],
    [22, 31, 26],
    [21, 30, 28],
    [22, 29, 31],
    // Mouth & Lips
    [27, 28, 32],
    [27, 32, 29],
    [28, 30, 33],
    [29, 34, 31],
    [28, 33, 32],
    [29, 32, 34],
    [30, 36, 33],
    [31, 34, 37],
    // Lower Lip to Chin & Jaw
    [32, 33, 35],
    [32, 35, 34],
    [33, 36, 35],
    [34, 35, 37],
    [25, 38, 36],
    [26, 37, 39],
    [25, 36, 30],
    [26, 31, 37],
    [23, 40, 38],
    [24, 39, 41],
    [23, 38, 25],
    [24, 26, 39],
    // Neck & Sub-jaw
    [35, 36, 42],
    [35, 42, 37],
    [36, 43, 42],
    [37, 42, 44],
    [36, 38, 43],
    [37, 44, 39],
  ];

  return { vertices, triangles };
}

const BASE_MESH = buildFaceMeshGeometry();

export const AvatarMesh3D: React.FC<AvatarMesh3DProps> = ({
  mode,
  accent,
  isSpeaking,
  isListening,
  isThinking,
  audioLevel,
  currentViseme,
  statusText,
  onToggleMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userRotation, setUserRotation] = useState({ yaw: 0, pitch: 0 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const smoothVisemeRef = useRef({ open: 0.02, width: 0, pucker: 0 });

  const palette = {
    cyan: {
      primary: "#38bdf8",
      secondary: "#0284c7",
      glow: "rgba(56, 189, 248, 0.45)",
      faint: "rgba(56, 189, 248, 0.14)",
    },
    amber: {
      primary: "#f59e0b",
      secondary: "#d97706",
      glow: "rgba(245, 158, 11, 0.45)",
      faint: "rgba(245, 158, 11, 0.14)",
    },
    emerald: {
      primary: "#10b981",
      secondary: "#059669",
      glow: "rgba(16, 185, 129, 0.45)",
      faint: "rgba(16, 185, 129, 0.14)",
    },
  }[accent];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const W = rect.width;
      const H = rect.height;
      const cx = W / 2;
      const cy = H / 2;

      ctx.clearRect(0, 0, W, H);

      // Subtle HUD circular radar grid
      ctx.strokeStyle = palette.faint;
      ctx.lineWidth = 1;
      const outerR = Math.min(W, H) * 0.44;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.setLineDash([4, 8]);
      ctx.arc(cx, cy, outerR * 0.82, elapsed * 0.25, elapsed * 0.25 + Math.PI * 1.9);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target viseme morph interpolation
      const targetShape = VISEME_SHAPES[currentViseme] || VISEME_SHAPES.SIL;
      const dynamicOpen = isSpeaking
        ? Math.max(targetShape.open, audioLevel * 0.95)
        : isListening
        ? 0.06 + Math.sin(elapsed * 5) * 0.02
        : 0.02;

      smoothVisemeRef.current.open += (dynamicOpen - smoothVisemeRef.current.open) * 0.28;
      smoothVisemeRef.current.width += (targetShape.width - smoothVisemeRef.current.width) * 0.25;
      smoothVisemeRef.current.pucker += (targetShape.pucker - smoothVisemeRef.current.pucker) * 0.25;

      if (mode === "arc_core") {
        // Mark-LV Holographic Arc Reactor Core Mode (core/avatar.py)
        const pulse = 1 + (isSpeaking ? audioLevel * 0.28 : Math.sin(elapsed * 2.5) * 0.04);
        const coreR = Math.min(W, H) * 0.26 * pulse;

        const grad = ctx.createRadialGradient(cx, cy, coreR * 0.1, cx, cy, coreR * 1.5);
        grad.addColorStop(0, palette.primary);
        grad.addColorStop(0.45, palette.glow);
        grad.addColorStop(1, "rgba(7, 11, 18, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Concentric rotating turbine segments
        for (let ring = 0; ring < 3; ring++) {
          const r = coreR * (0.55 + ring * 0.26);
          const segments = 8 + ring * 4;
          const speed = (ring % 2 === 0 ? 1 : -1) * (0.4 + ring * 0.2) * (isThinking ? 2.6 : 1);
          ctx.strokeStyle = palette.primary;
          ctx.lineWidth = ring === 1 ? 3 : 1.5;

          for (let i = 0; i < segments; i++) {
            const a0 = (i / segments) * Math.PI * 2 + elapsed * speed;
            const a1 = a0 + (Math.PI * 1.2) / segments;
            ctx.beginPath();
            ctx.arc(cx, cy, r, a0, a1);
            ctx.stroke();
          }
        }

        // Inner triangular Mark-LV core
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const angle = (i * (Math.PI * 2)) / 3 - Math.PI / 2 + Math.sin(elapsed) * 0.08;
          const px = cx + Math.cos(angle) * (coreR * 0.38);
          const py = cy + Math.sin(angle) * (coreR * 0.38);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      } else {
        // 3D Wireframe Face Mesh Mode (core/avatar_mesh.py + core/face_model.obj + core/viseme.py)
        const scale = Math.min(W, H) * 0.29;
        const idleYaw = Math.sin(elapsed * 0.85) * 0.14 + (isSpeaking ? Math.sin(elapsed * 3.2) * 0.04 : 0);
        const idlePitch = Math.cos(elapsed * 0.65) * 0.06 + (isSpeaking ? smoothVisemeRef.current.open * 0.05 : 0);
        const yaw = userRotation.yaw + idleYaw;
        const pitch = userRotation.pitch + idlePitch;

        // Periodic natural eye blink every ~4.2 seconds
        const blinkCycle = elapsed % 4.2;
        const blinkFactor = blinkCycle > 4.02 ? Math.sin(((blinkCycle - 4.02) / 0.18) * Math.PI) : 0;

        const browLift = isSpeaking
          ? smoothVisemeRef.current.open * 0.07
          : isListening
          ? 0.045
          : isThinking
          ? -0.03
          : 0;

        const projected = BASE_MESH.vertices.map((v) => {
          let x = v.x;
          let y = v.y;
          let z = v.z;

          // Apply viseme & expression morphs
          if (v.group === "brow_l" || v.group === "brow_r") {
            y += browLift;
          } else if (v.group === "eye_l" || v.group === "eye_r") {
            y -= blinkFactor * 0.12;
          } else if (v.group === "lip_upper") {
            y += smoothVisemeRef.current.open * 0.04;
            z += smoothVisemeRef.current.pucker * 0.08;
          } else if (v.group === "lip_lower") {
            y -= smoothVisemeRef.current.open * 0.26;
            z += smoothVisemeRef.current.pucker * 0.08;
          } else if (v.group === "mouth_corner_l") {
            x -= smoothVisemeRef.current.width * 0.12;
            y -= smoothVisemeRef.current.open * 0.08;
          } else if (v.group === "mouth_corner_r") {
            x += smoothVisemeRef.current.width * 0.12;
            y -= smoothVisemeRef.current.open * 0.08;
          } else if (v.group === "jaw") {
            y -= smoothVisemeRef.current.open * 0.22;
            z -= smoothVisemeRef.current.open * 0.05;
          }

          // 3D rotation around Y (yaw) and X (pitch)
          const cosY = Math.cos(yaw);
          const sinY = Math.sin(yaw);
          const x1 = x * cosY + z * sinY;
          const z1 = -x * sinY + z * cosY;

          const cosX = Math.cos(pitch);
          const sinX = Math.sin(pitch);
          const y2 = y * cosX - z1 * sinX;
          const z2 = y * sinX + z1 * cosX;

          // Perspective projection
          const fov = 3.2;
          const persp = fov / (fov - z2 * 0.65);
          return {
            sx: cx + x1 * scale * persp,
            sy: cy - y2 * scale * persp,
            z: z2,
            group: v.group,
          };
        });

        // Sort triangles back-to-front (Painter's algorithm)
        const sortedTris = BASE_MESH.triangles
          .map((tri) => {
            const [a, b, c] = tri;
            const avgZ = (projected[a].z + projected[b].z + projected[c].z) / 3;
            return { tri, avgZ };
          })
          .sort((p, q) => p.avgZ - q.avgZ);

        // Draw wireframe triangles
        for (const { tri, avgZ } of sortedTris) {
          const p0 = projected[tri[0]];
          const p1 = projected[tri[1]];
          const p2 = projected[tri[2]];

          const isMouthRegion =
            p0.group?.startsWith("lip") ||
            p1.group?.startsWith("lip") ||
            p2.group?.startsWith("lip") ||
            p0.group?.startsWith("mouth");

          const depthAlpha = Math.max(0.15, Math.min(0.85, (avgZ + 0.5) * 0.55));
          ctx.beginPath();
          ctx.moveTo(p0.sx, p0.sy);
          ctx.lineTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.closePath();

          ctx.fillStyle = isMouthRegion && isSpeaking
            ? palette.glow
            : `rgba(14, 28, 48, ${depthAlpha * 0.35})`;
          ctx.fill();

          ctx.strokeStyle = isMouthRegion && isSpeaking ? "#ffffff" : palette.primary;
          ctx.globalAlpha = isMouthRegion ? 0.92 : depthAlpha;
          ctx.lineWidth = isMouthRegion ? 1.4 : 0.95;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Draw glowing pupils inside left & right eyes
        const leftEyeX = (projected[15].sx + projected[17].sx) / 2;
        const leftEyeY = (projected[11].sy + projected[13].sy) / 2;
        const rightEyeX = (projected[16].sx + projected[18].sx) / 2;
        const rightEyeY = (projected[12].sy + projected[14].sy) / 2;

        if (blinkFactor < 0.7) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(leftEyeX, leftEyeY, 2.8, 0, Math.PI * 2);
          ctx.arc(rightEyeX, rightEyeY, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw vertex nodes
        ctx.fillStyle = palette.primary;
        for (const pt of projected) {
          if (pt.z > -0.1) {
            ctx.beginPath();
            ctx.arc(pt.sx, pt.sy, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Bottom audio waveform bars (core/viseme.py + core/echo.py)
      const barCount = 24;
      const totalBarWidth = Math.min(W * 0.68, 220);
      const startX = cx - totalBarWidth / 2;
      const baseY = H - 22;

      for (let i = 0; i < barCount; i++) {
        const norm = Math.abs(i - barCount / 2) / (barCount / 2);
        const wave = isSpeaking
          ? (1 - norm * 0.7) * (audioLevel * 22 + Math.abs(Math.sin(elapsed * 14 + i * 0.6)) * 10)
          : isListening
          ? 3 + Math.abs(Math.sin(elapsed * 7 + i * 0.5)) * 5
          : 2;
        ctx.fillStyle = isSpeaking ? palette.primary : palette.faint;
        const bx = startX + i * (totalBarWidth / barCount);
        ctx.fillRect(bx, baseY - wave / 2, 3, Math.max(2, wave));
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mode, accent, isSpeaking, isListening, isThinking, audioLevel, currentViseme, userRotation, palette]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    setUserRotation((prev) => ({
      yaw: Math.max(-0.75, Math.min(0.75, prev.yaw + dx * 0.008)),
      pitch: Math.max(-0.45, Math.min(0.45, prev.pitch + dy * 0.008)),
    }));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="relative flex flex-col items-center justify-between w-full h-full select-none">
      {/* Top Overlay Header */}
      <div className="z-10 flex items-center justify-between w-full px-4 pt-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isSpeaking
                ? "bg-sky-400 animate-ping"
                : isListening
                ? "bg-emerald-400 animate-pulse"
                : isThinking
                ? "bg-amber-400 animate-spin"
                : "bg-sky-500"
            }`}
          />
          <span className="font-medium text-slate-200">{statusText}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-sky-400">VISEME: {currentViseme}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {userRotation.yaw !== 0 && (
            <button
              type="button"
              onClick={() => setUserRotation({ yaw: 0, pitch: 0 })}
              className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-900/80 border border-slate-800 rounded hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap"
            >
              Reset Axis
            </button>
          )}
          <button
            type="button"
            onClick={onToggleMode}
            className="px-2.5 py-1 text-xs font-medium text-sky-300 bg-sky-950/50 border border-sky-500/30 rounded hover:bg-sky-900/50 transition-colors whitespace-nowrap"
          >
            {mode === "face_mesh" ? "Switch to Arc Core" : "Switch to 3D Face Mesh"}
          </button>
        </div>
      </div>

      {/* Interactive 3D Canvas */}
      <div className="relative w-full flex-1 min-h-[270px]">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />
      </div>

      {/* Subtle Bottom Metadata Line */}
      <div className="z-10 flex items-center justify-between w-full px-4 pb-2.5 text-[11px] text-slate-400 font-mono tabular-nums">
        <span>MESH: face_model.obj (45V · 76T)</span>
        <span>DRAG TO ROTATE 3D AXIS</span>
        <span>GAIN: {Math.round(audioLevel * 100)}%</span>
      </div>
    </div>
  );
};
