"use strict";
const MessageModel = require('./models/messages.model');
const log = require('./logservice');
const utils = require('./utils');

module.exports = mongoose => {
    mongoose.connect(process.env.DB, {
        useNewUrlParser: true
    });
    mongoose.Promise = require('bluebird'); //Либа для промисов

    mongoose.set('debug', function(coll, method, query, doc, options) {
        let set = {
            coll: coll,
            method: method,
            query: query,
            doc: doc,
            options: options
        };
        console.log(utils.serializer(set));
    });

    setInterval(() => {
        let a = new Date();
        a.setDate(a.getDate() - 1);
        MessageModel
            .find({date: {$lte: a}})
            .deleteMany()
            .exec(err => {
                if (!err) {
                    log.addRec(`records before ${a} remooved`);
                } else {
                    log.addRec(err);
                }
            });
    }, 60 * 60 * 1000);

    setInterval(() => {
        let a = new Date();
        a.setMinutes(a.getMinutes() - 10);
        MessageModel
            .find({removeDate: {$lte: a}})
            .deleteMany()
            .exec(err => {
                if (!err) {
                    log.addRec(`isDeleted records remooved`);
                } else {
                    log.addRec(err);
                }
            });
    }, 60 * 1000);
};