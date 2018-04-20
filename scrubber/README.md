# Mongo DB Scrubber Utility

A simple Node.js application that will connect to a MongoDB instance, copy a specified DB, scrub it clean of all sensitive information and create a dump of it in `/tmp`.

_**WARNING:** The utility will overwrite any existing dump that exists in `/tmp`. It will also overwrite any data that exists in the database copy that is being cleaned if it currently exists._

This utility also comes with accompanying modules that can be used in standalone:
* `exporter.js` - Exports a DB to `/tmp`. _Uses parameters specified in SRC section below or can be passed a configuration object._
* `importer.js` - Imports a DB from `/tmp`. _Uses parameters specified in DEST section below or can be passed a configuration object._

This utility requires the following dependencies:
* Node.js 8+ (preferrably LTS)
* mongo-tools

#### The following parameters should be defined as ENV variables specifying the DB to be scrubbed:

### Specify a SRC MongoDB Database:

`SRC_MONGO_DB_NAME` _defaults to 'devex'_ \
`SRC_MONGO_DB_HOSTNAME` _defaults to 'localhost'_ \
`SRC_MONGO_DB_PORT` _defaults to '27017'_ \
`SRC_MONGO_DB_BACKUP_DIRNAME` _defaults to 'devexbackup'_ \
`SRC_MONGO_DB_USERNAME` _defaults to ''_ \
`SRC_MONGO_DB_PASSWORD` _defaults to ''_

**IMPORTANT:**
* `SRC_MONGO_DB_BACKUP_DIRNAME` needs to be the same as the name of the destination database that is being scrubbed.
* Both `SRC_MONGO_DB_USERNAME` and `SRC_MONGO_DB_PASSWORD` need to be defined if the database requires authentication for connecting to. If either are missing, the script will attempt to connect to the database without authentication credentials.
* If authentication credentials are defined, the user that the database connects with must have a minimum of `read` permissions on that database.

### Specify a DEST MongoDB Database:

`DEST_MONGO_DB_NAME` _defaults to 'devexbackup'_ \
`DEST_MONGO_DB_HOSTNAME` _defaults to 'localhost'_ \
`DEST_MONGO_DB_PORT` _defaults to '27017'_ \
`DEST_MONGO_DB_USERNAME` _defaults to ''_ \
`DEST_MONGO_DB_PASSWORD` _defaults to ''_

**IMPORTANT:**
* Both `DEST_MONGO_DB_USERNAME` and `DEST_MONGO_DB_PASSWORD` need to be defined if the database requires authentication for connecting to. If either are missing, the script will attempt to connect to the database without authentication credentials.
* If authentication credentials are defined, the user that the database connects with must have a minimum of `readWrite` permissions on that database. It is preferrable for the user to have `dbAdmin` permissions since the script will attempt to drop any temporal or intermediary databases that it may create.

## Running the application

Run `npm install && npm start` if node modules are not installed, otherwise run `npm start`.

_For correspondence please email akiff.manji@gmail.com. or tag @amanji on GitHub_

## Replaced Fields

The following list indicates collections and the fields within them that are either replaced with a dummy placeholder, a default value or are completely removed (ie. set to '').

* 'opportunities'
    * 'proposalEmail': 'bcdevelopersexchange@gmail.com'
* 'orgs'
    * 'name': `dummy placeholder`
    * 'dba': `dummy placeholder`
    * 'address': `dummy placeholder`
    * 'address2': `dummy placeholder`
    * 'city': `dummy placeholder`
    * 'province': 'BC'
    * 'postalcode': '1A1 A1A'
    * 'fullAddress': `dummy placeholder`
    * 'contactName': `dummy placeholder`
    * 'contactEmail': 'bcdevelopersexchange@gmail.com'
    * 'contactPhone': `dummy placeholder`
    * 'website': ''
    * 'orgImageURL': ''
* 'profiles'
    * 'github': ''
    * 'stackOverflow': ''
    * 'stackExchange': ''
    * 'linkedIn': ''
    * 'website': ''
* 'programs'
    * 'owner': ''
* 'proposals'
    * 'businessName': `dummy placeholder`
    * 'businessAddress': `dummy placeholder`
    * 'businessContactName': `dummy placeholder`
    * 'businessContactEmail': `dummy placeholder`
    * 'businessContactPhone': `dummy placeholder`
* 'users'
    * 'firstName': `dummy placeholder`
    * 'lastName': `dummy placeholder`
    * 'displayName': `dummy placeholder`
    * 'username': `dummy placeholder`
    * 'email': 'bcdevelopersexchange@gmail.com'
    * 'address': `dummy placeholder`
    * 'phone': `dummy placeholder`
    * 'businessAddress2': `dummy placeholder`
    * 'businessCity': `dummy placeholder`
    * 'businessProvince': 'BC'
    * 'businessCode': ''
    * 'profileImageURL': ''
    * 'providerData': '
    * 'businessName': `dummy placeholder`
    * 'businessAddress': `dummy placeholder`
    * 'businessContactName': `dummy placeholder`
    * 'businessContactEmail': `dummy placeholder`
    * 'businessContactPhone': `dummy placeholder`
    * 'github': ''
    * 'stackOverflow': ''
    * 'stackExchange': ''
    * 'linkedIn': ''
    * 'website': ''