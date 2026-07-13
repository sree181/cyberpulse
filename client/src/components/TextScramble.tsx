/**
 * TextScramble — GSAP-powered text decode animation
 * 
 * Characters cycle through random symbols before resolving to final text.
 * Used for: IP addresses, CVE IDs, threat types, status messages.
 * 
 * Inspired by: The Matrix, Mr. Robot, TRON: Legacy terminal sequences.
 */
import { useEffect, useRef, useState, memo } from 'react';
import gsap from 'gsap';

// Character sets for scramble effect
const CHARS_CYBER = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEF';
const CHARS_HEX = '0123456789ABCDEF';
const CHARS_BINARY = '01';

type ScrambleMode = 'cyber' | 'hex' | 'binary';

interface TextScrambleProps {
  text: string;
  className?: string;
  mode?: ScrambleMode;
  duration?: number; // Total animation duration in seconds
  delay?: number;    // Delay before starting
  trigger?: any;     // When this changes, re-trigger the animation
  stagger?: boolean; // Stagger character resolution
}

const TextScramble = memo(function TextScramble({
  text,
  className = '',
  mode = 'cyber',
  duration = 0.8,
  delay = 0,
  trigger,
  stagger = true,
}: TextScrambleProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<gsap.core.Tween | null>(null);
  const [displayText, setDisplayText] = useState(text);
  const prevTextRef = useRef(text);

  const charSet = mode === 'hex' ? CHARS_HEX : mode === 'binary' ? CHARS_BINARY : CHARS_CYBER;

  useEffect(() => {
    if (!elementRef.current) return;
    if (text === prevTextRef.current && trigger === undefined) {
      setDisplayText(text);
      return;
    }

    prevTextRef.current = text;

    // Kill any running animation
    if (animRef.current) animRef.current.kill();

    const finalChars = text.split('');
    const length = finalChars.length;
    
    // Create scramble animation
    const obj = { progress: 0 };
    
    animRef.current = gsap.to(obj, {
      progress: 1,
      duration,
      delay,
      ease: 'power2.inOut',
      onUpdate: () => {
        const progress = obj.progress;
        let result = '';
        
        for (let i = 0; i < length; i++) {
          if (finalChars[i] === ' ') {
            result += ' ';
            continue;
          }

          // Stagger: characters resolve left-to-right
          const charProgress = stagger 
            ? Math.max(0, (progress * 1.5) - (i / length) * 0.5)
            : progress;

          if (charProgress >= 1) {
            result += finalChars[i];
          } else if (charProgress > 0) {
            // Scrambling phase — random character
            result += charSet[Math.floor(Math.random() * charSet.length)];
          } else {
            result += charSet[Math.floor(Math.random() * charSet.length)];
          }
        }
        
        setDisplayText(result);
      },
      onComplete: () => {
        setDisplayText(text);
      },
    });

    return () => {
      if (animRef.current) animRef.current.kill();
    };
  }, [text, trigger, duration, delay, stagger, charSet]);

  return (
    <span ref={elementRef} className={`font-mono ${className}`}>
      {displayText}
    </span>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// NUMBER MORPH — Animated counter that morphs between values
// ═══════════════════════════════════════════════════════════════════════════════

interface NumberMorphProps {
  value: number;
  className?: string;
  duration?: number;
  format?: (n: number) => string;
}

const NumberMorph = memo(function NumberMorph({
  value,
  className = '',
  duration = 1.2,
  format = (n) => Math.round(n).toString(),
}: NumberMorphProps) {
  const [display, setDisplay] = useState(format(value));
  const objRef = useRef({ val: value });
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (tweenRef.current) tweenRef.current.kill();

    tweenRef.current = gsap.to(objRef.current, {
      val: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplay(format(objRef.current.val));
      },
    });

    return () => {
      if (tweenRef.current) tweenRef.current.kill();
    };
  }, [value, duration, format]);

  return <span className={`tabular-nums ${className}`}>{display}</span>;
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPEWRITER — Text appears character by character with cursor
// ═══════════════════════════════════════════════════════════════════════════════

interface TypewriterProps {
  text: string;
  className?: string;
  speed?: number; // Characters per second
  delay?: number;
  showCursor?: boolean;
}

const Typewriter = memo(function Typewriter({
  text,
  className = '',
  speed = 30,
  delay = 0,
  showCursor = true,
}: TypewriterProps) {
  const [displayed, setDisplayed] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    let index = 0;
    const intervalMs = 1000 / speed;
    
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayed(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
        }
      }, intervalMs);

      return () => clearInterval(interval);
    }, delay * 1000);

    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  // Blinking cursor
  useEffect(() => {
    if (!showCursor) return;
    const interval = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(interval);
  }, [showCursor]);

  return (
    <span className={className}>
      {displayed}
      {showCursor && (
        <span className={`inline-block w-[2px] h-[1em] bg-[var(--color-cp-accent)] ml-0.5 align-middle transition-opacity ${cursorVisible ? 'opacity-100' : 'opacity-0'}`} />
      )}
    </span>
  );
});

export { TextScramble, NumberMorph, Typewriter };
export default TextScramble;
