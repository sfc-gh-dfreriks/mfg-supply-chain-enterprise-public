import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';

/** Keeps the scene's full width (and, if given, height) in view when the canvas is taller than it is designed for (e.g. full screen):
 *  with a fixed vertical fov, a narrower aspect would crop the sides, so the camera backs off along its view line. */
export default function FitCamera({ base, halfWidth, halfHeight = 0 }: { base: [number, number, number]; halfWidth: number; halfHeight?: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    const baseDist = Math.hypot(...base);
    const t = Math.tan((cam.fov * Math.PI) / 360);
    const need = Math.max(halfWidth / (t * (size.width / size.height)), halfHeight / t);
    const k = Math.max(baseDist, need) / baseDist;
    cam.position.set(base[0] * k, base[1] * k, base[2] * k);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, base, halfWidth, halfHeight]);
  return null;
}
