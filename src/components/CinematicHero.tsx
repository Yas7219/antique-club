import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Float,
  Environment,
  ContactShadows,
  Sparkles,
  MeshDistortMaterial,
  Lathe,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import * as THREE from "three";

// The relic's silhouette: an ancient urn/chalice profile revolved into a lathe mesh.
const relicProfile = [
  new THREE.Vector2(0.0, -1.35),
  new THREE.Vector2(0.55, -1.3),
  new THREE.Vector2(0.62, -1.1),
  new THREE.Vector2(0.3, -0.95),
  new THREE.Vector2(0.34, -0.55),
  new THREE.Vector2(0.62, -0.15),
  new THREE.Vector2(0.68, 0.25),
  new THREE.Vector2(0.5, 0.55),
  new THREE.Vector2(0.56, 0.85),
  new THREE.Vector2(0.42, 1.05),
  new THREE.Vector2(0.18, 1.15),
  new THREE.Vector2(0.0, 1.18),
];

// The core artifact: an ornate revolved gold urn crowned by a glowing gem, banded in engraved rings.
const GoldRelic = () => {
  const groupRef = useRef<THREE.Group>(null);
  const gemRef = useRef<THREE.Mesh>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) groupRef.current.rotation.y = t * 0.28;
    if (gemRef.current) {
      gemRef.current.rotation.y = -t * 0.6;
      gemRef.current.position.y = 1.85 + Math.sin(t * 1.4) * 0.08;
    }
    if (ringARef.current) ringARef.current.rotation.z = t * 0.18;
    if (ringBRef.current) ringBRef.current.rotation.z = -t * 0.12;
    if (haloRef.current) {
      const m = haloRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.35 + Math.sin(t * 1.6) * 0.15;
    }
  });

  return (
    <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.7}>
      <group ref={groupRef}>
        {/* Ornate urn body */}
        <Lathe args={[relicProfile, 48]} castShadow receiveShadow>
          <meshStandardMaterial
            color="#d4af37"
            metalness={1}
            roughness={0.22}
            emissive="#7a5a10"
            emissiveIntensity={0.25}
          />
        </Lathe>

        {/* Engraved bands */}
        <mesh ref={ringARef} position={[0, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.58, 0.028, 16, 96]} />
          <meshStandardMaterial color="#f4d68a" metalness={1} roughness={0.15} emissive="#c9962a" emissiveIntensity={0.5} />
        </mesh>
        <mesh ref={ringBRef} position={[0, -0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.36, 0.022, 16, 96]} />
          <meshStandardMaterial color="#f4d68a" metalness={1} roughness={0.15} emissive="#c9962a" emissiveIntensity={0.5} />
        </mesh>

        {/* Wide halo ring floating around the relic */}
        <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2.3, 0, 0]}>
          <torusGeometry args={[2.15, 0.03, 16, 128]} />
          <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.25} emissive="#7a5a10" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2.3, 0, 0]}>
          <torusGeometry args={[2.6, 0.016, 16, 128]} />
          <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.35} emissive="#7a5a10" emissiveIntensity={0.3} />
        </mesh>

        {/* Glowing crowning gem */}
        <mesh ref={gemRef} position={[0, 1.85, 0]} castShadow>
          <octahedronGeometry args={[0.28, 0]} />
          <MeshDistortMaterial
            color="#ff6a3d"
            metalness={0.6}
            roughness={0.1}
            distort={0.15}
            speed={2}
            emissive="#ff4d1f"
            emissiveIntensity={1.4}
          />
        </mesh>
        <mesh ref={haloRef} position={[0, 1.85, 0]}>
          <sphereGeometry args={[0.42, 16, 16]} />
          <meshBasicMaterial color="#ffb37a" transparent opacity={0.35} />
        </mesh>
      </group>
    </Float>
  );
};

// Fine drifting dust motes that catch the key light.
const Dust = () => {
  const groupRef = useRef<THREE.Group>(null);
  const pts = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    for (let i = 0; i < 70; i++) {
      arr.push(new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 4));
    }
    return arr;
  }, []);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) groupRef.current.rotation.y = t * 0.02;
  });
  return (
    <group ref={groupRef}>
      {pts.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshBasicMaterial color="#f4d68a" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
};

// Subtle cinematic parallax: the camera drifts gently with pointer position.
const CameraRig = () => {
  const { camera, pointer } = useThree();
  const base = useMemo(() => new THREE.Vector3(0, 0.4, 5.5), []);
  useFrame(() => {
    camera.position.x += (base.x + pointer.x * 0.4 - camera.position.x) * 0.03;
    camera.position.y += (base.y + pointer.y * 0.25 - camera.position.y) * 0.03;
    camera.lookAt(0, 0.3, 0);
  });
  return null;
};

const CinematicHero = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        shadows
        camera={{ position: [0, 0.4, 5.5], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.8]}
      >
        <Suspense fallback={null}>
          <CameraRig />
          {/* Three-point cinematic lighting */}
          <ambientLight intensity={0.25} />
          {/* Key light — warm, casts shadow */}
          <spotLight position={[5, 6, 4]} angle={0.32} penumbra={0.85} intensity={2.6} color="#ffd88a" castShadow />
          {/* Rim light — cool, separates relic from background */}
          <pointLight position={[-4, 1.5, -3]} intensity={1.4} color="#7fa8ff" />
          {/* Fill light — deep red-gold, low intensity */}
          <pointLight position={[3, -1.2, 2]} intensity={0.7} color="#a1381a" />
          {/* Accent glow from the gem itself */}
          <pointLight position={[0, 1.85, 0]} intensity={1.1} color="#ff6a3d" distance={3} />

          <GoldRelic />

          {/* Layered sparkles: near, sharp motes and a wider soft field */}
          <Sparkles count={60} scale={[3.5, 3.5, 2.5]} size={2} speed={0.35} color="#ffe8b0" opacity={0.9} />
          <Sparkles count={35} scale={[7, 5, 4]} size={3.5} speed={0.2} color="#f4d68a" opacity={0.5} />
          <Dust />

          <ContactShadows position={[0, -2, 0]} opacity={0.6} scale={8} blur={2.4} far={4} color="#000" />
          <Environment preset="sunset" />
        </Suspense>

        <EffectComposer>
          <Bloom intensity={0.65} luminanceThreshold={0.35} luminanceSmoothing={0.9} mipmapBlur />
          <ChromaticAberration
            offset={new THREE.Vector2(0.0006, 0.0006)}
            radialModulation={false}
            modulationOffset={0}
          />
          <Vignette eskil={false} offset={0.25} darkness={0.9} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default CinematicHero;
