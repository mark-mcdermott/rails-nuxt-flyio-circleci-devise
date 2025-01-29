# frontend/Dockerfile
FROM node:18
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm install -g vitest
CMD ["npx", "vitest", "spec/components"]