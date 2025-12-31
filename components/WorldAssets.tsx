
import React from 'react';
import { WorldObjectType } from '../types';

interface ObjectProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  variant?: 'real' | 'ghost';
}

export const WorldAsset: React.FC<{ type: WorldObjectType } & ObjectProps> = ({ 
  type, 
  position, 
  rotation = [0, 0, 0], 
  scale = [1, 1, 1],
  variant = 'real' 
}) => {
  const isGhost = variant === 'ghost';
  const ghostOpacity = 0.3;
  const ghostColor = "#60a5fa"; // Sky blue ghost

  const renderMaterial = (color: string, metalness = 0.2, roughness = 0.5, emissive?: string) => {
    if (isGhost) {
      return (
        <meshStandardMaterial 
          color={ghostColor} 
          transparent 
          opacity={ghostOpacity} 
          wireframe 
          emissive={ghostColor}
          emissiveIntensity={0.5}
        />
      );
    }
    return (
      <meshStandardMaterial 
        color={color} 
        roughness={roughness} 
        metalness={metalness} 
        emissive={emissive} 
        emissiveIntensity={emissive ? 0.5 : 0} 
      />
    );
  };

  switch (type) {
    case 'wall':
      return (
        <mesh position={position} rotation={rotation} scale={scale}>
          <boxGeometry args={[2, 2.5, 0.2]} />
          {renderMaterial("#d1d5db")}
        </mesh>
      );
    case 'modular_unit':
      return (
        <group position={position} rotation={rotation} scale={scale}>
          <mesh>
            <boxGeometry args={[2.5, 2.5, 2.5]} />
            {renderMaterial("#334155", 0.5, 0.1)}
          </mesh>
          {!isGhost && (
            <mesh>
              <boxGeometry args={[2.3, 2.3, 2.3]} />
              <meshStandardMaterial color="#1e293b" opacity={0.6} transparent />
            </mesh>
          )}
        </group>
      );
    case 'solar_panel':
      return (
        <group position={position} rotation={rotation} scale={scale}>
          <mesh rotation={[-Math.PI / 4, 0, 0]}>
            <boxGeometry args={[1.5, 0.1, 2]} />
            {renderMaterial("#1d4ed8", 1, 0, "#1d4ed8")}
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1]} />
            {renderMaterial("#475569")}
          </mesh>
        </group>
      );
    case 'water_collector':
      return (
        <group position={position} rotation={rotation} scale={scale}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.6, 0.8, 1, 32]} />
            {renderMaterial("#0ea5e9", 0.1, 0.1)}
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <coneGeometry args={[0.8, 0.3, 32]} />
            {renderMaterial("#cbd5e1", 0.8)}
          </mesh>
        </group>
      );
    case 'roof':
      return (
        <mesh position={[position[0], position[1] + 1.25, position[2]]} rotation={[Math.PI / 4, 0, 0]} scale={scale}>
          <coneGeometry args={[2, 1.5, 4]} />
          {renderMaterial("#7c2d12")}
        </mesh>
      );
    case 'crop':
      return (
        <group position={position} scale={scale}>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.1, 0.4, 0.1]} />
            {renderMaterial("#22c55e")}
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 8]} />
            {renderMaterial("#451a03")}
          </mesh>
        </group>
      );
    case 'tree':
      return (
        <group position={position} scale={scale}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 3]} />
            {renderMaterial("#451a03")}
          </mesh>
          <mesh position={[0, 3, 0]}>
            <sphereGeometry args={[1.2]} />
            {renderMaterial("#15803d")}
          </mesh>
        </group>
      );
    case 'door':
      return (
        <mesh position={position} scale={scale}>
          <boxGeometry args={[0.8, 1.8, 0.1]} />
          {renderMaterial("#78350f")}
        </mesh>
      );
    default:
      return (
        <mesh position={position} scale={scale}>
          <boxGeometry args={[1, 1, 1]} />
          {renderMaterial("hotpink")}
        </mesh>
      );
  }
};
