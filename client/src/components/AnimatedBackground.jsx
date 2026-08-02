import { useEffect, useRef } from 'react';

const SHAPES = [
  { id: 'pinkbeam', className: 'shape-pinkbeam', w: 340, h: 58, angle: 37, x: 0.16, y: 0.18, circles: 4 },
  { id: 'greenbars', className: 'shape-greenbars', w: 150, h: 62, angle: -31, x: 0.13, y: 0.42, circles: 2 },
  { id: 'cobalt', className: 'shape-cobalt', w: 86, h: 13, angle: -26, x: 0.34, y: 0.31, circles: 2 },
  { id: 'redtick', className: 'shape-redtick', w: 58, h: 12, angle: -55, x: 0.09, y: 0.66, circles: 1 },
  { id: 'ghost', className: 'shape-ghost', w: 154, h: 154, angle: 0, x: 0.72, y: 0.16, circles: 1 },
  { id: 'oval', className: 'shape-oval', w: 252, h: 184, angle: -5, x: 0.83, y: 0.8, circles: 2 },
  { id: 'blackbar', className: 'shape-blackbar', w: 216, h: 31, angle: -8, x: 0.74, y: 0.47, circles: 3 },
  { id: 'salmon', className: 'shape-salmon', w: 98, h: 98, angle: 12, x: 0.55, y: 0.71, circles: 1 },
  { id: 'sliver', className: 'shape-sliver', w: 118, h: 12, angle: 19, x: 0.47, y: 0.11, circles: 2 },
];

function AnimatedBackground() {
  const fieldRef = useRef(null);
  const shapeRefs = useRef(new Map());

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const width = () => window.innerWidth;
    const height = () => window.innerHeight;

    const bodies = SHAPES.map((shape) => {
      const el = shapeRefs.current.get(shape.id);
      const radius = Math.min(shape.w, shape.h) / 2 + 4;
      const span = Math.max(shape.w, shape.h) - 2 * radius;
      const circles = Array.from({ length: shape.circles }, (_, index) => ({
        offset: shape.circles === 1 ? 0 : -span / 2 + (span * index) / (shape.circles - 1),
        radius,
      }));

      return {
        ...shape,
        el,
        circles,
        horizontalMajor: shape.w >= shape.h,
        x: shape.x * width(),
        y: shape.y * height(),
        vx: (Math.random() - 0.5) * 34,
        vy: (Math.random() - 0.5) * 34,
        angleRad: (shape.angle * Math.PI) / 180,
        va: (Math.random() - 0.5) * 0.22,
        mass: (shape.w * shape.h) / 4300 + 1,
        grabbed: null,
      };
    });

    const render = (body) => {
      body.el.style.transform = `translate3d(${body.x - body.w / 2}px, ${body.y - body.h / 2}px, 0) rotate(${body.angleRad}rad)`;
    };

    bodies.forEach(render);

    if (reducedMotion) {
      field.classList.add('is-reduced-motion');
      return undefined;
    }

    const bodyCircles = (body) => body.circles.map((circle) => {
      const dx = body.horizontalMajor ? Math.cos(body.angleRad) : -Math.sin(body.angleRad);
      const dy = body.horizontalMajor ? Math.sin(body.angleRad) : Math.cos(body.angleRad);
      return {
        x: body.x + dx * circle.offset,
        y: body.y + dy * circle.offset,
        radius: circle.radius,
      };
    });

    const ripple = (clientX, clientY) => {
      bodies.forEach((body) => {
        if (body.grabbed) return;

        const dx = body.x - clientX;
        const dy = body.y - clientY;
        const distance = Math.hypot(dx, dy);
        if (distance < 360 && distance > 1) {
          const push = (116 * (1 - distance / 360)) / Math.sqrt(body.mass);
          body.vx += (dx / distance) * push;
          body.vy += (dy / distance) * push;
          body.va += (Math.random() - 0.5) * 0.28;
        }
      });
    };

    let active = null;
    let frameId = null;
    let last = performance.now();

    const release = () => {
      if (!active) return;

      const cap = 540;
      active.body.vx = Math.max(-cap, Math.min(cap, active.vx * 0.72));
      active.body.vy = Math.max(-cap, Math.min(cap, active.vy * 0.72));
      active.body.va += Math.max(-0.9, Math.min(0.9, active.vx / 1400));
      active.body.grabbed = null;
      active = null;
    };

    const handleShapeDown = (body) => (event) => {
      active = {
        body,
        lx: event.clientX,
        ly: event.clientY,
        lt: performance.now(),
        vx: 0,
        vy: 0,
      };
      body.grabbed = active;
      body.el.setPointerCapture(event.pointerId);
      event.stopPropagation();
    };

    const shapeHandlers = bodies.map((body) => {
      const handler = handleShapeDown(body);
      body.el.addEventListener('pointerdown', handler);
      return [body.el, handler];
    });

    const handleFieldDown = (event) => ripple(event.clientX, event.clientY);
    const handleMove = (event) => {
      if (!active) return;

      const now = performance.now();
      const dt = Math.max((now - active.lt) / 1000, 0.001);
      active.vx = (event.clientX - active.lx) / dt;
      active.vy = (event.clientY - active.ly) / dt;
      active.body.x = event.clientX;
      active.body.y = event.clientY;
      active.lx = event.clientX;
      active.ly = event.clientY;
      active.lt = now;
    };

    const step = (dt) => {
      const damping = 0.998;
      const minDrift = 5.5;
      const maxSpeed = 310;
      const restitution = 0.9;

      bodies.forEach((body) => {
        if (body.grabbed) {
          render(body);
          return;
        }

        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.angleRad += body.va * dt;
        body.vx *= damping;
        body.vy *= damping;
        body.va *= 0.996;

        const speed = Math.hypot(body.vx, body.vy);
        if (speed < minDrift) {
          const angle = Math.random() * Math.PI * 2;
          body.vx += Math.cos(angle) * 0.32;
          body.vy += Math.sin(angle) * 0.32;
        }
        if (speed > maxSpeed) {
          body.vx *= maxSpeed / speed;
          body.vy *= maxSpeed / speed;
        }

        const reach = Math.max(...body.circles.map((circle) => Math.abs(circle.offset) + circle.radius));
        if (body.x < reach) {
          body.x = reach;
          body.vx = Math.abs(body.vx) * restitution;
          body.va += 0.08 * Math.sign(body.vy || 1);
        }
        if (body.x > width() - reach) {
          body.x = width() - reach;
          body.vx = -Math.abs(body.vx) * restitution;
          body.va -= 0.08 * Math.sign(body.vy || 1);
        }
        if (body.y < reach) {
          body.y = reach;
          body.vy = Math.abs(body.vy) * restitution;
        }
        if (body.y > height() - reach) {
          body.y = height() - reach;
          body.vy = -Math.abs(body.vy) * restitution;
        }
      });

      for (let i = 0; i < bodies.length; i += 1) {
        for (let j = i + 1; j < bodies.length; j += 1) {
          const a = bodies[i];
          const b = bodies[j];
          const circlesA = bodyCircles(a);
          const circlesB = bodyCircles(b);

          circlesA.forEach((circleA) => {
            circlesB.forEach((circleB) => {
              const dx = circleB.x - circleA.x;
              const dy = circleB.y - circleA.y;
              const distance = Math.hypot(dx, dy);
              const minimum = circleA.radius + circleB.radius;
              if (distance <= 0 || distance >= minimum) return;

              const nx = dx / distance;
              const ny = dy / distance;
              const overlap = minimum - distance;
              const totalMass = a.mass + b.mass;

              if (!a.grabbed) {
                a.x -= nx * overlap * (b.mass / totalMass);
                a.y -= ny * overlap * (b.mass / totalMass);
              }
              if (!b.grabbed) {
                b.x += nx * overlap * (a.mass / totalMass);
                b.y += ny * overlap * (a.mass / totalMass);
              }

              const rvx = b.vx - a.vx;
              const rvy = b.vy - a.vy;
              const velocityNormal = rvx * nx + rvy * ny;
              if (velocityNormal >= 0) return;

              const impulse = (-(1 + restitution) * velocityNormal) / (1 / a.mass + 1 / b.mass);
              if (!a.grabbed) {
                a.vx -= (impulse * nx) / a.mass;
                a.vy -= (impulse * ny) / a.mass;
                a.va += (Math.random() - 0.5) * 0.28;
              }
              if (!b.grabbed) {
                b.vx += (impulse * nx) / b.mass;
                b.vy += (impulse * ny) / b.mass;
                b.va += (Math.random() - 0.5) * 0.28;
              }
            });
          });
        }
      }

      bodies.forEach(render);
    };

    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      step(dt);
      frameId = window.requestAnimationFrame(loop);
    };

    const start = () => {
      if (frameId || document.hidden) return;
      last = performance.now();
      frameId = window.requestAnimationFrame(loop);
    };

    const stop = () => {
      if (!frameId) return;
      window.cancelAnimationFrame(frameId);
      frameId = null;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    field.addEventListener('pointerdown', handleFieldDown, { passive: true });
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    document.addEventListener('visibilitychange', handleVisibility);
    start();

    return () => {
      stop();
      field.removeEventListener('pointerdown', handleFieldDown);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      document.removeEventListener('visibilitychange', handleVisibility);
      shapeHandlers.forEach(([el, handler]) => el.removeEventListener('pointerdown', handler));
    };
  }, []);

  return (
    <div className="suprematist-field" ref={fieldRef} aria-hidden="true">
      <div className="paper-grain"></div>
      {SHAPES.map((shape) => (
        <div
          key={shape.id}
          ref={(node) => {
            if (node) {
              shapeRefs.current.set(shape.id, node);
            } else {
              shapeRefs.current.delete(shape.id);
            }
          }}
          className={`suprematist-shape ${shape.className}`}
        >
          {shape.id === 'greenbars' && (
            <>
              <i></i>
              <i></i>
              <i></i>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default AnimatedBackground;
