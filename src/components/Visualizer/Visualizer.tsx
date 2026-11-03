import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import type { Preset } from '../../App';

interface VisualizerProps {
  frequencyData: Uint8Array;
  coverUrl?: string;
  preset: Preset;
}

const presetColors = {
  neon: { color1: '#8b5cf6', color2: '#ec4899' },
  retro: { color1: '#f59e0b', color2: '#ef4444' },
  minimal: { color1: '#e5e7eb', color2: '#9ca3af' },
};

export function Visualizer({ frequencyData, coverUrl, preset }: VisualizerProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const texture = coverUrl ? useLoader(TextureLoader, coverUrl) : null;
  const colors = presetColors[preset];

  const shader = useMemo(
    () => ({
      uniforms: {
        time: { value: 0 },
        bassLevel: { value: 0 },
        midLevel: { value: 0 },
        highLevel: { value: 0 },
        color1: { value: new THREE.Color(colors.color1) },
        color2: { value: new THREE.Color(colors.color2) },
        coverTexture: { value: null as THREE.Texture | null },
        hasCover: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float bassLevel;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform sampler2D coverTexture;
        uniform float hasCover;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        void main() {
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnelEffect = pow(1.0 - dot(viewDirection, vNormal), 3.0);
          vec3 baseColor;
          if (hasCover > 0.5) {
            vec4 coverColor = texture2D(coverTexture, vUv);
            baseColor = coverColor.rgb;
          } else {
            baseColor = mix(color1, color2, sin(time * 0.5) * 0.5 + 0.5);
          }
          vec3 glowColor = baseColor + vec3(bassLevel * 0.5);
          vec3 finalColor = glowColor * (1.0 + fresnelEffect * 2.0);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    }),
    // Пересоздаём шейдер при смене пресета
    [preset]
  );

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.coverTexture.value = texture;
      materialRef.current.uniforms.hasCover.value = texture ? 1 : 0;
    }
  }, [texture]);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current || frequencyData.length === 0) return;

    const bassSlice = frequencyData.slice(0, 10);
    const bassAverage = bassSlice.reduce((a, b) => a + b, 0) / bassSlice.length / 255;

    materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    materialRef.current.uniforms.bassLevel.value = bassAverage;

    const scale = 1 + bassAverage * 0.3;
    meshRef.current.scale.set(scale, scale, scale);
    meshRef.current.rotation.y += 0.002;
    meshRef.current.rotation.x += 0.001;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.5, 64, 64]} />
      <shaderMaterial ref={materialRef} attach="material" args={[shader]} />
    </mesh>
  );
}