'use strict';

const chalk = require('chalk'),
    config = require('./config'),
    exporter = require('./exporter'),
    faker = require('faker'),
    importer = require('./importer'),
    MongoClient = require('mongodb').MongoClient;

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
* Sensitive data fields with replacement functions.
*/
const removableFields = {
    'opportunities': () => {
        return {
            'proposalEmail': uniqueDefaultEmail()
        };
    },
    'orgs': () => generateOrgInfo(),
    'profiles': () => generateOnlineProfileInfo(),
    'programs': () => {
        return {
            'owner': ''
        };
    },
    'proposals': () => generateBusinessInfo(),
    'users': () => generateUserInfo()
};

/**
 * Helper functions for replacing sensitive data fields.
 */
const generateOrgInfo = function() {
    const address = faker.address.streetAddress();
    return {
        'name': faker.company.companyName(),
        'dba': faker.name.findName(),
        'address': address,
        'address2': faker.address.secondaryAddress(),
        'city': faker.address.city(),
        'province': 'BC',
        'postalcode': '1A1 A1A',
        'fullAddress': address,
        'contactName': faker.name.findName(),
        'contactEmail': uniqueDefaultEmail(),
        'contactPhone': faker.phone.phoneNumber(),
        'website': '',
        'orgImageURL': ''
    };
};

const generateOnlineProfileInfo = function() {
    return {
        'github': '',
        'stackOverflow': '',
        'stackExchange': '',
        'linkedIn': '',
        'website': '',
    };
}

const generateBusinessInfo = function() {
    return {
        'businessName': faker.company.companyName(),
        'businessAddress': faker.address.streetAddress(),
        'businessContactName': faker.name.findName(),
        'businessContactEmail': uniqueDefaultEmail(),
        'businessContactPhone': faker.phone.phoneNumber()
    };
};

const generateUserInfo = function() {
    const firstName = uniqueFirstName();
    const lastName = uniqueLastName();
    return Object.assign({
        'firstName': firstName,
        'lastName': lastName,
        'displayName': `${firstName} ${lastName}`,
        'username': uniqueUserName(),
        'email': uniqueDefaultEmail(),
        'address': faker.address.streetAddress(),
        'phone': faker.phone.phoneNumber(),
        'businessAddress2': faker.address.secondaryAddress(),
        'businessCity': faker.address.city(),
        'businessProvince': 'BC',
        'businessCode': '',
        'profileImageURL': '',
        'providerData': ''
    }, generateBusinessInfo(), generateOnlineProfileInfo());
};

/**
 * Helper functions for generating unique field values.
 */
const uniqueDefaultEmail = (() => {
    let count = 0;
    return () => {
        const email = `bcdevelopersexchange${count ? '+' + count : ''}@gmail.com`;
        ++count;
        return email;
    };
})();

const uniqueFirstName = (() => {
    const _firstNames = new Set();
    return () => {
        let _firstName = faker.name.firstName();
        while(_firstNames.has(_firstName)) {
            _firstName = faker.name.firstName();
        };
        _firstNames.add(_firstName);
        return _firstName;
    };
})();

const uniqueLastName = (() => {
    const _lastNames = new Set();
    return () => {
        let _lastName = faker.name.lastName();
        while(_lastNames.has(_lastName)) {
            _lastName = faker.name.lastName();
        };
        _lastNames.add(_lastName);
        return _lastName;
    };
})();

const uniqueUserName = (() => {
    const _userNames = new Set();
    return () => {
        let _userName = faker.internet.userName();
        while(_userNames.has(_userName)) {
            _userName = faker.internet.userName();
        };
        _userNames.add(_userName);
        return _userName;
    };
})();

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
    })
    .catch(err => {
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
            return new Promise((resolve, reject) => {

                const getReplacementsForCollection = (collection) => {
                    const replacementFn = removableFields[collection.collectionName];
                    if (replacementFn && typeof replacementFn === 'function') {
                        return replacementFn();
                    }
                    return {};
                }

                const replacements = getReplacementsForCollection(collection);
                const removableFieldNames = Object.keys(replacements) || [];

                /**
                 * Setup filter query for updateMany
                 */
                const existsOrQuery = removableFieldNames.map(field => {
                    return { [field] : { $exists: true} };
                });

                const filterQuery = { $or: existsOrQuery };
                if (collection.collectionName === 'users') {
                    const notQuery = ['admin', 'dev', 'gov', 'user'].map(username => {
                        return { 'username': { $ne: username } };
                    });
                    filterQuery.$and = notQuery;
                }

                const bulkWriteQueries = [];
                const stream = collection.find(filterQuery).stream();

                stream.on('data', function(document) {
                    const replacements = getReplacementsForCollection(collection);
                    const removableFieldNames = Object.keys(replacements) || [];

                    /**
                    * Setup update obects for updateMany
                    */
                    const updateParameters = removableFieldNames
                        .reduce((updates, field) => {
                            updates[field] = replacements[field] || '';
                            return updates;
                        }, {});

                    const bulkWriteQuery = {
                        updateOne: {
                            filter: { _id : document._id },
                            update: { $set: updateParameters }
                        }
                    };

                    bulkWriteQueries.push(bulkWriteQuery);
                });

                stream.on('error', function(err) {
                    return reject(err);
                });

                stream.on('end', function() {
                    return resolve(bulkWriteQueries);
                });

            }).then(function(operations) {
                /**
                * Attempt updateMany
                */
                return collection.bulkWrite(operations);
            })
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