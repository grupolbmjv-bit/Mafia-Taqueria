'use client';

import { useMemo, useState } from 'react';
import { calculateCostImpact, construirArbolTrazabilidad } from '@/lib/costImpact';
import type { AnalysisData, DatasetCompleto, MoverInsumo, MoverReceta, NodoTrazabilidad, CostImpactResult } from '@/lib/costImpact';

const money = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const pct = (n: number) => (n >= 0 ? '+' : '') + (n || 0).toFixed(1) + '%';

const fechaCorta = (v: string) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
};

function riesgoSim(fc: number) {
  const v = Number(fc) || 0;
  if (v <= 0.33) return { emoji: '', label: 'Rentable', bg: 'bg-[#DCFCE7]', text: 'text-[#16A34A]', border: 'border-[#BBF7D0]', dot: '#16A34A' };
  if (v <= 0.35) return { emoji: '', label: 'Vigilar', bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]', border: 'border-[#FDE68A]', dot: '#F59E0B' };
  return { emoji: '', label: 'Accion', bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]', border: 'border-[#FECACA]', dot: '#DC2626' };
}

function descargarCSV(nombre: string, filas: (string | number)[][]) {
  const csv = filas.map((f) => f.map((c) => {
    const s = String(c ?? '');
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(';')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function BarraVar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.min(100, (Math.abs(value) / max) * 100) : 0;
  const color = value >= 0 ? 'bg-red-500' : 'bg-green-500';
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className={'h-2 rounded-full ' + color} style={{ width: w + '%' }} />
    </div>
  );
}

function LineChart({ points, label, color = '#B45309' }: { points: { x: string; y: number }[]; label: string; color?: string }) {
  if (!points.length) {
    return <p className="py-8 text-center text-sm text-muted">Sin datos historicos todavia. Genera snapshots semanales.</p>;
  }
  const w = 560, h = 180, pad = 30;
  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;
  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((p.y - minY) / rangeY) * (h - pad * 2);
    return { x, y };
  });
  const path = coords.map((c, i) => (i === 0 ? 'M' : 'L') + c.x.toFixed(1) + ' ' + c.y.toFixed(1)).join(' ');
  return (
    <svg viewBox={'0 0 ' + w + ' ' + h} className="w-full" role="img" aria-label={label}>
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#E5E7EB" />
      <path d={path} fill="none" stroke={color} strokeWidth={2} />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={3} fill={color} />
          <text x={c.x} y={h - pad + 14} fontSize={9} textAnchor="middle" fill="#94A3B8">{fechaCorta(points[i].x)}</text>
        </g>
      ))}
      <text x={pad} y={pad - 10} fontSize={10} fill="#64748B">{label}</text>
    </svg>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <p className="py-6 text-center text-sm text-muted">Sin variaciones registradas.</p>;
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="w-32 shrink-0 truncate text-xs text-ink" title={d.label}>{d.label}</span>
          <div className="flex-1"><BarraVar value={d.value} max={max} /></div>
          <span className={'w-16 shrink-0 text-right text-xs font-semibold ' + (d.value >= 0 ? 'text-red-600' : 'text-green-700')}>{pct(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

function MoverList({ items, icono }: { items: { id: string; nombre: string; variacionPct: number }[]; icono: string }) {
  if (!items.length) return <p className="text-sm text-muted">Sin variaciones registradas.</p>;
  const max = Math.max(...items.map((t) => Math.abs(t.variacionPct)), 1);
  return (
    <div className="space-y-3">
      {items.map((t) => (
        <div key={t.id} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm text-ink" title={t.nombre}>{icono} {t.nombre}</span>
          <div className="flex-1"><BarraVar value={t.variacionPct} max={max} /></div>
          <span className={'w-16 shrink-0 text-right text-sm font-semibold ' + (t.variacionPct >= 0 ? 'text-red-600' : 'text-green-700')}>{pct(t.variacionPct)}</span>
        </div>
      ))}
    </div>
  );
}

const alertaColor = (n: string) => (n === 'rojo' ? 'border-red-200 bg-red-50 text-red-700' : n === 'amarillo' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-green-200 bg-green-50 text-green-700');
const alertaIcono = (n: string) => (n === 'rojo' ? 'ALTO' : n === 'amarillo' ? 'MEDIO' : 'BAJO');
const categoriaLabel = (c: string) => ({ insumo: 'Insumo', subreceta: 'Subreceta', receta: 'Receta', utilidad: 'Utilidad', food_cost: 'Food Cost', margen: 'Margen' } as Record<string, string>)[c] || c;

function NodoArbol({ nodo }: { nodo: NodoTrazabilidad }) {
  const icono = nodo.tipo === 'insumo' ? '' : nodo.tipo === 'subreceta' ? '' : '';
  return (
    <details className="ml-1 border-l border-line pl-3" open>
      <summary className="cursor-pointer select-none py-1 text-sm text-ink">
        <span className="mr-1">{icono}</span>
        <span className="font-medium">{nodo.nombre}</span>
        <span className="ml-2 text-xs text-muted">({nodo.tipo})</span>
        {nodo.metricas && (
          <span className={'ml-2 text-xs font-semibold ' + (nodo.metricas.fueraObjetivo ? 'text-red-600' : 'text-green-700')}>
            Food Cost {(nodo.metricas.foodCost * 100).toFixed(1)}%  -  Utilidad {money(nodo.metricas.utilidad)}  -  Precio sug. {money(nodo.metricas.precioSugerido)}
          </span>
        )}
      </summary>
      {nodo.hijos.length > 0 && (
        <div className="ml-2">
          {nodo.hijos.map((h) => (<NodoArbol key={h.id} nodo={h} />))}
        </div>
      )}
    </details>
  );
}

function Trazabilidad({ dataset, analysis }: { dataset: DatasetCompleto; analysis: AnalysisData }) {
  const opciones = useMemo(() => [
    ...dataset.insumos.map((i) => ({ id: i.id, nombre: i.articulo, tipo: 'insumo' as const })),
    ...dataset.subrecetas.map((s) => ({ id: s.id, nombre: s.nombre, tipo: 'subreceta' as const })),
  ], [dataset]);
  const [itemId, setItemId] = useState('');
  const seleccion = opciones.find((o) => o.id === itemId);
  const arbol = useMemo(() => {
    if (!seleccion) return null;
    return construirArbolTrazabilidad(seleccion.id, seleccion.tipo, dataset);
  }, [seleccion, dataset]);

  return (
    <section className="card p-5">
      <h3 className="mb-1 font-semibold text-ink">Trazabilidad completa</h3>
      <p className="mb-3 text-xs text-salvia-700">Selecciona un insumo o subreceta para ver toda su cadena: subrecetas y recetas donde participa, hasta el food cost, utilidad y precio sugerido final.</p>
      <select value={itemId} onChange={(e) => setItemId(e.target.value)}
        className="mb-4 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#DBEAFE] sm:w-96">
        <option value="">Selecciona un insumo o subreceta...</option>
        <optgroup label="Insumos">
          {dataset.insumos.map((i) => (<option key={i.id} value={i.id}>{i.articulo}</option>))}
        </optgroup>
        <optgroup label="Subrecetas">
          {dataset.subrecetas.map((s) => (<option key={s.id} value={s.id}>{s.nombre}</option>))}
        </optgroup>
      </select>
      {arbol ? <NodoArbol nodo={arbol} /> : <p className="text-sm text-muted">Ningun elemento seleccionado todavia.</p>}
    </section>
  );
}

function Simulador({ dataset }: { dataset: DatasetCompleto }) {
  const [tipo, setTipo] = useState<'insumo' | 'subreceta'>('insumo');
  const [itemId, setItemId] = useState('');
  const [modo, setModo] = useState<'precio' | 'porcentaje'>('precio');
  const [valor, setValor] = useState('');

  const opciones = useMemo(() => tipo === 'insumo'
    ? dataset.insumos.map((i) => ({ id: i.id, nombre: i.articulo, costo: Number(i.coste) || 0 }))
    : dataset.subrecetas.map((s) => ({ id: s.id, nombre: s.nombre, costo: Number(s.costo_porcion) || 0 })), [tipo, dataset]);

  const seleccion = opciones.find((o) => o.id === itemId);
  const costoAnterior = seleccion ? seleccion.costo : 0;
  const num = Number(valor);
  const tieneValor = valor !== '' && !Number.isNaN(num);
  const costoNuevo = tieneValor ? (modo === 'precio' ? num : costoAnterior * (1 + num / 100)) : costoAnterior;

  const resultado: CostImpactResult | null = useMemo(() => {
    if (!itemId || !tieneValor) return null;
    return calculateCostImpact({ tipo, itemId, costoAnterior, costoNuevo, dataset });
  }, [tipo, itemId, costoAnterior, costoNuevo, dataset, tieneValor]);

  return (
    <div className="card p-5">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="font-display text-lg font-bold text-ambar-700"> Simular impacto</h2>
        <span className="chip bg-slate-100 text-slate-600">Solo consulta, no guarda</span>
      </div>
      <p className="mb-4 text-xs text-salvia-700">Elige un insumo o subreceta y prueba un nuevo costo o un porcentaje de variacion. Veras de inmediato el efecto en cascada sobre subrecetas, recetas, food cost, utilidad y precio sugerido.</p>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-salvia-700">Tipo</span>
          <select value={tipo} onChange={(e) => { setTipo(e.target.value as 'insumo' | 'subreceta'); setItemId(''); setValor(''); }}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#DBEAFE]">
            <option value="insumo">Insumo</option>
            <option value="subreceta">Subreceta</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-salvia-700">{tipo === 'insumo' ? 'Insumo' : 'Subreceta'}</span>
          <select value={itemId} onChange={(e) => { setItemId(e.target.value); setValor(''); }}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#DBEAFE]">
            <option value="">Selecciona...</option>
            {opciones.map((o) => (<option key={o.id} value={o.id}>{o.nombre}</option>))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-salvia-700">Modo</span>
          <select value={modo} onChange={(e) => setModo(e.target.value as 'precio' | 'porcentaje')}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#DBEAFE]">
            <option value="precio">Nuevo costo ($)</option>
            <option value="porcentaje">Variacion (%)</option>
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-salvia-700">{modo === 'precio' ? 'Nuevo costo' : 'Variacion porcentual'}</span>
          <input type="number" step="any" value={valor} onChange={(e) => setValor(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#DBEAFE]" />
        </label>
      </div>

      {seleccion && (
        <p className="mt-2 text-xs text-muted">Costo actual: {money(seleccion.costo)}</p>
      )}

      {resultado && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-3 text-sm">
            <span className="font-semibold">{resultado.insumo}</span>: {money(resultado.costoAnterior)}  ->  {money(resultado.costoNuevo)}{' '}
            <span className={resultado.porcentajeVariacion >= 0 ? 'text-red-600' : 'text-green-700'}>({pct(resultado.porcentajeVariacion)})</span>
          </p>

          {resultado.subrecetasAfectadas.length > 0 && (
            <div className="mb-4 overflow-x-auto">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-salvia-600">Subrecetas afectadas</h4>
              <table className="erp-table text-xs">
                <thead>
                  <tr>
                    <th>Subreceta</th>
                    <th className="!text-right">Costo actual</th>
                    <th className="!text-right">Costo nuevo</th>
                    <th className="!text-right">Variacion</th>
                    <th className="!text-right">Recetas donde participa</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.subrecetasAfectadas.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.nombre}</td>
                      <td className="text-right">{money(s.costoAnterior)}</td>
                      <td className="text-right">{money(s.costoNuevo)}</td>
                      <td className={'text-right ' + (s.variacionPct >= 0 ? 'text-red-600' : 'text-green-700')}>{pct(s.variacionPct)}</td>
                      <td className="text-right">{s.recetasQueLaUsan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {resultado.recetasAfectadas.length === 0 ? (
            <p className="text-sm text-muted">Este elemento no afecta ninguna receta activa.</p>
          ) : (
            <div className="overflow-x-auto">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-salvia-600">Recetas afectadas</h4>
              <table className="erp-table text-xs">
                <thead>
                  <tr>
                    <th>Receta</th>
                    <th className="!text-right">Costo actual</th>
                    <th className="!text-right">Costo nuevo</th>
                    <th className="!text-right">Nuevo Food Cost</th>
                    <th className="!text-right">Utilidad nueva</th>
                    <th className="!text-right">Precio sug.</th>
                    <th className="!text-center">Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.recetasAfectadas.map((r) => {
                    const rg = riesgoSim(r.foodCostNuevo);
                    return (
                    <tr key={r.id} className={r.fueraObjetivo ? 'bg-red-50/60' : ''}>
                      <td className="font-medium">{r.nombre}</td>
                      <td className="text-right">{money(r.costoAnterior)}</td>
                      <td className="text-right">{money(r.costoNuevo)}</td>
                      <td className={'text-right font-semibold ' + rg.text}>{(r.foodCostNuevo * 100).toFixed(1)}%</td>
                      <td className="text-right">{money(r.utilidadNueva)}</td>
                      <td className={'text-right font-semibold ' + (r.fueraObjetivo ? 'text-[#DC2626]' : 'text-[#16A34A]')}>{money(r.precioSugeridoNuevo)}</td>
                      <td className="text-center">
                        <span className={'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ' + rg.bg + ' ' + rg.text + ' ' + rg.border}>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: rg.dot }} />
                          {rg.label}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function MatrizImpacto({ dataset, analysis }: { dataset: DatasetCompleto; analysis: AnalysisData }) {
  const candidatos = useMemo(() => [
    ...analysis.moversInsumos.filter((m) => m.variacionAbs !== 0).map((m) => ({ id: m.id, nombre: m.articulo, tipo: 'insumo' as const, variacionPct: m.variacionPct, costoAnterior: m.costoAnterior, costoNuevo: m.costoActual })),
    ...analysis.moversSubrecetas.filter((m) => m.variacionAbs !== 0).map((m) => ({ id: m.id, nombre: m.nombre, tipo: 'subreceta' as const, variacionPct: m.variacionPct, costoAnterior: m.costoAnterior, costoNuevo: m.costoNuevo })),
  ].sort((a, b) => Math.abs(b.variacionPct) - Math.abs(a.variacionPct)), [analysis]);

  const [sel, setSel] = useState<string>('');
  const seleccionado = candidatos.find((c) => c.tipo + ':' + c.id === sel);

  const resultado: CostImpactResult | null = useMemo(() => {
    if (!seleccionado) return null;
    return calculateCostImpact({ tipo: seleccionado.tipo, itemId: seleccionado.id, costoAnterior: seleccionado.costoAnterior, costoNuevo: seleccionado.costoNuevo, dataset });
  }, [seleccionado, dataset]);

  const recomendaciones = useMemo(() => {
    if (!resultado) return [];
    return resultado.recetasAfectadas
      .filter((r) => r.fueraObjetivo && r.precioReal > 0)
      .map((r) => ({ nombre: r.nombre, incrementoPct: ((r.precioSugeridoNuevo - r.precioReal) / r.precioReal) * 100, precioSugerido: r.precioSugeridoNuevo }));
  }, [resultado]);

  const incrementoPromedio = recomendaciones.length ? recomendaciones.reduce((a, r) => a + r.incrementoPct, 0) / recomendaciones.length : 0;

  return (
    <section className="card p-5">
      <h3 className="mb-1 font-semibold text-ink">Matriz de impacto: elige un insumo o subreceta</h3>
      <p className="mb-3 text-xs text-salvia-700">Explora en detalle cuanto se propaga cada variacion historica al resto del menu y que recomendacion de precio de venta se sugiere.</p>
      <div className="mb-4 max-h-56 overflow-y-auto rounded-md border border-line">
        <table className="erp-table text-xs">
          <thead>
            <tr>
              <th>Elemento</th>
              <th>Tipo</th>
              <th className="!text-right">Variacion</th>
            </tr>
          </thead>
          <tbody>
            {candidatos.map((c) => {
              const key = c.tipo + ':' + c.id;
              return (
                <tr key={key} onClick={() => setSel(key)} className={'cursor-pointer hover:bg-slate-50 ' + (sel === key ? 'bg-ambar-50' : '')}>
                  <td className="font-medium">{c.nombre}</td>
                  <td>{c.tipo === 'insumo' ? 'Insumo' : 'Subreceta'}</td>
                  <td className={'text-right font-semibold ' + (c.variacionPct >= 0 ? 'text-red-600' : 'text-green-700')}>{pct(c.variacionPct)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {resultado && (
        <div className="space-y-4 border-t border-line pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-line bg-slate-50 p-3">
              <p className="text-xs text-salvia-600">Subrecetas afectadas</p>
              <p className="text-xl font-bold text-ink">{resultado.subrecetasAfectadas.length}</p>
            </div>
            <div className="rounded-md border border-line bg-slate-50 p-3">
              <p className="text-xs text-salvia-600">Recetas afectadas</p>
              <p className="text-xl font-bold text-ink">{resultado.recetasAfectadas.length}</p>
            </div>
            <div className="rounded-md border border-line bg-slate-50 p-3">
              <p className="text-xs text-salvia-600">Incremento total del menu</p>
              <p className={'text-xl font-bold ' + (resultado.impactoEconomico >= 0 ? 'text-red-600' : 'text-green-700')}>{money(resultado.impactoEconomico)}</p>
            </div>
          </div>

          {recomendaciones.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-semibold">Recomendacion: subir el precio de venta en promedio {pct(incrementoPromedio)} en {recomendaciones.length} receta(s) para restaurar el food cost objetivo.</p>
              <ul className="mt-2 space-y-1 text-xs">
                {recomendaciones.map((r) => (
                  <li key={r.nombre}>{r.nombre}: {pct(r.incrementoPct)} (precio sugerido {money(r.precioSugerido)})</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted">Ninguna receta afectada supera el food cost objetivo; no se requiere ajuste de precio.</p>
          )}
        </div>
      )}
    </section>
  );
}

export function AnalisisDashboard({ analysis, dataset, evolucionCosto }: { analysis: AnalysisData; dataset: DatasetCompleto; evolucionCosto: { fecha: string; costo_promedio: number }[] }) {
  const [tab, setTab] = useState<'resumen' | 'trazabilidad' | 'impacto' | 'matriz' | 'simular'>('resumen');

  const exportInsumos = () => descargarCSV('historial_precios_insumos', [
    ['Insumo', 'Referencia', 'Costo base', 'Costo actual', 'Variacion abs', 'Variacion %', 'Cambios'],
    ...analysis.moversInsumos.map((m) => [m.articulo, m.referencia, m.costoAnterior, m.costoActual, m.variacionAbs, m.variacionPct.toFixed(2), m.cambios]),
  ]);
  const exportSubrecetas = () => descargarCSV('impacto_subrecetas', [
    ['Subreceta', 'Costo anterior', 'Costo nuevo', 'Variacion %', 'Recetas donde participa', 'Impacto economico'],
    ...analysis.impactoSubrecetas.map((s) => [s.nombre, s.costoAnterior, s.costoNuevo, s.variacionPct.toFixed(2), s.recetasQueLaUsan, Math.round(s.impactoEconomico)]),
  ]);
  const exportRecetas = () => descargarCSV('impacto_recetas', [
    ['Receta', 'Costo anterior', 'Costo nuevo', 'Nuevo Food Cost %', 'Utilidad nueva', 'Precio sugerido nuevo', 'Fuera de objetivo'],
    ...analysis.impactoMenu.map((r) => [r.nombre, r.costoAnterior, r.costoNuevo, (r.foodCostNuevo * 100).toFixed(1), Math.round(r.utilidadNueva), Math.round(r.precioSugeridoNuevo), r.fueraObjetivo ? 'SI' : 'NO']),
  ]);
  const exportGlobal = () => descargarCSV('impacto_global_menu', [
    ['Metrica', 'Valor'],
    ['Recetas en riesgo', analysis.riesgoMenu.recetasEnRiesgo],
    ['Subrecetas criticas', analysis.riesgoMenu.subrecetasCriticas],
    ['Costo adicional generado', Math.round(analysis.riesgoMenu.costoAdicionalGenerado)],
    ['Impacto acumulado', Math.round(analysis.riesgoMenu.impactoAcumulado)],
    ['Variacion promedio insumos %', analysis.variacionPromedio.insumos.toFixed(2)],
    ['Variacion promedio subrecetas %', analysis.variacionPromedio.subrecetas.toFixed(2)],
    ['Variacion promedio recetas %', analysis.variacionPromedio.recetas.toFixed(2)],
    ['Variacion promedio global %', analysis.variacionPromedio.global.toFixed(2)],
  ]);

  return (
    <div className="space-y-6">
      <section className="dashboard-grid">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-salvia-600">Insumo mas inflacionario</p>
          {analysis.insumoMasInflacionario ? (
            <>
              <p className="mt-1 truncate font-semibold text-ink" title={analysis.insumoMasInflacionario.articulo}> {analysis.insumoMasInflacionario.articulo}</p>
              <p className="text-2xl font-bold text-red-600">{pct(analysis.insumoMasInflacionario.variacionPct)}</p>
            </>
          ) : <p className="mt-1 text-muted">N/A</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-salvia-600">Subreceta mas afectada</p>
          {analysis.subrecetaMasAfectada ? (
            <>
              <p className="mt-1 truncate font-semibold text-ink" title={analysis.subrecetaMasAfectada.nombre}> {analysis.subrecetaMasAfectada.nombre}</p>
              <p className="text-2xl font-bold text-red-600">{pct(analysis.subrecetaMasAfectada.variacionPct)}</p>
            </>
          ) : <p className="mt-1 text-muted">N/A</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-salvia-600">Receta mas afectada</p>
          {analysis.recetaMasAfectada ? (
            <>
              <p className="mt-1 truncate font-semibold text-ink" title={analysis.recetaMasAfectada.nombre}> {analysis.recetaMasAfectada.nombre}</p>
              <p className="text-2xl font-bold text-red-600">{money(analysis.recetaMasAfectada.variacionAbs)}</p>
            </>
          ) : <p className="mt-1 text-muted">N/A</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-salvia-600">Variacion promedio de costos</p>
          <p className={'mt-1 text-3xl font-bold ' + (analysis.variacionPromedio.global >= 0 ? 'text-red-600' : 'text-green-700')}>{pct(analysis.variacionPromedio.global)}</p>
          <p className="mt-1 text-[11px] text-muted">Insumos {pct(analysis.variacionPromedio.insumos)}  -  Subrecetas {pct(analysis.variacionPromedio.subrecetas)}  -  Recetas {pct(analysis.variacionPromedio.recetas)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-salvia-600">Riesgo del menu</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{analysis.riesgoMenu.recetasEnRiesgo} recetas</p>
          <p className="text-[11px] text-muted">{analysis.riesgoMenu.subrecetasCriticas} subreceta(s) critica(s)  -  costo adicional {money(analysis.riesgoMenu.costoAdicionalGenerado)}</p>
          <p className="mt-1 text-[10px] italic text-muted">Impacto mensual no disponible: el sistema no registra volumen de ventas.</p>
        </div>
      </section>

      {analysis.alertas.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-ambar-700"> Alertas automaticas</h2>
          <ul className="space-y-2">
            {analysis.alertas.map((a, i) => (
              <li key={i} className={'flex items-center gap-2 rounded-md border px-3 py-2 text-sm ' + alertaColor(a.nivel)}>
                <span>{alertaIcono(a.nivel)}</span>
                <span className="chip bg-white/60">{categoriaLabel(a.categoria)}</span>
                <span>{a.mensaje}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-semibold text-ambar-700"> Reportes:</span>
          <button onClick={exportInsumos} className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50">Historial de precios (Excel)</button>
          <button onClick={exportSubrecetas} className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50">Impacto en subrecetas (Excel)</button>
          <button onClick={exportRecetas} className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50">Impacto en recetas (Excel)</button>
          <button onClick={exportGlobal} className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50">Impacto global (Excel)</button>
          <button onClick={() => window.print()} className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50">Exportar PDF (imprimir)</button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-b border-line">
        {([['resumen', 'Variacion de costos'], ['trazabilidad', 'Trazabilidad'], ['impacto', 'Impacto en el menu'], ['matriz', 'Matriz de impacto'], ['simular', 'Simulacion']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={'px-4 py-2 text-sm font-medium ' + (tab === k ? 'border-b-2 border-ambar-600 text-ambar-700' : 'text-muted hover:text-ink')}>{l}</button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h3 className="mb-3 font-semibold text-ink">Top 10 insumos con mayor aumento</h3>
              <MoverList items={analysis.top10.insumosAumento.map((m) => ({ id: m.id, nombre: m.articulo, variacionPct: m.variacionPct }))} icono="" />
            </section>
            <section className="card p-5">
              <h3 className="mb-3 font-semibold text-ink">Top 10 subrecetas con mayor aumento</h3>
              <MoverList items={analysis.top10.subrecetasAumento.map((m) => ({ id: m.id, nombre: m.nombre, variacionPct: m.variacionPct }))} icono="" />
            </section>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h3 className="mb-3 font-semibold text-ink">Top 10 recetas mas impactadas</h3>
              <MoverList items={analysis.top10.recetasImpactadas.map((m) => ({ id: m.id, nombre: m.nombre, variacionPct: m.variacionPct }))} icono="" />
            </section>
            <section className="card p-5">
              <h3 className="mb-3 font-semibold text-ink">Variacion por familia</h3>
              <BarChart data={analysis.top10.familias.map((f) => ({ label: f.nombre, value: f.variacionPromedio }))} />
            </section>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h3 className="mb-3 font-semibold text-ink">Variacion por subfamilia</h3>
              <BarChart data={analysis.top10.subfamilias.map((f) => ({ label: f.nombre, value: f.variacionPromedio }))} />
            </section>
            <section className="card p-5">
              <h3 className="mb-3 font-semibold text-ink">Evolucion semanal del costo promedio</h3>
              <LineChart points={evolucionCosto.map((e) => ({ x: e.fecha, y: e.costo_promedio }))} label="Costo promedio" />
            </section>
          </div>
        </div>
      )}

      {tab === 'trazabilidad' && <Trazabilidad dataset={dataset} analysis={analysis} />}

      {tab === 'impacto' && (
        <div className="space-y-6">
          <section className="card p-5">
            <h3 className="mb-1 font-semibold text-ink">Impacto en recetas</h3>
            <p className="mb-3 text-xs text-salvia-700">Recetas afectadas por variaciones historicas de insumos y subrecetas, ordenadas de mayor a menor impacto.</p>
            {analysis.impactoMenu.length === 0 ? <p className="text-sm text-muted">Aun no hay impacto calculado.</p> : (
              <div className="overflow-x-auto">
                <table className="erp-table text-sm">
                  <thead>
                    <tr>
                      <th>Receta</th>
                      <th className="!text-right">Costo anterior</th>
                      <th className="!text-right">Costo nuevo</th>
                      <th className="!text-right">Nuevo Food Cost</th>
                      <th className="!text-right">Precio sugerido</th>
                      <th className="!text-center">Fuera de objetivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.impactoMenu.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium">{r.nombre}</td>
                        <td className="text-right">{money(r.costoAnterior)}</td>
                        <td className="text-right">{money(r.costoNuevo)}</td>
                        <td className={'text-right font-semibold ' + (r.fueraObjetivo ? 'text-red-600' : 'text-green-700')}>{(r.foodCostNuevo * 100).toFixed(1)}%</td>
                        <td className="text-right">{money(r.precioSugeridoNuevo)}</td>
                        <td className="text-center">{r.fueraObjetivo ? '' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="card p-5">
            <h3 className="mb-1 font-semibold text-ink">Impacto en subrecetas</h3>
            <p className="mb-3 text-xs text-salvia-700">Subrecetas afectadas y cuantas recetas dependen de cada una.</p>
            {analysis.impactoSubrecetas.length === 0 ? <p className="text-sm text-muted">Aun no hay impacto calculado.</p> : (
              <div className="overflow-x-auto">
                <table className="erp-table text-sm">
                  <thead>
                    <tr>
                      <th>Subreceta</th>
                      <th className="!text-right">Costo anterior</th>
                      <th className="!text-right">Costo nuevo</th>
                      <th className="!text-right">Variacion</th>
                      <th className="!text-right">Recetas donde participa</th>
                      <th className="!text-right">Impacto economico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.impactoSubrecetas.map((s) => (
                      <tr key={s.id}>
                        <td className="font-medium">{s.nombre}</td>
                        <td className="text-right">{money(s.costoAnterior)}</td>
                        <td className="text-right">{money(s.costoNuevo)}</td>
                        <td className={'text-right ' + (s.variacionPct >= 0 ? 'text-red-600' : 'text-green-700')}>{pct(s.variacionPct)}</td>
                        <td className="text-right">{s.recetasQueLaUsan}</td>
                        <td className="text-right font-semibold text-red-600">{money(s.impactoEconomico)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'matriz' && <MatrizImpacto dataset={dataset} analysis={analysis} />}

      {tab === 'simular' && <Simulador dataset={dataset} />}
    </div>
  );
}
