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
import { foodCost, precioSugerido as calcPrecioSugerido, utilidad as calcUtilidad, foodCostObjetivoDe } from './costeo';

export type TipoItem = 'insumo' | 'subreceta';

const sanitizePrecio = (n: any): number => {
    if (typeof n === 'number') return isFinite(n) ? n : 0;
    if (n === null || n === undefined || n === '') return 0;
    const limpio = String(n).replace(/[$.,\s]/g, '');
    const parsed = Number(limpio);
    return isFinite(parsed) ? parsed : 0;
};

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
