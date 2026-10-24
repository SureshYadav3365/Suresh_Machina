import React, { useState, useEffect, useRef } from 'react';

/**
 * AnimatedNumber smoothly interpolates between values
 * Uses requestAnimationFrame for 60fps performance and respects prefers-reduced-motion.
 */
export default function AnimatedNumber({ value = 0, duration = 800, prefix = '', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || duration <= 0) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startValue = prevValueRef.current;
    const targetValue = value;
    if (startValue === targetValue) return;

    let startTime = null;
    let animationFrameId = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic formula for natural settling
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (targetValue - startValue) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = targetValue;
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {Number(displayValue).toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}
