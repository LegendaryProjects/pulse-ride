FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV NODE_ENV=production
ENV ML_SERVICE_URL=http://ml-service:8000

EXPOSE 3000
CMD ["node", "src/server.js"]
