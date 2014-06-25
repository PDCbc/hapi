FROM node

### Configuration Parameters -- You should set these. ###
# Configure Port
ENV PORT 8080
# Configure Secret
ENV SECRET "Test Secret"
# Configure MONGO_URI
ENV MONGO_URI mongodb://mongo/query-engine

# Set directory to the volume.
WORKDIR /app

# Install Dependencies then start
CMD npm install && npm start
