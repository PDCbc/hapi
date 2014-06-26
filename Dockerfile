FROM node

### Configuration Parameters -- You should set these. ###
# Configure Port
ENV PORT 8080
# Configure Secret
ENV SECRET "Test Secret"
# Configure MONGO_URI
ENV MONGO_URI mongodb://queryenginedb/queryengine

# Setup nodemon - So it can reload if the file changes.
RUN npm install -g supervisor

# Set directory to the volume.
VOLUME ["/app"]
WORKDIR /app

# Install Dependencies then start
CMD npm install --no-bin-links && supervisor --watch . -i node_modules init.js 
