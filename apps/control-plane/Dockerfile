FROM node:20-alpine
WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies for the workspace
RUN npm ci

# Generate Prisma client
RUN cd packages/db && npx prisma generate

# Build the control plane using Turbo
RUN npx turbo run build --filter=control-plane

# Expose port and start
EXPOSE 3000
CMD ["node", "apps/control-plane/dist/main.js"]
