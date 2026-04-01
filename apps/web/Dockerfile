FROM node:20-alpine
WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies
RUN npm ci

# Build the web dashboard
RUN npx turbo run build --filter=web

# Expose the standard Next.js port
EXPOSE 3001

# Start the built Next.js app
CMD ["npm", "run", "start", "-w", "apps/web"]
