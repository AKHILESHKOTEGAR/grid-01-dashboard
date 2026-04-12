"use client";
import React, { Suspense } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Stage, ContactShadows, Environment } from "@react-three/drei";
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

function F1Car({ color }: { color: string }) {
    const geometry = useLoader(STLLoader, "/F1_RB16B.stl");

    return (
        <mesh
            geometry={geometry}
            // 1. DYNAMIC SCALE: TRIPLED from 0.06 to 0.18
            scale={0.18}
            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
            position={[0, -1, 0]} // Positioned to ground it below text
            castShadow
        >
            {/* 2. DYNAMIC MATERIAL: 
               - metalness 1.0 (Rich metallic sheen)
               - roughness 0.05 (Smoother for high-gloss reflections)
               - emissiveIntensity 0.35 (Boosts saturation in low light)
            */}
            <meshStandardMaterial
                color={color}
                metalness={1.0}
                roughness={0.05}
                emissive={color}
                emissiveIntensity={0.35}
            />
        </mesh>
    );
}

export default function Scene3D({ teamColor = "#E10600" }: { teamColor?: string }) {
    return (
        /* 3. CINEMATIC CAMERA: 
           - Closer position [8, 4, 10] to [6, 2.5, 7]
           - NARROWER FOV from 35 to 25 (This creates a massive zoom-in effect)
        */
        <Canvas shadows camera={{ position: [6, 2.5, 7], fov: 25 }}>
            <color attach="background" args={["#010101"]} />
            {/* Thinned fog so light travels better across the car */}
            <fog attach="fog" args={["#010101", 30, 60]} />

            {/* --- MAX-LUMINOSITY LIGHTING --- */}
            <ambientLight intensity={0.7} />

            {/* Top-Down Hero Light (White) */}
            <spotLight
                position={[0, 20, 0]}
                angle={0.5}
                penumbra={1}
                intensity={5} // Max top-down brightness
                castShadow
            />

            {/* Front-Facing Accent Light (White) */}
            <spotLight
                position={[15, 9, 10]}
                angle={0.2}
                penumbra={1}
                intensity={4}
                color="#ffffff"
            />

            {/* Rear "Rim" Accent Light (Red/Lime/White) */}
            <spotLight
                position={[-15, 5, -10]}
                angle={0.2}
                penumbra={1}
                intensity={3}
                color={teamColor} // Uses team color for depth
            />

            {/* pointLights provide the color splash onto the floor and details */}
            <pointLight position={[10, 10, 10]} intensity={2.5} />
            <pointLight position={[-10, -10, -10]} color={teamColor} intensity={1.5} />

            <Suspense fallback={null}>
                {/* 4. STAGE ADJUSTMENT: Max Intensity */}
                <Stage
                    environment="warehouse" // Warehouse has brightest light bars for reflections
                    intensity={2}
                    preset="rembrandt"
                    adjustCamera={false} // Keep our custom camera
                >
                    <F1Car color={teamColor} />
                </Stage>
                {/* Changed to 'studio' for cleaner, brighter specular highlights */}
                <Environment preset="studio" />
            </Suspense>

            <gridHelper args={[100, 100, "#222", "#080808"]} position={[0, -2.01, 0]} />

            <ContactShadows
                opacity={0.6}
                scale={40}
                blur={2}
                far={10}
                color="#000000"
            />

            <OrbitControls
                enableZoom={false}
                autoRotate
                autoRotateSpeed={0.5}
                maxPolarAngle={Math.PI / 2.1}
            />
        </Canvas>
    );
}