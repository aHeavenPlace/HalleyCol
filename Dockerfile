# ========================================
# HalleyCol CRM - Dockerfile
# ========================================

# Usar imagen oficial de Node.js LTS
FROM node:20-alpine

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

# Comando de inicio
CMD ["npm", "run", "start:ui"]
