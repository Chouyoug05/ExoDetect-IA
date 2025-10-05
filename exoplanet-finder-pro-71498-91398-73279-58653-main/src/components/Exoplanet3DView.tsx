import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';

type Planet = {
  name: string;
  habitability_score?: number | null;
  radius?: number | null; // in Earth radii
  temp_eq?: number | null; // K
  distance_au?: number | null; // optional direct semi-major axis in AU
  distance?: number | null; // generic distance field from backend (fallback)
  gravity_m_s2?: number | null;
  luminosity_w_m2?: number | null;
  esi?: number | null;
  star_class?: string | null;
  distance_ly?: number | null;
  zone_habitable?: boolean | null;
};

function getColor(score: number = 0) {
  if (score < 0.3) return '#ef4444'; // red
  if (score < 0.7) return '#f59e0b'; // orange
  return '#22c55e'; // green
}

function PlanetMesh({ planet, index }: { planet: Planet; index: number }) {
  const ref = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const score = planet.habitability_score ?? 0;
  const color = getColor(score);

  // Size: map Earth radii to scene units
  const size = Math.max(0.2, Math.min(2, (planet.radius ?? 1) * 0.2));

  // Orbit radius: if distance_au missing, spread planets by index
  const orbit = useMemo(() => {
    const d = planet.distance_au ?? (planet.distance ?? 1);
    const base = Number.isFinite(d as number) && (d as number) > 0 ? (d as number) : 1 + index * 0.8;
    return Math.min(20, Math.max(2, base));
  }, [planet.distance_au, planet.distance, index]);

  // Angular speed based on orbit radius (farther -> slower)
  const angSpeed = useMemo(() => 0.2 / (orbit * 0.6), [orbit]);

  const orbitPoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    const steps = 128;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      pts.push([Math.cos(t) * orbit, 0, Math.sin(t) * orbit]);
    }
    return pts;
  }, [orbit]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.userData.theta = (ref.current.userData.theta || Math.random() * Math.PI * 2) + angSpeed * delta;
    const t = ref.current.userData.theta;
    ref.current.position.x = Math.cos(t) * orbit;
    ref.current.position.z = Math.sin(t) * orbit;
  });

  return (
    <group>
      <Line points={orbitPoints} color="#334155" lineWidth={1} dashed={false} />
      <mesh
        ref={ref}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial color={color} emissive={hovered ? color : '#000000'} emissiveIntensity={hovered ? 0.2 : 0} />
      </mesh>
      {hovered && (
        <Html position={[ref.current?.position.x ?? 0, (size + 0.8), ref.current?.position.z ?? 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
          <div style={{ background: 'rgba(0,0,0,0.75)', padding: '6px 8px', borderRadius: 6, fontSize: 12, color: 'white', whiteSpace: 'nowrap' }}>
            <div><strong>{planet.name}</strong></div>
            <div>Température: {planet.temp_eq != null ? `${planet.temp_eq.toFixed(0)} K` : 'Non dispo'}</div>
            <div>Score: {score.toFixed(2)}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function Exoplanet3DView({ planets }: { planets: Planet[] }) {
  const safePlanets = planets || [];
  const [selected, setSelected] = useState<Planet | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  return (
    <div style={{ width: '100%', height: 560, background: 'black', borderRadius: 12, position: 'relative' }}>
      {/* Panneau Légende explicite */}
      {showLegend && (
        <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 2, color: '#e2e8f0', fontSize: 12, background: 'rgba(17,24,39,0.9)', padding: '10px 12px', borderRadius: 10, maxWidth: 520, lineHeight: 1.4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 13 }}>Comment lire la scène 3D</strong>
            <button onClick={() => setShowLegend(false)} style={{ color: '#94a3b8' }}>Masquer</button>
          </div>
          <div style={{ marginBottom: 6 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 9999, background: '#ef4444', marginRight: 6 }} />
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 9999, background: '#f59e0b', marginRight: 6 }} />
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 9999, background: '#22c55e', marginRight: 6 }} />
            Couleur planète = score d’habitabilité (rouge → orange → vert)
          </div>
          <div>- Taille planète ≈ rayon (pl_rade). - Anneau = orbite simulée. - Vitesse ≈ 1/distance.</div>
          <div>- Survol: tooltip (nom, température, score). - Clic: panneau détaillé à droite.</div>
          <div>- Caméra: clic‑droit pour pivoter • molette pour zoomer • glisser pour déplacer.</div>
        </div>
      )}
      {!showLegend && (
        <button onClick={() => setShowLegend(true)} style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 2, fontSize: 12, background: 'rgba(17,24,39,0.8)', color: '#e2e8f0', padding: '6px 8px', borderRadius: 8 }}>Afficher la légende</button>
      )}
      {!!selected && (
        <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 2, width: 280, background: 'rgba(17,24,39,0.85)', color: '#e2e8f0', padding: 12, borderRadius: 10, fontSize: 12, backdropFilter: 'blur(4px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <strong style={{ fontSize: 13 }}>{selected.name || '—'}</strong>
            <button onClick={() => setSelected(null)} style={{ color: '#94a3b8' }}>✕</button>
          </div>
          <div>Score: {(selected.habitability_score ?? 0).toFixed(2)}</div>
          <div>Rayon: {selected.radius != null ? `${selected.radius.toFixed(2)} Terre` : 'Non disponible'}</div>
          <div>Température: {selected.temp_eq != null ? `${selected.temp_eq.toFixed(0)} K` : 'Non disponible'}</div>
          <div>Gravité: {selected.gravity_m_s2 != null ? `${selected.gravity_m_s2.toFixed(2)} m/s²` : 'Non disponible'}</div>
          <div>Insolation: {selected.luminosity_w_m2 != null ? selected.luminosity_w_m2.toExponential(2) : 'Non disponible'} W/m²</div>
          <div>Classe stellaire: {selected.star_class ?? 'Non disponible'}</div>
          <div>Distance: {selected.distance_ly != null ? `${selected.distance_ly.toFixed(1)} al` : 'Non disponible'}</div>
          <div>Zone habitable: {selected.zone_habitable ? 'Oui' : 'Non'}</div>
        </div>
      )}
      <Canvas camera={{ position: [0, 6, 16], fov: 60 }}>
        {/* Lights */}
        <ambientLight intensity={0.4} />
        <pointLight position={[0, 0, 0]} intensity={2.5} color={0xffffaa} />

        {/* Star (central) */}
        <mesh>
          <sphereGeometry args={[1.6, 48, 48]} />
          <meshStandardMaterial emissive={'#ffd166'} emissiveIntensity={1.2} color={'#fff2a8'} />
        </mesh>
        <Html position={[0, 2.5, 0]} center distanceFactor={12}>
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: '4px 6px', borderRadius: 6, fontSize: 12, color: 'white' }}>Étoile hôte</div>
        </Html>

        {/* Planets */}
        {safePlanets.map((p, i) => (
          <group key={p.name + i} onClick={(e) => { e.stopPropagation(); setSelected(p); }}>
            <PlanetMesh planet={p} index={i} />
          </group>
        ))}

        {/* Stars background */}
        <Stars radius={100} depth={40} count={2000} factor={4} fade speed={0.4} />

        <OrbitControls enableDamping dampingFactor={0.15} />
      </Canvas>
    </div>
  );
}


