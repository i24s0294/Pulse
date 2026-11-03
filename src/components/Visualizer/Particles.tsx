import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Preset } from '../../App';

interface ParticlesProps {
  frequencyData: Uint8Array;
  count?: number;
  preset?: Preset;
}

const presetParticleColors = {
  neon: '#a78bfa',
  retro: '#fbbf24',
  minimal: '#d1d5db',
};

export function Particles({ frequencyData, count = 500, preset = 'neon' }: ParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null!);
  const materialRef = useRef<THREE.PointsMaterial>(null!);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, [count]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame((state) => {
    if (!pointsRef.current || frequencyData.length === 0) return;

    const highSlice = frequencyData.slice(50, 100);
    const highAverage = highSlice.reduce((a, b) => a + b, 0) / highSlice.length / 255;

    const bassSlice = frequencyData.slice(0, 10);
    const bassAverage = bassSlice.reduce((a, b) => a + b, 0) / bassSlice.length / 255;

    const attr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = state.clock.elapsedTime;
    const speed = 0.01 + highAverage * 0.1;

    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i];
      const y = arr[i + 1];
      const z = arr[i + 2];

      arr[i] = x + Math.sin(t + x * 0.5) * speed;
      arr[i + 1] = y + Math.cos(t + y * 0.5) * speed;
      arr[i + 2] = z + Math.sin(t + z * 0.5) * speed;

      const distance = Math.sqrt(x * x + y * y + z * z);
      if (distance > 8) {
        arr[i] = (Math.random() - 0.5) * 2;
        arr[i + 1] = (Math.random() - 0.5) * 2;
        arr[i + 2] = (Math.random() - 0.5) * 2;
      }
    }
    attr.needsUpdate = true;

    if (materialRef.current) {
      materialRef.current.size = 0.06 + bassAverage * 0.12;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        size={0.06}
        sizeAttenuation={true}
        transparent={true}
        opacity={0.7}
        color={presetParticleColors[preset]}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}