import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbMotionLevel } from '../types';

interface AlfredWorldOrb3DProps {
  size?: 'mini' | 'hero' | 'panel';
  active?: boolean;
  motion?: OrbMotionLevel;
  label?: string;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<AlfredWorldOrb3DProps['size']>, string> = {
  mini: 'alfred-world-orb--mini',
  hero: 'alfred-world-orb--hero',
  panel: 'alfred-world-orb--panel',
};

function buildWorldNodes(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index += 1) {
    const y = 1 - (index / Math.max(1, count - 1)) * 2;
    const ringRadius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * index;
    positions[index * 3] = Math.cos(theta) * ringRadius * radius;
    positions[index * 3 + 1] = y * radius;
    positions[index * 3 + 2] = Math.sin(theta) * ringRadius * radius;
  }
  return positions;
}

export const AlfredWorldOrb3D: React.FC<AlfredWorldOrb3DProps> = ({
  size = 'hero',
  active = false,
  motion = active ? 'conversation' : 'idle',
  label = 'ALFRED 3D WORLD',
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef(motion === 'working' ? 3.6 : motion === 'conversation' ? 1.45 : 0.52);

  useEffect(() => {
    motionRef.current = motion === 'working' ? 3.6 : motion === 'conversation' ? 1.45 : 0.52;
  }, [motion]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const world = new THREE.Group();
    scene.add(world);

    const worldMaterial = new THREE.MeshBasicMaterial({
      color: 0x36e4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.74,
    });
    const worldMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), worldMaterial);
    world.add(worldMesh);

    const nodeMaterial = new THREE.PointsMaterial({
      color: 0xffd166,
      size: size === 'mini' ? 0.018 : 0.014,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(buildWorldNodes(size === 'mini' ? 48 : 96, 1.012), 3)
    );
    const nodes = new THREE.Points(nodeGeometry, nodeMaterial);
    world.add(nodes);

    const ambientLight = new THREE.AmbientLight(0x8beaff, 0.9);
    scene.add(ambientLight);

    let raf = 0;
    let lastTime = performance.now();
    let pulse = 0;

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(80, Math.floor(rect.width));
      const height = Math.max(80, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      const fit = Math.max(0.55, Math.min(width, height) / Math.max(width, height));
      const viewHeight = 2.34;
      const viewWidth = viewHeight * (width / height);
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      world.scale.setScalar(Math.min(1, fit + 0.35));
    };

    const animate = (now: number) => {
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      pulse += delta;
      const motion = motionRef.current;
      world.rotation.y += delta * 0.48 * motion;
      world.rotation.x += delta * 0.12 * motion;
      const breathing = 1 + Math.sin(pulse * (motion > 1 ? 3.2 : 1.2)) * (motion > 1 ? 0.018 : 0.008);
      world.scale.setScalar(breathing);
      nodeMaterial.opacity = 0.68 + Math.sin(pulse * (motion > 1 ? 4.4 : 1.8)) * (motion > 1 ? 0.18 : 0.08);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.dispose();
      worldMesh.geometry.dispose();
      worldMaterial.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      mount.querySelector('canvas')?.remove();
    };
  }, [size]);

  return (
    <div
      className={`alfred-world-orb ${SIZE_CLASS[size]} ${active ? 'is-active' : ''} ${className}`}
      aria-label={label}
      role="img"
    >
      <div ref={mountRef} className="alfred-world-orb__canvas" />
    </div>
  );
};
