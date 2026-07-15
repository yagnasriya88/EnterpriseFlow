import type { Transition, Variants } from "framer-motion";

export const EASE_PREMIUM = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  fast: 0.12,
  base: 0.2,
  slow: 0.36,
} as const;

export const transitionBase: Transition = {
  duration: DURATION.base,
  ease: EASE_PREMIUM,
};

export const transitionFast: Transition = {
  duration: DURATION.fast,
  ease: EASE_PREMIUM,
};

export const transitionSlow: Transition = {
  duration: DURATION.slow,
  ease: EASE_PREMIUM,
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transitionBase },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitionBase },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: transitionBase },
  exit: { opacity: 0, scale: 0.98, y: 2, transition: transitionFast },
};

export const staggerChildren = (stagger = 0.05): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger } },
});
