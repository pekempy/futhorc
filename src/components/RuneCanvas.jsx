import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Somewhere to actually draw a rune.
 *
 * This replaces an instruction to "sketch it on paper, then check yourself",
 * which is a strange thing for a phone to say when it has a touchscreen and
 * already knows what the rune should look like.
 *
 * One finger draws. Two fingers pinch to zoom and pan. Zooming out is how you
 * get more room for a long shape without the app having to guess how much room
 * you wanted; zooming in is how you get the detail back.
 *
 * Ink is kept in *canvas* coordinates, not screen ones, so it stays put when
 * the view moves and the recogniser sees the same drawing however much you
 * zoomed while making it.
 */
export default function RuneCanvas({
  onChange,
  strokes,
  setStrokes,
  height = 260,
  guide = null,
  guideWidth = 60,
  disabled = false,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const live = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const [, force] = useState(0);

  const toCanvas = useCallback((clientX, clientY) => {
    const r = wrapRef.current.getBoundingClientRect();
    return [
      (clientX - r.left - view.x) / view.scale,
      (clientY - r.top - view.y) / view.scale,
    ];
  }, [view]);

  // ── Drawing ──────────────────────────────────────────────────────────────

  const onPointerDown = (e) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      // Second finger: this is a pinch, so whatever was being drawn was a
      // fumble rather than a mark. Dropping it beats leaving a stray line.
      live.current = null;
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        centre: [(a.x + b.x) / 2, (a.y + b.y) / 2],
        view,
      };
      force((n) => n + 1);
      return;
    }
    if (pointers.current.size === 1) {
      live.current = [toCanvas(e.clientX, e.clientY)];
      force((n) => n + 1);
    }
  };

  const onPointerMove = (e) => {
    if (disabled) return;
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const centre = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      const start = pinch.current;
      // Clamped: past about a third the strokes are a few pixels long and the
      // recogniser has nothing to work with; past 4x you can't see the rune.
      const scale = Math.min(4, Math.max(0.35, start.view.scale * (distance / start.distance)));
      const k = scale / start.view.scale;
      const r = wrapRef.current.getBoundingClientRect();
      const cx = start.centre[0] - r.left;
      const cy = start.centre[1] - r.top;
      // Keep the point between the fingers under the fingers.
      setView({
        scale,
        x: centre[0] - r.left - (cx - start.view.x) * k,
        y: centre[1] - r.top - (cy - start.view.y) * k,
      });
      return;
    }

    if (live.current) {
      live.current = [...live.current, toCanvas(e.clientX, e.clientY)];
      force((n) => n + 1);
    }
  };

  const finishPointer = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0 && live.current) {
      if (live.current.length >= 2) {
        const next = [...strokes, live.current];
        setStrokes(next);
        onChange?.(next);
      }
      live.current = null;
      force((n) => n + 1);
    }
  };

  // Wheel zoom, for anyone on a laptop.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setView((v) => {
        const scale = Math.min(4, Math.max(0.35, v.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
        const r = el.getBoundingClientRect();
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        const k = scale / v.scale;
        return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── Painting ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

    const css = getComputedStyle(document.documentElement);
    const inkColour = css.getPropertyValue('--ink')?.trim() || '#1b1916';
    const faint = css.getPropertyValue('--line-2')?.trim() || '#cdc5b8';

    // The rune to copy, faintly, if one was asked for.
    if (guide?.length) {
      const box = Math.min(w, h) * 0.62;
      const k = box / 100;
      const ox = (w - guideWidth * k) / 2;
      const oy = (h - box) / 2;
      ctx.strokeStyle = faint;
      ctx.lineWidth = 9 * k;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const s of guide) {
        ctx.beginPath();
        s.forEach(([x, y], i) => {
          const px = ox + x * k;
          const py = oy + y * k;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }
    }

    ctx.strokeStyle = inkColour;
    ctx.lineWidth = 6 / view.scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const all = live.current ? [...strokes, live.current] : strokes;
    for (const s of all) {
      if (s.length < 2) continue;
      ctx.beginPath();
      s.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    }
    ctx.restore();
  });

  const zoomPercent = Math.round(view.scale * 100);

  return (
    <div className="rune-canvas-wrap">
      <div
        ref={wrapRef}
        className="rune-canvas"
        style={{ height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
      >
        <canvas ref={canvasRef} />
      </div>
      <div className="row tiny muted" style={{ marginTop: '0.35rem', alignItems: 'center' }}>
        <span>Draw with one finger · pinch to zoom</span>
        <span className="grow" />
        {zoomPercent !== 100 && (
          <>
            <span>{zoomPercent}%</span>
            <button className="btn ghost small" onClick={() => setView({ scale: 1, x: 0, y: 0 })}>
              Reset view
            </button>
          </>
        )}
      </div>
    </div>
  );
}
