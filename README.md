# HalleyCol CRM 

Sistema integral de gestión para HalleyCol - Tienda de Calzado Femenino

![Estado](https://img.shields.io/badge/estado-production-green)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)
![PostgreSQL](https://img.shields.io/badge/postgresql-15-blue)

---

## 📖 Descripción

HalleyCol CRM es una plataforma completa que integra:

- **Chatbot con IA** para atención al cliente vía WhatsApp
- **Sistema de gestión CRM** para administración de pedidos, productos y clientes
- **Roles y permisos** para diferentes tipos de usuarios
- **Base de datos PostgreSQL** en la nube (Render)

---

## 🎯 Características Principales

### Chatbot Inteligente
- Clasificación de intenciones con regex y Google Gemini AI
- Flujo conversacional para compra de productos
- Detección de tallas, colores, ciudades y métodos de pago
- Escalamiento a asesor humano cuando es necesario

### CRM Multi-Rol
| Rol | Permisos | Dashboard |
|-----|----------|-----------|
| **Admin** | Acceso total a todas las funcionalidades | `/dashboard` |
| **Ventas** | Productos, pedidos, clientes, reportes | `/dashboard` |
| **Logística** | Gestión de pedidos y guías de envío | `/dashboard-logistica` |
| **Asesor** | Conversaciones y atención al cliente | `/dashboard-asesor` |

---

## 🛠️ Tecnologías

### Backend
- **Node.js** + **Express** - Servidor web
- **TypeScript** - Tipo seguro
- **PostgreSQL** - Base de datos relacional
- **node-postgres** - Driver de PostgreSQL
- **bcrypt** - Hash de contraseñas
- **jsonwebtoken** - Autenticación JWT

### Inteligencia Artificial
- **@google/generative-ai** - Gemini API para clasificación de intenciones
- **Sistema híbrido** - Regex + AI para mejor precisión

### Frontend
- **HTML5** + **CSS3** - Estructura y estilos
- **JavaScript Vanilla** - Lógica del cliente
- **Diseño responsive** - Adaptable a móviles

### Infraestructura
- **Docker** - Contenerización
- **Render** - Hosting y base de datos
- **GitHub** - Control de versiones

---

## 📁 Estructura del Proyecto

```
halleycol-crm/
├── src/
│   ├── ia/                          # Módulo de IA
│   │   ├── data/                    # Catálogos y datasets
│   │   ├── interfaces/              # Interfaces de servicios
│   │   ├── scripts/                 # Scripts de utilidad
│   │   ├── services/                # Servicios de IA
│   │   ├── strategies/              # Estrategias de clasificación
│   │   ├── tests/                   # Tests unitarios
│   │   ├── types/                   # Tipos TypeScript
│   │   ├── utils/                   # Utilidades
│   │   └── index.ts                 # Punto de entrada
│   └── test-ui/                     # CRM Frontend + Backend
│       ├── public/                  # Archivos estáticos
│       │   ├── css/                 # Estilos
│       │   ├── js/                  # Scripts
│       │   ├── img/                 # Imágenes
│       │   └── *.html               # Páginas del CRM
│       ├── routes/                  # Rutas de la API
│       └── server.ts                # Servidor Express
├── .env                             # Variables de entorno
├── .gitignore                       # Ignorados de Git
├── Dockerfile                       # Configuración Docker
├── package.json                     # Dependencias
└── tsconfig.ia.json                 # Config TypeScript
```

---

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/aHeavenPlace/HalleyCol.git
cd HalleyCol
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear archivo `.env` en la raíz:

```env
# Database PostgreSQL (Render)
PGHOST=dpg-d836144vikkc73ctvhfg-a.oregon-postgres.render.com
PGPORT=5432
PGUSER=halleycol_user
PGPASSWORD=Kg0wvFbP1w8kGufs4yKY02n6VKNL29Ca
PGDATABASE=halleycol

# Gemini AI
GEMINI_API_KEY=tu_api_key_aqui

# JWT
JWT_SECRET=halleycol-super-secret-key-2026

# Server
NODE_ENV=development
PORT=3000
```

### 4. Inicializar base de datos

```bash
npm run build:ia
npx ts-node --project tsconfig.ia.json src/ia/scripts/setup-db.ts
```

### 5. Iniciar el servidor

```bash
npm run start:ui
```

El servidor estará disponible en: **http://localhost:3000**

---

## 📱 Uso del Sistema

### Login

Accedé a http://localhost:3000 e ingresá tus credenciales. Cada rol será redirigido a su dashboard correspondiente.

### Dashboards por Rol

#### Admin / Ventas
- **Dashboard general** - Vista completa del negocio
- **Productos** - CRUD de calzado
- **Pedidos** - Seguimiento de órdenes
- **Clientes** - Base de datos de clientes
- **Reportes** - Estadísticas y métricas

#### Logística
- **Gestión de pedidos** - Actualizar estados
- **Guías de envío** - Registrar números de tracking
- **Estados** - Pendiente, Pagado, Enviado, Entregado

#### Asesor
- **Conversaciones** - Historial de chats
- **Mensajes** - Ver conversaciones completas
- **Filtro** - Conversaciones que requieren atención

### Chatbot

Accedé a http://localhost:3000/chatbot para probar el asistente virtual.

**Ejemplos de consultas:**
- "¿Tienen botas en talla 38?"
- "Quiero ver zapatos negros"
- "¿Hacen envíos a Bogotá?"
- "Quiero hablar con un humano"

---

## 🔐 Usuarios por Defecto

Los usuarios se crean automáticamente al ejecutar `setup-db.ts`:

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Admin | `admin` | `admin123` |
| Ventas | `ventas1` | `ventas123` |
| Logística | `logistica1` | `logistica123` |
| Asesor | `asesor1` | `asesor123` |

**⚠️ IMPORTANTE:** Cambiar las contraseñas en producción.

---

## 🐳 Docker

### Construir imagen

```bash
docker build -t halleycol-crm .
```

### Ejecutar contenedor

```bash
docker run -p 3000:3000 --env-file .env halleycol-crm
```

---

## 🌐 Deploy en Render

### 1. Subir a GitHub

```bash
git add .
git commit -m "feat: descripción del cambio"
git push origin main
```

### 2. Crear Web Service en Render

1. Ir a https://render.com
2. New + → Web Service
3. Conectar repositorio de GitHub
4. Seleccionar `HalleyCol`

### 3. Configurar

| Campo | Valor |
|-------|-------|
| Name | `halleycol-crm` |
| Region | `Oregon, USA` |
| Branch | `main` |
| Root Directory | (vacío) |
| Runtime | `Docker` |
| Docker Command | (vacío) |
| Instance Type | `Free` |

### 4. Variables de Entorno

Agregar todas las del `.env` en la sección "Environment Variables":

```
PGHOST=...
PGPORT=5432
PGUSER=halleycol_user
PGPASSWORD=...
PGDATABASE=halleycol
GEMINI_API_KEY=...
JWT_SECRET=...
NODE_ENV=production
PORT=3000
```

### 5. Deploy

Click en "Create Web Service". Render construirá y desplegará automáticamente.

URL resultante: `https://halleycol-crm.onrender.com`

---

## 📊 API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |

### CRM (Requiere autenticación)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/crm/products` | Listar productos | Todos |
| POST | `/api/crm/products` | Crear/Actualizar producto | admin, ventas |
| GET | `/api/crm/orders` | Listar pedidos | Todos |
| PATCH | `/api/crm/orders/:id` | Actualizar pedido | admin, logistica |
| GET | `/api/crm/conversations` | Listar conversaciones | admin, ventas, asesor |
| GET | `/api/crm/conversations/:id/messages` | Ver mensajes | admin, ventas, asesor |
| GET | `/api/crm/dashboard` | Datos del dashboard | admin, ventas |
| GET | `/api/crm/clients` | Listar clientes | admin, ventas |
| GET | `/api/crm/reports` | Reportes y estadísticas | admin, ventas |

### Chatbot

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/chat` | Enviar mensaje al bot |
| GET | `/api/chat/messages` | Obtener mensajes de sesión |

---

## 🧪 Scripts Útiles

```bash
# Build de IA
npm run build:ia

# Test de clasificación
npm test:ia

# Iniciar UI
npm run start:ui

# Generar dataset
npm run generate-dataset
```

---

## 🔧 Scripts de Base de Datos

```bash
# Setup inicial
npx ts-node --project tsconfig.ia.json src/ia/scripts/setup-db.ts

# Seed de roles
npx ts-node --project tsconfig.ia.json src/ia/scripts/seed-roles.ts

# Migrar a Render
npx ts-node --project tsconfig.ia.json src/ia/scripts/migrate-to-render.ts

# Verificar datos
npx ts-node --project tsconfig.ia.json src/ia/scripts/check-local-data.ts
```

---

## 📝 Licencia

© 2025 HalleyCol. Todos los derechos reservados.

---

## 👥 Equipo de Desarrollo

- **Desarrollo Full Stack** - HalleyCol Dev Team
- **IA & Chatbot** - HalleyCol Dev Team
- **Diseño UI/UX** - HalleyCol Dev Team

---

## 🆘 Soporte

Para soporte técnico o consultas, contactar a:
- Email: soporte@halleycol.com
- Documentación adicional en `/src/test-ui/public/README.md`
