import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export function useAudioAnalyzer(audioRef: RefObject<HTMLAudioElement | null>) {
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    // Если source уже создан для этого элемента, переиспользуем
    if (sourceRef.current && connectedElementRef.current === audioElement) {
      const context = audioContextRef.current!;
      const source = sourceRef.current;
      
      if (context.state === 'suspended') {
        context.resume();
      }

      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.connect(analyser);
      analyser.connect(context.destination);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      setFrequencyData(dataArray);

      const updateData = () => {
        analyser.getByteFrequencyData(dataArray);
        setFrequencyData(new Uint8Array(dataArray));
        animationFrameRef.current = requestAnimationFrame(updateData);
      };
      updateData();

      return () => {
        cancelAnimationFrame(animationFrameRef.current);
        source.disconnect();
        analyser.disconnect();
      };
    }

    // Создаём новый граф
    const context = new AudioContext();
    audioContextRef.current = context;

    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const source = context.createMediaElementSource(audioElement);
    sourceRef.current = source;
    connectedElementRef.current = audioElement;

    source.connect(analyser);
    analyser.connect(context.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    setFrequencyData(dataArray);

    const updateData = () => {
      analyser.getByteFrequencyData(dataArray);
      setFrequencyData(new Uint8Array(dataArray));
      animationFrameRef.current = requestAnimationFrame(updateData);
    };
    updateData();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      source.disconnect();
      analyser.disconnect();
      // НЕ закрываем контекст и НЕ обнуляем sourceRef — они переиспользуются
    };
  }, [audioRef]);

  return frequencyData;
}