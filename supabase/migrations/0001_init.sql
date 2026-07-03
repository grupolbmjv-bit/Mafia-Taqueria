-- Extensión para búsqueda full-text
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- TABLAS BÁSICAS (Organizaciones, Usuarios, Roles)
-- ============================================================================

CREATE TABLE organizaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE roles (
    id serial PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    permisos jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Roles por defecto
INSERT INTO roles (nombre, permisos) VALUES
    ('Administrador', '{"modulos": ["*"]}'::jsonb),
    ('Costos', '{"modulos": ["recetas", "insumos", "analisis"]}'::jsonb),
    ('Chef', '{"modulos": ["recetas", "insumos"]}'::jsonb),
    ('Consulta', '{"modulos": ["recetas", "insumos", "analisis"]}'::jsonb)
ON CONFLICT DO NOTHING;

CREATE TABLE usuarios (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    nombre_completo text,
    rol_id integer NOT NULL REFERENCES roles(id),
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- CATÁLOGOS
-- ============================================================================

CREATE TABLE unidades_medida (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    abreviatura text NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('peso', 'volumen', 'unidad')),
    es_base boolean DEFAULT false,
    factor_a_base numeric DEFAULT 1,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_unidad_por_org UNIQUE (organizacion_id, nombre)
);

CREATE TABLE proveedores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    nit text,
    contacto text,
    telefono text,
    email text,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE familias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('insumo', 'receta')),
    orden integer DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_familia_por_org UNIQUE (organizacion_id, nombre, tipo)
);

CREATE TABLE subfamilias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    familia_id uuid NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    orden integer DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_subfamilia_por_familia UNIQUE (familia_id, nombre)
);

CREATE TABLE etiquetas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    color text DEFAULT '#808080',
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_etiqueta_por_org UNIQUE (organizacion_id, nombre)
);

-- ============================================================================
-- INSUMOS
-- ============================================================================

CREATE TABLE insumos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    codigo text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    familia_id uuid REFERENCES familias(id),
    proveedor_id uuid REFERENCES proveedores(id),
    unidad_compra_id uuid NOT NULL REFERENCES unidades_medida(id),
    unidad_almacen_id uuid NOT NULL REFERENCES unidades_medida(id),
    unidad_produccion_id uuid NOT NULL REFERENCES unidades_medida(id),
    factor_conversion numeric DEFAULT 1,
    costo_compra numeric NOT NULL DEFAULT 0,
    costo_unidad_base numeric GENERATED ALWAYS AS (
        costo_compra / NULLIF(factor_conversion, 0)
    ) STORED,
    iva_porcentaje numeric DEFAULT 0,
    merma_porcentaje numeric DEFAULT 0,
    rendimiento_porcentaje numeric DEFAULT 100,
    activo boolean DEFAULT true,
    observaciones text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid REFERENCES usuarios(id),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_codigo_por_org UNIQUE (organizacion_id, codigo)
);

CREATE TABLE insumo_precio_historico (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    insumo_id uuid NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
    costo_anterior numeric NOT NULL,
    costo_nuevo numeric NOT NULL,
    variacion_absoluta numeric GENERATED ALWAYS AS (costo_nuevo - costo_anterior) STORED,
    variacion_porcentual numeric GENERATED ALWAYS AS (
        CASE 
            WHEN costo_anterior = 0 THEN 0
            ELSE ((costo_nuevo - costo_anterior) / costo_anterior) * 100
        END
    ) STORED,
    fecha timestamp with time zone DEFAULT now(),
    usuario_id uuid REFERENCES usuarios(id),
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- RECETAS Y COMPONENTES
-- ============================================================================

CREATE TABLE recetas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    codigo text NOT NULL,
    nombre text NOT NULL,
    familia_id uuid REFERENCES familias(id),
    subfamilia_id uuid REFERENCES subfamilias(id),
    descripcion text,
    tiempo_preparacion_min integer DEFAULT 0,
    porciones numeric NOT NULL DEFAULT 1,
    peso_final numeric DEFAULT 0,
    rendimiento_porcentaje numeric DEFAULT 100,
    estado text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'activa', 'archivada')),
    version_actual integer DEFAULT 1,
    es_subreceta boolean DEFAULT false,
    food_cost_objetivo numeric DEFAULT 0,
    margen_objetivo numeric DEFAULT 0,
    precio_venta_sugerido numeric DEFAULT 0,
    precio_venta_real numeric DEFAULT 0,
    costo_total_actual numeric DEFAULT 0,
    costo_porcion_actual numeric DEFAULT 0,
    food_cost_actual numeric DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid REFERENCES usuarios(id),
    CONSTRAINT unique_codigo_receta_org UNIQUE (organizacion_id, codigo)
);

-- Índices para búsqueda
CREATE INDEX idx_recetas_nombre_trgm ON recetas USING GIN (nombre gin_trgm_ops);
CREATE INDEX idx_recetas_codigo ON recetas(codigo);
CREATE INDEX idx_recetas_familia_subfamilia ON recetas(familia_id, subfamilia_id);

CREATE TABLE receta_ingredientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id uuid NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    tipo_ingrediente text NOT NULL CHECK (tipo_ingrediente IN ('insumo', 'subreceta')),
    insumo_id uuid REFERENCES insumos(id),
    subreceta_id uuid REFERENCES recetas(id),
    cantidad numeric NOT NULL,
    unidad_id uuid NOT NULL REFERENCES unidades_medida(id),
    merma_porcentaje numeric DEFAULT 0,
    orden integer DEFAULT 0,
    costo_unitario_snapshot numeric DEFAULT 0,
    costo_total_snapshot numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_ingrediente CHECK (
        (tipo_ingrediente = 'insumo' AND insumo_id IS NOT NULL AND subreceta_id IS NULL) OR
        (tipo_ingrediente = 'subreceta' AND subreceta_id IS NOT NULL AND insumo_id IS NULL)
    )
);

CREATE TABLE receta_versiones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id uuid NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    numero_version integer NOT NULL,
    snapshot jsonb NOT NULL,
    costo_total numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES usuarios(id),
    motivo_cambio text,
    CONSTRAINT unique_version_por_receta UNIQUE (receta_id, numero_version)
);

CREATE TABLE receta_etiquetas (
    receta_id uuid NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    etiqueta_id uuid NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
    PRIMARY KEY (receta_id, etiqueta_id)
);

CREATE TABLE receta_favoritos (
    usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    receta_id uuid NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, receta_id)
);

CREATE TABLE receta_imagenes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id uuid NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    storage_path text NOT NULL,
    orden integer DEFAULT 0,
    es_principal boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE receta_adjuntos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id uuid NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    tipo text NOT NULL CHECK (tipo IN ('pdf', 'excel', 'manual', 'foto')),
    storage_path text NOT NULL,
    nombre_archivo text NOT NULL,
    uploaded_by uuid REFERENCES usuarios(id),
    uploaded_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- AUDITORÍA Y CONFIGURACIÓN
-- ============================================================================

CREATE TABLE auditoria (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    entidad text NOT NULL,
    entidad_id uuid,
    accion text NOT NULL CHECK (accion IN ('create', 'update', 'delete')),
    campo text,
    valor_anterior text,
    valor_nuevo text,
    usuario_id uuid REFERENCES usuarios(id),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE configuracion_organizacion (
    organizacion_id uuid PRIMARY KEY REFERENCES organizaciones(id) ON DELETE CASCADE,
    food_cost_objetivo_default numeric DEFAULT 30,
    margen_objetivo_default numeric DEFAULT 70,
    iva_default numeric DEFAULT 19,
    costo_operativo_porcentaje numeric DEFAULT 15,
    comision_plataformas_porcentaje numeric DEFAULT 5,
    descuento_promedio_porcentaje numeric DEFAULT 2,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE subfamilias ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Política para usuarios: ver solo su propia organización
CREATE POLICY "usuarios_org_isolation"
    ON usuarios FOR ALL
    USING (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()))
    WITH CHECK (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()));

-- Política para insumos: ver solo insumos de su organización
CREATE POLICY "insumos_org_isolation"
    ON insumos FOR ALL
    USING (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()))
    WITH CHECK (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()));

-- Política para recetas: ver solo recetas de su organización
CREATE POLICY "recetas_org_isolation"
    ON recetas FOR ALL
    USING (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()))
    WITH CHECK (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()));

-- Política para familias
CREATE POLICY "familias_org_isolation"
    ON familias FOR ALL
    USING (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()))
    WITH CHECK (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()));

-- Política para unidades_medida
CREATE POLICY "unidades_org_isolation"
    ON unidades_medida FOR ALL
    USING (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()))
    WITH CHECK (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()));

-- Política para proveedores
CREATE POLICY "proveedores_org_isolation"
    ON proveedores FOR ALL
    USING (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()))
    WITH CHECK (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()));

-- Política para auditoría
CREATE POLICY "auditoria_org_isolation"
    ON auditoria FOR SELECT
    USING (organizacion_id = (SELECT organizacion_id FROM usuarios WHERE id = auth.uid()));

-- ============================================================================
-- FUNCIÓN: Calcular costo total de una receta
-- ============================================================================

CREATE OR REPLACE FUNCTION calcular_costo_receta(receta_id uuid)
RETURNS TABLE(costo_total numeric, costo_porcion numeric, food_cost_porcentaje numeric) AS $$
DECLARE
    v_porciones numeric;
    v_costo_total numeric;
BEGIN
    -- Obtener porciones de la receta
    SELECT porciones INTO v_porciones FROM recetas WHERE id = receta_id;
    
    -- Calcular costo total desde ingredientes
    SELECT COALESCE(SUM(
        CASE 
            WHEN ri.tipo_ingrediente = 'insumo' THEN
                (ri.cantidad / NULLIF(um.factor_a_base, 0)) * i.costo_unidad_base * (1 + COALESCE(i.merma_porcentaje, 0) / 100)
            WHEN ri.tipo_ingrediente = 'subreceta' THEN
                (SELECT costo_total_actual FROM recetas WHERE id = ri.subreceta_id)
            ELSE 0
        END
    ), 0) INTO v_costo_total
    FROM receta_ingredientes ri
    LEFT JOIN insumos i ON ri.insumo_id = i.id
    LEFT JOIN unidades_medida um ON ri.unidad_id = um.id
    WHERE ri.receta_id = receta_id;
    
    RETURN QUERY SELECT
        v_costo_total,
        v_costo_total / NULLIF(v_porciones, 0),
        (v_costo_total / NULLIF(v_porciones, 0) / 
            (SELECT precio_venta_real FROM recetas WHERE id = receta_id) * 100)::numeric;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Trigger para recalcular costo al cambiar ingredientes
-- ============================================================================

CREATE OR REPLACE FUNCTION actualizar_costo_receta()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE recetas
    SET costo_total_actual = (SELECT costo_total FROM calcular_costo_receta(receta_id))
    WHERE id = NEW.receta_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_costo_ingredientes
AFTER INSERT OR UPDATE OR DELETE ON receta_ingredientes
FOR EACH ROW
EXECUTE FUNCTION actualizar_costo_receta();

-- ============================================================================
-- DATOS DE EJEMPLO (Opcional - comentar si no es necesario)
-- ============================================================================

-- Crear organización de ejemplo
INSERT INTO organizaciones (nombre) VALUES ('Mi Restaurante') ON CONFLICT DO NOTHING;

-- Crear unidades de medida base
INSERT INTO unidades_medida (organizacion_id, nombre, abreviatura, tipo, es_base, factor_a_base)
SELECT 
    id, 
    nombre, 
    abreviatura, 
    tipo, 
    es_base, 
    factor_a_base
FROM (
    VALUES 
        ('Gramo', 'gr', 'peso', true, 1),
        ('Kilogramo', 'kg', 'peso', false, 1000),
        ('Mililitro', 'ml', 'volumen', true, 1),
        ('Litro', 'lt', 'volumen', false, 1000),
        ('Unidad', 'ud', 'unidad', true, 1)
) AS v(nombre, abreviatura, tipo, es_base, factor_a_base)
CROSS JOIN organizaciones o
WHERE o.nombre = 'Mi Restaurante'
ON CONFLICT DO NOTHING;

-- Crear familias de ejemplo
INSERT INTO familias (organizacion_id, nombre, tipo, orden)
SELECT id, 'Proteínas', 'insumo', 1 FROM organizaciones WHERE nombre = 'Mi Restaurante'
ON CONFLICT DO NOTHING;

INSERT INTO familias (organizacion_id, nombre, tipo, orden)
SELECT id, 'Verduras', 'insumo', 2 FROM organizaciones WHERE nombre = 'Mi Restaurante'
ON CONFLICT DO NOTHING;

INSERT INTO familias (organizacion_id, nombre, tipo, orden)
SELECT id, 'Bebidas', 'receta', 1 FROM organizaciones WHERE nombre = 'Mi Restaurante'
ON CONFLICT DO NOTHING;
