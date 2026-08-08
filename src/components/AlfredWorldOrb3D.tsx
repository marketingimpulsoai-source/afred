import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AlfredWorldOrb3DProps {
  size?: 'mini' | 'hero' | 'panel';
  active?: boolean;
  label?: string;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<AlfredWorldOrb3DProps['size']>, string> = {
  mini: 'alfred-world-orb--mini',
  hero: 'alfred-world-orb--hero',
  panel: 'alfred-world-orb--panel',
};

function buildFibonacciSphere(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    positions[i * 3] = Math.cos(theta) * r * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return positions;
}

export const AlfredWorldOrb3D: React.FC<AlfredWorldOrb3DProps> = ({
  size = 'hero',
  active = false,
  label = 'ALFRED WORLD CORE',
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = size === 'mini' ? 3.4 : 3.15;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const globeRadius = 1;
    const earthWireframe = new THREE.Mesh(
      new THREE.SphereGeometry(globeRadius, 64, 64),
      new THREE.MeshPhongMaterial({
        color: 0x22d3ee,
        wireframe: true,
        transparent: true,
        opacity: size === 'mini' ? 0.42 : 0.32,
        emissive: 0x22d3ee,
        emissiveIntensity: active ? 0.86 : 0.52,
      })
    );
    globeGroup.add(earthWireframe);

    const innerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.94, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x071225, transparent: true, opacity: size === 'mini' ? 0.72 : 0.58 })
    );
    globeGroup.add(innerSphere);

    const meridian = new THREE.Mesh(
      new THREE.TorusGeometry(1.28, 0.006, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0x8aebff, transparent: true, opacity: 0.46 })
    );
    meridian.rotation.x = Math.PI / 2;
    globeGroup.add(meridian);

    const rings: THREE.Mesh[] = [];
    [1.38, 1.62, 1.92].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, index === 0 ? 0.01 : 0.007, 12, 160),
        new THREE.MeshBasicMaterial({
          color: index === 1 ? 0xddb7ff : index === 2 ? 0xffd882 : 0x22d3ee,
          transparent: true,
          opacity: 0.28 + index * 0.08,
        })
      );
      ring.rotation.x = Math.PI / (2.6 + index * 0.3);
      ring.rotation.y = Math.PI / (3.1 - index * 0.2);
      globeGroup.add(ring);
      rings.push(ring);
    });

    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(buildFibonacciSphere(size === 'mini' ? 90 : 160, 1.04), 3));
    const nodeMaterial = new THREE.PointsMaterial({
      color: active ? 0xffd882 : 0x22d3ee,
      size: size === 'mini' ? 0.025 : 0.021,
      transparent: true,
      opacity: active ? 0.92 : 0.74,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nodes = new THREE.Points(nodeGeometry, nodeMaterial);
    globeGroup.add(nodes);

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = size === 'mini' ? 80 : 180;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const theta = (i * 2.3999632297) % (Math.PI * 2);
      const phi = Math.acos(2 * ((i * 37) % particleCount) / particleCount - 1);
      const r = 1.45 + ((i * 13) % 50) / 170;
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x8aebff,
      size: size === 'mini' ? 0.012 : 0.016,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    globeGroup.add(particles);

    scene.add(new THREE.AmbientLight(0x8aebff, 0.6));
    const pointLight = new THREE.PointLight(0x22d3ee, active ? 2.4 : 1.8);
    pointLight.position.set(4, 4, 5);
    scene.add(pointLight);

    let frame = 0;
    let raf = 0;
    let pointerX = 0;
    let pointerY = 0;

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(80, Math.floor(rect.width));
      const height = Math.max(80, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.24;
      pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.18;
    };

    const animate = () => {
      frame += 1;
      const time = performance.now() * 0.001;
      globeGroup.rotation.y += active ? 0.006 : 0.0032;
      globeGroup.rotation.x += active ? 0.002 : 0.001;
      globeGroup.rotation.y += (pointerX - globeGroup.rotation.y * 0.015) * 0.008;
      globeGroup.rotation.x += (pointerY - globeGroup.rotation.x * 0.015) * 0.008;
      earthWireframe.scale.setScalar(1 + Math.sin(time * (active ? 3.4 : 2.1)) * (active ? 0.045 : 0.024));
      nodeMaterial.opacity = (active ? 0.76 : 0.58) + Math.sin(time * 2.8) * 0.18;
      particleMaterial.opacity = 0.34 + Math.sin(time * 1.7) * 0.16;
      rings.forEach((ring, index) => {
        ring.rotation.x += (index + 1) * 0.0018;
        ring.rotation.y += (index % 2 === 0 ? 1 : -1) * 0.0024;
      });
      particles.rotation.y -= 0.0014;
      nodes.rotation.y += 0.0009;
      if (frame % 2 === 0 || size !== 'mini') renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    mount.addEventListener('pointermove', onPointerMove);
    resize();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      mount.removeEventListener('pointermove', onPointerMove);
      renderer.dispose();
      earthWireframe.geometry.dispose();
      (earthWireframe.material as THREE.Material).dispose();
      innerSphere.geometry.dispose();
      (innerSphere.material as THREE.Material).dispose();
      meridian.geometry.dispose();
      (meridian.material as THREE.Material).dispose();
      rings.forEach((ring) => {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      });
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      mount.querySelector('canvas')?.remove();
    };
  }, [active, size]);

  return (
    <div className={`alfred-world-orb ${SIZE_CLASS[size]} ${active ? 'is-active' : ''} ${className}`} aria-label={label}>
      <div className="alfred-world-orb__shader" aria-hidden="true" />
      <div ref={mountRef} className="alfred-world-orb__canvas" aria-hidden="true" />
      <div className="alfred-world-orb__scan" aria-hidden="true" />
      <div className="alfred-world-orb__label" aria-hidden="true">{size === 'mini' ? 'A' : 'ALFRED WORLD'}</div>
    </div>
  );
};
