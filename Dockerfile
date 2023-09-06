# Use the Node.js LTS image as a base
FROM node:lts

# Set working directory to /
WORKDIR /

# Copy app source
COPY . /

# Install app dependencies
RUN npm install

# Expose port to outside world
EXPOSE 3000

# Start command as per the package.json file
CMD ["npm", "run", "test"]