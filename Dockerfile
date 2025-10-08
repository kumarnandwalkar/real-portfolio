# Orchestrator container with Node and Docker CLI (via Alpine packages)
FROM node:20-alpine

RUN apk add --no-cache git docker-cli docker-cli-compose

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY src ./src
COPY public ./public

ENV PORT=8088
EXPOSE 8088

CMD ["node", "src/server.js"]


