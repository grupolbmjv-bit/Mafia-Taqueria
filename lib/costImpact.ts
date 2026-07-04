// lib/costImpact.ts
// ============================================================================
// SERVICIO CENTRAL DE INTELIGENCIA DE NEGOCIO (BI): IMPACTO DE COSTOS
// ----------------------------------------------------------------------------
// Unica fuente de calculo para la trazabilidad completa del menu:
//   INSUMO -> SUBRECETA -> RECETA -> COSTO FINAL -> FOOD COST -> UTILIDAD -> PRECIO SUGERIDO
// Todas las pantallas del modulo "Analisis" (resumen, alertas, top 10,
// trazabilidad, impacto en el menu, simulador, matriz de impacto y
// exportes) deben consumir `calculateCostImpact()` y las funciones de este
// archivo. El costeo puntual de una receta siempre se apoya en
// `lib/costeo.ts` (fuente unica de formulas). No se duplican formulas aqui.
// ============================================================================

import type { Insumo, Receta, IngredienteReceta, HistorialReceta, HistorialInsumo, Familia, Subfamilia } from './api/gastrocore';
import { foodCost, precioSugerido as calcPrecioSugerido, utilidad as calcUtilidad, foodCostObjetivoDe, sanitizePrecio } from './costeo';

export type TipoItem = 'insumo' | 'subreceta';

const idEsSubreceta = (id: string) => String(id).indexOf('SUB-') === 0;
const idEsReceta = (id: string) => String(id).indexOf('REC-') === 0;

export interface DatasetCompleto {
    insumos: Insumo[];
    subrecetas: Receta[];
    recetas: Receta[];
    ingredientes: IngredienteReceta[];
    preciosHistoricos: HistorialInsumo[];
    historialRecetas: HistorialReceta[];
    familias: Familia[];
    subfamilias: Subfamilia[];
}

// ---------------------------------------------------------------------------
// Mapas auxiliares (grafo de dependencias insumo/subreceta -> receta)
// ---------------------------------------------------------------------------

function buildIngredientesPorReceta(ingredientes: IngredienteReceta[]): Map<string, IngredienteReceta[]> {
    const m = new Map<string, IngredienteReceta[]>();
    ingredientes.forEach((ing) => {
          const key = String(ing.receta_id || '');
          if (!key) return;
          if (!m.has(key)) m.set(key, []);
          m.get(key)!.push(ing);
    });
    return m;
}

function buildPadres(ingredientes: IngredienteReceta[]): Map<string, string[]> {
    const m = new Map<string, string[]>();
    ingredientes.forEach((ing) => {
          const itemId = String(ing.item_id || '');
          const recetaId = String(ing.receta_id || '');
          if (!itemId || !recetaId) return;
          if (!m.has(itemId)) m.set(itemId, []);
          m.get(itemId)!.push(recetaId);
    });
    return m;
}

export interface Afectados {
    subrecetaIds: Set<string>;
    recetaIds: Set<string>;
}

/** Recorre el grafo de dependencias hacia arriba: dado un insumo o subreceta, encuentra TODAS las subrecetas y recetas que lo usan directa o indirectamente. */
export function encontrarAfectados(itemId: string, padres: Map<string, string[]>): Afectados {
    const subrecetaIds = new Set<string>();
    const recetaIds = new Set<string>();
    const visitados = new Set<string>();
    const pila = [itemId];
    while (pila.length) {
          const actual = pila.pop() as string;
          const directos = padres.get(actual) || [];
          directos.forEach((padreId) => {
                  if (visitados.has(padreId)) return;
                  visitados.add(padreId);
                  if (idEsSubreceta(padreId)) {
                            subrecetaIds.add(padreId);
                            pila.push(padreId);
                  } else if (idEsReceta(padreId)) {
                            recetaIds.add(padreId);
                            pila.push(padreId);
                  }
          });
    }
    return { subrecetaIds, recetaIds };
}

/** Costo por porcion de una receta/subreceta, recalculado recursivamente con costos unitarios sobreescritos (para simulacion). */
function costoPorcionConOverride(
    recetaId: string,
    recetasById: Map<string, Receta>,
    ingredientesPorReceta: Map<string, IngredienteReceta[]>,
    costosBaseInsumo: Map<string, number>,
    overrides: Map<string, number>,
    cache: Map<string, number>,
    enProceso: Set<string>
  ): number {
    if (cache.has(recetaId)) return cache.get(recetaId) as number;
    if (enProceso.has(recetaId)) return Number(recetasById.get(recetaId)?.costo_porcion) || 0;
    enProceso.add(recetaId);
    const ingredientes = ingredientesPorReceta.get(recetaId) || [];
    let costoTotal = 0;
    ingredientes.forEach((ing) => {
          const itemId = String(ing.item_id);
          let costoUnitario: number;
          if (overrides.has(itemId)) {
                  costoUnitario = overrides.get(itemId) as number;
          } else if (ing.tipo_item === 'subreceta') {
                  costoUnitario = costoPorcionConOverride(itemId, recetasById, ingredientesPorReceta, costosBaseInsumo, overrides, cache, enProceso);
          } else {
                  costoUnitario = costosBaseInsumo.get(itemId) ?? 0;
          }
          const cantidad = Number(ing.cantidad) || 0;
                                                              const merma = Number(ing.merma_pct) || 0;
          costoTotal += cantidad * costoUnitario * (1 + merma / 100);
    });
    const r = recetasById.get(recetaId);
    const rendimiento = r && Number(r.rendimiento) > 0 ? Number(r.rendimiento) : 1;
    const costoPorcion = costoTotal / rendimiento;
    enProceso.delete(recetaId);
    cache.set(recetaId, costoPorcion);
    return costoPorcion;
}

// ---------------------------------------------------------------------------
// calculateCostImpact(): funcion central solicitada
// ---------------------------------------------------------------------------

export interface RecetaAfectada {
    id: string;
    nombre: string;
    costoAnterior: number;
    costoNuevo: number;
    foodCostAnterior: number;
    foodCostNuevo: number;
    utilidadAnterior: number;
    utilidadNueva: number;
    precioSugeridoAnterior: number;
    precioSugeridoNuevo: number;
    precioReal: number;
    variacionPct: number;
    impactoEconomico: number;
    fueraObjetivo: boolean;
}

export interface SubrecetaAfectada {
    id: string;
    nombre: string;
    costoAnterior: number;
    costoNuevo: number;
    variacionAbs: number;
    variacionPct: number;
    recetasQueLaUsan: number;
    impactoEconomico: number;
}

export interface CostImpactResult {
    insumo: string;
    itemId: string;
    tipo: TipoItem;
    subrecetasAfectadas: SubrecetaAfectada[];
    recetasAfectadas: RecetaAfectada[];
    costoAnterior: number;
    costoNuevo: number;
    foodCostAnterior: number;
    foodCostNuevo: number;
    utilidadAnterior: number;
    utilidadNueva: number;
    precioSugeridoAnterior: number;
    precioSugeridoNuevo: number;
    impactoEconomico: number;
    porcentajeVariacion: number;
}

export interface CostImpactInput {
    tipo: TipoItem;
    itemId: string;
    costoAnterior?: number;
    costoNuevo?: number;
    dataset: DatasetCompleto;
}

/**
 * Servicio unico de calculo de impacto de costos. Recorre
 * INSUMO/SUBRECETA -> SUBRECETA -> RECETA -> FOOD COST -> UTILIDAD -> PRECIO SUGERIDO.
 * Todas las pantallas de Analisis (resumen, alertas, tops, trazabilidad,
 * impacto en el menu, simulador y matriz de impacto) consumen esta funcion.
 */
export function calculateCostImpact(input: CostImpactInput): CostImpactResult {
    const { tipo, itemId, dataset } = input;
    const { insumos, subrecetas, recetas, ingredientes } = dataset;
    const recetasById = new Map<string, Receta>([...subrecetas, ...recetas].map((r) => [String(r.id), r]));
    const insumosById = new Map<string, Insumo>(insumos.map((i) => [String(i.id), i]));
    const ingredientesPorReceta = buildIngredientesPorReceta(ingredientes);
    const padres = buildPadres(ingredientes);

  const nombre = tipo === 'insumo' ? insumosById.get(itemId)?.articulo || itemId : recetasById.get(itemId)?.nombre || itemId;
    const costoGuardado = tipo === 'insumo' ? Number(insumosById.get(itemId)?.coste) || 0 : Number(recetasById.get(itemId)?.costo_porcion) || 0;
    const costoAnterior = input.costoAnterior ?? costoGuardado;
    const costoNuevo = input.costoNuevo ?? costoGuardado;

  const { subrecetaIds, recetaIds } = encontrarAfectados(itemId, padres);

  const costosBaseInsumo = new Map<string, number>();
    insumos.forEach((i) => costosBaseInsumo.set(String(i.id), Number(i.coste) || 0));

  const overridesAnterior = new Map<string, number>([[itemId, costoAnterior]]);
    const overridesNuevo = new Map<string, number>([[itemId, costoNuevo]]);
    const cacheAnterior = new Map<string, number>();
    const cacheNuevo = new Map<string, number>();

  const subrecetasAfectadas: SubrecetaAfectada[] = [];
    subrecetaIds.forEach((subId) => {
          const sub = recetasById.get(subId);
          if (!sub) return;
          const cA = costoPorcionConOverride(subId, recetasById, ingredientesPorReceta, costosBaseInsumo, overridesAnterior, cacheAnterior, new Set());
          const cN = costoPorcionConOverride(subId, recetasById, ingredientesPorReceta, costosBaseInsumo, overridesNuevo, cacheNuevo, new Set());
          const recetasQueLaUsan = encontrarAfectados(subId, padres).recetaIds.size;
          subrecetasAfectadas.push({
                  id: subId,
                  nombre: sub.nombre,
                  costoAnterior: cA,
                  costoNuevo: cN,
                  variacionAbs: cN - cA,
                  variacionPct: cA > 0 ? ((cN - cA) / cA) * 100 : 0,
                  recetasQueLaUsan,
                  impactoEconomico: cN - cA,
          });
    });

  const recetasAfectadas: RecetaAfectada[] = [];
    recetaIds.forEach((recId) => {
          const rec = recetasById.get(recId);
          if (!rec) return;
          const cA = costoPorcionConOverride(recId, recetasById, ingredientesPorReceta, costosBaseInsumo, overridesAnterior, cacheAnterior, new Set());
          const cN = costoPorcionConOverride(recId, recetasById, ingredientesPorReceta, costosBaseInsumo, overridesNuevo, cacheNuevo, new Set());
          const fcObj = foodCostObjetivoDe(rec);
          const precioReal = sanitizePrecio(rec.precio_real);
          const fcA = foodCost(cA, precioReal);
          const fcN = foodCost(cN, precioReal);
          recetasAfectadas.push({
                  id: recId,
                  nombre: rec.nombre,
                  costoAnterior: cA,
                  costoNuevo: cN,
                  foodCostAnterior: fcA,
                  foodCostNuevo: fcN,
                  utilidadAnterior: calcUtilidad(precioReal, cA),
                  utilidadNueva: calcUtilidad(precioReal, cN),
                  precioSugeridoAnterior: calcPrecioSugerido(cA, fcObj),
                  precioSugeridoNuevo: calcPrecioSugerido(cN, fcObj),
                  precioReal,
                  variacionPct: cA > 0 ? ((cN - cA) / cA) * 100 : 0,
                  impactoEconomico: cN - cA,
                  fueraObjetivo: fcN > fcObj,
          });
    });

  recetasAfectadas.sort((a, b) => b.impactoEconomico - a.impactoEconomico);
    subrecetasAfectadas.sort((a, b) => b.impactoEconomico - a.impactoEconomico);

  const impactoEconomico = recetasAfectadas.reduce((a, r) => a + r.impactoEconomico, 0);
    const n = recetasAfectadas.length || 1;
    const foodCostAnterior = recetasAfectadas.reduce((a, r) => a + r.foodCostAnterior, 0) / n;
    const foodCostNuevo = recetasAfectadas.reduce((a, r) => a + r.foodCostNuevo, 0) / n;
    const utilidadAnterior = recetasAfectadas.reduce((a, r) => a + r.utilidadAnterior, 0);
    const utilidadNueva = recetasAfectadas.reduce((a, r) => a + r.utilidadNueva, 0);
    const precioSugeridoAnterior = recetasAfectadas.reduce((a, r) => a + r.precioSugeridoAnterior, 0) / n;
    const precioSugeridoNuevo = recetasAfectadas.reduce((a, r) => a + r.precioSugeridoNuevo, 0) / n;

  return {
        insumo: nombre,
        itemId,
        tipo,
        subrecetasAfectadas,
        recetasAfectadas,
        costoAnterior,
        costoNuevo,
        foodCostAnterior: recetasAfectadas.length ? foodCostAnterior : 0,
        foodCostNuevo: recetasAfectadas.length ? foodCostNuevo : 0,
        utilidadAnterior,
        utilidadNueva,
        precioSugeridoAnterior: recetasAfectadas.length ? precioSugeridoAnterior : 0,
        precioSugeridoNuevo: recetasAfectadas.length ? precioSugeridoNuevo : 0,
        impactoEconomico,
        porcentajeVariacion: costoAnterior > 0 ? ((costoNuevo - costoAnterior) / costoAnterior) * 100 : 0,
          };
}

// ---------------------------------------------------------------------------
// Movers historicos: cuanto cambio cada insumo/subreceta/receta desde su
// primer registro historico hasta hoy (fuente: PreciosHistoricos / HistorialRecetas)
// ---------------------------------------------------------------------------

export interface MoverInsumo {
      id: string;
      articulo: string;
      referencia: string;
      subfamiliaId: string;
      costoAnterior: number;
      costoActual: number;
      variacionAbs: number;
      variacionPct: number;
      cambios: number;
      ultimaFecha: string;
}

export function construirMoversInsumos(insumos: Insumo[], preciosHistoricos: HistorialInsumo[]): MoverInsumo[] {
      const porInsumo = new Map<string, HistorialInsumo[]>();
      preciosHistoricos.forEach((h) => {
              const id = String(h.insumo_id || '');
              if (!id) return;
              if (!porInsumo.has(id)) porInsumo.set(id, []);
              porInsumo.get(id)!.push(h);
      });
      const out: MoverInsumo[] = [];
      insumos.forEach((ins) => {
              const regs = (porInsumo.get(String(ins.id)) || []).slice().sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
              if (!regs.length) return;
              const primero = regs[0];
              const base = primero.coste_anterior !== undefined && primero.coste_anterior !== null && (primero.coste_anterior as any) !== '' ? primero.coste_anterior : primero.coste;
              const costoAnterior = Number(base) || 0;
              const costoActual = Number(ins.coste) || 0;
              const variacionAbs = costoActual - costoAnterior;
              out.push({
                        id: ins.id,
                        articulo: ins.articulo,
                        referencia: ins.referencia,
                        subfamiliaId: ins.subfamilia_id,
                        costoAnterior,
                        costoActual,
                        variacionAbs,
                        variacionPct: costoAnterior ? (variacionAbs / costoAnterior) * 100 : 0,
                        cambios: regs.length,
                        ultimaFecha: regs[regs.length - 1].fecha,
              });
      });
      return out;
}

export interface MoverReceta {
      id: string;
      nombre: string;
      esSubreceta: boolean;
      costoAnterior: number;
      costoNuevo: number;
      variacionAbs: number;
      variacionPct: number;
      foodCostAnterior: number;
      foodCostNuevo: number;
      utilidadAnterior: number;
      utilidadNueva: number;
      precioSugeridoAnterior: number;
      precioSugeridoNuevo: number;
      cambios: number;
      ultimaFecha: string;
      subfamiliaId: string;
}

export function construirMoversRecetas(lista: Receta[], historialRecetas: HistorialReceta[], esSubreceta: boolean): MoverReceta[] {
      const porReceta = new Map<string, HistorialReceta[]>();
      historialRecetas.forEach((h) => {
              const id = String(h.receta_id || '');
              if (!id) return;
              if (!porReceta.has(id)) porReceta.set(id, []);
              porReceta.get(id)!.push(h);
      });
      const out: MoverReceta[] = [];
      lista.forEach((r) => {
              const regs = (porReceta.get(String(r.id)) || []).slice().sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
              if (!regs.length) return;
              const primero = regs[0];
              const costoAnterior = Number(primero.costo_porcion) || 0;
              const costoNuevo = Number(r.costo_porcion) || 0;
              if (costoAnterior <= 0) return;
              const variacionAbs = costoNuevo - costoAnterior;
              const fcObj = foodCostObjetivoDe(r);
              const precioReal = sanitizePrecio(r.precio_real);
              const foodCostAnterior = Number(primero.food_cost) > 0 ? Number(primero.food_cost) : foodCost(costoAnterior, precioReal);
              out.push({
                        id: r.id,
                        nombre: r.nombre,
                        esSubreceta,
                        costoAnterior,
                        costoNuevo,
                        variacionAbs,
                        variacionPct: (variacionAbs / costoAnterior) * 100,
                        foodCostAnterior,
                        foodCostNuevo: foodCost(costoNuevo, precioReal),
                        utilidadAnterior: calcUtilidad(precioReal, costoAnterior),
                        utilidadNueva: calcUtilidad(precioReal, costoNuevo),
                        precioSugeridoAnterior: calcPrecioSugerido(costoAnterior, fcObj),
                        precioSugeridoNuevo: calcPrecioSugerido(costoNuevo, fcObj),
                        cambios: regs.length,
                        ultimaFecha: regs[regs.length - 1].fecha,
                        subfamiliaId: r.subfamilia_id,
              });
      });
      return out.sort((a, b) => b.variacionPct - a.variacionPct);
}

// ---------------------------------------------------------------------------
// Variacion agregada por familia / subfamilia (usa subfamilia_id de cada
// receta o subreceta y la relacion Subfamilia -> Familia).
// ---------------------------------------------------------------------------

export interface VariacionGrupo {
      id: string;
      nombre: string;
      variacionPromedio: number;
      itemsAfectados: number;
}

function mapaSubfamiliaFamilia(subfamilias: Subfamilia[], familias: Familia[]) {
      const familiaPorId = new Map(familias.map((f) => [String(f.id), f.nombre]));
      const m = new Map<string, { familiaId: string; familiaNombre: string }>();
      subfamilias.forEach((sf) => {
              m.set(String(sf.id), {
                        familiaId: String(sf.familia_id || ''),
                        familiaNombre: familiaPorId.get(String(sf.familia_id || '')) || 'Sin familia',
              });
      });
      return m;
}

export function construirVariacionPorFamilia(movers: MoverReceta[], subfamilias: Subfamilia[], familias: Familia[]): VariacionGrupo[] {
      const mapa = mapaSubfamiliaFamilia(subfamilias, familias);
      const acc = new Map<string, { nombre: string; suma: number; n: number }>();
      movers.forEach((m) => {
              const info = mapa.get(String(m.subfamiliaId));
              const key = info ? info.familiaId : 'sin-familia';
              const nombre = info ? info.familiaNombre : 'Sin familia';
              if (!acc.has(key)) acc.set(key, { nombre, suma: 0, n: 0 });
              const a = acc.get(key)!;
              a.suma += m.variacionPct;
              a.n += 1;
      });
      return Array.from(acc.entries())
        .map(([id, v]) => ({ id, nombre: v.nombre, variacionPromedio: v.n ? v.suma / v.n : 0, itemsAfectados: v.n }))
        .sort((a, b) => Math.abs(b.variacionPromedio) - Math.abs(a.variacionPromedio));
}

export function construirVariacionPorSubfamilia(movers: MoverReceta[], subfamilias: Subfamilia[]): VariacionGrupo[] {
      const nombrePorId = new Map(subfamilias.map((sf) => [String(sf.id), sf.nombre]));
      const acc = new Map<string, { nombre: string; suma: number; n: number }>();
      movers.forEach((m) => {
              const key = String(m.subfamiliaId || 'sin-subfamilia');
              const nombre = nombrePorId.get(key) || 'Sin subfamilia';
              if (!acc.has(key)) acc.set(key, { nombre, suma: 0, n: 0 });
              const a = acc.get(key)!;
              a.suma += m.variacionPct;
              a.n += 1;
      });
      return Array.from(acc.entries())
        .map(([id, v]) => ({ id, nombre: v.nombre, variacionPromedio: v.n ? v.suma / v.n : 0, itemsAfectados: v.n }))
        .sort((a, b) => Math.abs(b.variacionPromedio) - Math.abs(a.variacionPromedio));
}

// ---------------------------------------------------------------------------
// Alertas automaticas: precio de insumo, costo de subreceta, costo de
// receta, Food Cost, utilidad y margen.
// ---------------------------------------------------------------------------

export interface Alerta {
      nivel: 'rojo' | 'amarillo' | 'verde';
      categoria: 'insumo' | 'subreceta' | 'receta' | 'utilidad' | 'food_cost' | 'margen';
      mensaje: string;
}

export function construirAlertas(
      moversInsumos: MoverInsumo[],
      moversSubrecetas: MoverReceta[],
      moversRecetas: MoverReceta[],
      padres: Map<string, string[]>
    ): Alerta[] {
      const alertas: Alerta[] = [];

  moversInsumos
        .filter((m) => m.variacionPct >= 15)
        .sort((a, b) => b.variacionPct - a.variacionPct)
        .slice(0, 8)
        .forEach((m) => {
                  const recetasAfectadas = encontrarAfectados(m.id, padres).recetaIds.size;
                  alertas.push({
                              nivel: m.variacionPct >= 30 ? 'rojo' : 'amarillo',
                              categoria: 'insumo',
                              mensaje: m.articulo + ' subio ' + m.variacionPct.toFixed(1) + '% de precio y afecta ' + recetasAfectadas + ' receta(s).',
                  });
        });

  moversSubrecetas
        .filter((m) => Math.abs(m.variacionPct) >= 10)
        .slice(0, 8)
        .forEach((m) => {
                  const recetasAfectadas = encontrarAfectados(m.id, padres).recetaIds.size;
                  alertas.push({
                              nivel: m.variacionPct >= 20 ? 'rojo' : 'amarillo',
                              categoria: 'subreceta',
                              mensaje: 'La subreceta ' + m.nombre + ' ' + (m.variacionPct >= 0 ? 'aumento' : 'se redujo') + ' ' + Math.abs(m.variacionPct).toFixed(1) + '% y afecta ' + recetasAfectadas + ' receta(s).',
                  });
        });

  moversRecetas.forEach((m) => {
          if (Math.abs(m.variacionAbs) >= 200) {
                    alertas.push({
                                nivel: m.variacionAbs >= 0 ? 'amarillo' : 'verde',
                                categoria: 'receta',
                                mensaje: m.nombre + ' ' + (m.variacionAbs >= 0 ? 'incremento' : 'redujo') + ' $' + Math.round(Math.abs(m.variacionAbs)) + ' por porcion.',
                    });
          }
                           const perdidaUtilidad = m.utilidadAnterior - m.utilidadNueva;
          if (m.utilidadAnterior > 0 && (perdidaUtilidad / m.utilidadAnterior) * 100 >= 10) {
                    alertas.push({
                                nivel: 'rojo',
                                categoria: 'utilidad',
                                mensaje: m.nombre + ' perdio ' + ((perdidaUtilidad / m.utilidadAnterior) * 100).toFixed(1) + '% de utilidad.',
                    });
          }
          const deltaFc = (m.foodCostNuevo - m.foodCostAnterior) * 100;
          if (Math.abs(deltaFc) >= 3) {
                    alertas.push({
                                nivel: deltaFc >= 0 ? 'amarillo' : 'verde',
                                categoria: 'food_cost',
                                mensaje: 'El Food Cost de ' + m.nombre + ' ' + (deltaFc >= 0 ? 'subio' : 'bajo') + ' ' + Math.abs(deltaFc).toFixed(1) + ' puntos.',
                    });
          }
          const base = m.precioSugeridoAnterior || 1;
          const deltaMargen = ((m.precioSugeridoNuevo - m.precioSugeridoAnterior) / base) * 100;
          if (Math.abs(deltaMargen) >= 10) {
                    alertas.push({
                                nivel: 'amarillo',
                                categoria: 'margen',
                                mensaje: 'El precio sugerido de ' + m.nombre + ' deberia ajustarse ' + (deltaMargen >= 0 ? '+' : '') + deltaMargen.toFixed(1) + '% para mantener el margen.',
                    });
          }
  });

  const orden = { rojo: 0, amarillo: 1, verde: 2 } as const;
      return alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}

// ---------------------------------------------------------------------------
// Riesgo del menu (quinta tarjeta del resumen superior)
// ---------------------------------------------------------------------------

export interface RiesgoMenu {
      recetasEnRiesgo: number;
      subrecetasCriticas: number;
      costoAdicionalGenerado: number;
      impactoAcumulado: number;
}

export function construirRiesgoMenu(
      recetasLive: { fueraObjetivo: boolean }[],
      moversSubrecetas: MoverReceta[],
      moversRecetas: MoverReceta[]
    ): RiesgoMenu {
      const recetasEnRiesgo = recetasLive.filter((r) => r.fueraObjetivo).length;
      const subrecetasCriticas = moversSubrecetas.filter((m) => m.variacionPct >= 10).length;
      const costoAdicionalGenerado = moversRecetas.reduce((a, m) => a + Math.max(0, m.variacionAbs), 0);
      const impactoAcumulado = moversSubrecetas.reduce((a, m) => a + Math.max(0, m.variacionAbs), 0) + costoAdicionalGenerado;
      return { recetasEnRiesgo, subrecetasCriticas, costoAdicionalGenerado, impactoAcumulado };
}

// ---------------------------------------------------------------------------
// Trazabilidad: arbol expandible INSUMO/SUBRECETA -> SUBRECETA -> RECETA
// ---------------------------------------------------------------------------

export interface NodoTrazabilidad {
      id: string;
      nombre: string;
      tipo: 'insumo' | 'subreceta' | 'receta';
      hijos: NodoTrazabilidad[];
      metricas?: { foodCost: number; utilidad: number; precioSugerido: number; fueraObjetivo: boolean };
}

export function construirArbolTrazabilidad(itemId: string, tipo: TipoItem, dataset: DatasetCompleto): NodoTrazabilidad {
      const { insumos, subrecetas, recetas, ingredientes } = dataset;
      const recetasById = new Map<string, Receta>([...subrecetas, ...recetas].map((r) => [String(r.id), r]));
      const insumosById = new Map<string, Insumo>(insumos.map((i) => [String(i.id), i]));
      const padres = buildPadres(ingredientes);

  function construirNodo(id: string, tipoNodo: 'insumo' | 'subreceta' | 'receta', visitados: Set<string>): NodoTrazabilidad {
          const nombre = tipoNodo === 'insumo' ? insumosById.get(id)?.articulo || id : recetasById.get(id)?.nombre || id;
          const hijosIds = (padres.get(id) || []).filter((h) => !visitados.has(h));
          const nuevosVisitados = new Set(visitados);
          nuevosVisitados.add(id);
          const hijos = hijosIds.map((hid) => construirNodo(hid, idEsSubreceta(hid) ? 'subreceta' : 'receta', nuevosVisitados));
          let metricas: NodoTrazabilidad['metricas'];
          if (tipoNodo === 'receta') {
                    const rec = recetasById.get(id);
                    if (rec) {
                                const fcObj = foodCostObjetivoDe(rec);
                                const precioReal = sanitizePrecio(rec.precio_real);
                                const cp = Number(rec.costo_porcion) || 0;
                                const fc = foodCost(cp, precioReal);
                                metricas = {
                                              foodCost: fc,
                                              utilidad: calcUtilidad(precioReal, cp),
                                              precioSugerido: calcPrecioSugerido(cp, fcObj),
                                              fueraObjetivo: fc > fcObj,
                                };
                    }
          }
          return { id, nombre, tipo: tipoNodo, hijos, metricas };
  }

  return construirNodo(itemId, tipo === 'insumo' ? 'insumo' : 'subreceta', new Set());
}

// ---------------------------------------------------------------------------
// Orquestador principal: buildAnalysisData()
// Unico punto de entrada que debe consumir la pantalla de Analisis (resumen,
// alertas, top 10, impacto en el menu/subrecetas, riesgo del menu). Internamente
// reutiliza calculateCostImpact() para consolidar el impacto en cascada de
// cada insumo/subreceta con variacion historica; no duplica formulas.
// ---------------------------------------------------------------------------

export interface Top10 {
      insumosAumento: MoverInsumo[];
      subrecetasAumento: MoverReceta[];
      recetasImpactadas: MoverReceta[];
      familias: VariacionGrupo[];
      subfamilias: VariacionGrupo[];
}

export interface AnalysisData {
      insumoMasInflacionario: MoverInsumo | null;
      subrecetaMasAfectada: MoverReceta | null;
      recetaMasAfectada: MoverReceta | null;
      variacionPromedio: { insumos: number; subrecetas: number; recetas: number; global: number };
      riesgoMenu: RiesgoMenu;
      alertas: Alerta[];
      top10: Top10;
      moversInsumos: MoverInsumo[];
      moversSubrecetas: MoverReceta[];
      moversRecetas: MoverReceta[];
      impactoMenu: RecetaAfectada[];
      impactoSubrecetas: SubrecetaAfectada[];
}

export function buildAnalysisData(dataset: DatasetCompleto): AnalysisData {
      const { insumos, subrecetas, recetas, ingredientes, preciosHistoricos, historialRecetas, familias, subfamilias } = dataset;
      const padres = buildPadres(ingredientes);

  const moversInsumos = construirMoversInsumos(insumos, preciosHistoricos).sort((a, b) => b.variacionPct - a.variacionPct);
      const moversSubrecetas = construirMoversRecetas(subrecetas, historialRecetas, true);
      const moversRecetas = construirMoversRecetas(recetas, historialRecetas, false);
      const moversRecetasTodas = construirMoversRecetas([...subrecetas, ...recetas], historialRecetas, false);

  const recetasLive = recetas.map((r) => {
          const fcObj = foodCostObjetivoDe(r);
          const cp = Number(r.costo_porcion) || 0;
          const precioReal = sanitizePrecio(r.precio_real);
          const fc = foodCost(cp, precioReal);
          return { fueraObjetivo: fc > fcObj };
  });

  const riesgoMenu = construirRiesgoMenu(recetasLive, moversSubrecetas, moversRecetas);
      const alertas = construirAlertas(moversInsumos, moversSubrecetas, moversRecetas, padres);
      const variacionFamilia = construirVariacionPorFamilia(moversRecetasTodas, subfamilias, familias);
      const variacionSubfamilia = construirVariacionPorSubfamilia(moversRecetasTodas, subfamilias);

  const impactoPorReceta = new Map<string, RecetaAfectada>();
      const impactoPorSubreceta = new Map<string, SubrecetaAfectada>();
      const movidos: { tipo: TipoItem; id: string }[] = [
              ...moversInsumos.filter((m) => m.variacionAbs !== 0).map((m) => ({ tipo: 'insumo' as TipoItem, id: m.id })),
              ...moversSubrecetas.filter((m) => m.variacionAbs !== 0).map((m) => ({ tipo: 'subreceta' as TipoItem, id: m.id })),
            ];
      movidos.forEach(({ tipo, id }) => {
              const mv: any = tipo === 'insumo' ? moversInsumos.find((m) => m.id === id) : moversSubrecetas.find((m) => m.id === id);
              if (!mv) return;
              const resultado = calculateCostImpact({
                        tipo,
                        itemId: id,
                        costoAnterior: mv.costoAnterior,
                        costoNuevo: tipo === 'insumo' ? mv.costoActual : mv.costoNuevo,
                        dataset,
              });
              resultado.recetasAfectadas.forEach((ra) => {
                        const previo = impactoPorReceta.get(ra.id);
                        if (!previo || Math.abs(ra.impactoEconomico) > Math.abs(previo.impactoEconomico)) impactoPorReceta.set(ra.id, ra);
              });
              resultado.subrecetasAfectadas.forEach((sa) => {
                        const previo = impactoPorSubreceta.get(sa.id);
                        if (!previo || Math.abs(sa.impactoEconomico) > Math.abs(previo.impactoEconomico)) impactoPorSubreceta.set(sa.id, sa);
              });
      });

  const impactoMenu = Array.from(impactoPorReceta.values()).sort((a, b) => b.impactoEconomico - a.impactoEconomico);
      const impactoSubrecetas = Array.from(impactoPorSubreceta.values()).sort((a, b) => b.impactoEconomico - a.impactoEconomico);

  const variacionPromedio = {
          insumos: moversInsumos.length ? moversInsumos.reduce((a, m) => a + m.variacionPct, 0) / moversInsumos.length : 0,
          subrecetas: moversSubrecetas.length ? moversSubrecetas.reduce((a, m) => a + m.variacionPct, 0) / moversSubrecetas.length : 0,
          recetas: moversRecetas.length ? moversRecetas.reduce((a, m) => a + m.variacionPct, 0) / moversRecetas.length : 0,
          global: 0,
  };
      const todasVariaciones = [...moversInsumos.map((m) => m.variacionPct), ...moversSubrecetas.map((m) => m.variacionPct), ...moversRecetas.map((m) => m.variacionPct)];
      variacionPromedio.global = todasVariaciones.length ? todasVariaciones.reduce((a, v) => a + v, 0) / todasVariaciones.length : 0;

  return {
          insumoMasInflacionario: moversInsumos[0] || null,
          subrecetaMasAfectada: moversSubrecetas[0] || null,
          recetaMasAfectada: moversRecetas[0] || null,
          variacionPromedio,
          riesgoMenu,
          alertas,
          top10: {
                    insumosAumento: moversInsumos.filter((m) => m.variacionPct > 0).slice(0, 10),
                    subrecetasAumento: moversSubrecetas.filter((m) => m.variacionPct > 0).slice(0, 10),
                    recetasImpactadas: moversRecetas.slice(0, 10),
                    familias: variacionFamilia.slice(0, 10),
                    subfamilias: variacionSubfamilia.slice(0, 10),
          },
          moversInsumos,
          moversSubrecetas,
          moversRecetas,
          impactoMenu,
          impactoSubrecetas,
  };
}
