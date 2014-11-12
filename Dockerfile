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

RUN npm install

# Install Dependencies then start
CMD npm start
