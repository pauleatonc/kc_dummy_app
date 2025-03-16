FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create a .env file with the environment variables
RUN echo "VITE_KEYCLOAK_URL=http://localhost:8080" > .env && \
    echo "VITE_KEYCLOAK_REALM=kcdummy" >> .env && \
    echo "VITE_KEYCLOAK_CLIENT_ID=frontend-client" >> .env

# Expose the port Vite runs on
EXPOSE 5173

# Start the development server
CMD ["npm", "run", "dev"] 