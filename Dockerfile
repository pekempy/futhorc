# Stage 1: Build Vite application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Accept build argument for Gemini API Key
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Build production bundle
RUN npm run build

# Stage 2: Serve static production assets & database persistence with Node.js
FROM node:20-alpine

WORKDIR /app

# Copy production build and server script
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs
COPY package*.json ./

# Create data directory volume mount target
RUN mkdir -p /app/data

ENV PORT=80
EXPOSE 80

CMD ["node", "server.mjs"]
