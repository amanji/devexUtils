var DB_NAME = process.env.MONGO_DB_NAME || 'devex';
var DB_HOSTNAME = process.env.MONGO_DB_HOSTNAME || process.env.SCRUBBER_MONGO_PORT_27017_TCP_ADDR || 'localhost';
var DB_PORT = process.env.MONGO_DB_PORT || process.env.SCRUBBER_MONGO_PORT_27017_TCP_PORT || '27017';

module.exports = {
    db: {
        hostname: DB_HOSTNAME,
        name: DB_NAME,
        port: DB_PORT,
        uri: 'mongodb://' + (process.env.MONGO_DB_HOSTNAME || process.env.SCRUBBER_MONGO_PORT_27017_TCP_ADDR || DB_HOSTNAME) + '/' + DB_NAME
    }
};