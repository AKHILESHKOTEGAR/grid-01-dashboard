"use client";
import React, { Suspense } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

function F1Car({ color, isDark }: { color: string; isDark: boolean }) {
  const geometry = useLoader(STLLoader, "/F1_RB16B.stl");
  geometry.center();

  return (
    <mesh
      geometry={geometry}
      scale={0.18}
      rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      position={[0, -1.4, 0]}
      castShadow
    >
      <meshStandardMaterial
        color={color}
        metalness={isDark ? 1.0 : 0.7}
        roughness={isDark ? 0.05 : 0.15}
        emissive={color}
        emissiveIntensity={isDark ? 0.35 : 0.15}
      />
    </mesh>
  );
}

interface Props {
  teamColor?: string;
  isDark?: boolean;
}

export default function Scene3D({ teamColor = "#E10600", isDark = true }: Props) {
  const bgColor = isDark ? "#010101" : "#dcdcdc";
  const fogColor = isDark ? "#010101" : "#dcdcdc";
  const gridPri = isDark ? "#1a1a1a" : "#c0c0c0";
  const gridSec = isDark ? "#080808" : "#d8d8d8";
  const ambLight = isDark ? 0.7 : 1.4;
  const topLight = isDark ? 5.0 : 6.0;
  const rimColor = isDark ? teamColor : "#ffffff";
  const rimInt = isDark ? 3.0 : 1.5;

  return (
    <Canvas shadows camera={{ position: [0, 2, 10], fov: 28 }}>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[fogColor, 30, 60]} />

      <ambientLight intensity={ambLight} />

      {/* Top hero */}
      <spotLight
        position={[0, 20, 0]}
        angle={0.5}
        penumbra={1}
        intensity={topLight}
        castShadow
      />

      {/* Front accent */}
      <spotLight
        position={[15, 9, 10]}
        angle={0.2}
        penumbra={1}
        intensity={isDark ? 4 : 5}
        color="#ffffff"
      />

      {/* Rim light — team color in dark, white fill in light */}
      <spotLight
        position={[-15, 5, -10]}
        angle={0.2}
        penumbra={1}
        intensity={rimInt}
        color={rimColor}
      />

      {/* Fill point */}
      <pointLight position={[10, 10, 10]} intensity={isDark ? 2.5 : 3.0} />
      <pointLight position={[-10, -10, -10]} color={teamColor} intensity={isDark ? 1.5 : 0.5} />

      {/* In light mode add extra under-fill to prevent dark undercarriage */}
      {!isDark && (
        <pointLight position={[0, -5, 5]} color="#ffffff" intensity={2.0} />
      )}

      <Suspense fallback={null}>
        <Environment preset={isDark ? "warehouse" : "city"} />
        <F1Car color={teamColor} isDark={isDark} />
      </Suspense>

      <gridHelper args={[100, 100, gridPri, gridSec]} position={[0, -2.41, 0]} />

      <ContactShadows
        position={[0, -2.41, 0]}
        opacity={isDark ? 0.6 : 0.25}
        scale={40}
        blur={2}
        far={10}
        color={isDark ? "#000000" : "#888888"}
      />

      <OrbitControls
        target={[0, -0.4, 0]}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
