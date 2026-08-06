# Use a lightweight Alpine Linux image with Node.js pre-installed
FROM node:20-alpine

# Install wget for downloading files
RUN apk add --no-cache wget

# Set the working directory inside the container
WORKDIR /app

# Download the server.js script directly from your GitHub repository
RUN wget https://raw.githubusercontent.com/jjjm03299-wq/didactic-barnacle/refs/heads/main/server.js -O server.js

# Initialize package.json and install Express framework
RUN npm init -y && \
    npm install express

# Expose the application port
EXPOSE 5900

# Set environment variable for port
ENV PORT=5900

# Command to run the Node.js server
CMD ["node", "server.js"]
