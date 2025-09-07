# AI Todo App - Docker Configuration
# Multi-stage build for optimal production deployment

# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

# Copy frontend package files
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy frontend source and build
COPY public ./public
COPY src ./src
COPY tsconfig.json ./
RUN npm run build

# Stage 2: Setup backend and final image
FROM node:18-alpine AS production

# Install PM2 globally for process management
RUN npm install -g pm2

# Create app directory
WORKDIR /app

# Copy backend files
COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy backend source
COPY server/ ./

# Copy built frontend
COPY --from=frontend-build /app/frontend/build ../build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start both servers with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]