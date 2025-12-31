
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AvatarProps {
  position: [number, number, number];
  targetPosition: [number, number, number] | null;
  isThinking?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ position, targetPosition, isThinking }) => {
  const meshRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const scannerRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      
      if (targetPosition) {
        const target = new THREE.Vector3(...targetPosition);
        meshRef.current.lookAt(target.x, position[1], target.z);
      }
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (isThinking ? 10 : 2);
      ringRef.current.scale.setScalar(isThinking ? 1.2 + Math.sin(state.clock.elapsedTime * 10) * 0.1 : 1);
    }
    if (scannerRef.current) {
      scannerRef.current.visible = !!isThinking;
      scannerRef.current.rotation.y += delta * 5;
      scannerRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 20) * 0.2;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Chassis */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.6, 0.8, 0.6]} />
        <meshStandardMaterial color="#475569" roughness={0.1} metalness={0.8} />
      </mesh>
      
      {/* Scanner Head */}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial 
          color={isThinking ? "#f43f5e" : "#0ea5e9"} 
          emissive={isThinking ? "#f43f5e" : "#0ea5e9"} 
          emissiveIntensity={isThinking ? 4 : 2} 
        />
      </mesh>

      {/* Scanning Beam Illustration */}
      <mesh ref={scannerRef} position={[0, 1.1, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.5, 2, 32, 1, true]} />
        <meshBasicMaterial color="#f43f5e" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Base Ring */}
      <mesh ref={ringRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.02, 16, 40]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" opacity={0.5} transparent />
      </mesh>
    </group>
  );
};
