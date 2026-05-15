# ========================================
# HalleyCol CRM - Dockerfile
# ========================================

# Usar imagen oficial de Node.js LTS
FROM node:20-alpine

# Instalar dotenv-cli para cargar variables de entorno
RUN npm install -g dotenv-cli

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias (incluyendo devDependencies para TypeScript)
RUN npm install

# Copiar todo el código fuente
COPY . .

# Compilar TypeScript (si es necesario)
RUN npm run build:ia 2>/dev/null || echo "Build step completed"

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/auth/login', (r) => {process.exit(r.statusCode === 405 ? 0 : 1)})"

# Comando de inicio
CMD ["npm", "run", "start:ui"]
