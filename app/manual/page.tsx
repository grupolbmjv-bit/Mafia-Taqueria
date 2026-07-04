import Link from 'next/link';

const MODULOS = [
  {
    id: 'insumos',
    eyebrow: 'Modulo Insumos',
    titulo: 'Catalogo de materias primas',
    pasos: [
      'Ve al modulo Insumos desde el menu superior.',
      'Usa el buscador para encontrar un insumo por nombre o referencia, o filtra por subfamilia con el menu desplegable.',
      'Haz clic en Editar junto al insumo para cambiar su precio o unidad. Puedes anotar un motivo del cambio antes de guardar.',
      'Dentro del mismo formulario, abre Ver historial de precios para revisar todos los cambios anteriores: fecha, valor anterior, valor nuevo y motivo.',
      'Haz clic en Donde se usa para ver en que subrecetas y recetas participa ese insumo antes de modificar su precio.',
    ],
  },
  {
    id: 'subrecetas',
    eyebrow: 'Modulo Subrecetas',
    titulo: 'Preparaciones base',
    pasos: [
      'Ve al modulo Subrecetas y revisa el listado con rendimiento, costo total, costo por unidad y estado.',
      'Haz clic en + Nueva subreceta para crear una preparacion base.',
      'Completa nombre, rendimiento producido, unidad de rendimiento, desvio de mercancia y clasificacion por familia y subfamilia.',
      'Agrega cada ingrediente con + Agregar ingrediente: elige el insumo, la unidad, la cantidad y el porcentaje de merma.',
      'Revisa el resumen de costeo al final: costo de ingredientes, costo final, costo por unidad, food cost objetivo, precio sugerido y utilidad.',
      'Guarda la subreceta. Su costo por unidad quedara disponible para usarse como ingrediente dentro de otras recetas.',
    ],
  },
  {
    id: 'recetas',
    eyebrow: 'Modulo Recetas',
    titulo: 'Recetario final',
    pasos: [
      'Ve al modulo Recetas para ver el recetario completo con food cost, precio de venta y precio sugerido de cada plato.',
      'Filtra por familia, subfamilia, rango de food cost o estado para encontrar recetas especificas.',
      'Haz clic en + Nueva receta para crear un plato nuevo: define nombre, rendimiento en porciones, desvio de mercancia y clasificacion.',
      'Agrega los ingredientes de la receta: pueden ser insumos directos o subrecetas ya creadas.',
      'Revisa el resumen de costeo, costo del plato, food cost, precio sugerido y utilidad, y guarda la receta.',
      'Haz clic sobre cualquier receta del listado para abrir su ficha detallada, descargar el PDF o ver su trazabilidad completa.',
    ],
  },
  {
    id: 'familias',
    eyebrow: 'Modulo Familias',
    titulo: 'Clasificacion por familia y subfamilia',
    pasos: [
      'Ve al modulo Familias para organizar insumos, subrecetas y recetas por categoria.',
      'Usa Crear familia para dar de alta una nueva familia, por ejemplo TACOS.',
      'Usa Crear subfamilia para dar de alta una subfamilia asociada a una familia existente, por ejemplo SALSAS dentro de SUB. RECETAS.',
      'Desde el listado de Familias existentes puedes editar el nombre o desactivar una familia o subfamilia que ya no uses.',
    ],
  },
  {
    id: 'panel',
    eyebrow: 'Modulo Panel',
    titulo: 'Panel ejecutivo',
    pasos: [
      'Ve al modulo Panel para ver el tablero ejecutivo: recetas activas, food cost promedio, utilidad potencial y recetas fuera de precio.',
      'Revisa el bloque de Alertas de rentabilidad, separado en accion inmediata y a vigilar.',
      'Consulta los rankings de recetas mas rentables y de recetas que mas pierden margen, y el food cost promedio por familia.',
      'En la tabla de detalle por receta puedes editar el precio sugerido y ver de inmediato el food cost resultante y la utilidad antes de aplicar el cambio con Actualizar precio.',
      'Usa el boton Exportar a Excel para descargar el panel completo.',
    ],
  },
  {
    id: 'analisis',
    eyebrow: 'Modulo Analisis',
    titulo: 'Analisis de costos e inteligencia de negocio',
    pasos: [
      'Ve al modulo Analisis para entrar al centro de inteligencia de costos.',
      'En la pestana Variacion de costos revisa el insumo mas inflacionario, la subreceta y receta mas afectadas, y las alertas automaticas.',
      'En la pestana Trazabilidad elige un insumo o subreceta del listado desplegable para ver toda su cadena de impacto hasta el food cost y precio sugerido final.',
      'En la pestana Impacto en el menu revisa las tablas de recetas y subrecetas afectadas por variaciones historicas.',
      'En la pestana Matriz de impacto elige un insumo o subreceta para explorar como se propaga su variacion al resto del menu.',
      'En la pestana Simulacion elige un insumo o subreceta, el modo, nuevo costo o variacion en porcentaje, y prueba un escenario sin guardar nada para ver el efecto en cascada antes de decidir un cambio real.',
    ],
  },
  {
    id: 'flujo',
    eyebrow: 'Recomendacion',
    titulo: 'Flujo de trabajo recomendado',
    pasos: [
      'Carga o verifica los insumos y sus precios en el modulo Insumos.',
      'Crea las subrecetas necesarias, salsas, fondos, masas, en el modulo Subrecetas, ya que se calculan a partir de los insumos.',
      'Crea las recetas finales en el modulo Recetas, combinando insumos y subrecetas.',
      'Usa el modulo Familias para mantener todo bien clasificado desde el inicio.',
      'Revisa el modulo Panel para monitorear el food cost y la rentabilidad del menu completo.',
      'Usa el modulo Analisis para detectar alertas de variacion de precios y simular el impacto de futuros cambios antes de aplicarlos.',
    ],
  },
];

export default function ManualPage() {
  return (
    <main className="app-shell py-10 space-y-8">
      <div className="space-y-3">
        <span className="eyebrow">Centro de ayuda</span>
        <h1 className="font-display text-4xl font-bold text-[#1E3A5F]">Manual de uso de GastroCore</h1>
        <p className="max-w-3xl text-base text-muted">
          Guia paso a paso de cada modulo del sistema y explicacion de la logica de costeo en cascada que conecta
          insumos, subrecetas y recetas. Consulta esta pagina cuando tengas dudas sobre como usar la plataforma.
        </p>
      </div>

      <nav className="card p-5">
        <h2 className="font-display text-lg font-semibold text-[#1E3A5F]">Contenido</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          <li><a href="#logica" className="text-sm font-medium text-[#2563EB] hover:underline">Como funciona la logica de la app</a></li>
          {MODULOS.map((m) => (
            <li key={m.id}>
              <a href={'#' + m.id} className="text-sm font-medium text-[#2563EB] hover:underline">{m.titulo}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="logica" className="card p-6 space-y-3 scroll-mt-24">
        <span className="eyebrow">La logica de la app</span>
        <h2 className="font-display text-2xl font-semibold text-[#1E3A5F]">Como funciona la cascada de costeo</h2>
        <p className="text-sm text-muted">
          GastroCore organiza el costeo en tres niveles conectados entre si: Insumos, materias primas, Subrecetas,
          preparaciones base como salsas o fondos, y Recetas finales, los platos del menu.
        </p>
        <p className="text-sm text-muted">
          Cuando cambias el precio de un insumo, ese cambio se propaga automaticamente: primero recalcula el costo
          de las subrecetas que lo usan, y luego el costo de las recetas que usan esas subrecetas o el insumo de
          forma directa.
        </p>
        <p className="text-sm text-muted">
          Con cada recalculo el sistema actualiza el food cost, el porcentaje que representa el costo sobre el
          precio de venta, la utilidad y el precio de venta sugerido de cada receta afectada.
        </p>
        <p className="text-sm text-muted">
          Todo cambio de precio queda registrado en un historial, por lo que en cualquier momento puedes revisar la
          trazabilidad completa: que cambio, cuando y que impacto tuvo sobre el menu.
        </p>
      </section>

      {MODULOS.map((m) => (
        <section key={m.id} id={m.id} className="card p-6 space-y-3 scroll-mt-24">
          <span className="eyebrow">{m.eyebrow}</span>
          <h2 className="font-display text-2xl font-semibold text-[#1E3A5F]">{m.titulo}</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
            {m.pasos.map((paso) => (
              <li key={paso}>{paso}</li>
            ))}
          </ol>
        </section>
      ))}

      <div>
        <Link href="/" className="btn-secondary">Volver al inicio</Link>
      </div>
    </main>
  );
}
