# Dockerfile for the PDC's HAPI service
#
#
# Hub API used by the PDC's Visualizer.  Links to Auth, HubDB and DCLAPI.
#
# Example:
# sudo docker pull pdcbc/hapi
# sudo docker run -d --name=hapi -h hapi --restart=always \
#   --link auth:auth \
#   --link dclapi:dclapi \
#   --link hubdb:hubdb \
#   pdcbc/hapi
#
# Linked containers
# - Auth:            --link auth:auth
# - DCLAPI:          --link dclapi:dclapi
# - HubDB:           --link hubdb:hubdb
#
# Modify default settings
# - DACS federation: -e DACS_FEDERATION=<string>
# -    jurisdiction: -e DACS_JURISDICTION=<string>
# - Node secret:     -e NODE_SECRET=<string>
# - Reject non-CA    -e REJECT_NONCA_CERTS=<0/1>
#     certificates?:
#
# Releases
# - https://github.com/PDCbc/hapi/releases
#
#
FROM phusion/passenger-nodejs
MAINTAINER derek.roberts@gmail.com
ENV RELEASE 0.1.7


# Packages
#
RUN apt-get update; \
    apt-get install -y \
      git \
      python2.7; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*


# Prepare /app/ folder
#
WORKDIR /app/
RUN git clone https://github.com/pdcbc/hapi.git . -b ${RELEASE}; \
    npm config set python /usr/bin/python2.7; \
    npm install; \
    chown -R app:app /app/


# Create startup script and make it executable
#
RUN mkdir -p /etc/service/app/; \
    ( \
      echo "#!/bin/bash"; \
      echo "#"; \
      echo "set -e -o nounset"; \
      echo ""; \
      echo ""; \
      echo "# Environment variables"; \
      echo "#"; \
      echo "export PORT=\${PORT_HAPI:-3003}"; \
      echo "export AUTH_CONTROL=https://auth:\${PORT_AUTH_C:-3006}"; \
      echo "export DCLAPI_URI=http://dclapi:\${PORT_DCLAPI:-3007}"; \
      echo "export MONGO_URI=mongodb://hubdb:27017/query_composer_development"; \
      echo "export HAPI_GROUPS=/home/app/groups/groups.json"; \
      echo "#"; \
      echo "export ROLES=/etc/dacs/federations/\${DACS_FEDERATION:-pdc.dev}/roles"; \
      echo "export NODE_TLS_REJECT_UNAUTHORIZED=\${REJECT_NONCA_CERTS:-0}"; \
      echo "export SECRET=\${NODE_SECRET:-notVerySecret}"; \
      echo ""; \
      echo ""; \
      echo "# Copy groups.json if not present"; \
      echo "# "; \
      echo "if([ ! -d /home/app/groups/ ]||[ ! -s /home/app/groups/groups.json ])"; \
      echo "then"; \
      echo "  ("; \
      echo "    mkdir -p /home/app/groups"; \
      echo "    cp /app/groups.json /home/app/groups/"; \
      echo "  )||("; \
      echo "    ERROR: /home/app/groups/groups.json initialization unsuccessful >&2"; \
      echo "  )"; \
      echo "fi"; \
      echo ""; \
      echo ""; \
      echo "# Start service"; \
      echo "#"; \
      echo "cd /app/"; \
      echo "/sbin/setuser app npm start"; \
    )  \
      >> /etc/service/app/run; \
    chmod +x /etc/service/app/run


# Run Command
#
CMD ["/sbin/my_init"]
