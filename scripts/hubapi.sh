#!/bin/sh
cd /home/app/hubapi/
#chpst -u app bash -c /home/app/hubapi/setup.sh #satisfy preconditions
npm install # Install Dependencies into `.node_modules/`.
npm start   # Start the application.
