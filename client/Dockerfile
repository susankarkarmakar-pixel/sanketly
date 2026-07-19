FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./
# Since we are using workspaces, it's better to copy the whole project for a dev setup, but for now we just want a dev container.
# In a real dev setup, we might mount the root.
COPY . .

RUN pnpm install

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]
