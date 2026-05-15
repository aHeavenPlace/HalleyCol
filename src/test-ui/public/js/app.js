/**
 * HALLEYCOL CRM - Utilidades Principales
 */

// ========================================
// AUTH & SESSION
// ========================================

function getCurrentUser() {
  const userStr = localStorage.getItem('halleycol_user');
  return userStr ? JSON.parse(userStr) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('halleycol_user', JSON.stringify(user));
}

function removeCurrentUser() {
  localStorage.removeItem('halleycol_user');
}

function isLoggedIn() {
  return !!getCurrentUser();
}

function hasRole(...roles) {
  const user = getCurrentUser();
  if (!user) return false;
  return roles.includes(user.role);
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

function requireRole(...roles) {
  if (!requireAuth()) return false;
  
  const user = getCurrentUser();
  if (!roles.includes(user.role)) {
    window.location.href = '/unauthorized';
    return false;
  }
  return true;
}

async function login(username, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    return { success: false, error: 'Error de conexión con el servidor' };
  }
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  removeCurrentUser();
  window.location.href = '/login';
}

// ========================================
// API HELPERS
// ========================================

async function apiRequest(endpoint, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const config = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(`/api/crm${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error en la petición');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ========================================
// UI HELPERS
// ========================================

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Ahora mismo';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return formatDate(dateStr);
}

function showLoading(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  }
}

function hideLoading(elementId) {
  const el = document.getElementById(elementId);
  if (el && el.querySelector('.loading')) {
    el.querySelector('.loading').remove();
  }
}

function showAlert(containerId, message, type = 'error') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.style.display = 'block';
  alert.textContent = message;
  
  container.innerHTML = '';
  container.appendChild(alert);
  
  setTimeout(() => {
    alert.style.display = 'none';
  }, 5000);
}

function getBadgeForStatus(status) {
  const badges = {
    'Pendiente': 'badge-gray',
    'Pendiente Validacion': 'badge-warning',
    'Pendiente Despacho': 'badge-warning',
    'Pagado': 'badge-success',
    'Enviado': 'badge-primary',
    'Entregado': 'badge-success',
    'Rechazado': 'badge-danger',
    'Cancelado': 'badge-danger',
  };
  return badges[status] || 'badge-gray';
}

// ========================================
// TABLE RENDERERS
// ========================================

function renderProductsTable(products, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <h3>No hay productos</h3>
        <p>Los productos aparecerán aquí cuando se agreguen</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Marca</th>
          <th>Categoría</th>
          <th>Precio</th>
          <th>Tallas</th>
          <th>Stock</th>
        </tr>
      </thead>
      <tbody>
        ${products.map(p => `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.brand}</td>
            <td>${p.category}</td>
            <td>${formatCurrency(p.price)}</td>
            <td>${p.available_sizes?.join(', ') || 'N/A'}</td>
            <td>${JSON.stringify(p.stock)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderOrdersTable(orders, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>No hay pedidos</h3>
        <p>Los pedidos aparecerán aquí cuando se realicen compras</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Orden</th>
          <th>Cliente</th>
          <th>Ciudad</th>
          <th>Productos</th>
          <th>Total</th>
          <th>Estado</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(o => `
          <tr>
            <td><strong>${o.numero_orden}</strong></td>
            <td>${o.cliente_nombre}<br><small>${o.cliente_whatsapp}</small></td>
            <td>${o.ciudad}</td>
            <td>${o.productos}</td>
            <td><strong>${formatCurrency(o.total)}</strong></td>
            <td><span class="badge ${getBadgeForStatus(o.estado)}">${o.estado}</span></td>
            <td>${formatRelativeTime(o.created_at)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderConversationsTable(conversations, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!conversations || conversations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💬</div>
        <h3>No hay conversaciones</h3>
        <p>Las conversaciones del chatbot aparecerán aquí</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Session ID</th>
          <th>Cliente</th>
          <th>Estado</th>
          <th>Necesita Asesor</th>
          <th>Última Actividad</th>
        </tr>
      </thead>
      <tbody>
        ${conversations.map(c => `
          <tr>
            <td><code>${c.session_id}</code></td>
            <td>${c.cliente_whatsapp || 'N/A'}</td>
            <td>${c.estado_fsm}</td>
            <td>${c.necesita_asesor ? '<span class="badge badge-danger">Sí</span>' : '<span class="badge badge-success">No</span>'}</td>
            <td>${formatRelativeTime(c.updated_at)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderClientsTable(clients, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!clients || clients.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <h3>No hay clientes</h3>
        <p>Los clientes aparecerán aquí cuando realicen pedidos</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>WhatsApp</th>
          <th>Compras</th>
          <th>Total Gastado</th>
          <th>Última Compra</th>
        </tr>
      </thead>
      <tbody>
        ${clients.map(c => `
          <tr>
            <td><strong>${c.nombre}</strong></td>
            <td>${c.id}</td>
            <td>${c.compras}</td>
            <td><strong>${formatCurrency(c.total_gastado)}</strong></td>
            <td>${formatRelativeTime(c.ultima_compra)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ========================================
// INITIALIZATION
// ========================================

function initSidebar() {
  const user = getCurrentUser();
  if (!user) return;
  
  // Actualizar info de usuario en sidebar
  const roleEl = document.querySelector('.sidebar-user-role');
  const nameEl = document.querySelector('.sidebar-user-name');
  
  if (roleEl) roleEl.textContent = user.role;
  if (nameEl) nameEl.textContent = user.username;
  
  // Marcar enlace activo
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });
}

// ========================================
// EXPORTS
// ========================================

window.HalleyCol = {
  auth: {
    getCurrentUser,
    setCurrentUser,
    removeCurrentUser,
    isLoggedIn,
    hasRole,
    requireAuth,
    requireRole,
    login,
    logout,
  },
  api: {
    request: apiRequest,
  },
  ui: {
    formatCurrency,
    formatDate,
    formatRelativeTime,
    showLoading,
    hideLoading,
    showAlert,
    getBadgeForStatus,
    renderProductsTable,
    renderOrdersTable,
    renderConversationsTable,
    renderClientsTable,
    initSidebar,
  },
};
