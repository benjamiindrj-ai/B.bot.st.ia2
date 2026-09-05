FROM node:20-slim

WORKDIR /app

# Copy package definitions
COPY package*.json ./

# Install all dependencies (dev included for build step)
RUN npm install

# Copy application source
COPY . .

# Build client and bundle server
RUN npm run build

# Expose default port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["node", "dist/server.cjs"]
