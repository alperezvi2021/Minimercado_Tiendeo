FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Install postgresql-client for pg_dump
RUN apk add --no-cache postgresql-client

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
