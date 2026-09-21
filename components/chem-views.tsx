'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Atom, Minus, Plus, Scan, MousePointer2 } from 'lucide-react';
import { Mol } from '@/lib/chem';
import Image from 'next/image';
import type { RDKitModule, JSMol } from '@rdkit/rdkit';
let rdkitPromise: Promise<RDKitModule> | null = null;
export function getRDKit() {
  if (!rdkitPromise)
    rdkitPromise = new Promise((resolve, reject) => {
      const init = () => {
        window
          .initRDKitModule({ locateFile: () => '/rdkit/RDKit_minimal.wasm' })
          .then(resolve, reject);
      };
      if (typeof window.initRDKitModule === 'function') init();
      else {
        const s = document.createElement('script');
        s.src = '/rdkit/RDKit_minimal.js';
        s.onload = init;
        s.onerror = () => reject(Error('结构绘图引擎加载失败'));
        document.head.appendChild(s);
      }
    });
  return rdkitPromise;
}
export function Molecule({
  smiles,
  small = false,
}: {
  smiles: string;
  small?: boolean;
}) {
  const [drawing, setDrawing] = useState({
    smiles: '',
    small: false,
    svg: '',
    error: false,
  });
  const matches = drawing.smiles === smiles && drawing.small === small;
  const svg = matches ? drawing.svg : '';
  const error = matches && drawing.error;
  useEffect(() => {
    let alive = true;
    getRDKit()
      .then((R) => {
        let m: JSMol | null = null;
        try {
          m = R.get_mol(smiles);
          if (!m) throw Error();
          const output = m.get_svg(small ? 150 : 360, small ? 80 : 225);
          if (alive) setDrawing({ smiles, small, svg: output, error: false });
        } catch {
          if (alive) setDrawing({ smiles, small, svg: '', error: true });
        } finally {
          m?.delete();
        }
      })
      .catch(() => {
        if (alive) setDrawing({ smiles, small, svg: '', error: true });
      });
    return () => {
      alive = false;
    };
  }, [smiles, small]);
  return (
    <div className={'molecule ' + (small ? 'mini' : '')}>
      {svg ? (
        <Image
          unoptimized
          width={small ? 150 : 360}
          height={small ? 80 : 225}
          src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)}
          alt={'分子结构 ' + smiles}
        />
      ) : (
        <span>{error ? '结构绘图失败' : <Atom size={small ? 20 : 32} />}</span>
      )}
    </div>
  );
}
export const palette = [
  '#3572d4',
  '#e89837',
  '#28a394',
  '#9661c8',
  '#d86683',
  '#6d9e39',
  '#5a9ec4',
  '#b07445',
  '#c469c0',
  '#6b79a6',
  '#dc7653',
  '#3a9981',
];
export const color = (cluster: number) =>
  palette[(cluster - 1) % palette.length];
export function Scatter({
  rows,
  visible,
  selected,
  active,
  onActive,
  onRegion,
  mode,
}: {
  rows: Mol[];
  visible: Set<string>;
  selected: string[];
  active: string | null;
  onActive: (key: string) => void;
  onRegion: (keys: string[] | null) => void;
  mode: 'map' | 'scores';
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    wrap = useRef<HTMLDivElement>(null),
    points = useRef<{ x: number; y: number; row: Mol }[]>([]);
  const [size, setSize] = useState({ w: 700, h: 355 }),
    [zoom, setZoom] = useState(1),
    [hover, setHover] = useState<Mol | null>(null),
    [rect, setRect] = useState<number[] | null>(null);
  const origin = useRef<number[] | null>(null);
  const data = useMemo(
    () =>
      rows.filter(
        (r) => mode === 'map' || (r.docking !== null && r.mmgbsa !== null),
      ),
    [rows, mode],
  );
  useEffect(() => {
    if (!wrap.current) return;
    const obs = new ResizeObserver((entries) =>
      setSize({ w: entries[0].contentRect.width, h: 355 }),
    );
    obs.observe(wrap.current);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = size.w * dpr;
    el.height = size.h * dpr;
    const ctx = el.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.w, size.h);
    const left = 50,
      right = size.w - 25,
      top = 24,
      bottom = size.h - 40;
    const xval = (r: Mol) => (mode === 'map' ? r.x : r.docking!),
      yval = (r: Mol) => (mode === 'map' ? r.y : r.mmgbsa!);
    const xs = data.map(xval),
      ys = data.map(yval);
    let xmin = Math.min(...xs),
      xmax = Math.max(...xs),
      ymin = Math.min(...ys),
      ymax = Math.max(...ys);
    if (!data.length) {
      xmin = 0;
      xmax = 1;
      ymin = 0;
      ymax = 1;
    }
    if (xmax - xmin < 1e-8) {
      xmin -= 0.5;
      xmax += 0.5;
    }
    if (ymax - ymin < 1e-8) {
      ymin -= 0.5;
      ymax += 0.5;
    }
    const xrange = ((xmax - xmin) * 1.16) / zoom,
      yrange = ((ymax - ymin) * 1.18) / zoom;
    const xc = (xmin + xmax) / 2,
      yc = (ymin + ymax) / 2;
    xmin = xc - xrange / 2;
    ymin = yc - yrange / 2;
    ctx.font = '11px Segoe UI';
    ctx.fillStyle = '#8390a4';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    for (let i = 0; i <= 4; i++) {
      const xx = left + ((right - left) * i) / 4,
        yy = bottom - ((bottom - top) * i) / 4;
      ctx.strokeStyle = '#e5ebf3';
      ctx.beginPath();
      ctx.moveTo(xx, top);
      ctx.lineTo(xx, bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(left, yy);
      ctx.lineTo(right, yy);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText((xmin + (xrange * i) / 4).toFixed(2), xx, bottom + 18);
      ctx.textAlign = 'right';
      ctx.fillText(
        (ymin + (yrange * i) / 4).toFixed(mode === 'map' ? 2 : 1),
        left - 8,
        yy + 4,
      );
    }
    ctx.setLineDash([]);
    points.current = data.map((row) => ({
      row,
      x: left + ((xval(row) - xmin) / xrange) * (right - left),
      y: bottom - ((yval(row) - ymin) / yrange) * (bottom - top),
    }));
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();
    const draw = (p: (typeof points.current)[number]) => {
      const isActive = p.row.key === active,
        isSelected = selected.includes(p.row.key),
        isVisible = visible.has(p.row.key);
      ctx.globalAlpha = isVisible ? 0.85 : 0.1;
      ctx.beginPath();
      ctx.arc(
        p.x,
        p.y,
        isActive ? 8 : isSelected ? 6 : data.length > 700 ? 3.2 : 5,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = color(p.row.cluster);
      ctx.fill();
      if (isActive || isSelected) {
        ctx.globalAlpha = 1;
        ctx.lineWidth = isActive ? 2.3 : 1.8;
        ctx.strokeStyle = isActive ? '#182e4d' : '#1b9b73';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, isActive ? 10.5 : 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };
    points.current.filter((p) => p.row.key !== active).forEach(draw);
    points.current.filter((p) => p.row.key === active).forEach(draw);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#708198';
    ctx.fillText(
      mode === 'map' ? 'FastMap 1' : 'Docking score',
      size.w / 2,
      size.h - 3,
    );
    ctx.save();
    ctx.translate(12, size.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(mode === 'map' ? 'FastMap 2' : 'MM/GBSA', 0, 0);
    ctx.restore();
    if (rect) {
      ctx.fillStyle = 'rgba(36,101,211,.1)';
      ctx.strokeStyle = '#2465d3';
      ctx.setLineDash([4, 3]);
      ctx.fillRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
      ctx.strokeRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
    }
  }, [data, rows, visible, selected, active, size, zoom, rect, mode]);
  const pos = (e: React.PointerEvent) => {
    const b = canvas.current!.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  };
  const nearest = (x: number, y: number) =>
    points.current
      .filter((p) => visible.has(p.row.key))
      .reduce<{ p: (typeof points.current)[number] | null; d: number }>(
        (best, p) => {
          const d = Math.hypot(p.x - x, p.y - y);
          return d < best.d ? { p, d } : best;
        },
        { p: null, d: 14 },
      ).p;
  return (
    <div>
      <div className="plot" ref={wrap}>
        <canvas
          ref={canvas}
          style={{ width: '100%', height: 355, touchAction: 'none' }}
          aria-label="分子散点图。可点击分子或拖动框选范围。键盘用户可通过下方表格查看相同分子。"
          onPointerDown={(e) => {
            origin.current = pos(e);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const p = pos(e);
            if (
              origin.current &&
              Math.hypot(p[0] - origin.current[0], p[1] - origin.current[1]) > 5
            )
              setRect([...origin.current, ...p]);
            else setHover(nearest(p[0], p[1])?.row || null);
          }}
          onPointerUp={(e) => {
            const p = pos(e);
            if (
              origin.current &&
              Math.hypot(p[0] - origin.current[0], p[1] - origin.current[1]) > 5
            ) {
              const [x, y] = origin.current;
              onRegion(
                points.current
                  .filter(
                    (k) =>
                      visible.has(k.row.key) &&
                      k.x >= Math.min(x, p[0]) &&
                      k.x <= Math.max(x, p[0]) &&
                      k.y >= Math.min(y, p[1]) &&
                      k.y <= Math.max(y, p[1]),
                  )
                  .map((k) => k.row.key),
              );
            } else {
              const hit = nearest(p[0], p[1]);
              if (hit) onActive(hit.row.key);
            }
            origin.current = null;
            setRect(null);
          }}
          onPointerCancel={() => {
            origin.current = null;
            setRect(null);
          }}
          onPointerLeave={() => setHover(null)}
        />
        <div className="plot-tools">
          <button
            title="放大"
            aria-label="放大图"
            onClick={() => setZoom((z) => Math.min(4, z * 1.3))}
          >
            <Plus size={16} />
          </button>
          <button
            title="缩小"
            aria-label="缩小图"
            onClick={() => setZoom((z) => Math.max(0.5, z / 1.3))}
          >
            <Minus size={16} />
          </button>
          <button
            title="重置视图和框选"
            aria-label="重置图"
            onClick={() => {
              setZoom(1);
              onRegion(null);
            }}
          >
            <Scan size={16} />
          </button>
        </div>
        {hover && (
          <div className="plot-tooltip">
            <b>{hover.id}</b>
            <span>结构簇 {String(hover.cluster).padStart(2, '0')}</span>
            <span>
              Docking {hover.docking ?? '—'} · MM/GBSA {hover.mmgbsa ?? '—'}
            </span>
          </div>
        )}
        {!data.length && (
          <div className="plot-empty">
            {mode === 'scores'
              ? '导入两种分数后显示评分分布'
              : '导入 SMILES 或载入演示，开始探索化学空间'}
          </div>
        )}
      </div>
      <div className="plot-note">
        <span>
          <MousePointer2 size={13} />
          点击查看分子 · 拖动框选筛选范围
        </span>
        <span>
          {mode === 'map'
            ? '投影仅用于导航；相似度由原始指纹计算'
            : data.length + ' / ' + rows.length + ' 个分子有完整评分'}
        </span>
      </div>
    </div>
  );
}

