
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, ContactShadows, Environment, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { WorldObject, ConstructionPlan } from '../types';
import { WorldAsset } from './WorldAssets';
import { Avatar } from './Avatar';

interface SimulationCanvasProps {
  objects: WorldObject[];
  avatarPos: [number, number, number];
  avatarTarget: [number, number, number] | null;
  activePlan?: ConstructionPlan;
  isScanning?: boolean;
}

const Terrain: React.FC<{ isScanning?: boolean, scanOrigin: [number, number, number] }> = ({ isScanning, scanOrigin }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  
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
      // Fix: pulseRef.current.material can be an array. We check and cast to access 'opacity'.
      const material = pulseRef.current.material;
      if (material && !Array.isArray(material)) {
        (material as THREE.MeshBasicMaterial).opacity = 1 - (scale / 60);
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
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshBasicMaterial color="#1e293b" wireframe transparent opacity={0.05} />
      </mesh>
      {/* Scan Pulse Visual */}
      <mesh ref={pulseRef} position={[scanOrigin[0], scanOrigin[1] + 0.1, scanOrigin[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 1, 64]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ objects, avatarPos, avatarTarget, activePlan, isScanning }) => {
  const ghostObjects = useMemo(() => {
    if (!activePlan) return [];
    return activePlan.steps.slice(activePlan.currentStepIndex + 1);
  }, [activePlan]);

  return (
    <div className="w-full h-full bg-black">
      <Canvas camera={{ position: [20, 20, 20], fov: 35 }} shadows>
        <color attach="background" args={['#010409']} />
        
        <ambientLight intensity={0.2} />
        <pointLight position={[15, 20, 15]} intensity={2} color="#00f2ff" castShadow />
        <spotLight position={[0, 40, 0]} intensity={1} angle={0.5} penumbra={1} color="#38bdf8" />
        
        <Sky sunPosition={[100, 10, 100]} turbidity={0.1} rayleigh={0.5} />
        <Stars radius={150} depth={50} count={7000} factor={4} saturation={0} fade speed={0.5} />
        <Environment preset="night" />

        <Terrain isScanning={isScanning} scanOrigin={avatarPos} />
        
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

        <ContactShadows opacity={0.4} scale={50} blur={2.5} far={20} color="#000000" />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.05} enableDamping />
      </Canvas>
    </div>
  );
};

export default SimulationCanvas;
