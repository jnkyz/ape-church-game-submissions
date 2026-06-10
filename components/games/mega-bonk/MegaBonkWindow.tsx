"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Game } from "@/lib/games";
import {
  BAG_DROP_DURATION_MS,
  DIFFICULTY_MIN,
  DIFFICULTY_MAX,
  PUNCH_IMPACT_OFFSET_MS,
} from "./megaBonkConfig";

interface MegaBonkWindowProps {
  game: Game;
  phase: 0 | 1 | 2;
  difficulty: number;
  score: number | null;
  won: boolean | null;
  meterValue: number;
  onDifficultyChange: (value: number) => void;
  onPunchImpact: () => void;
}

type WadeAnim = "Wade_BoxingIdle" | "Wade_Punch" | "Wade_Victory" | "Wade_Defeat";
type MachineAnim = "Machine_BagDrop" | "Machine_Punch";
type SliderHitZone = { left: number; top: number; width: number; height: number };
type SliderHitZoneDragMode = "move" | "nw" | "ne" | "sw" | "se";

interface SliderHitZoneDragState {
  mode: SliderHitZoneDragMode;
  startX: number;
  startY: number;
  startZone: SliderHitZone;
  bounds: DOMRect;
}

const FINAL_CAMERA_POSITION: [number, number, number] = [
  -3.1775011222282608, 1.2474373653804691, -1.24484895064303,
];
const FINAL_CAMERA_TARGET: [number, number, number] = [
  -0.24733064966252727, 0.9496155038106564, 0.5877986971313052,
];
const ENVIRONMENT_POSITION: [number, number, number] = [0, 0, 0];
const BLOOM_STRENGTH = 0.32;
const BLOOM_RADIUS = 0.24;
const BLOOM_THRESHOLD = 0.9;
const DOF_APERTURE = 0.0045;
const DOF_MAX_BLUR = 0.006;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const normalizeRange = (value: number, min: number, max: number) =>
  max === min ? 0 : clamp01((value - min) / (max - min));

// The authored SetLevel morph moves downward as its influence approaches 1.
// Use the full meter scale so the visual marker matches the displayed target.
const difficultyToInfluence = (d: number) =>
  1 - normalizeRange(d, 0, 100);
// The result meter is authored at the bottom and rises as Meter approaches 1.
const scoreToInfluence = (score: number) =>
  normalizeRange(score, 0, 100);
const influenceToDifficulty = (i: number) =>
  Math.min(Math.max(Math.round((1 - clamp01(i)) * 100), DIFFICULTY_MIN), DIFFICULTY_MAX);

const TARGET_FPS = 60;
const FRAME_MS = 1000 / TARGET_FPS;
const FRAME_SKIP_EPSILON_MS = 1;
const MAX_RENDER_PIXEL_RATIO = 1.5;
const PUNCH_CROSSFADE_SECONDS = 0.12;
const DEFEAT_TRIM_START_FRAME = 30;
const DEFEAT_CROSSFADE_MS = 120;
const AUTHORED_ANIMATION_FPS = 30;
const SLIDER_HIT_ZONE_STORAGE_KEY = "mega-bonk-slider-hit-zone";
const SHOW_SLIDER_HIT_ZONE_EDITOR = false;
const DEFAULT_SLIDER_HIT_ZONE: SliderHitZone = {
  left: 0.68,
  top: 0.14,
  width: 0.14,
  height: 0.72,
};

const clampSliderHitZone = (zone: SliderHitZone): SliderHitZone => {
  const minWidth = 0.04;
  const minHeight = 0.12;
  const width = Math.min(Math.max(zone.width, minWidth), 1);
  const height = Math.min(Math.max(zone.height, minHeight), 1);
  return {
    left: Math.min(Math.max(zone.left, 0), 1 - width),
    top: Math.min(Math.max(zone.top, 0), 1 - height),
    width,
    height,
  };
};

const pct = (value: number) => `${Math.round(value * 1000) / 10}%`;

const SEGMENT_MAP: Record<string, readonly number[]> = {
  "0": [0, 1, 2, 3, 4, 5],
  "1": [1, 2],
  "2": [0, 1, 6, 4, 3],
  "3": [0, 1, 6, 2, 3],
  "4": [5, 6, 1, 2],
  "5": [0, 5, 6, 2, 3],
  "6": [0, 5, 6, 4, 2, 3],
  "7": [0, 1, 2],
  "8": [0, 1, 2, 3, 4, 5, 6],
  "9": [0, 1, 2, 3, 5, 6],
  "-": [6],
};

const SEGMENT_STYLE = [
  { left: "16%", top: "0", width: "68%", height: "12%", clipPath: "polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)" },
  { right: "0", top: "7%", width: "16%", height: "41%", clipPath: "polygon(50% 0, 100% 10%, 100% 90%, 50% 100%, 0 90%, 0 10%)" },
  { right: "0", bottom: "7%", width: "16%", height: "41%", clipPath: "polygon(50% 0, 100% 10%, 100% 90%, 50% 100%, 0 90%, 0 10%)" },
  { left: "16%", bottom: "0", width: "68%", height: "12%", clipPath: "polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)" },
  { left: "0", bottom: "7%", width: "16%", height: "41%", clipPath: "polygon(50% 0, 100% 10%, 100% 90%, 50% 100%, 0 90%, 0 10%)" },
  { left: "0", top: "7%", width: "16%", height: "41%", clipPath: "polygon(50% 0, 100% 10%, 100% 90%, 50% 100%, 0 90%, 0 10%)" },
  { left: "16%", top: "44%", width: "68%", height: "12%", clipPath: "polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)" },
] as const;

const DIGITAL_COLOR = "#6affd8";

const SevenSegmentDigit: React.FC<{ digit: string }> = ({ digit }) => {
  const activeSegments = SEGMENT_MAP[digit] ?? [];
  return (
    <span className="relative inline-block h-[30px] w-[18px] sm:h-[38px] sm:w-[22px]">
      {SEGMENT_STYLE.map((style, index) => {
        const isActive = activeSegments.includes(index);
        return (
          <span
            key={index}
            className="absolute block"
            style={{
              ...style,
              backgroundColor: DIGITAL_COLOR,
              opacity: isActive ? 1 : 0.07,
              filter: isActive ? `drop-shadow(0 0 4px ${DIGITAL_COLOR})` : "none",
            }}
          />
        );
      })}
    </span>
  );
};

const SevenSegmentValue: React.FC<{ value: number | null }> = ({ value }) => {
  const characters = value === null
    ? "---"
    : String(Math.min(Math.max(Math.round(value), 0), 999)).padStart(3, "0");
  return (
    <span className="flex gap-1" aria-label={value === null ? "pending" : String(value)}>
      {characters.split("").map((digit, index) => <SevenSegmentDigit key={`${digit}-${index}`} digit={digit} />)}
    </span>
  );
};

const drawCanvasSegment = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  horizontal: boolean,
) => {
  const bevel = Math.min(width, height) * 0.5;
  ctx.beginPath();
  if (horizontal) {
    ctx.moveTo(x + bevel, y);
    ctx.lineTo(x + width - bevel, y);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(x + width - bevel, y + height);
    ctx.lineTo(x + bevel, y + height);
    ctx.lineTo(x, y + height / 2);
  } else {
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, y + bevel);
    ctx.lineTo(x + width, y + height - bevel);
    ctx.lineTo(x + width / 2, y + height);
    ctx.lineTo(x, y + height - bevel);
    ctx.lineTo(x, y + bevel);
  }
  ctx.closePath();
  ctx.fill();
};

const drawCanvasDigit = (
  ctx: CanvasRenderingContext2D,
  digit: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const activeSegments = SEGMENT_MAP[digit] ?? [];
  const thickness = width * 0.15;
  const horizontalWidth = width - thickness * 1.3;
  const verticalHeight = (height - thickness * 2.4) / 2;
  const segments = [
    [x + thickness * 0.65, y, horizontalWidth, thickness, true],
    [x + width - thickness, y + thickness * 0.6, thickness, verticalHeight, false],
    [x + width - thickness, y + height / 2 + thickness * 0.2, thickness, verticalHeight, false],
    [x + thickness * 0.65, y + height - thickness, horizontalWidth, thickness, true],
    [x, y + height / 2 + thickness * 0.2, thickness, verticalHeight, false],
    [x, y + thickness * 0.6, thickness, verticalHeight, false],
    [x + thickness * 0.65, y + height / 2 - thickness / 2, horizontalWidth, thickness, true],
  ] as const;

  segments.forEach(([segmentX, segmentY, segmentWidth, segmentHeight, horizontal], index) => {
    ctx.globalAlpha = activeSegments.includes(index) ? 1 : 0.06;
    drawCanvasSegment(ctx, segmentX, segmentY, segmentWidth, segmentHeight, horizontal);
  });
  ctx.globalAlpha = 1;
};

const MegaBonkWindow: React.FC<MegaBonkWindowProps> = ({
  phase, difficulty, won, meterValue, onDifficultyChange, onPunchImpact,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderHitZone, setSliderHitZone] = useState<SliderHitZone>(DEFAULT_SLIDER_HIT_ZONE);
  const [isEditingSliderHitZone, setIsEditingSliderHitZone] = useState(false);
  const [sceneLoadProgress, setSceneLoadProgress] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const sliderHitZoneRef = useRef<SliderHitZone>(DEFAULT_SLIDER_HIT_ZONE);
  const sliderHitZoneOverlayRef = useRef<HTMLDivElement>(null);
  const sliderHitZoneDragRef = useRef<SliderHitZoneDragState | null>(null);
  const loadingOverlayRef = useRef<HTMLDivElement>(null);

  // ── Three.js core ──────────────────────────────────────────────────────────
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);

  // ── Mixers ─────────────────────────────────────────────────────────────────
  const wadeMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const machineMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const wadeActionsRef = useRef<Partial<Record<WadeAnim, THREE.AnimationAction>>>({});
  const machineActionsRef = useRef<Partial<Record<MachineAnim, THREE.AnimationAction>>>({});
  const defeatFirstPassActionRef = useRef<THREE.AnimationAction | null>(null);
  const currentWadeActionRef = useRef<THREE.AnimationAction | null>(null);
  const currentMachineActionRef = useRef<THREE.AnimationAction | null>(null);

  // ── Prop refs ──────────────────────────────────────────────────────────────
  const wonRef = useRef<boolean | null>(null);
  const phaseRef = useRef<0 | 1 | 2>(0);
  const difficultyRef = useRef(difficulty);
  const meterValueRef = useRef(meterValue);
  const onDifficultyChangeRef = useRef(onDifficultyChange);
  const onPunchImpactRef = useRef(onPunchImpact);

  // ── Timers ─────────────────────────────────────────────────────────────────
  const punchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Meter blendshapes ─────────────────────────────────────────────────────
  const sliderMeshRef = useRef<THREE.Mesh | null>(null);
  const resultMeterMeshRef = useRef<THREE.Mesh | null>(null);
  const resultMeterActiveRef = useRef(false);
  const isDraggingSliderRef = useRef(false);
  const lastPointerYRef = useRef(0);
  const influenceRef = useRef(difficultyToInfluence(difficulty));

  // ── Meter canvas ───────────────────────────────────────────────────────────
  const meterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const meterTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // ── Keep prop refs current ─────────────────────────────────────────────────
  useEffect(() => { wonRef.current = won; }, [won]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { meterValueRef.current = meterValue; }, [meterValue]);
  useEffect(() => { onDifficultyChangeRef.current = onDifficultyChange; }, [onDifficultyChange]);
  useEffect(() => { onPunchImpactRef.current = onPunchImpact; }, [onPunchImpact]);

  useEffect(() => {
    const saved = window.localStorage.getItem(SLIDER_HIT_ZONE_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<SliderHitZone>;
      if (
        typeof parsed.left !== "number" ||
        typeof parsed.top !== "number" ||
        typeof parsed.width !== "number" ||
        typeof parsed.height !== "number"
      ) {
        return;
      }
      const next = clampSliderHitZone({
        left: parsed.left,
        top: parsed.top,
        width: parsed.width,
        height: parsed.height,
      });
      sliderHitZoneRef.current = next;
      setSliderHitZone(next);
    } catch {
      // Ignore a stale/manual localStorage edit and fall back to the default zone.
    }
  }, []);

  useEffect(() => {
    sliderHitZoneRef.current = sliderHitZone;
    window.localStorage.setItem(SLIDER_HIT_ZONE_STORAGE_KEY, JSON.stringify(sliderHitZone));
  }, [sliderHitZone]);

  // ── Canvas meter ───────────────────────────────────────────────────────────
  const drawMeter = (value: number) => {
    const canvas = meterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const bandTop = H * 0.25, bandH = H * 0.5;
    const cx = W / 2, cy = bandTop + bandH / 2;
    ctx.fillStyle = "#0a0f0a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1a4a1a";
    ctx.lineWidth = 4;
    ctx.strokeRect(4, bandTop + 4, W - 8, bandH - 8);
    const displayVal = Math.min(Math.max(Math.round(value), 0), 100);
    const color = displayVal >= 80 ? "#ff4444" : displayVal >= 60 ? "#ffaa00" : "#22dd44";
    const digits = String(displayVal).padStart(3, "0");
    const digitWidth = 96, digitHeight = 174, digitGap = 16;
    const digitsWidth = digitWidth * digits.length + digitGap * (digits.length - 1);
    const digitsLeft = cx - digitsWidth / 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    digits.split("").forEach((digit, index) => {
      drawCanvasDigit(ctx, digit, digitsLeft + index * (digitWidth + digitGap), cy - digitHeight / 2, digitWidth, digitHeight);
    });
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `36px "Courier New", monospace`;
    ctx.fillStyle = "#448844";
    ctx.fillText("POWER", cx, bandTop + bandH - 18);
    if (meterTextureRef.current) meterTextureRef.current.needsUpdate = true;
  };

  const setMorphInfluence = (mesh: THREE.Mesh | null, morphName: string, influence: number) => {
    if (!mesh?.morphTargetInfluences) return;
    const index = mesh.morphTargetDictionary?.[morphName] ?? 0;
    mesh.morphTargetInfluences[index] = clamp01(influence);
  };

  const applyTargetInfluence = (influence: number) => {
    setMorphInfluence(sliderMeshRef.current, "SetLevel", influence);
  };

  const applyResultInfluence = (score: number) => {
    setMorphInfluence(resultMeterMeshRef.current, "Meter", scoreToInfluence(score));
  };

  // ── Wade animation ─────────────────────────────────────────────────────────
  const playWade = (
    name: WadeAnim,
    loop = true,
    crossfadeMs = 250,
    warpCrossfade = true,
  ) => {
    const next = wadeActionsRef.current[name];
    if (!next) return;
    const prev = currentWadeActionRef.current;
    next.reset();
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    next.enabled = true;
    if (prev && prev !== next) {
      prev.crossFadeTo(next, crossfadeMs / 1000, warpCrossfade);
    }
    next.play();
    currentWadeActionRef.current = next;
  };

  // ── Machine animation ──────────────────────────────────────────────────────
  const playMachine = (name: MachineAnim, loop = false) => {
    const next = machineActionsRef.current[name];
    if (!next) return;
    const prev = currentMachineActionRef.current;
    next.reset();
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = true;
    next.enabled = true;
    if (prev && prev !== next) prev.crossFadeTo(next, 0.15, true);
    next.play();
    currentMachineActionRef.current = next;
  };

  const playSynchronizedPunch = () => {
    const wadePunch = wadeActionsRef.current["Wade_Punch"];
    const machinePunch = machineActionsRef.current["Machine_Punch"];

    if (!wadePunch || !machinePunch) {
      if (wadePunch) playWade("Wade_Punch", false, 0);
      if (machinePunch) playMachine("Machine_Punch", false);
      return;
    }

    const synchronizedDuration = Math.max(
      wadePunch.getClip().duration,
      machinePunch.getClip().duration,
    );

    const previousWadeAction = currentWadeActionRef.current;
    currentMachineActionRef.current?.stop();

    [wadePunch, machinePunch].forEach((action) => {
      action.stop();
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.enabled = true;
      action.setEffectiveWeight(1);
      action.setEffectiveTimeScale(action.getClip().duration / synchronizedDuration);
    });

    // Both punch clocks begin together. Wade's idle pose only affects the
    // opening blend weight, so the machine and character still finish together.
    wadePunch.play();
    machinePunch.play();
    if (previousWadeAction && previousWadeAction !== wadePunch) {
      previousWadeAction.crossFadeTo(wadePunch, PUNCH_CROSSFADE_SECONDS, false);
    }
    currentWadeActionRef.current = wadePunch;
    currentMachineActionRef.current = machinePunch;
  };

  // ── Scene setup (once) ─────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setSceneLoadProgress(0);
    setSceneReady(false);
    if (loadingOverlayRef.current) {
      loadingOverlayRef.current.style.opacity = "1";
      loadingOverlayRef.current.style.pointerEvents = "auto";
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_RENDER_PIXEL_RATIO);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14181e);
    scene.fog = new THREE.Fog(0x14181e, 12, 22);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(...FINAL_CAMERA_POSITION);
    camera.lookAt(...FINAL_CAMERA_TARGET);
    const focusTarget = new THREE.Vector3(...FINAL_CAMERA_TARGET);
    const focusDistance = camera.position.distanceTo(focusTarget);

    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(container.clientWidth, container.clientHeight);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    );
    const bokehPass = new BokehPass(
      scene,
      camera,
      {
        focus: focusDistance,
        aperture: DOF_APERTURE,
        maxblur: DOF_MAX_BLUR,
      },
    );
    const outputPass = new OutputPass();
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(bokehPass);
    composer.addPass(outputPass);

    scene.add(new THREE.HemisphereLight(0xf2f5ff, 0x444851, 1.25));
    scene.add(new THREE.AmbientLight(0xffffff, 0.42));

    const keyLight = new THREE.DirectionalLight(0xfff1df, 3.25);
    keyLight.position.set(-4.5, 6.5, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.00025;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdde8ff, 2.15);
    fillLight.position.set(4.5, 3.5, 4);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 2.6);
    backLight.position.set(1.5, 5, -4.5);
    scene.add(backLight);

    const meterCanvas = document.createElement("canvas");
    meterCanvas.width = 512; meterCanvas.height = 512;
    meterCanvasRef.current = meterCanvas;
    const meterTexture = new THREE.CanvasTexture(meterCanvas);
    meterTextureRef.current = meterTexture;
    drawMeter(50);

    let disposed = false;
    const setLoadProgress = (value: number) => {
      if (!disposed) setSceneLoadProgress(clamp01(value));
    };
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onStart = () => setLoadProgress(0.08);
    loadingManager.onProgress = (_url, loaded, total) => {
      setLoadProgress(total > 0 ? Math.min((loaded / total) * 0.92, 0.92) : 0.45);
    };
    loadingManager.onError = () => setLoadProgress(0.92);

    const loader = new GLTFLoader(loadingManager);
    loader.setMeshoptDecoder(MeshoptDecoder);

    const configureEnvironmentMaterial = (child: THREE.Mesh) => {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material, index) => {
        const materialName = (material.name || "").toLowerCase();
        if (!materialName.includes("glass")) return;
        const source = material instanceof THREE.MeshStandardMaterial ? material : null;
        const glass = new THREE.MeshPhysicalMaterial({
          color: source?.color ?? new THREE.Color(0xdcecff),
          roughness: 0.08,
          metalness: 0,
          transparent: true,
          opacity: 0.32,
          transmission: 0.35,
          thickness: 0.06,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        glass.name = material.name;
        if (Array.isArray(child.material)) (child.material as THREE.Material[])[index] = glass;
        else child.material = glass;
        child.renderOrder = Math.max(child.renderOrder, 1);
      });
    };

    const boostMachineMaterial = (material: THREE.Material): void => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      const materialName = material.name.toLowerCase();
      if (
        materialName === "meter" ||
        materialName === "light_meter" ||
        materialName === "target_meter_indicator"
      ) {
        // Keep the GLB-authored emissive factor, map, and strength untouched.
        return;
      }
      if (!material.emissiveMap) return;
      material.emissive.set(0xffffff);
      material.emissiveIntensity =
        materialName === "meter"
          ? 0.035
          : materialName === "boxingmachine_2"
            ? 0.1
            : materialName === "boxingmachine"
              ? 0.08
              : 0.07;
    };

    // ── Screen-space slider drag region ──────────────────────────────────────
    const getFallbackSliderViewportRect = () => {
      const canvasRect = renderer.domElement.getBoundingClientRect();
      const zone = sliderHitZoneRef.current;
      return {
        left: canvasRect.left + canvasRect.width * zone.left,
        right: canvasRect.left + canvasRect.width * (zone.left + zone.width),
        top: canvasRect.top + canvasRect.height * zone.top,
        bottom: canvasRect.top + canvasRect.height * (zone.top + zone.height),
      };
    };

    const isPointerInSliderViewport = (e: PointerEvent) => {
      const rect = getFallbackSliderViewportRect();
      return (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (phaseRef.current !== 0) return;
      if (!sliderMeshRef.current) return;
      if (!isPointerInSliderViewport(e)) return;
      isDraggingSliderRef.current = true;
      lastPointerYRef.current = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = "ns-resize";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDraggingSliderRef.current) {
        const deltaY = lastPointerYRef.current - e.clientY;
        lastPointerYRef.current = e.clientY;
        const newInf = Math.min(Math.max(influenceRef.current - deltaY * 0.007, 0), 1);
        influenceRef.current = newInf;
        applyTargetInfluence(newInf);
        const newDiff = influenceToDifficulty(newInf);
        if (newDiff !== difficultyRef.current) onDifficultyChangeRef.current(newDiff);
      } else {
        if (phaseRef.current !== 0) {
          renderer.domElement.style.cursor = "default";
          return;
        }
        if (!sliderMeshRef.current) {
          renderer.domElement.style.cursor = "default";
          return;
        }
        renderer.domElement.style.cursor =
          isPointerInSliderViewport(e) ? "ns-resize" : "default";
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDraggingSliderRef.current) return;
      isDraggingSliderRef.current = false;
      renderer.domElement.releasePointerCapture(e.pointerId);
      renderer.domElement.style.cursor = "default";
    };

    const onPointerLeave = () => {
      if (!isDraggingSliderRef.current) renderer.domElement.style.cursor = "default";
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const prepareEnvironment = (gltf: GLTF) => {
      const environment = gltf.scene;
      environment.name = "MegaBonkEnvironment";
      environment.position.set(...ENVIRONMENT_POSITION);
      environment.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow = false;
        child.receiveShadow = true;
        configureEnvironmentMaterial(child);
      });
      return environment;
    };

    const prepareMachine = (gltf: GLTF) => {
      const machine = gltf.scene;
      machine.castShadow = true; machine.receiveShadow = true;

      machine.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow = true; child.receiveShadow = true;
        if (child.name === "Level_Set") {
          sliderMeshRef.current = child;
          applyTargetInfluence(difficultyToInfluence(difficultyRef.current));
          influenceRef.current = difficultyToInfluence(difficultyRef.current);
        }
        if (child.name === "Target_Meter") {
          resultMeterMeshRef.current = child;
          applyResultInfluence(resultMeterActiveRef.current ? meterValueRef.current : 0);
          const source = Array.isArray(child.material) ? child.material[0] : child.material;
          if (source instanceof THREE.MeshStandardMaterial) {
            const indicator = source.clone();
            indicator.name = "Target_Meter_Indicator";
            indicator.transparent = true;
            indicator.opacity = 1;
            indicator.alphaTest = 0;
            indicator.depthTest = true;
            indicator.depthWrite = true;
            indicator.side = THREE.DoubleSide;
            indicator.needsUpdate = true;
            child.material = indicator;
            child.castShadow = false;
            child.renderOrder = 2;
          }
        }
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat, idx) => {
          const mn = (mat.name || "").toLowerCase();
          boostMachineMaterial(mat);
          if (mn === "screen") {
            const rep = new THREE.MeshStandardMaterial({
              map: meterTexture, emissiveMap: meterTexture,
              emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.38,
              roughness: 0.4, metalness: 0.3,
            });
            if (Array.isArray(child.material)) (child.material as THREE.Material[])[idx] = rep;
            else child.material = rep;
            return;
          }
          if (mn === "meter" && mat instanceof THREE.MeshStandardMaterial) {
            // Keep the GLB's authored alpha texture. A global opacity override
            // makes the opaque rails transparent along with the glass regions.
            mat.transparent = true;
            mat.opacity = 1;
            mat.alphaTest = 0;
            mat.depthWrite = false;
            mat.side = THREE.DoubleSide;
            mat.needsUpdate = true;
            child.renderOrder = Math.max(child.renderOrder, 3);
            return;
          }
          if (mat.transparent) {
            if (mn === "boxingmachine_2") {
              mat.transparent = true; mat.depthWrite = false; child.renderOrder = 2;
            } else {
              mat.alphaTest = 0.1; mat.transparent = false; mat.depthWrite = true;
            }
          }
        });
      });

      if (gltf.animations.length > 0) {
        const machineMixer = new THREE.AnimationMixer(machine);
        machineMixerRef.current = machineMixer;
        (["Machine_BagDrop", "Machine_Punch"] as MachineAnim[]).forEach((name) => {
          const clip = THREE.AnimationClip.findByName(gltf.animations, name);
          if (clip) machineActionsRef.current[name] = machineMixer.clipAction(clip);
        });
        const bagDrop = machineActionsRef.current["Machine_BagDrop"];
        if (bagDrop) {
          bagDrop.reset().setLoop(THREE.LoopOnce, 1);
          bagDrop.clampWhenFinished = true;
          bagDrop.play(); bagDrop.paused = true;
          currentMachineActionRef.current = bagDrop;
        }
      }
      return machine;
    };

    const prepareWade = (gltf: GLTF) => {
      const wade = gltf.scene;
      wade.castShadow = true; wade.receiveShadow = true;
      wade.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow = true; child.receiveShadow = true;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (!mat.transparent) return;
          mat.alphaTest = 0.1; mat.transparent = false; mat.depthWrite = true;
        });
      });

      if (gltf.animations.length > 0) {
        const wadeMixer = new THREE.AnimationMixer(wade);
        wadeMixerRef.current = wadeMixer;
        (["Wade_BoxingIdle", "Wade_Punch", "Wade_Victory", "Wade_Defeat"] as WadeAnim[]).forEach((name) => {
          const clip = THREE.AnimationClip.findByName(gltf.animations, name);
          if (clip) wadeActionsRef.current[name] = wadeMixer.clipAction(clip);
        });
        const defeatClip = THREE.AnimationClip.findByName(gltf.animations, "Wade_Defeat");
        if (defeatClip) {
          const defeatFirstPassClip = THREE.AnimationUtils.subclip(
            defeatClip,
            "Wade_Defeat_FirstPass",
            DEFEAT_TRIM_START_FRAME,
            Math.ceil(defeatClip.duration * AUTHORED_ANIMATION_FPS),
            AUTHORED_ANIMATION_FPS,
          );
          defeatFirstPassActionRef.current = wadeMixer.clipAction(defeatFirstPassClip);
        }
        wadeMixer.addEventListener("finished", (e) => {
          const finished = e.action as THREE.AnimationAction;
          const punch = wadeActionsRef.current["Wade_Punch"];
          if (finished === punch && phaseRef.current === 1) {
            if (wonRef.current) {
              playWade("Wade_Victory", true);
            } else {
              const defeatFirstPass = defeatFirstPassActionRef.current;
              if (!defeatFirstPass) {
                playWade("Wade_Defeat", true, DEFEAT_CROSSFADE_MS, false);
                return;
              }
              const previous = currentWadeActionRef.current;
              defeatFirstPass
                .reset()
                .setLoop(THREE.LoopOnce, 1);
              defeatFirstPass.clampWhenFinished = true;
              defeatFirstPass.enabled = true;
              defeatFirstPass.setEffectiveWeight(1);
              defeatFirstPass.setEffectiveTimeScale(1);
              defeatFirstPass.play();
              if (previous && previous !== defeatFirstPass) {
                previous.crossFadeTo(
                  defeatFirstPass,
                  DEFEAT_CROSSFADE_MS / 1000,
                  false,
                );
              }
              currentWadeActionRef.current = defeatFirstPass;
            }
          } else if (
            finished === defeatFirstPassActionRef.current &&
            wonRef.current === false
          ) {
            finished.stop();
            currentWadeActionRef.current = null;
            playWade("Wade_Defeat", true, 0, false);
          }
        });
        if (phaseRef.current === 0) playWade("Wade_BoxingIdle", true);
      }
      return wade;
    };

    Promise.all([
      loader.loadAsync("/submissions/mega-bonk/models/env.glb"),
      loader.loadAsync("/submissions/mega-bonk/models/boxing-machine.glb"),
      loader.loadAsync("/submissions/mega-bonk/models/wade.glb"),
    ])
      .then(([environmentGltf, machineGltf, wadeGltf]) => {
        if (disposed) return;
        const environment = prepareEnvironment(environmentGltf);
        const machine = prepareMachine(machineGltf);
        const wade = prepareWade(wadeGltf);
        scene.add(environment, machine, wade);
        setLoadProgress(1);
        if (loadingOverlayRef.current) {
          loadingOverlayRef.current.style.opacity = "0";
          loadingOverlayRef.current.style.pointerEvents = "none";
        }
        setSceneReady(true);
      })
      .catch((err) => console.warn("Mega Bonk asset load error:", err));

    const handleResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    const animate = (timestamp: number) => {
      frameIdRef.current = requestAnimationFrame(animate);
      const elapsed = timestamp - lastFrameTimeRef.current;
      if (lastFrameTimeRef.current !== 0 && elapsed < FRAME_MS - FRAME_SKIP_EPSILON_MS) return;
      const delta = Math.min((lastFrameTimeRef.current === 0 ? FRAME_MS : elapsed) / 1000, 0.05);
      lastFrameTimeRef.current = timestamp;
      wadeMixerRef.current?.update(delta);
      machineMixerRef.current?.update(delta);
      if (resultMeterActiveRef.current) {
        applyResultInfluence(meterValueRef.current);
      }
      composer.render(delta);
    };
    requestAnimationFrame(animate);

    return () => {
      disposed = true;
      if (frameIdRef.current !== null) cancelAnimationFrame(frameIdRef.current);
      if (punchTimerRef.current !== null) clearTimeout(punchTimerRef.current);
      if (meterTimerRef.current !== null) clearTimeout(meterTimerRef.current);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      wadeMixerRef.current?.stopAllAction(); wadeMixerRef.current = null;
      defeatFirstPassActionRef.current = null;
      machineMixerRef.current?.stopAllAction(); machineMixerRef.current = null;
      bloomPass.dispose();
      bokehPass.dispose();
      outputPass.dispose();
      composer.dispose();
      renderer.dispose();
      sliderMeshRef.current = null;
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      rendererRef.current = null;
      meterTextureRef.current?.dispose(); meterTextureRef.current = null;
    };
  }, []);

  // ── Sync difficulty → morph target ─────────────────────────────────────────
  useEffect(() => {
    if (isDraggingSliderRef.current) return;
    const inf = difficultyToInfluence(difficulty);
    influenceRef.current = inf;
    applyTargetInfluence(inf);
  }, [difficulty]);

  useEffect(() => { drawMeter(meterValue); }, [meterValue]);

  // ── Phase → animation driver ───────────────────────────────────────────────
  useEffect(() => {
    if (punchTimerRef.current !== null) { clearTimeout(punchTimerRef.current); punchTimerRef.current = null; }
    if (meterTimerRef.current !== null) { clearTimeout(meterTimerRef.current); meterTimerRef.current = null; }

    if (phase === 2) { resultMeterActiveRef.current = true; }

    if (phase === 0) {
      resultMeterActiveRef.current = false;
      applyResultInfluence(0);
      currentMachineActionRef.current?.stop();
      const bagDrop = machineActionsRef.current["Machine_BagDrop"];
      if (bagDrop) {
        bagDrop.reset().setLoop(THREE.LoopOnce, 1);
        bagDrop.clampWhenFinished = true;
        bagDrop.play(); bagDrop.paused = true;
        currentMachineActionRef.current = bagDrop;
      }
      playWade("Wade_BoxingIdle", true);
    } else if (phase === 1) {
      resultMeterActiveRef.current = false;
      applyResultInfluence(0);
      // Crossfade from idle to bag-drop phase — wade stays idle
      playWade("Wade_BoxingIdle", true);
      playMachine("Machine_BagDrop", false);

      punchTimerRef.current = setTimeout(() => {
        punchTimerRef.current = null;
        if (phaseRef.current !== 1) return;

        playSynchronizedPunch();

        // One animation-owned impact cue drives the sound and both meters.
        meterTimerRef.current = setTimeout(() => {
          meterTimerRef.current = null;
          if (phaseRef.current !== 1) return;
          resultMeterActiveRef.current = true;
          onPunchImpactRef.current();
        }, PUNCH_IMPACT_OFFSET_MS);
      }, BAG_DROP_DURATION_MS);
    }
  }, [phase]);

  const startSliderHitZoneDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    mode: SliderHitZoneDragMode,
  ) => {
    if (!isEditingSliderHitZone) return;
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    event.preventDefault();
    event.stopPropagation();
    sliderHitZoneDragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startZone: sliderHitZoneRef.current,
      bounds,
    };
    sliderHitZoneOverlayRef.current?.setPointerCapture(event.pointerId);
  };

  const updateSliderHitZoneDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = sliderHitZoneDragRef.current;
    if (!drag) return;
    event.preventDefault();
    event.stopPropagation();

    const dx = (event.clientX - drag.startX) / drag.bounds.width;
    const dy = (event.clientY - drag.startY) / drag.bounds.height;
    const start = drag.startZone;
    let next: SliderHitZone;

    switch (drag.mode) {
      case "nw":
        next = { left: start.left + dx, top: start.top + dy, width: start.width - dx, height: start.height - dy };
        break;
      case "ne":
        next = { left: start.left, top: start.top + dy, width: start.width + dx, height: start.height - dy };
        break;
      case "sw":
        next = { left: start.left + dx, top: start.top, width: start.width - dx, height: start.height + dy };
        break;
      case "se":
        next = { left: start.left, top: start.top, width: start.width + dx, height: start.height + dy };
        break;
      default:
        next = { ...start, left: start.left + dx, top: start.top + dy };
        break;
    }

    setSliderHitZone(clampSliderHitZone(next));
  };

  const endSliderHitZoneDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!sliderHitZoneDragRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    sliderHitZoneDragRef.current = null;
    if (sliderHitZoneOverlayRef.current?.hasPointerCapture(event.pointerId)) {
      sliderHitZoneOverlayRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const resetSliderHitZone = () => setSliderHitZone(DEFAULT_SLIDER_HIT_ZONE);

  const sliderHitZoneHandles: Array<{ mode: Exclude<SliderHitZoneDragMode, "move">; className: string }> = [
    { mode: "nw", className: "left-[-7px] top-[-7px] cursor-nwse-resize" },
    { mode: "ne", className: "right-[-7px] top-[-7px] cursor-nesw-resize" },
    { mode: "sw", className: "bottom-[-7px] left-[-7px] cursor-nesw-resize" },
    { mode: "se", className: "bottom-[-7px] right-[-7px] cursor-nwse-resize" },
  ];

  return (
    <div className="absolute inset-0 w-full h-full" style={{ minHeight: 340 }}>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {SHOW_SLIDER_HIT_ZONE_EDITOR ? (
        <div className="pointer-events-none absolute inset-0 z-40">
          <div className="pointer-events-auto absolute left-3 top-3 flex max-w-[calc(100%-24px)] flex-wrap items-center gap-2 rounded-lg border border-[#34f5c8]/40 bg-[#06100f]/85 p-2 text-[11px] font-semibold text-[#d8fff6] shadow-[0_0_20px_rgba(52,245,200,0.16)] backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setIsEditingSliderHitZone((editing) => !editing)}
              className="rounded-md border border-[#34f5c8]/40 bg-[#34f5c8]/15 px-2.5 py-1 text-[#d8fff6] hover:bg-[#34f5c8]/25"
            >
              {isEditingSliderHitZone ? "Test slider" : "Edit zone"}
            </button>
            <button
              type="button"
              onClick={resetSliderHitZone}
              className="rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-white/80 hover:bg-white/15"
            >
              Reset
            </button>
            <span className="font-mono text-[#78ffe0]/80">
              L {pct(sliderHitZone.left)} T {pct(sliderHitZone.top)} W {pct(sliderHitZone.width)} H {pct(sliderHitZone.height)}
            </span>
          </div>

          <div
            ref={sliderHitZoneOverlayRef}
            onPointerDown={(event) => startSliderHitZoneDrag(event, "move")}
            onPointerMove={updateSliderHitZoneDrag}
            onPointerUp={endSliderHitZoneDrag}
            onPointerCancel={endSliderHitZoneDrag}
            className={`absolute select-none rounded-[6px] border-2 border-[#ff2d2d] bg-[#78ff3d]/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.06),0_0_24px_rgba(120,255,61,0.34)] ${
              isEditingSliderHitZone ? "pointer-events-auto cursor-move" : "pointer-events-none"
            }`}
            style={{
              left: `${sliderHitZone.left * 100}%`,
              top: `${sliderHitZone.top * 100}%`,
              width: `${sliderHitZone.width * 100}%`,
              height: `${sliderHitZone.height * 100}%`,
            }}
          >
            <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#b6ff9c]">
              {isEditingSliderHitZone ? "Drag/resize" : "Test active"}
            </span>
            {isEditingSliderHitZone
              ? sliderHitZoneHandles.map((handle) => (
                  <div
                    key={handle.mode}
                    onPointerDown={(event) => startSliderHitZoneDrag(event, handle.mode)}
                    className={`absolute h-3.5 w-3.5 rounded-sm border border-white bg-[#ff2d2d] shadow-[0_0_10px_rgba(255,45,45,0.8)] ${handle.className}`}
                  />
                ))
              : null}
          </div>
        </div>
      ) : null}

      {/* Target and live result meter */}
      <div
        aria-label="Mega Bonk digital meter"
        data-target-influence={difficultyToInfluence(difficulty).toFixed(3)}
        data-result-progress={normalizeRange(phase === 0 ? 0 : meterValue, 0, 100).toFixed(3)}
        className="pointer-events-none absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2"
        style={{ width: "min(calc(100% - 24px), 360px)" }}
      >
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-lg border border-[#285a56] bg-[#06100f]/90 p-2 shadow-[0_0_18px_rgba(106,255,216,0.14)] sm:p-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#79bdb2]">Target</span>
          <SevenSegmentValue value={difficulty} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-lg border border-[#285a56] bg-[#06100f]/90 p-2 shadow-[0_0_18px_rgba(106,255,216,0.14)] sm:p-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#79bdb2]">Result</span>
          <SevenSegmentValue value={phase === 0 ? null : meterValue} />
        </div>
      </div>

      <div
        ref={loadingOverlayRef}
        aria-live="polite"
        aria-label="Mega Bonk assets loading"
        className={`absolute inset-0 z-50 flex items-center justify-center bg-[#050909]/95 transition-opacity duration-500 ${
          sceneReady ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"
        }`}
      >
        <div className="flex w-[min(calc(100%-48px),360px)] flex-col gap-3 rounded-lg border border-[#34f5c8]/35 bg-[#06100f]/90 p-4 shadow-[0_0_28px_rgba(52,245,200,0.16)]">
          <div className="flex items-end justify-between gap-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#78ffe0]">
              Mega Bonk
            </span>
            <span className="font-mono text-[18px] font-bold text-[#6affd8]">
              {Math.round(sceneLoadProgress * 100).toString().padStart(3, "0")}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full border border-[#285a56] bg-[#06100f]">
            <div
              className="h-full rounded-full bg-[#6affd8] shadow-[0_0_14px_rgba(106,255,216,0.55)] transition-[width] duration-200"
              style={{ width: `${Math.round(sceneLoadProgress * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MegaBonkWindow;
