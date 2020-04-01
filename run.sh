#!/bin/bash

#(cd programs/server && npm install)

export MONGO_URL='mongodb://jimmy:qZLys6tR_K!tKxZ@ds111319.mlab.com:11319/meteor-apn'
export ROOT_URL='http://apn.meteor.example'
export PORT=4000
export MAIL_URL='smtp://jimmy@localhost:25/'

node bundle/main.js
