import { useCallback } from 'react';
import { playMemorySaveSound } from '@/sounds/whoosh';

export const useMemorySound = () => {
  const playSuccessSound = useCallback(() => {
    playMemorySaveSound();
  }, []);

  return {
    playSuccessSound
  };
};