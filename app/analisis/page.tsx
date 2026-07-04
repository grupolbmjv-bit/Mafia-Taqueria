import {
    getAnalytics,
    getInsumos,
    getSubrecetas,
    getRecetas,
    getAllIngredientes,
    getAllPreciosHistoricos,
    getAllHistorialRecetas,
    getFamilias,
    getSubfamilias,
} from '@/lib/api/gastrocore';
import { buildAnalysisData, type DatasetCompleto } from '@/lib/costImpact';
import { AnalisisDashboard } from './AnalisisDashboard';

export const dynamic = 'force-dynamic';

export default async function AnalisisPage() {
    let analysis = null;
    let dataset: DatasetCompleto | null = null;
    let error: string | null = null;
    try {
          const [insumos, subrecetas, recetas, ingredientes, preciosHistoricos, historialRecetas, familias, subfamilias] = await Promise.all([
                  getInsumos(),
                  getSubrecetas(true),
                  getRecetas(true),
                  getAllIngredientes(),
                  getAllPreciosHistoricos(),
                  getAllHistorialRecetas(),
                  getFamilias(),
                  getSubfamilias(),
                ]);
          dataset = { insumos, subrecetas, recetas, ingredientes, preciosHistoricos, historialRecetas, familias, subfamilias };
          analysis = buildAnalysisData(dataset);
    } catch (e) {
          error = e instanceof Error ? e.message : 'Error desconocido';
    }

  return (
        <main className="app-shell py-8">
              <header className="mb-6">
                      <h1 className="font-display text-3xl font-bold text-ambar-700">
                                Analisis de Variacion de Costos
                      </h1>
                      <p className="text-sm text-salvia-700">
                                Inteligencia de negocios: trazabilidad completa insumo, subreceta, receta, costo final, food cost, utilidad y precio sugerido.
                      </p>
              </header>
        
          {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            No se pudo cargar el analisis: {error}
                  </div>
                ) : !analysis || !dataset ? (
                  <div className="rounded-md border border-line bg-white px-4 py-8 text-center text-sm text-muted">
                            Aun no hay datos de variacion. Registra cambios de precio en los insumos para generar el analisis.
                  </div>
                ) : (
                  <AnalisisDashboard analysis={analysis} dataset={dataset} />
                )}
        </main>
      );
}
