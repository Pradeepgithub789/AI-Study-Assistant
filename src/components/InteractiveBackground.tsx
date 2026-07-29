import React, { useEffect, useRef } from 'react';
import { useStudyStore } from '../store/studyStore';

export const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useStudyStore((state) => state.theme);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Detect user accessibility preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Twinkling stars dataset
    const starCount = 220;
    interface Star {
      x: number;
      y: number;
      radius: number;
      baseAlpha: number;
      phase: number;
      twinkleSpeed: number;
    }
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 0.95 + 0.45,
        baseAlpha: Math.random() * 0.45 + 0.35,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.012 + 0.004,
      });
    }

    // Shooting star model
    interface ShootingStar {
      x: number;
      y: number;
      dx: number;
      dy: number;
      length: number;
      opacity: number;
      life: number;
      maxLife: number;
      active: boolean;
    }
    let shootingStar: ShootingStar | null = null;
    // Spawn cooldown in frames (approx. 8–15 seconds at 60 FPS is 480 to 900 frames)
    let spawnCooldown = Math.floor(Math.random() * 420) + 480;

    const spawnShootingStar = () => {
      const startFromRight = Math.random() > 0.3;
      const startX = startFromRight ? Math.random() * (width * 0.4) + width * 0.6 : Math.random() * (width * 0.3);
      const startY = Math.random() * (height * 0.2);
      
      const speed = Math.random() * 2 + 3; // slow moving
      const angle = Math.PI * 0.75 + (Math.random() * 0.08 - 0.04); // ~135 degrees diagonal down-left

      shootingStar = {
        x: startX,
        y: startY,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        length: Math.random() * 90 + 70,
        opacity: 0,
        life: 0,
        maxLife: Math.random() * 70 + 90,
        active: true,
      };
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Render stars
      stars.forEach((star) => {
        let alpha = star.baseAlpha;
        if (!prefersReducedMotion) {
          alpha = star.baseAlpha + Math.sin(time * star.twinkleSpeed + star.phase) * 0.28;
          alpha = Math.max(0.12, Math.min(0.92, alpha));
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render shooting stars
      if (!prefersReducedMotion) {
        if (shootingStar && shootingStar.active) {
          shootingStar.x += shootingStar.dx;
          shootingStar.y += shootingStar.dy;
          shootingStar.life++;

          // Fade transitions
          if (shootingStar.life < 18) {
            shootingStar.opacity = shootingStar.life / 18;
          } else if (shootingStar.life > shootingStar.maxLife - 25) {
            shootingStar.opacity = (shootingStar.maxLife - shootingStar.life) / 25;
          } else {
            shootingStar.opacity = 1;
          }

          if (shootingStar.life >= shootingStar.maxLife) {
            shootingStar.active = false;
            shootingStar = null;
            spawnCooldown = Math.floor(Math.random() * 420) + 480;
          } else {
            // Draw gradient trail line
            const grad = ctx.createLinearGradient(
              shootingStar.x,
              shootingStar.y,
              shootingStar.x - shootingStar.dx * 3.5,
              shootingStar.y - shootingStar.dy * 3.5
            );
            grad.addColorStop(0, `rgba(224, 242, 254, ${shootingStar.opacity})`); // Sky head
            grad.addColorStop(0.35, `rgba(139, 92, 246, ${shootingStar.opacity * 0.5})`); // Violet tail
            grad.addColorStop(1, `rgba(99, 102, 241, 0)`); // Faded tail

            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(shootingStar.x, shootingStar.y);
            ctx.lineTo(
              shootingStar.x - shootingStar.dx * 3.5,
              shootingStar.y - shootingStar.dy * 3.5
            );
            ctx.stroke();
          }
        } else {
          spawnCooldown--;
          if (spawnCooldown <= 0) {
            spawnShootingStar();
          }
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    if (prefersReducedMotion) {
      animate(0);
    } else {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [theme]);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none -z-20 overflow-hidden select-none bg-[#020617] dark:bg-[#020617] light:bg-[#f8fafc]">
      {/* Cosmic Nebula Gradients */}
      <div className="absolute inset-0 opacity-85 dark:opacity-85 light:opacity-20 transition-opacity duration-300">
        {/* Purple/Violet cluster top-left */}
        <div className="absolute top-[-10%] left-[-15%] w-[70vw] h-[70vh] bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.18),transparent_65%)] blur-3xl"></div>
        {/* Blue/Indigo cluster bottom-right */}
        <div className="absolute bottom-[-15%] right-[-15%] w-[75vw] h-[75vh] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18),transparent_65%)] blur-3xl"></div>
        {/* Cyan center ambient dot */}
        <div className="absolute top-[35%] left-[20%] w-[55vw] h-[55vh] bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06),transparent_60%)] blur-3xl"></div>
      </div>
      
      {/* Tiny stars canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Subtle overlay for text legibility */}
      <div className="absolute inset-0 bg-slate-950/20 dark:bg-slate-950/20 light:bg-transparent pointer-events-none"></div>
    </div>
  );
};

export default InteractiveBackground;
