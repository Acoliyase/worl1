
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, ContactShadows, Environment, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { WorldObject, ConstructionPlan, SettlementTier } from '../types';
import { WorldAsset } from './WorldAssets';
import { Avatar } from './Avatar';

interface SimulationCanvasProps {
  objects: WorldObject[];
  avatarPos: [number, number, number];
  avatarTarget: [number, number, number] | null;
  activePlan?: ConstructionPlan;
  isScanning?: boolean;
  tier: SettlementTier;
}

const ThermalAura: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(5 + Math.sin(clock.elapsedTime * 2) * 0.2);
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.05 + Math.sin(clock.elapsedTime) * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={[position[0], position[1] + 0.1, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1, 64]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
};

const Terrain: React.FC<{ isScanning?: boolean, scanOrigin: [number, number, number], tier: SettlementTier }> = ({ isScanning, scanOrigin, tier }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  
  const latticeColor = useMemo(() => {
    if (tier === 'Citadel') return '#f472b6';
    if (tier === 'Settlement') return '#a78bfa';
    return '#0ea5e9';
  }, [tier]);

  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(120, 120, 80, 80);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i);
      const h = Math.sin(x * 0.2) * Math.cos(z * 0.2) * 1.2;
      pos.setZ(i, h);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (pulseRef.current && isScanning) {
      const scale = (clock.elapsedTime * 15) % 60;
      pulseRef.current.scale.set(scale, scale, 1);
      const material = pulseRef.current.material;
      if (material && !Array.isArray(material)) {
        (material as THREE.MeshBasicMaterial).opacity = 0.8 - (scale / 60);
      }
    } else if (pulseRef.current) {
      pulseRef.current.scale.set(0, 0, 0);
    }
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geom} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#020617" roughness={0.8} metalness={0.2} flatShading />
      </mesh>
      {/* Neural Lattice Overlay */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 120, 40, 40]} />
        <meshBasicMaterial color={latticeColor} wireframe transparent opacity={0.15} />
      </mesh>
      {/* Scan Pulse */}
      <mesh ref={pulseRef} position={[scanOrigin[0], scanOrigin[1] + 0.1, scanOrigin[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1, 64]} />
        <meshBasicMaterial color={latticeColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ objects, avatarPos, avatarTarget, activePlan, isScanning, tier }) => {
  const ghostObjects = useMemo(() => {
    if (!activePlan) return [];
    return activePlan.steps.slice(activePlan.currentStepIndex + 1);
  }, [activePlan]);

  const energySources = useMemo(() => 
    objects.filter(o => o.type === 'solar_panel' || o.type === 'water_collector' || o.type === 'life_support_hub'), 
  [objects]);

  return (
    <div className="w-full h-full bg-black">
      <Canvas camera={{ position: [25, 25, 25], fov: 35 }} shadows>
        <color attach="background" args={['#010409']} />
        
        <ambientLight intensity={0.2} />
        <pointLight position={[20, 30, 20]} intensity={3} color="#00f2ff" castShadow />
        <spotLight position={[0, 50, 0]} intensity={1.5} angle={0.4} penumbra={1} color="#38bdf8" />
        
        <Sky sunPosition={[100, 10, 100]} turbidity={0.1} rayleigh={1} />
        <Stars radius={150} depth={50} count={10000} factor={6} saturation={0} fade speed={1} />
        <Environment preset="night" />

        <Terrain isScanning={isScanning} scanOrigin={avatarPos} tier={tier} />
        
        {/* Thermal Aura Viz (Directive #4) */}
        {energySources.map(o => (
          <ThermalAura key={`aura-${o.id}`} position={o.position} />
        ))}

        {/* Settlement Assets */}
        {objects.map((obj) => (
          <WorldAsset 
            key={obj.id} 
            type={obj.type} 
            position={obj.position} 
            rotation={obj.rotation} 
            scale={obj.scale} 
            variant="real"
          />
        ))}

        {/* Predictive Visualization */}
        {ghostObjects.map((step, idx) => (
          <WorldAsset 
            key={`ghost-${idx}`} 
            type={step.type} 
            position={[step.position[0], step.position[1], step.position[2]]} 
            variant="ghost"
          />
        ))}

        <Avatar position={avatarPos} targetPosition={avatarTarget} isThinking={isScanning} />

        <ContactShadows opacity={0.5} scale={60} blur={2} far={20} color="#000000" />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.05} enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
};

export default SimulationCanvas;
