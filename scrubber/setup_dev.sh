#!/bin/bash

MONGO_PID=$(docker ps -a -q -f "name=scrubber-mongo")
if [[ -z $MONGO_PID ]]; then
	docker run -p 27017:27017 -d -v /var/lib/mongodb:/data/db --name scrubber-mongo mongo
fi

docker build -t scrubber .

docker stop scrubber-mongo
docker start scrubber-mongo
docker stop scrubber

docker run \
    -v `pwd`:/opt/scrubber \
    -ti --rm --link scrubber-mongo scrubber ${@:-bash}
