## NOTE: Dockerfile build context is /backend
FROM node:20

# Install nodemon globally
RUN npm install -g nodemon

# Install ffmpeg. This is required for check upload media file.
RUN apt-get update && apt-get install -y ffmpeg

# Create a directory for application source code
RUN mkdir -p /usr/src/app/src

# Create a directory for the app
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY ./package*.json ./

# Install twilio for sending SMS
RUN npm install twilio

# Install app dependencies
RUN npm install

# Expose the port the app runs on
EXPOSE 3000

# Set the working directory for the app
VOLUME ["/usr/src/app/src"]

# Start the app
CMD npm run dev
