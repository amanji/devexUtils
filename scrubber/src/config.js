'use strict';

const DB_URI = 'mongodb://';

const SRC_DB_NAME = (
    process.env.SRC_MONGO_DB_NAME ||
    // process.env.MONGO_DB_NAME ||
    'devex'
);
const SRC_DB_HOSTNAME = (
    process.env.SRC_MONGO_DB_HOSTNAME ||
    // process.env.MONGO_DB_HOSTNAME ||
    process.env.SCRUBBER_MONGO_PORT_27017_TCP_ADDR ||
    'localhost'
);
const SRC_DB_PORT = (
    process.env.SRC_MONGO_DB_PORT ||
    // process.env.MONGO_DB_PORT ||
    process.env.SCRUBBER_MONGO_PORT_27017_TCP_PORT ||
    '27017'
);
const SRC_DB_USERNAME = (
    process.env.SRC_MONGO_DB_USERNAME ||
    // process.env.MONGO_DB_USERNAME ||
    ''
);
const SRC_DB_PASSWORD = (
    process.env.SRC_MONGO_DB_PASSWORD ||
    // process.env.MONGO_DB_PASSWORD ||
    ''
);
const SRC_DB_BACKUP_DIRNAME = (
    process.env.SRC_MONGO_DB_BACKUP_DIRNAME ||
    // process.env.MONGO_DB_BACKUP_DIRNAME ||
    'devexbackup'
);

let SRC_DB_URI = DB_URI;
if (SRC_DB_USERNAME && SRC_DB_PASSWORD) {
    SRC_DB_URI += `${SRC_DB_USERNAME}:${SRC_DB_PASSWORD}@${SRC_DB_HOSTNAME}:${SRC_DB_PORT}/${SRC_DB_NAME}`;
} else {
    SRC_DB_URI += `${SRC_DB_HOSTNAME}:${SRC_DB_PORT}/${SRC_DB_NAME}`;
}

const DEST_DB_NAME = (
    process.env.DEST_MONGO_DB_NAME ||
    // process.env.MONGO_DB_NAME ||
    'devexbackup'
);
const DEST_DB_HOSTNAME = (
    process.env.DEST_MONGO_DB_HOSTNAME ||
    // process.env.MONGO_DB_HOSTNAME ||
    process.env.SCRUBBER_MONGO_PORT_27017_TCP_ADDR ||
    'localhost'
);
const DEST_DB_PORT = (
    process.env.DEST_MONGO_DB_PORT ||
    // process.env.MONGO_DB_PORT ||
    process.env.SCRUBBER_MONGO_PORT_27017_TCP_PORT ||
    '27017'
);
const DEST_DB_USERNAME = (
    process.env.DEST_MONGO_DB_USERNAME ||
    // process.env.MONGO_DB_USERNAME ||
    ''
);
const DEST_DB_PASSWORD = (
    process.env.DEST_MONGO_DB_PASSWORD ||
    // process.env.MONGO_DB_PASSWORD ||
    ''
);

let DEST_DB_URI = DB_URI;
if (DEST_DB_USERNAME && DEST_DB_PASSWORD) {
    DEST_DB_URI += `${DEST_DB_USERNAME}:${DEST_DB_PASSWORD}@${DEST_DB_HOSTNAME}:${DEST_DB_PORT}/${DEST_DB_NAME}`;
} else {
    DEST_DB_URI += `${DEST_DB_HOSTNAME}:${DEST_DB_PORT}/${DEST_DB_NAME}`;
}

module.exports = {
    src: {
        db: {
            name: SRC_DB_NAME,
            hostname: SRC_DB_HOSTNAME,
            port: SRC_DB_PORT,
            uri: SRC_DB_URI,
            username: SRC_DB_USERNAME,
            password: SRC_DB_PASSWORD,
            backup_dirname: SRC_DB_BACKUP_DIRNAME
        }
    },
    dest: {
        db: {
            name: DEST_DB_NAME,
            hostname: DEST_DB_HOSTNAME,
            port: DEST_DB_PORT,
            uri: DEST_DB_URI,
            username: DEST_DB_USERNAME,
            password: DEST_DB_PASSWORD
        }
    }
};