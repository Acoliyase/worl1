
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { WorldObjectType } from '../types';
import * as THREE from 'three';

interface ObjectProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  variant?: 'real' | 'ghost';
}

const GhostMaterial: React.FC = () => {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = 0.1 + Math.sin(clock.elapsedTime * 3) * 0.05;
      matRef.current.emissiveIntensity = 0.4 + Math.sin(clock.elapsedTime * 3) * 0.2;
    }
  });
  return (
    <meshStandardMaterial 
      ref={matRef}
      color="#0ea5e9" 
      transparent 
      opacity={0.15} 
      wireframe 
      emissive="#0ea5e9"
      emissiveIntensity={0.6}
      side={THREE.DoubleSide}
    />
  );
};

export const WorldAsset: React.FC<{ type: WorldObjectType } & ObjectProps> = ({ 
  type, 
  position, 
  rotation = [0, 0, 0], 
  scale = [1, 1, 1],
  variant = 'real' 
}) => {
  const isGhost = variant === 'ghost';
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current && !isGhost) {
      // Subtle hovering for futuristic feel
      groupRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.5) * 0.05;
    }
  });

  const renderMaterial = (color: string, metalness = 0.5, roughness = 0.2, emissive?: string) => {
    if (isGhost) return <GhostMaterial />;
    return (
      <meshStandardMaterial 
        color={color} 
        roughness={roughness} 
        metalness={metalness} 
        emissive={emissive} 
        emissiveIntensity={emissive ? 0.4 : 0} 
      />
    );
  };

  const model = (() => {
    switch (type) {
      case 'data_spire':
        return (
          <group position={[0, 3, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.5, 0.8, 6, 6]} />
              {renderMaterial("#0f172a", 0.9, 0.1, "#38bdf8")}
            </mesh>
            <mesh position={[0, 3.2, 0]}>
              <octahedronGeometry args={[0.6]} />
              {renderMaterial("#38bdf8", 1, 0, "#38bdf8")}
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[0, Math.PI/4, 0]}>
              <boxGeometry args={[1.2, 5.5, 1.2]} />
              <meshStandardMaterial color="#38bdf8" wireframe transparent opacity={0.1} />
            </mesh>
          </group>
        );
      case 'life_support_hub':
        return (
          <group position={[0, 1.5, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              {renderMaterial("#1e293b", 0.7, 0.2, "#0ea5e9")}
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[2.1, 2.1, 0.2, 32]} />
              {renderMaterial("#0ea5e9", 1, 0, "#0ea5e9")}
            </mesh>
            <pointLight color="#0ea5e9" intensity={2} distance={5} />
          </group>
        );
      case 'wall':
        return (
          <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 2.5, 0.3]} />
            {renderMaterial("#334155", 0.2, 0.8, "#1e293b")}
          </mesh>
        );
      case 'modular_unit':
        return (
          <group position={[0, 1.25, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[2.5, 2.5, 2.5]} />
              {renderMaterial("#1e293b", 0.8, 0.1, "#0f172a")}
            </mesh>
            <mesh position={[0, 0, 1.26]}>
              <planeGeometry args={[1.8, 1.8]} />
              {renderMaterial("#38bdf8", 1, 0, "#38bdf8")}
            </mesh>
          </group>
        );
      case 'solar_panel':
        return (
          <group position={[0, 0.5, 0]}>
            <mesh rotation={[-Math.PI / 6, 0, 0]} position={[0, 0.6, 0]} castShadow>
              <boxGeometry args={[2, 0.1, 1.5]} />
              {renderMaterial("#1d4ed8", 1, 0, "#2563eb")}
            </mesh>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.15, 1.2]} />
              {renderMaterial("#475569")}
            </mesh>
          </group>
        );
      default:
        return (
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            {renderMaterial("#6366f1")}
          </mesh>
        );
    }
  })();

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {model}
    </group>
  );
};
