FROM strictlyskyler/meteor-environment:1.1.0
MAINTAINER Skyler Brungardt <skyler.brungardt@gmail.com>

ADD . /opt/apm

WORKDIR /opt/apm

RUN apt-get update \
 && apt-get install -y locales
RUN locale-gen en_US.UTF-8 && localedef -i en_GB -f UTF-8 en_US.UTF-8
RUN meteor npm i
RUN TOOL_NODE_FLAGS="--max-old-space-size=4096" \
  meteor build --directory /apm --allow-superuser

WORKDIR /apm/bundle/programs/server

RUN npm i

ADD ./start.sh /start.sh
