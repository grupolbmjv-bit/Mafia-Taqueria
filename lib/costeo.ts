// lib/costeo.ts
// ============================================================================
// FUENTE UNICA DE VERDAD PARA EL CALCULO DE COSTOS (CostCalculator)
// ----------------------------------------------------------------------------
// Todas las vistas (Recetas, ficha, Panel Ejecutivo, Reportes, Exportaciones,
// Analisis) deben consumir estas funciones. NO duplicar formulas en otros
// modulos. La funcion `calculateRecipeMetrics()` es el punto de entrada unico
// recomendado para cualquier pantalla nueva.
//
// Reglas del negocio (fijas):
//   - Impuesto al Consumo (INC) fijo del 8%. Los precios de venta lo incluyen.
//   - Food Cost objetivo por defecto del 35% (se puede sobreescribir por
//     receta via `margen_objetivo`, que hace las veces de "Configuracion").
//   - Food Cost = Costo por porcion / Precio base SIN impuesto.
//   - Precio base sin impuesto = precio_real / (1 + INC).
//   - Precio sugerido = (Costo por porcion / FC objetivo) * (1 + INC).
// ============================================================================

export const INC = 0.08;      // Impuesto al Consumo (fijo)
export const FC_OBJ = 0.35;   // Food Cost objetivo por defecto (fallback)

const num = (n: any): number => Number(n) || 0;

/**
 * Sanitiza un precio que puede llegar como string desde formularios, CSV o la
 * hoja de calculo (ej. "$ 8.900", "8,900", " 8900 "). Nunca debe llegar un
 * string sin limpiar a una operacion aritmetica.
 */
const sanitizePrecio = (n: any): number => {
    if (typeof n === 'number') return isFinite(n) ? n : 0;
    if (n === null || n === undefined || n === '') return 0;
    const limpio = String(n).replace(/[$.,\s]/g, '');
    const parsed = Number(limpio);
    return isFinite(parsed) ? parsed : 0;
};

/** Precio de venta base, quitando el impuesto al consumo. */
export function precioBaseSinImpuesto(precioReal: number): number {
    return sanitizePrecio(precioReal) / (1 + INC);
}

/**
 * Food Cost canonico = Costo por porcion / Precio base sin impuesto.
 * Es la UNICA definicion de Food Cost de la aplicacion.
 */
export function foodCost(costoPorcion: number, precioReal: number): number {
    const base = precioBaseSinImpuesto(precioReal);
    return base > 0 ? num(costoPorcion) / base : 0;
}

/**
 * Food Cost objetivo de una receta. Se lee de la "Configuracion" de la
 * receta (campo `margen_objetivo`, guardado al crear/editar la receta). Si
 * no existe o es invalido, se usa 35% por defecto y se registra un warning
 * para poder detectar recetas sin configurar.
 */
export function foodCostObjetivoDe(receta: any): number {
    const raw = receta?.margen_objetivo;
    const v = Number(raw);
    if (raw === undefined || raw === null || raw === '' || !isFinite(v) || v <= 0) {
          if (typeof console !== 'undefined') {
                  console.warn('[costeo] food_cost_objetivo no configurado para esta receta; usando 35% por defecto.');
          }
          return FC_OBJ;
    }
    return v > 1 ? v / 100 : v;
}

/** Precio sugerido para alcanzar el Food Cost objetivo (con impuesto incluido). */
export function precioSugerido(costoPorcion: number, foodCostObjetivo: number = FC_OBJ): number {
    const fcObj = foodCostObjetivo > 0 ? foodCostObjetivo : FC_OBJ;
    return (num(costoPorcion) / fcObj) * (1 + INC);
}

// Food Cost objetivo para la SUGERENCIA de precio del Panel Ejecutivo (30%).
// El resto de la app usa el objetivo por receta (o FC_OBJ). Ver Panel
// Ejecutivo: precio sugerido editable.
export const FC_OBJ_PANEL = 0.30;

/**
 * Precio de venta sugerido para el Panel Ejecutivo, calculado con el
 * Food Cost objetivo del 30% e impuesto al consumo del 8% (incluido).
 */
export function precioSugeridoPanel(costoPorcion: number): number {
    return FC_OBJ_PANEL > 0 ? (num(costoPorcion) / FC_OBJ_PANEL) * (1 + INC) : 0;
}

/** Utilidad = Precio de venta - Costo por porcion. */
export function utilidad(precioReal: number, costoPorcion: number): number {
    const p = sanitizePrecio(precioReal);
    return p > 0 ? p - num(costoPorcion) : 0;
}

/** Margen bruto = Utilidad / Precio de venta. */
export function margenBruto(precioReal: number, costoPorcion: number): number {
    const p = sanitizePrecio(precioReal);
    return p > 0 ? (p - num(costoPorcion)) / p : 0;
}

/** Precio de venta necesario para volver al Food Cost objetivo dado un nuevo costo. */
export function precioParaObjetivo(costoPorcion: number, foodCostObjetivo?: number): number {
    return precioSugerido(costoPorcion, foodCostObjetivo);
}

export type Semaforo = {
    hex: string;
    dot: string;
    text: string;
    bg: string;
    border: string;
    label: string;
    emoji: string;
};

/** Semaforo unico: verde <=33%, amarillo 33-35%, rojo >35%. */
export function semaforo(fc: number): Semaforo {
    const v = num(fc);
    if (v <= 0.33)
          return { hex: '#16A34A', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-[#DCFCE7]', border: 'border-[#BBF7D0]', label: 'Rentable', emoji: 'Optimo' };
    if (v <= 0.35)
          return { hex: '#F59E0B', dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-[#FEF3C7]', border: 'border-[#FDE68A]', label: 'En limite', emoji: 'Alerta' };
    return { hex: '#DC2626', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-[#FEE2E2]', border: 'border-[#FECACA]', label: 'Critico', emoji: 'Critico' };
}

/** True si el Food Cost esta dentro del objetivo (<= 35%). */
export function esRentable(fc: number): boolean {
    return num(fc) > 0 && num(fc) <= FC_OBJ;
}

export type Costeo = {
    costoPorcion: number;
    precioReal: number;
    precioSugerido: number;
    precioBase: number;
    foodCost: number;
    utilidad: number;
    margenBruto: number;
    rentable: boolean;
    semaforo: Semaforo;
};

/**
 * Costeo completo de una receta desde la fuente unica.
 * Usa el costo por porcion del backend (motor de costeo canonico) y calcula
 * el resto de indicadores. Si se pasa `precioOverride`, simula ese precio de
 * venta SIN alterar los datos guardados (para "Nuevo precio de venta").
 */
export function costearReceta(receta: any, precioOverride?: number | string): Costeo {
    const costoPorcion = num(receta?.costo_porcion) || num(receta?.costo_total);
    const tieneOverride = precioOverride !== undefined && precioOverride !== null && precioOverride !== '';
    const precioReal = tieneOverride ? sanitizePrecio(precioOverride) : sanitizePrecio(receta?.precio_real);
    const fcObj = foodCostObjetivoDe(receta);
    const fc = foodCost(costoPorcion, precioReal);
    return {
          costoPorcion,
          precioReal,
          precioSugerido: precioSugerido(costoPorcion, fcObj),
          precioBase: precioBaseSinImpuesto(precioReal),
          foodCost: fc,
          utilidad: utilidad(precioReal, costoPorcion),
          margenBruto: margenBruto(precioReal, costoPorcion),
          rentable: esRentable(fc),
          semaforo: semaforo(fc),
    };
}

export type RecipeMetrics = {
    costoPorcion: number;
    foodCost: number;
    precioSugerido: number;
    utilidad: number;
    margenBruto: number;
    rentable: boolean;
};

/**
 * Funcion unica y reutilizable que deben consumir TODAS las pantallas
 * (Recetario, ficha de receta, Panel Ejecutivo, Analisis, Rentabilidad,
 * exportaciones PDF) para obtener los indicadores de una receta. Nunca
 * devuelve undefined ni depende de campos pre-calculados y potencialmente
 * obsoletos guardados en la hoja (food_cost, precio_sugerido); siempre
 * recalcula en vivo a partir de costo_porcion y precio_real.
 */
export function calculateRecipeMetrics(receta: any, precioOverride?: number | string): RecipeMetrics {
    const c = costearReceta(receta, precioOverride);
    return {
          costoPorcion: c.costoPorcion,
          foodCost: c.foodCost,
          precioSugerido: c.precioSugerido,
          utilidad: c.utilidad,
          margenBruto: c.margenBruto,
          rentable: c.rentable,
    };
}
