'use strict';

const chalk = require('chalk'),
    config = require('./config'),
    crypto = require('crypto'),
    exporter = require('./exporter'),
    importer = require('./importer'),
    MongoClient = require('mongodb').MongoClient,
    spawn = require('child_process');

const DEST_DB_NAME = config.dest.db.name;
const DEST_DB_URI = config.dest.db.uri;

/**
 * Collections that don't contain sensitive data fields.
 */
const collectionWhitelist = [
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
const removableFields = {
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
const defaults = {
    'province': 'BC',
    'businessProvince': 'BC'
};

/**
* Collections with indexes that need to be dropped.
*/
const indexes = {
    'users': {
        'email': { unique: true },
        'username': { unique: true }
    }
};

/**
 * Connects to a Mongo DB.
 */
let _client;
const connectDB = function() {
    return new Promise((resolve, reject) => {
        MongoClient.connect(DEST_DB_URI, (err, client) => {
            if (err) {
                return reject(err);
            }
            _client = client;
            return resolve();
        });
    }).catch(err => {
        console.error(chalk.bold.red(`Failed to connect to DB ${DEST_DB_NAME}`));
        console.error(err);
        process.exit(1);
    });
}

/**
* Drops the ephemeral scrub DB if it exists.
*/
const dropDB = function() {
    console.log(chalk.yellow(`Dropping DB: ${DEST_DB_NAME}'`));
    return _client.db(DEST_DB_NAME)
        .dropDatabase();
}

/**
* Get list of all collections in ephemeral scrub DB.
*/
const getDBCollections = function() {
    return _client.db(DEST_DB_NAME)
        .collections();
}

/**
* Cleans ephemeral scrub DB of all sensitive data.
*/
const scrubDB = function(collections) {
    console.log(chalk.cyan(`Scrubbing DB: ${DEST_DB_NAME}`));

    /**
     * Get list of sensitive collections.
     */
    const sensitiveCollections = collections
        .filter(collection => collectionWhitelist.indexOf(collection.collectionName) === -1);
    console.log(chalk.yellow(`Found ${sensitiveCollections.length} sensitive collections`));

    return sensitiveCollections.reduce((sequence, collection) => {
        return sequence.then(() => {
            if (indexes.hasOwnProperty(collection.collectionName)) {

                /**
                 * TODO: Need to figure out a better way to deal with overwriting unique indexes.
                 * For now simply dropping the indexes so that an empty string value can be written.
                 */
                return collection.dropIndexes();
            } else {
                return Promise.resolve();
            }
        })
        .then(() => {
            /**
             * Setup filter query for updateMany
             */
            const existsOrQuery = removableFields[collection.collectionName].map(field => {
                return { [field] : { $exists: true} };
            });

            let filterQuery = { $or: existsOrQuery };
            if (collection.collectionName === 'users') {
                const notQuery = ['admin', 'dev', 'gov', 'user'].map(username => {
                    return { 'username': { $ne: username } };
                });
                filterQuery.$and = notQuery;
            }

            /**
             * Setup update obects for updateMany
             */
            const updateParameters = removableFields[collection.collectionName]
                .reduce((updates, field) => {
                    updates[field] = defaults[field] || '';
                    return updates;
                }, {});

            /**
            * Attempt updateMany
            */
            return collection.updateMany(filterQuery, { $set: updateParameters });
        }).then(result => {
            console.log(chalk.green(
                `Found ${result.matchedCount} entries in ${collection.collectionName} with sensitive fields \
                ...scrubbed ${result.modifiedCount} entries clean`));
        });
    }, Promise.resolve());

}

/**
 * Close connected Mongo DB.
 */
const closeClient = function() {
    if (_client) {
        return _client.close();
    }
    return Promise.resolve();
}

module.exports.scrub = function() {
    config.dest.db.backup_dirname = config.src.db.backup_dirname;
    return connectDB()
        .then(() => dropDB())
        .then(() => exporter.export(config.src))
        .then(() => importer.import(config.dest))
        .then(() => getDBCollections())
        .then(collections => {
            if (!collections.length) {
                return Promise.reject(`No collections in db: ${DEST_DB_NAME}`);
            }
            console.log(chalk.cyan(`Found ${collections.length} collections.`));
            return scrubDB(collections);
        })
        .then(() => exporter.export(config.dest))
        .then(() => {
            return dropDB()
                .then(() => closeClient())
                .then(() => process.exit(0));
        })
        .catch(err => {
            /**
             * Regular catch if anything fails.
             * Will attempt to drop the DEST database and close the connection.
             * Stop the script with an error code.
             */
            console.error(chalk.bold.red(err));
            return dropDB()
                .then(() => closeClient())
                .then(() => process.exit(1));
        })
        .catch(err => {
            /**
             * Generic catch if anything fails.
             * Stop the script immediately with an error code.
             */
            console.error(chalk.bold.red(err));
            process.exit(1);
        });
};

this.scrub();