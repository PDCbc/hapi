FROM node

### Configuration Parameters -- You should set these. ###
# Configure Port
ENV PORT 8080
# Configure Secret
ENV SECRET "Test Secret"
# Configure MONGO_URI
# mongodb://<domain>/<database>
ENV MONGO_URI mongodb://hub-db/query_composer_development
# Allow Self Signed SSL Certs
ENV NODE_TLS_REJECT_UNAUTHORIZED 0

ADD . /app
WORKDIR /app

# Remove any binaries that might have invalid ELF headers
RUN rm -rf node-modules

RUN npm install

EXPOSE 8080

# Install Dependencies then start
CMD npm start
