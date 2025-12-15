FROM node:20-alpine AS base

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000

# Install dependencies based on the lockfile for reproducible builds
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

EXPOSE 4000

CMD ["npm", "run", "start"]
