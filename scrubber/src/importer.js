'use strict';

const chalk = require('chalk'),
    config = require('./config'),
    spawn = require('child_process');

module.exports.import = function(dest) {
    dest = dest || config.dest;

    let mongorestoreCMD = [
        'mongorestore',
        '--host', dest.db.hostname,
        '--port', dest.db.port,
        '--db', dest.db.name,
        '--dir', `/tmp/${dest.db.name}`,
        '--gzip'
    ];
    if (dest.db.username && dest.db.password) {
        mongorestoreCMD.splice(3, 0, '--username', dest.db.username, '--password', dest.db.password);
    }
    mongorestoreCMD = mongorestoreCMD.join(' ');

    const infoStr = `Restorting to ${dest.db.name} from /tmp/${dest.db.name}`;
    const successStr = `Restored ${dest.db.name}`;
    const errStr = `Error restoring to ${dest.db.name} from /tmp/${dest.db.name}`;

    return new Promise((resolve, reject) => {
        console.log(chalk.cyan(infoStr));

        spawn.exec(mongorestoreCMD, (err, stdout, stderr) => {
            if (err) {
                console.error(chalk.bold.red(errStr));
                return reject(err);
            }

            if (stdout) {
                console.log(`STDOUT >\n${stdout}`);
            }

            if (stderr) {
                console.log(`STDERR >\n${stderr}`);
            }
            console.log(chalk.bold.green(successStr));
            return resolve();
        });
    });
};