## NOTE: Dockerfile build context is /frontend
FROM node:20

# Install nodemon globally
RUN npm install -g nodemon

# Create a directory for application source code
RUN mkdir -p /usr/src/app/src
RUN mkdir -p /usr/src/app/public

# Create a directory for the app
WORKDIR /usr/src/app

# Set the NODE_OPTIONS environment variable to allow legacy OpenSSL algorithms
ENV NODE_OPTIONS=--openssl-legacy-provider

# Copy package.json and package-lock.json
COPY ./package*.json ./

# Install dependencies
RUN npm install

# Expose the port the app runs on
EXPOSE 3000

# Set the working directory for the app
VOLUME ["/usr/src/app/src", "/usr/src/app/public"]

# Start the application
CMD ["npm", "run", "start"]
