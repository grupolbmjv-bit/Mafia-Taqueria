# 🎯 START HERE — GastroCore Setup Guide

## 👋 Bienvenido a GastroCore

Tienes todo listo para:
- ✅ Clonar el código
- ✅ Ejecutar localmente
- ✅ Desplegar a Vercel (1 click)
- ✅ Lanzar a producción

---

## 📥 Descargaste: `GastroCore-ready-to-clone.zip` (129 KB)

Dentro encontrarás:
- ✅ Código completo (Next.js 14 + TypeScript)
- ✅ Esquema SQL (PostgreSQL)
- ✅ Componentes y páginas
- ✅ API routes
- ✅ Documentación completa

---

## 🚀 ¿QUÉ QUIERES HACER?

### OPCIÓN 1️⃣: Ejecutar en tu computadora (desarrollo local)

```
Tiempo: 10 minutos
Dificultad: ⭐⭐ (muy fácil)
Resultado: App en http://localhost:3000
```

**Pasos:**
1. Descomprimir ZIP
2. Abrir `CLONE_ME.md`
3. Seguir los 7 pasos
4. ✅ ¡Corriendo localmente!

📖 **Archivo:** Abre `CLONE_ME.md` **dentro del ZIP**

---

### OPCIÓN 2️⃣: Desplegar en Vercel (producción)

```
Tiempo: 5 minutos
Dificultad: ⭐ (ultra fácil)
Resultado: App en https://gastrocore.vercel.app (HTTPS + público)
```

**Pasos:**
1. Descomprimir ZIP
2. Pushear a GitHub (3 comandos)
3. Ir a Vercel.com
4. Conectar GitHub
5. Agregar variables
6. ✅ ¡En producción!

📖 **Archivo:** Abre `QUICKSTART_VERCEL.md` **dentro del ZIP**

---

### OPCIÓN 3️⃣: Entender la arquitectura

```
Tiempo: 30 minutos
Dificultad: ⭐⭐⭐ (técnico)
Resultado: Entender cómo funciona todo
```

📖 **Archivo:** Abre `arquitectura-erp-recetas.md` **dentro del ZIP**

---

## 🗺️ Mapa de archivos (DENTRO DEL ZIP)

```
GastroCore/
├── 📖 CLONE_ME.md              ← Empieza AQUÍ si quieres local
├── 📖 QUICKSTART_VERCEL.md     ← Empieza AQUÍ si quieres Vercel
├── 📖 SETUP.md                 ← Setup completo + troubleshooting
├── 📖 DEPLOY_VERCEL.md         ← Guía detallada de Vercel
├── 📖 README.md                ← Descripción del proyecto
├── 📖 arquitectura-erp-recetas.md ← Documento de arquitectura
│
├── app/                        ← Next.js App Router (UI)
│   ├── (dashboard)/            ← Páginas protegidas
│   │   ├── recetas/            ← Gestión de recetas
│   │   ├── insumos/            ← Gestión de insumos
│   │   └── analisis/           ← Dashboard
│   └── api/                    ← REST API endpoints
│
├── components/                 ← Componentes reutilizables
├── lib/                        ← Motor de costeo + helpers
├── supabase/
│   ├── migrations/0001_init.sql ← Schema de BD
│   └── config.json
│
├── .env.local.example          ← Template de variables
├── package.json                ← Dependencias
└── vercel.json                 ← Config para Vercel
```

---

## ⚡ Camino RÁPIDO (5 minutos)

```bash
# 1. Descomprimir
unzip GastroCore-ready-to-clone.zip
cd GastroCore

# 2. Pushear a GitHub (reemplaza con tu usuario)
git remote add origin https://github.com/TU-USUARIO/gastrocore.git
git branch -M main
git push -u origin main

# 3. Ir a Vercel
# https://vercel.com/new → Conectar GitHub → Seleccionar repo → Deploy

# 4. Agregar variables en Vercel Dashboard
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 5. Redeploy

# ✅ ¡Listo! Tu app está en producción
# https://gastrocore.vercel.app
```

**Guía paso a paso:** Abre `QUICKSTART_VERCEL.md`

---

## 🛠️ Camino DESARROLLO (10 minutos)

```bash
# 1. Descomprimir
unzip GastroCore-ready-to-clone.zip
cd GastroCore

# 2. Instalar dependencias
npm install

# 3. Crear .env.local (cambiar valores)
cp .env.local.example .env.local
# Editar con credenciales de Supabase

# 4. Crear BD en Supabase
# Supabase Dashboard → SQL Editor → Copiar + ejecutar supabase/migrations/0001_init.sql

# 5. Crear usuario
# Supabase Dashboard → Auth → Add User

# 6. Ejecutar
npm run dev

# ✅ ¡Listo! App en http://localhost:3000
```

**Guía paso a paso:** Abre `CLONE_ME.md`

---

## 📋 Requisitos

### Para Desarrollo Local:
- Node.js 18+ (https://nodejs.org)
- Git (https://git-scm.com)
- Editor (VS Code, Sublime, etc)
- Cuenta Supabase (https://supabase.com) — GRATIS

### Para Vercel:
- Cuenta GitHub (GRATIS)
- Cuenta Vercel (GRATIS)
- Cuenta Supabase (GRATIS)

**Total:** 0 pesos de costo inicial ✅

---

## 🔑 Credenciales Necesarias

Antes de empezar, necesitarás de **Supabase:**

1. Crear proyecto en https://supabase.com
2. Ir a Settings → API
3. Copiar:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

**Tiempo:** 2 minutos

---

## ✅ Checklist antes de empezar

- [ ] Descargar y descomprimir ZIP
- [ ] Crear proyecto Supabase (gratuito)
- [ ] Copiar credenciales de Supabase
- [ ] Decidir: ¿LOCAL o VERCEL?
- [ ] Seguir la guía correspondiente

---

## 🆘 Ayuda

### Si algo no funciona:

1. **LOCAL:** Ver sección "Troubleshooting" en `SETUP.md`
2. **VERCEL:** Ver sección "Troubleshooting" en `DEPLOY_VERCEL.md`
3. **Verificar:** `node --version` debe ser 18+
4. **Logs:** En Vercel Dashboard → Deployments → Click → Logs

---

## 📚 Documentación

| Archivo | Para | Tiempo |
|---------|------|--------|
| `CLONE_ME.md` | Setup local paso a paso | 10 min |
| `QUICKSTART_VERCEL.md` | Deploy rápido a Vercel | 5 min |
| `SETUP.md` | Setup completo + troubleshooting | 20 min |
| `DEPLOY_VERCEL.md` | Guía detallada de Vercel | 15 min |
| `arquitectura-erp-recetas.md` | Cómo funciona todo | 30 min |

---

## 🎯 Próximos 3 pasos

### Paso 1: Descomprimir
```bash
unzip GastroCore-ready-to-clone.zip
cd GastroCore
```

### Paso 2: Elegir camino
**¿LOCAL?** → Abre `CLONE_ME.md`  
**¿VERCEL?** → Abre `QUICKSTART_VERCEL.md`

### Paso 3: Seguir instrucciones
Copiar y pegar los comandos. ✅ ¡Listo!

---

## 🚀 ¿Listo?

1. **Descomprimir** el ZIP
2. **Abrir** el archivo correspondiente:
   - LOCAL → `CLONE_ME.md`
   - VERCEL → `QUICKSTART_VERCEL.md`
3. **Seguir** paso a paso
4. **¡Éxito!** 🎉

---

## 💡 Pro Tips

✅ Usa **Git Bash** en Windows (más compatible)  
✅ `npm cache clean --force` si hay problemas  
✅ Verifica Node.js: `node --version` (debe ser 18+)  
✅ En Vercel, los logs están en Dashboard → Deployments  
✅ Variables de Vercel son privadas y seguras  

---

**¡BIENVENIDO A GASTROCORE! 🍽️📊**

Estás a 5-10 minutos de tener una app completa de costeo de recetas.

**¿Qué esperas? ¡Comienza ahora!** 🚀
