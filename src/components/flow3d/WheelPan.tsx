import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** Trackpad-friendly navigation on top of OrbitControls (which must be makeDefault with enableZoom={false}):
 *  two-finger scroll / mouse wheel pans, pinch or Ctrl/Cmd + wheel zooms toward the cursor's view line,
 *  arrow keys pan. Drag still orbits; right-drag or Shift-drag pans. */
export default function WheelPan({ minDistance = 4, maxDistance = 160 }: { minDistance?: number; maxDistance?: number }) {
  const { camera, gl, controls, size } = useThree();
  useEffect(() => {
    const ctl = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (!ctl) return;
    const el = gl.domElement;
    const right = new THREE.Vector3(), up = new THREE.Vector3(), off = new THREE.Vector3();
    const pan = (dx: number, dy: number) => {
      const dist = camera.position.distanceTo(ctl.target);
      const perPx = (2 * dist * Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360)) / size.height;
      right.setFromMatrixColumn(camera.matrix, 0).multiplyScalar(dx * perPx);
      up.setFromMatrixColumn(camera.matrix, 1).multiplyScalar(-dy * perPx);
      off.copy(right).add(up);
      camera.position.add(off);
      ctl.target.add(off);
      ctl.update();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const dir = off.subVectors(camera.position, ctl.target);
        const d = THREE.MathUtils.clamp(dir.length() * Math.exp(e.deltaY * 0.003), minDistance, maxDistance);
        camera.position.copy(ctl.target).add(dir.setLength(d));
        ctl.update();
      } else pan(e.deltaX, e.deltaY);
    };
    const onKey = (e: KeyboardEvent) => {
      const k: Record<string, [number, number]> = { ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, -40], ArrowDown: [0, 40] };
      if (k[e.key] && el.matches(':hover')) { e.preventDefault(); pan(...k[e.key]); }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => { el.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', onKey); };
  }, [camera, gl, controls, size.height, minDistance, maxDistance]);
  return null;
}
