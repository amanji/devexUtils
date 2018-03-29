# Mongo DB Scrubber Utility

A simple Node.js application that will connect to a MongoDB instance, copy a specified DB and scrub it clean of all sensitive information and create a dump of it in `/tmp`.

The following parameters can be provided via ENV variables specifying the DB that should be cleaned.:

_NOTE: A copy of the DB will be generated and dropped once it is cleaned and dumped to `/tmp`. The scrubbable DB copy as well as the dump can be identified via the name of the DB being cleaned, post-fixed with '-scrubbed' (Example: 'devex-scrubbed'). The DB dump will overwrite any existing dump that exists in `/tmp`._

`MONGO_DB_NAME` _defaults to 'devex'_

`MONGO_DB_HOSTNAME` _defaults to 'localhost'_;

`MONGO_DB_PORT` _defaults to '27017'_;

## Running the application

Run `npm install && npm start` if node modules are not installed,otherwise run `npm start`.

_For correspondence please email akiff.manji@gmail.com. or tag @amanji on GitHub_
