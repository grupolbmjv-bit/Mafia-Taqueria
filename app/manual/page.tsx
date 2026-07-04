export default function ManualPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="eyebrow">Centro de ayuda</p>
      <h1 className="mt-2 text-4xl font-display font-bold text-[var(--brand)]">Manual de uso</h1>
      <p className="mt-3 max-w-3xl text-[var(--muted)]">
        Guia paso a paso de GastroCore: que hace cada modulo, como se usa y por que los numeros se calculan como se calculan.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr] items-start">
        <aside className="card p-5 lg:sticky lg:top-20">
          <p className="eyebrow">Contenido</p>
          <nav className="mt-3 flex flex-col gap-3 text-sm">
            <a href="#como-funciona" className="text-[var(--ink)] hover:text-[var(--accent)]">Como funciona GastroCore</a>
            <a href="#insumos" className="text-[var(--ink)] hover:text-[var(--accent)]">1. Insumos</a>
            <a href="#subrecetas" className="text-[var(--ink)] hover:text-[var(--accent)]">2. Subrecetas</a>
            <a href="#recetas" className="text-[var(--ink)] hover:text-[var(--accent)]">3. Recetas</a>
            <a href="#familias" className="text-[var(--ink)] hover:text-[var(--accent)]">4. Familias</a>
            <a href="#panel" className="text-[var(--ink)] hover:text-[var(--accent)]">5. Panel Ejecutivo</a>
            <a href="#analisis" className="text-[var(--ink)] hover:text-[var(--accent)]">6. Analisis de Costos</a>
            <a href="#glosario" className="text-[var(--ink)] hover:text-[var(--accent)]">Glosario de terminos</a>
          </nav>
        </aside>

        <div className="space-y-6">
          <section id="como-funciona" className="card p-8">
            <h2 className="text-2xl font-display font-bold text-[var(--ink)]">Como funciona GastroCore</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-[var(--ink)]">
              <p>
                GastroCore organiza el costeo de un restaurante en tres niveles que se alimentan uno del otro. El primer nivel son los <strong>insumos</strong>: las materias primas que se compran (verduras, carnes, licores, abarrotes, etc.), cada una con un costo por unidad de medida. El segundo nivel son las <strong>subrecetas</strong>: preparaciones intermedias como salsas, fondos, masas o mixes, armadas combinando insumos, cuyo resultado (costo por unidad producida) puede usarse como si fuera un insumo mas. El tercer nivel son las <strong>recetas finales</strong>: los platos que se venden, que pueden combinar insumos y subrecetas en cualquier proporcion.
              </p>
              <p>
                La clave del sistema es la propagacion automatica de costos: si el precio de un insumo cambia, ese cambio recalcula al instante el costo de toda subreceta o receta que lo utilice, sin que nadie tenga que actualizar nada a mano. Por eso, mantener actualizado el precio de los insumos en la seccion Insumos es lo que garantiza que el food cost de todo el menu sea correcto.
              </p>
              <p>
                El indicador central del sistema es el <strong>food cost</strong>: el porcentaje que representa el costo de un plato sobre su precio de venta (costo del plato dividido por precio de venta). Cada receta tiene un food cost objetivo (35% por defecto) contra el cual se compara el food cost real. Segun ese resultado, el sistema asigna un semaforo:
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="chip chip-success">Verde &middot; Rentable: el food cost esta dentro del objetivo</span>
                <span className="chip chip-warning">Amarillo &middot; Vigilar: el food cost esta cerca del limite</span>
                <span className="chip chip-danger">Rojo &middot; Accion inmediata: el food cost supera el objetivo</span>
              </div>
              <p>
                Ademas del food cost, el sistema calcula automaticamente el <strong>precio sugerido de venta</strong> (el precio necesario para lograr el food cost objetivo), la <strong>utilidad</strong> (precio de venta menos costo del plato), el <strong>margen bruto</strong>, el impacto de la <strong>merma</strong> (perdida de producto al preparar un ingrediente) y el <strong>desvio de mercancia</strong> (un porcentaje adicional que cubre diferencias de inventario no explicadas por la merma normal).
              </p>
            </div>
          </section>

          <section id="insumos" className="card p-8">
            <h2 className="text-2xl font-display font-bold text-[var(--ink)]">1. Insumos</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink)]">
              Es el catalogo maestro de materias primas. Cada insumo tiene una referencia, un nombre, una unidad de medida, una subfamilia y un costo. Desde aqui se mantiene actualizado el precio real de compra de cada producto, que es el dato que alimenta todo el resto del sistema.
            </p>
            <p className="mt-5 font-semibold text-[var(--ink)]">Paso a paso</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--ink)]">
              <li>Entra a <strong>Insumos</strong> desde el menu superior.</li>
              <li>Usa el buscador para encontrar un insumo por nombre o referencia, o filtra por subfamilia con el desplegable.</li>
              <li>Para actualizar un precio, haz clic en <strong>Editar</strong> en la fila del insumo, ingresa el nuevo precio (y opcionalmente un motivo del cambio) y guarda. El cambio se propaga automaticamente a todas las subrecetas y recetas que usan ese insumo.</li>
              <li>Para saber en que preparaciones se usa un insumo antes de cambiar su precio, haz clic en <strong>Donde se usa</strong>: se abre la lista de subrecetas y recetas que lo incluyen, con acceso directo a cada una.</li>
              <li>Desde la ventana de edicion tambien puedes consultar el <strong>historial de precios</strong> del insumo.</li>
            </ol>
          </section>

          <section id="subrecetas" className="card p-8">
            <h2 className="text-2xl font-display font-bold text-[var(--ink)]">2. Subrecetas</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink)]">
              Las subrecetas son preparaciones base (salsas, fondos, masas, mixes) que luego se agregan como ingrediente dentro de otras recetas o subrecetas. Sirven para no repetir la misma preparacion en el costeo de cada plato: se costea una sola vez y su costo por unidad se reutiliza donde haga falta.
            </p>
            <p className="mt-5 font-semibold text-[var(--ink)]">Paso a paso para crear una subreceta</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--ink)]">
              <li>Entra a <strong>Subrecetas</strong> y haz clic en <strong>+ Nueva subreceta</strong>.</li>
              <li>Completa el nombre, el rendimiento producido (cuanto rinde la preparacion) y su unidad (gramos, kilos, mililitros, litros, onza, copa o unidades).</li>
              <li>Define el porcentaje de desvio de mercancia y clasifica la subreceta por familia y subfamilia (puedes crear una familia nueva desde el mismo formulario con &quot;Administrar familias&quot;).</li>
              <li>Agrega los ingredientes uno por uno con <strong>+ Agregar ingrediente</strong>: elige el insumo (u otra subreceta), la cantidad usada y el porcentaje de merma. El costo unitario y el costo total de cada ingrediente se calculan solos.</li>
              <li>Revisa el resumen de costeo (costo de ingredientes, desvio de mercancia, costo final, costo por unidad, food cost y precio sugerido) y guarda con <strong>Guardar receta</strong>.</li>
              <li>Desde ese momento, la subreceta queda disponible como ingrediente al armar cualquier receta o subreceta nueva.</li>
            </ol>
          </section>

          <section id="recetas" className="card p-8">
            <h2 className="text-2xl font-display font-bold text-[var(--ink)]">3. Recetas</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink)]">
              Es el recetario final: los platos que se venden en el menu. La lista se agrupa por familia y muestra, para cada receta, el costo por porcion, el precio de venta, el precio sugerido y el food cost con su semaforo de color.
            </p>
            <p className="mt-5 font-semibold text-[var(--ink)]">Consultar una receta</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--ink)]">
              <li>Entra a <strong>Recetas</strong> y filtra por familia, subfamilia, rango de food cost o estado si lo necesitas.</li>
              <li>Haz clic en el nombre de una receta para ver su ficha completa: ingredientes con cantidad, merma, costo unitario y costo total; resumen de costos; y botones para descargar la ficha en PDF o ver la trazabilidad completa.</li>
              <li>Desde la ficha puedes entrar a <strong>Editar receta</strong> para modificar sus ingredientes, cantidades o clasificacion.</li>
            </ol>
            <p className="mt-5 font-semibold text-[var(--ink)]">Paso a paso para crear una receta nueva</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--ink)]">
              <li>Haz clic en <strong>+ Nueva receta</strong>.</li>
              <li>Completa el nombre, el rendimiento en porciones, el desvio de mercancia y la clasificacion por familia y subfamilia.</li>
              <li>Agrega los ingredientes (insumos o subrecetas) uno por uno, indicando cantidad y merma.</li>
              <li>Define el precio real de venta para que el sistema calcule el food cost real y la utilidad, y guarda la receta.</li>
            </ol>
          </section>

          <section id="familias" className="card p-8">
            <h2 className="text-2xl font-display font-bold text-[var(--ink)]">4. Familias</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink)]">
              Las familias y subfamilias son la forma de clasificar y ordenar insumos, subrecetas y recetas (por ejemplo Entradas, Arroces, Fruver, Licores). Se usan como filtro en todas las demas secciones y en los reportes del Panel y de Analisis.
            </p>
            <p className="mt-5 font-semibold text-[var(--ink)]">Paso a paso</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--ink)]">
              <li>Entra a <strong>Familias</strong> desde el menu.</li>
              <li>Para crear una familia nueva, escribe el nombre en &quot;Nueva familia&quot; y haz clic en <strong>Crear familia</strong>.</li>
              <li>Para crear una subfamilia, elige primero la familia a la que pertenecera y haz clic en <strong>Crear subfamilia</strong>.</li>
              <li>Desde el listado &quot;Familias existentes&quot; puedes <strong>editar</strong> el nombre de una familia o subfamilia, o <strong>desactivarla</strong> si ya no se usa.</li>
            </ol>
          </section>

          <section id="panel" className="card p-8">
            <h2 className="text-2xl font-display font-bold text-[var(--ink)]">5. Panel Ejecutivo</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-[var(--ink)]">
              <p>
                Es el tablero de indicadores para revisar la salud del menu de un vistazo: recetas activas, food cost promedio, utilidad potencial y recetas fuera de precio, ademas de alertas de rentabilidad separadas en &quot;accion inmediata&quot; y &quot;a vigilar&quot;.
              </p>
              <p>
                Incluye un ranking de las recetas mas rentables, un ranking de las que mas se alejan del objetivo, el food cost promedio por familia y una tabla detallada donde se puede simular un precio sugerido editable y ver de inmediato el food cost resultante y la utilidad, ademas de activar, desactivar o actualizar el precio de cada receta directamente desde ahi. Todo el panel se puede exportar a Excel con el boton correspondiente.
              </p>
            </div>
          </section>

          <section id="analisis" className="card p-8">
            <h2 className="text-2xl font-display font-bold text-[var(--ink)]">6. Analisis de Costos</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-[var(--ink)]">
              <p>
                Esta seccion muestra como varian los precios de los insumos a lo largo del tiempo y cuanto afecta esa variacion al menu. En la parte superior aparecen el insumo mas inflacionario, la receta mas afectada, la variacion promedio de costos y alertas automaticas cuando un insumo sube mucho de precio o una receta supera su food cost objetivo.
              </p>
              <p>
                Tiene tres pestanas: <strong>Variacion de costos</strong> (top de insumos que mas subieron o bajaron y variacion por familia), <strong>Impacto en el menu</strong> (que recetas se ven afectadas por cada variacion de insumo) y <strong>Simulacion</strong>, donde puedes elegir un insumo, escribir un precio hipotetico y ver que pasaria con el food cost y el precio sugerido de las recetas afectadas, sin guardar ningun cambio real. Tambien puedes descargar reportes en Excel o exportar la vista completa en PDF.
              </p>
            </div>
          </section>

          <section id="glosario" className="card p-8">
            <h2 className="text-2xl font-display font-bold text-[var(--ink)]">Glosario de términos</h2>
            <div className="mt-4 divide-y divide-[var(--line)]">
              <div className="py-3">
                <p className="font-semibold text-[var(--ink)]">Food cost</p>
                <p className="text-[var(--muted)]">Porcentaje que representa el costo de un plato sobre su precio de venta.</p>
              </div>
              <div className="py-3">
                <p className="font-semibold text-[var(--ink)]">Food cost objetivo</p>
                <p className="text-[var(--muted)]">El porcentaje máximo de food cost que la receta debería tener (35% por defecto).</p>
              </div>
              <div className="py-3">
                <p className="font-semibold text-[var(--ink)]">Precio sugerido</p>
                <p className="text-[var(--muted)]">El precio de venta necesario para alcanzar el food cost objetivo.</p>
              </div>
              <div className="py-3">
                <p className="font-semibold text-[var(--ink)]">Merma</p>
                <p className="text-[var(--muted)]">Porcentaje de producto que se pierde al preparar un ingrediente (limpieza, cocción, corte).</p>
              </div>
              <div className="py-3">
                <p className="font-semibold text-[var(--ink)]">Desvío de mercancía</p>
                <p className="text-[var(--muted)]">Porcentaje adicional que cubre diferencias de inventario no explicadas por la merma normal.</p>
              </div>
              <div className="py-3">
                <p className="font-semibold text-[var(--ink)]">Margen bruto</p>
                <p className="text-[var(--muted)]">Porcentaje de utilidad sobre el precio de venta (utilidad dividida por precio de venta).</p>
              </div>
              <div className="py-3">
                <p className="font-semibold text-[var(--ink)]">Utilidad</p>
                <p className="text-[var(--muted)]">Diferencia entre el precio de venta y el costo total del plato.</p>
              </div>
              <div className="py-3">
                <p className="font-semibold text-[var(--ink)]">Impuesto al Consumo (INC)</p>
                <p className="text-[var(--muted)]">Impuesto fijo del 8% que ya viene incluido en el precio de venta de cada receta.</p>
              </div>
              <div className="py-3">
                <p className="font-semibold text-[var(--ink)]">Precio base sin impuesto</p>
                <p className="text-[var(--muted)]">El precio de venta sin el Impuesto al Consumo (precio de venta ÷ 1.08). El food cost se calcula sobre este valor, no sobre el precio de venta total.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
