FROM node:8.16.0

ENV APP_DIR=/meteor
# Install as root (otherwise node-gyp gets compiled as nobody)
USER root
WORKDIR $APP_DIR/bundle/programs/server/

# Copy bundle and scripts to the image APP_DIR
ADD . $APP_DIR

# the install command for debian
RUN echo "Installing the node modules..." \
  && npm install -g node-gyp \
  && npm install --production --silent

# start the app
WORKDIR /meteor/bundle
CMD ["node","main.js"]
