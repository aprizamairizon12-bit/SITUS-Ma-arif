import React, { createContext, useContext, useState, useEffect } from 'react';

interface AnimationContextType {
  animationsEnabled: boolean;
  reducedMotion: boolean;
  animationSpeed: 'normal' | 'fast' | 'slow';
  setAnimationsEnabled: (enabled: boolean) => void;
  setAnimationSpeed: (speed: 'normal' | 'fast' | 'slow') => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('situs_animations_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [animationSpeed, setAnimationSpeedState] = useState<'normal' | 'fast' | 'slow'>(() => {
    const saved = localStorage.getItem('situs_animation_speed');
    return (saved as any) || 'normal';
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  const setAnimationsEnabled = (enabled: boolean) => {
    setAnimationsEnabledState(enabled);
    localStorage.setItem('situs_animations_enabled', String(enabled));
  };

  const setAnimationSpeed = (speed: 'normal' | 'fast' | 'slow') => {
    setAnimationSpeedState(speed);
    localStorage.setItem('situs_animation_speed', speed);
  };

  return (
    <AnimationContext.Provider
      value={{
        animationsEnabled: animationsEnabled && !reducedMotion,
        reducedMotion,
        animationSpeed,
        setAnimationsEnabled,
        setAnimationSpeed,
      }}
    >
      {children}
    </AnimationContext.Provider>
  );
};

export const useAppAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    return {
      animationsEnabled: true,
      reducedMotion: false,
      animationSpeed: 'normal' as const,
      setAnimationsEnabled: () => {},
      setAnimationSpeed: () => {},
    };
  }
  return context;
};
