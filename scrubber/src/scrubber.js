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
            'proposalEmail': defaultEmail()
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
        'contactEmail': defaultEmail(),
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
        'businessContactEmail': defaultEmail(),
        'businessContactPhone': faker.phone.phoneNumber()
    };
};

const generateUserInfo = function() {
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    return Object.assign({
        'firstName': firstName,
        'lastName': lastName,
        'displayName': `${firstName} ${lastName}`,
        'username': faker.internet.userName(),
        'email': defaultEmail(),
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

const defaultEmail = (function() {
    let count = 0;
    return function() {
        const email = `bcdevelopersexchange${count ? '+' + count : ''}@gmail.com`;
        ++count;
        return email;
    };
})();

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
            const replacements = removableFields[collection.collectionName]() || {};
            const removableFieldNames = Object.keys(replacements) || [];
            /**
             * Setup filter query for updateMany
             */
            const existsOrQuery = removableFieldNames.map(field => {
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
            const updateParameters = removableFieldNames
                .reduce((updates, field) => {
                    updates[field] = replacements[field] || '';
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