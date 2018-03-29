'use strict';

var chalk = require('chalk'),
    config = require('./config'),
    MongoClient = require('mongodb').MongoClient,
    spawn = require('child_process');

var MONGO_DB_HOSTNAME = config.db.hostname;
var MONGO_DB_PORT = config.db.port;
var MONGO_DB_URL = config.db.uri;

var FROM_DB_NAME = config.db.name;
var SCRUB_DB_NAME = FROM_DB_NAME + '-scrubbed';

/**
 * Collections that don't contain sensitive data fields.
 */
var collectionWhitelist = [
    'capabilities',
    'capabilityskills',
    'configuration',
    'notifications',
    'projects',
    'sessions',
    'skills',
    'subscriptions',
    'teams'
];

/**
* Sensitive data fields.
*/
var removableFields = {
    'opportunities': [
        'proposalEmail'
    ],
    'orgs': [
        'name',
        'dba',
        'address',
        'address2',
        'city',
        'province',
        'postalcode',
        'fullAddress',
        'contactName',
        'contactEmail',
        'contactPhone',
        'website',
        'orgImageURL'
    ],
    'profiles': [
        'github',
        'stackOverflow',
        'stackExchange',
        'linkedIn',
        'website'
    ],
    'programs': [
        'owner'
    ],
    'proposals': [
        'businessName',
        'businessAddress',
        'businessContactName',
        'businessContactEmail',
        'businessContactPhone'
    ],
    'users': [
        'firstName',
        'lastName',
        'displayName',
        'username',
        'email',
        'address',
        'phone',
        'businessName',
        'businessAddress',
        'businessAddress2',
        'businessCity',
        'businessProvince',
        'businessCode',
        'businessContactName',
        'businessContactEmail',
        'businessContactPhone',
        // Removed the following since they may contain personal information
        'profileImageURL',
        'providerData',
        'github',
        'stackOverflow',
        'stackExchange',
        'linkedIn',
        'website'
    ]
};

/**
* Default field values to use instead of ''.
*/
var defaults = {
    'province': 'BC',
    'businessProvince': 'BC'
};

/**
* Collections with indexes that need to be dropped.
*/
var indexes = {
    'users': {
        'email': { unique: true },
        'username': { unique: true }
    }
};

var _client;

/**
* Connects to a Mongo DB.
*/
var connectDB = function() {
    return new Promise(function(resolve, reject) {
        MongoClient.connect(MONGO_DB_URL, function(err, client) {
            if (err) {
                return reject(err);
            }
            _client = client;
            return resolve();
        });
    }).catch(function(err) {
        console.error(chalk.bold.red(err));
        process.exit(1);
    });
}

/**
* Drops the ephemeral scrub DB if it exists.
*/
var dropDB = function() {
    console.log(chalk.cyan('Dropping DB: ' + SCRUB_DB_NAME));
    return _client.db(SCRUB_DB_NAME)
        .dropDatabase();
}

/**
* Copies connected Mongo DB to an ephemeral scrub DB.
*/
var copyProdDB = function() {
    var copyCommand = {
        copydb: 1,
        fromhost: MONGO_DB_HOSTNAME,
        fromdb: FROM_DB_NAME,
        todb: SCRUB_DB_NAME
    };

    return _client.db(SCRUB_DB_NAME)
        .admin()
        .command(copyCommand)
}

/**
* Get list of all collections in ephemeral scrub DB.
*/
var getDBCollections = function() {
    return _client.db(SCRUB_DB_NAME)
        .collections();
}

/**
* Cleans ephemeral scrub DB of all sensitive data.
*/
var scrubDB = function(collections) {
    console.log(chalk.cyan('Scrubbing database: ' + SCRUB_DB_NAME));

    /**
     * Get list of sensitive collections.
     */
    var sensitiveCollections = collections.filter(function(collection) {
        return collectionWhitelist.indexOf(collection.collectionName) === -1;
    });
    console.log(chalk.yellow('Found ' + sensitiveCollections.length + ' sensitive collections.'));

    // var promise = Promise.resolve();

    return sensitiveCollections.reduce(function(sequence, collection) {
        return sequence.then(function() {
            if (indexes.hasOwnProperty(collection.collectionName)) {

                /**
                 * TODO: Need to figure out a better way to deal with overwriting unique indexes.
                 * For now simply dropping the indexes so that an empty string value can be written.
                 */
                return collection.dropIndexes();
            } else {
                return Promise.resolve();
            }
        }).then(function() {
            /**
             * Setup filter query for updateMany
             */
            var existsOrQuery = removableFields[collection.collectionName].map(function(field) {
                var queryObject = {};
                queryObject[field] = { $exists: true};
                return queryObject;
            });

            var filterQuery = { $or: existsOrQuery };

            if (collection.collectionName === 'users') {
                var notQuery = ['admin', 'dev', 'gov', 'user'].map(function(username) {
                    return { 'username': { $ne: username } };
                });
                filterQuery.$and = notQuery;
            }

            /**
             * Setup update obects for updateMany
             */
            var updateParameters = removableFields[collection.collectionName]
                .reduce(function(updates, field) {
                    updates[field] = defaults[field] || '';
                    return updates;
                }, {});

            /**
            * Attempt updateMany
            */
            return collection.updateMany(filterQuery, { $set: updateParameters });
        }).then(function(result) {
            console.log(chalk.green('Found ' + result.matchedCount + ' entries in ' + collection.collectionName +
            ' with sensitive fields...scrubbed ' + result.modifiedCount + ' entries clean'));
            return Promise.resolve();
        });
    }, Promise.resolve());

}

/**
 * Close connected Mongo DB.
 */
var closeClient = function() {
    if (_client) {
        _client.close();
    }
}

var dumpDB = function() {
    return new Promise(function(resolve, reject) {
        console.log(chalk.cyan('Dumping ' + SCRUB_DB_NAME + ' to /tmp'));

        var cmd = [
            'mongodump',
            '--host', MONGO_DB_HOSTNAME,
            '--port', MONGO_DB_PORT,
            '--db', SCRUB_DB_NAME,
            '--out', '/tmp/',
            '--gzip'
        ].join(' ');

        spawn.exec(cmd, function(err, stdout, stderr) {
            if (err) {
                return reject(err);
            }

            if (stdout) {
                console.log(stdout);
            }

            if (stderr) {
                console.log(stderr);
            }

            return resolve();
        });
    });
}

module.exports.scrub = function() {
    return connectDB()
        .then(function() {
            return dropDB();
        })
        .then(function() {
            return copyProdDB();
        })
        .then(function() {
            return getDBCollections();
        })
        .then(function(collections) {
            if (!collections.length) {
                return Promise.reject('No collections in db: ' + SCRUB_DB_NAME);
            }
            console.log(chalk.cyan('Found ' + collections.length + ' collections.'));
            return scrubDB(collections);
        })
        .then(function() {
            return dumpDB();
        })
        .then(function() {
            dropDB().then(closeClient);
            process.exit(0);
        })
        .catch(function(err) {
            console.error(chalk.bold.red(err));
            dropDB().then(closeClient);
            process.exit(1);
        });
};

this.scrub();