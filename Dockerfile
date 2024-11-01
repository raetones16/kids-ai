FROM node:20.18.0

WORKDIR /usr/src/app

# Install ts-node-dev globally
RUN npm install -g ts-node-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]