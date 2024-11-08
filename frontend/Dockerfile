FROM node:20.18.0-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy the rest of the code
COPY . .

# Expose the port Vite uses
EXPOSE 5173

# Start the development server with host flag to make it accessible
CMD ["pnpm", "run", "dev", "--host"]