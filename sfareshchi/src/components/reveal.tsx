"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay in seconds */
  delay?: number;
  as?: ElementType;
  id?: string;
  role?: string;
  "aria-label"?: string;
}

/**
 * Fade-up reveal on scroll via IntersectionObserver.
 * Falls back to visible instantly when JS/motion is unavailable.
 */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div", id, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style = { "--reveal-delay": `${delay}s` } as CSSProperties;

  return (
    <Tag ref={ref} id={id} className={`fade-up ${className}`} style={style} {...rest}>
      {children}
    </Tag>
  );
}
