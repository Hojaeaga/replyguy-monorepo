# Use the official Node.js 18 runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./

# Copy the entire monorepo
COPY . .

# Install dependencies
RUN npm ci --frozen-lockfile

# Build the ingestion app
RUN npm run build --workspace=@replyguy/ingestion

# Expose the port the app runs on
EXPOSE 3001

# Set the user to non-root for security
USER node

# Start the application
CMD ["npm", "start", "--workspace=@replyguy/ingestion"] 