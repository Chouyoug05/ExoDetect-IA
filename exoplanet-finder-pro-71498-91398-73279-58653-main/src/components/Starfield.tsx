import { useEffect, useRef } from 'react';

type Star = { x: number; y: number; z: number; pz: number; speed: number; size: number };

const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const initStars = () => {
      const count = Math.min(400, Math.floor((width * height) / 6000));
      const stars: Star[] = [];
      for (let i = 0; i < count; i++) {
        const z = Math.random() * width;
        stars.push({
          x: (Math.random() - 0.5) * width,
          y: (Math.random() - 0.5) * height,
          z,
          pz: z,
          speed: 2 + Math.random() * 2,
          size: 0.6 + Math.random() * 1.4,
        });
      }
      starsRef.current = stars;
    };

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const centerX = width / 2;
      const centerY = height / 2;

      for (const s of starsRef.current) {
        s.z -= s.speed;
        if (s.z < 1) {
          s.z = width;
          s.pz = s.z;
          s.x = (Math.random() - 0.5) * width;
          s.y = (Math.random() - 0.5) * height;
        }
        const sx = (s.x / s.z) * centerX + centerX;
        const sy = (s.y / s.z) * centerY + centerY;
        const r = s.size * (1 - s.z / width);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.2, r), 0, Math.PI * 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };

    initStars();
    draw();
    window.addEventListener('resize', onResize);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.4 }}
    />
  );
};

export default Starfield;


