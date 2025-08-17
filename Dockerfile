FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

RUN mkdir -p converted_images

EXPOSE 3000

CMD ["node", "index.js"]