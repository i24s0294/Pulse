import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraPulseProps {
  frequencyData: Uint8Array;
}

// Камера слегка "пульсирует" FOV-ом в такт бочке — эффект присутствия из клипов
export function CameraPulse({ frequencyData }: CameraPulseProps) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  useFrame(() => {
    if (frequencyData.length === 0) return;
    const bassSlice = frequencyData.slice(0, 10);
    const bass = bassSlice.reduce((a, b) => a + b, 0) / bassSlice.length / 255;
    const targetFov = 75 - bass * 5;
    camera.fov += (targetFov - camera.fov) * 0.12;
    camera.updateProjectionMatrix();
  });

  return null;
}