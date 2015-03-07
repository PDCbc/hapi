#!/bin/bash

# Exit on errors and trace (print) exections
#
set -e

npm install
npm install request
PORT=3003 MONGO_URI=mongodb://localhost:27019/query_composer_development npm start
