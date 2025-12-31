
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { WorldObject, ConstructionPlan } from '../types';
import { WorldAsset } from './WorldAssets';
import { Avatar } from './Avatar';

interface SimulationCanvasProps {
  objects: WorldObject[];
  avatarPos: [number, number, number];
  avatarTarget: [number, number, number] | null;
  activePlan?: ConstructionPlan;
}

const Terrain: React.FC = () => {
  const meshRef = React.useRef<THREE.Mesh>(null);
  
  // Create a vertex-based terrain that matches getTerrainHeight logic
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(100, 100, 64, 64);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i); // Y in PlaneGeometry is Z in World
      const h = Math.sin(x * 0.2) * Math.cos(z * -0.2) * 1.2;
      pos.setZ(i, h); // Displacement along Z axis of geometry
    }
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh ref={meshRef} geometry={geom} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0.1} flatShading />
    </mesh>
  );
};

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ objects, avatarPos, avatarTarget, activePlan }) => {
  const ghostObjects = useMemo(() => {
    if (!activePlan) return [];
    return activePlan.steps.slice(activePlan.currentStepIndex + 1);
  }, [activePlan]);

  return (
    <div className="w-full h-full bg-black">
      <Canvas camera={{ position: [18, 18, 18], fov: 40 }} shadows>
        <color attach="background" args={['#020617']} />
        
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 15, 10]} intensity={1.5} color="#00f2ff" />
        <directionalLight 
          position={[-10, 20, 10]} 
          intensity={1} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
        />

        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="night" />

        <Terrain />
        <gridHelper args={[100, 50, '#1e293b', '#0f172a']} position={[0, -0.05, 0]} />

        {/* Existing Real Objects */}
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

        {/* Planned Ghost Objects */}
        {ghostObjects.map((step, idx) => (
          <WorldAsset 
            key={`ghost-${idx}`} 
            type={step.type} 
            position={step.position} 
            variant="ghost"
          />
        ))}

        <Avatar position={avatarPos} targetPosition={avatarTarget} isThinking={activePlan === undefined} />

        <ContactShadows opacity={0.6} scale={40} blur={2} far={10} />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
    </div>
  );
};

export default SimulationCanvas;
