'use strict';

const chalk = require('chalk'),
    config = require('./config'),
    fse = require('fs-extra'),
    spawn = require('child_process');

const exportDB = function(src) {
    let mongodumpCMD = [
        'mongodump',
        '--host', src.db.hostname,
        '--port', src.db.port,
        '--db', src.db.name,
        '--out', '/tmp',
        '--gzip'
    ];
    if (src.db.username && src.db.password) {
        mongodumpCMD.splice(3, 0, '--username', src.db.username, '--password', src.db.password);
    }
    mongodumpCMD = mongodumpCMD.join(' ');

    const infoStr = `Dumping from ${src.db.name} to /tmp`;
    const successStr = `Dumped ${src.db.name} to ${src.finalDumpDir}`;
    const errStr = `Error dumping from ${src.db.name} to /tmp`;

    return new Promise((resolve, reject) => {
        console.log(chalk.cyan(infoStr));

        spawn.exec(mongodumpCMD, (err, stdout, stderr) => {
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

module.exports.export = function(src) {
    src = src || config.src;

    const intermediateDumpDir = `/tmp/${src.db.name}`;
    const finalDumpDir = `/tmp/${src.db.backup_dirname}`;

    src.intermediateDumpDir = intermediateDumpDir;
    src.finalDumpDir = finalDumpDir;

    return fse.remove(intermediateDumpDir)
        .then(() => fse.remove(finalDumpDir))
        .then(() => exportDB(src))
        .then(() => fse.move(intermediateDumpDir, finalDumpDir, {
            overwrite: true
        }));
};