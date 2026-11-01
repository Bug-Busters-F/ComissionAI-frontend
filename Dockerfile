# Etapa de build
FROM node:22-alpine AS base

WORKDIR /app

# Copia os arquivos de dependências primeiro (melhor uso de cache)
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código-fonte
COPY . .

# Expõe a porta padrão do Vite
EXPOSE 5173

# Inicia o servidor de desenvolvimento
CMD ["npm", "run", "dev"]
