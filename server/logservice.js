const fs = require('fs');
const dateformat = require('dateformat');
var logFileName;
function getLogTime () {
    return dateformat(new Date(), "yyyy-mm-dd_HH-MM-ss");
}
module.exports = {
    init: (app) => {
        writeFile();
        app.use((req, res, next) => {
            addRec(`url:${req.originalUrl}`);
            next();
        });
        setInterval(() => {
            writeFile();
        }, 24 * 60 * 60 * 1000);
    },
    addRec: addRec,
    writeFile: writeFile
};

function writeFile () {
    logFileName = './server/logs/server_log_' + getLogTime () + '.txt';
    fs.writeFile(logFileName, 'startServer - ' + getLogTime (), ()=>{});
}

function addRec (text) {
    fs.appendFile(logFileName, `\n${getLogTime()} - ` + text, ()=>{});
}