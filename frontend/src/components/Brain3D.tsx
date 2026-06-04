import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface Brain3DProps {
  isAD: boolean;  // true for Alzheimer's, false for Healthy
}

export default function Brain3D({ isAD }: Brain3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(200, 200);
    renderer.setClearColor(0x000000, 0); // transparent
    mountRef.current.appendChild(renderer.domElement);

    // Brain geometry (simplified)
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: isAD ? 0xff4444 : 0x44ff44,  // red for AD, green for healthy
      transparent: true,
      opacity: 0.8,
      wireframe: false,
    });
    const brain = new THREE.Mesh(geometry, material);
    scene.add(brain);

    // Add some "lobes" (smaller spheres)
    const lobeGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const lobeMaterial = new THREE.MeshPhongMaterial({
      color: isAD ? 0xff6666 : 0x66ff66,
      transparent: true,
      opacity: 0.6,
    });
    
    const positions = [
      [-0.7, 0.5, 0.3], [0.7, 0.5, 0.3],   // frontal
      [-0.8, -0.3, 0.2], [0.8, -0.3, 0.2],   // temporal
      [0, 0.6, -0.5], [0, -0.6, -0.5]             // parietal/occipital
    ];
    
    positions.forEach(([x, y, z]) => {
      const lobe = new THREE.Mesh(lobeGeometry, lobeMaterial);
      lobe.position.set(x, y, z);
      scene.add(lobe);
    });

    // Lighting
    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(5, 5, 5).normalize();
    scene.add(light1);

    const light2 = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(light2);

    camera.position.z = 3;

    // Animation
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      brain.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [isAD]);

  return (
    <div ref={mountRef} className="brain-3d-container" />
  );
}
