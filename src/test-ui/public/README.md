# HalleyCol CRM - Frontend

Sistema CRM para HalleyCol con gestión de roles y permisos.

## 🚀 Acceso al Sistema

URL: http://localhost:3000

## 👥 Usuarios por Rol

| Rol | Usuario | Password | Página por defecto |
|-----|---------|----------|-------------------|
| **Admin** | `admin` | `admin123` | /dashboard (acceso total) |
| **Ventas** | `ventas1` | `ventas123` | /dashboard (productos, pedidos, clientes, reportes) |
| **Logística** | `logistica1` | `logistica123` | /pedidos (solo gestión de pedidos) |
| **Asesor** | `asesor1` | `asesor123` | /conversaciones (solo chatbot) |

## 📁 Páginas del CRM

| Página | URL | Roles Permitidos |
|--------|-----|------------------|
| Login | `/login` | Todos |
| Dashboard | `/dashboard` | admin, ventas |
| Productos | `/productos` | admin, ventas |
| Pedidos | `/pedidos` | admin, ventas, logistica |
| Conversaciones | `/conversaciones` | admin, ventas, asesor |
| Clientes | `/clientes` | admin, ventas |
| Reportes | `/reportes` | admin, ventas |

## 🎨 Estructura de Archivos

```
src/test-ui/public/
├── css/
│   ├── styles.css          # Estilos principales del CRM
│   └── chatbot.css         # Estilos del chatbot (legacy)
├── js/
│   └── app.js              # Utilidades y funciones de auth
├── login.html              # Página de login
├── dashboard.html          # Dashboard principal
├── productos.html          # Gestión de productos
├── pedidos.html            # Gestión de pedidos
├── conversaciones.html     # Historial de conversaciones
├── clientes.html           # Base de datos de clientes
├── reportes.html           # Estadísticas y reportes
├── unauthorized.html       # Página de acceso denegado
└── chatbot.html            # Interfaz del chatbot (legacy)
```

## 🔐 Sistema de Autenticación

El frontend usa las siguientes funciones de autenticación (disponibles en `window.HalleyCol.auth`):

```javascript
// Verificar si está logueado
HalleyCol.auth.isLoggedIn()

// Obtener usuario actual
HalleyCol.auth.getCurrentUser()

// Verificar si tiene un rol específico
HalleyCol.auth.hasRole('admin', 'ventas')

// Requerir autenticación (redirige a /login si no está autenticado)
HalleyCol.auth.requireAuth()

// Requerir roles específicos (redirige a /unauthorized si no tiene permiso)
HalleyCol.auth.requireRole('admin', 'ventas')

// Login
await HalleyCol.auth.login(username, password)

// Logout
HalleyCol.auth.logout()
```

## 🛠️ Utilidades UI

```javascript
// Formatear moneda
HalleyCol.ui.formatCurrency(250000) // "$250.000"

// Formatear fecha
HalleyCol.ui.formatDate(new Date()) // "14 may 2026, 07:00 PM"

// Formatear tiempo relativo
HalleyCol.ui.formatRelativeTime(new Date()) // "Hace 2h"

// Mostrar loading
HalleyCol.ui.showLoading('containerId')

// Mostrar alerta
HalleyCol.ui.showAlert('containerId', 'Mensaje', 'success')

// Renderizar tablas
HalleyCol.ui.renderProductsTable(products, 'containerId')
HalleyCol.ui.renderOrdersTable(orders, 'containerId')
HalleyCol.ui.renderConversationsTable(conversations, 'containerId')
HalleyCol.ui.renderClientsTable(clients, 'containerId')
```

## 🌐 API Endpoints

Todos los endpoints requieren autenticación vía cookie `auth_token`.

### Auth
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión

### CRM
- `GET /api/crm/products` - Listar productos
- `POST /api/crm/products` - Crear/actualizar producto
- `GET /api/crm/orders` - Listar pedidos
- `PATCH /api/crm/orders/:id` - Actualizar pedido
- `GET /api/crm/conversations` - Listar conversaciones
- `GET /api/crm/conversations/:sessionId/messages` - Ver mensajes
- `GET /api/crm/dashboard` - Datos del dashboard
- `GET /api/crm/clients` - Listar clientes
- `GET /api/crm/reports` - Reportes y estadísticas

## 🔒 Matriz de Permisos

| Endpoint | admin | ventas | logistica | asesor |
|----------|-------|--------|-----------|--------|
| GET /products | ✅ | ✅ | ✅ | ✅ |
| POST /products | ✅ | ✅ | 🚫 |  |
| GET /orders | ✅ | ✅ | ✅ | ✅ |
| PATCH /orders | ✅ | 🚫 | ✅ | 🚫 |
| GET /conversations | ✅ | ✅ | 🚫 | ✅ |
| GET /dashboard | ✅ | ✅ | 🚫 |  |
| GET /clients | ✅ | ✅ | 🚫 |  |
| GET /reports | ✅ | ✅ | 🚫 | 🚫 |

## 🎯 Flujo de Inicio de Sesión

1. Usuario ingresa credenciales en `/login`
2. Se hace POST a `/api/auth/login`
3. Si es exitoso, se guarda el usuario en `localStorage`
4. Redirección según el rol:
   - admin → `/dashboard`
   - ventas → `/dashboard`
   - logistica → `/pedidos`
   - asesor → `/conversaciones`

## 🚫 Página de Acceso Denegado

Si un usuario intenta acceder a una página para la cual no tiene permisos, es redirigido a `/unauthorized` que muestra una página de error amigable.
