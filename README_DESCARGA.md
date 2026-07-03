# 🎉 GastroCore — Listo para Clonar Y Desplegar

## 📦 Archivos incluidos

✅ **GastroCore-ready-to-clone.zip** (129 KB) — Proyecto completo listo para ejecutar y desplegar

---

## 🚀 Dos caminos:

### Opción A: Ejecutar localmente
**Tiempo:** 10 minutos  
**Para:** Desarrollo, testing, customización

### Opción B: Desplegar a Vercel (1 click)
**Tiempo:** 5 minutos  
**Para:** Producción, acceso público, auto-updates

---

## ⚡ Opción A: Ejecutar Localmente (7 pasos)

### 1️⃣ Descargar y descomprimir

```bash
unzip GastroCore-ready-to-clone.zip
cd GastroCore
```

### 2️⃣ Instalar dependencias

```bash
npm install
```

### 3️⃣ Crear proyecto en Supabase

- Ir a https://supabase.com
- Crear nuevo proyecto
- Copiar URL, anon key, service role key

### 4️⃣ Configurar variables

```bash
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Supabase
```

### 5️⃣ Crear base de datos

- En Supabase Dashboard → SQL Editor
- Copiar contenido de `supabase/migrations/0001_init.sql`
- Ejecutar

### 6️⃣ Crear usuario de prueba

- Supabase Dashboard → Auth → Add User
- Ejecutar el SQL del paso 5b en SETUP.md para conectar el usuario

### 7️⃣ Ejecutar

```bash
npm run dev
# Abre http://localhost:3000
```

---

## 🚀 Opción B: Desplegar a Vercel (1 Click)

### Ventajas:
✅ Tu app en HTTPS público  
✅ Auto-deploy en cada `git push`  
✅ Dominio personalizado  
✅ Analytics y logs  
✅ **GRATIS** hasta cierto tráfico  

### Pasos rápidos:

1. **Descomprimir ZIP** y pushear a GitHub
   ```bash
   cd GastroCore
   git remote add origin https://github.com/tu-usuario/gastrocore.git
   git push -u origin main
   ```

2. **Vercel** → https://vercel.com/new → GitHub → Select repo → Deploy

3. **Esperar 2-3 minutos** → ✅ ¡En vivo!

4. **Agregar variables** (IMPORTANTE)
   - Vercel Dashboard → Settings → Environment Variables
   - Copiar desde Supabase:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

5. **Redeploy** en Vercel

**URL:** `https://gastrocore.vercel.app` (o custom domain)

📖 **Guía detallada:** Ver [`QUICKSTART_VERCEL.md`](./QUICKSTART_VERCEL.md) **dentro del ZIP**

---

## 📚 Documentación incluida

Dentro del ZIP encontrarás:

- **CLONE_ME.md** — Instrucciones paso a paso LOCAL (la más detallada)
- **SETUP.md** — Setup completo + troubleshooting
- **QUICKSTART_VERCEL.md** ⭐ — Deploy a Vercel en 5 minutos
- **DEPLOY_VERCEL.md** — Guía completa de Vercel
- **README.md** — Descripción del proyecto
- **arquitectura-erp-recetas.md** — Documento de arquitectura completo

**→ Si quieres LOCAL:** Empieza en `CLONE_ME.md`  
**→ Si quieres VERCEL:** Empieza en `QUICKSTART_VERCEL.md`

---

## 🏗️ Contenido del proyecto

```
GastroCore/
├── app/                    # Código de Next.js (rutas, páginas, API)
├── components/             # Componentes reutilizables
├── lib/                    # Librerías y utilidades
├── supabase/
│   ├── migrations/         # Esquema SQL de la BD
│   └── config.json
├── public/                 # Assets estáticos
├── CLONE_ME.md            # ← Empezar aquí
├── SETUP.md
├── README.md
├── package.json
└── .env.local.example
```

---

## ✨ Características

✅ Autenticación con Supabase  
✅ Dashboard con KPIs  
✅ CRUD de recetas e insumos  
✅ Motor de costeo automático  
✅ Panel de costos en vivo  
✅ Exportar a PDF/Excel  
✅ Roles y permisos  
✅ Row Level Security en BD  
✅ Auditoría completa  

---

## 🎯 Stack

- **Frontend:** Next.js 14 + React 18 + TypeScript + TailwindCSS
- **Backend:** Supabase (PostgreSQL + Auth)
- **Deployment:** Vercel (recomendado)

---

## 🔐 Seguridad

⚠️ **IMPORTANTE:**
- Nunca commitear `.env.local` con credenciales reales
- El archivo `.gitignore` está configurado para protegerte
- En producción, usar Vercel Environment Variables

---

## 📊 Próximos pasos

**Elige tu camino:**

### Para LOCAL (desarrollo):
1. Descomprimir ZIP
2. Leer `CLONE_ME.md`
3. Seguir los 7 pasos
4. Explorar dashboard en http://localhost:3000

### Para VERCEL (producción):
1. Descomprimir ZIP
2. Leer `QUICKSTART_VERCEL.md`
3. Pushear a GitHub
4. Desplegar en Vercel (1 click)
5. Ver app en https://gastrocore.vercel.app

---

## 🆘 ¿Problemas?

1. Revisar `SETUP.md` → Sección "Troubleshooting"
2. Verificar que Node.js 18+ está instalado: `node --version`
3. Verificar credenciales en `.env.local`

---

## 🎓 Documentación de referencia

- **Next.js:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **TailwindCSS:** https://tailwindcss.com/docs

---

## ✅ Checklist LOCAL

- [ ] Descargar y descomprimir ZIP
- [ ] `npm install` completado
- [ ] Proyecto Supabase creado
- [ ] `.env.local` configurado
- [ ] Migrations ejecutadas
- [ ] Usuario creado en Supabase
- [ ] `npm run dev` corriendo
- [ ] http://localhost:3000 accesible
- [ ] Login exitoso

## ✅ Checklist VERCEL

- [ ] Descargar y descomprimir ZIP
- [ ] Código en GitHub
- [ ] Conectado a Vercel
- [ ] Variables de Supabase agregadas
- [ ] Deploy completado
- [ ] App en vivo en https://gastrocore.vercel.app
- [ ] Redeploy en Vercel
- [ ] Login exitoso

---

## 🎉 ¡TODO LISTO!

### Archivo principal: `GastroCore-ready-to-clone.zip` (129 KB)

**LOCAL:** Empieza en `CLONE_ME.md` (dentro del ZIP)  
**VERCEL:** Empieza en `QUICKSTART_VERCEL.md` (dentro del ZIP)

---

**GastroCore v0.1.0 — ERP de Costeo de Recetas para Restaurantes**

*Listo para clonar, desarrollar y desplegar en producción. 🚀*
