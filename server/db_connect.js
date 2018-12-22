"use strict";

module.exports = mongoose => {
    mongoose.connect('mongodb://DmitryMinsk:DmitryMinsk1@ds159676.mlab.com:59676/secure_chat', {
        useNewUrlParser: true
    });
    mongoose.Promise = require('bluebird'); //Либа для промисов

    setInterval(() => {
        mongoose.connection.db.dropCollection('MessageCollection', function(err, result) {
            if (err) return console.error("MessageModel", err);
            console.log("Collection 'MessageCollection' has been dropped", err);
        });
    }, 5 * 24 * 60 * 60 * 1000);
};