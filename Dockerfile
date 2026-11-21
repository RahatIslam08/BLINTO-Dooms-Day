FROM node:24-alpine AS client-build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm install
COPY client client
RUN npm run build -w client

FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json server/package.json
COPY server server
RUN npm install --omit=dev -w server
COPY --from=client-build /app/client/dist ./client/dist
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "run", "start", "-w", "server"]
