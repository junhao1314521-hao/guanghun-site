/** 动效偏好：统一入口，避免各处重复 matchMedia */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}