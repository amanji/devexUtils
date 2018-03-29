FROM ubuntu:latest

LABEL io.openshift.s2i.scripts-url=image:///usr/local/s2i

COPY ./.s2i/bin /usr/local/s2i

# Install apt packages
RUN apt update -q
RUN apt install -yqq \
    apt-transport-https \
    apt-utils \
    curl \
    sudo
RUN apt clean
RUN rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install MongoDB
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
RUN echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-3.6.list
RUN apt update -q
RUN apt install -yqq mongodb-org
RUN apt clean
RUN rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
RUN sudo apt install -yqq nodejs
RUN apt clean
RUN rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install minio
RUN mkdir /opt/minio
RUN curl -o /opt/minio/mc https://dl.minio.io/client/mc/release/linux-amd64/mc
RUN chmod +x /opt/minio/mc

WORKDIR /opt/scrubber
COPY . /opt/scrubber
# COPY package.json /opt/scrubber
# COPY package.lock.json /opt/scrubber
RUN rm -rf node_modules
RUN npm install

CMD ["npm", "start"]
