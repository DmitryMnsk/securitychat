"user strict";
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Mixed = mongoose.Mixed;
//const {Schema} = require('mongoose');

const MessageSchema = new Schema({
    date: {type: String},
    room: {type: String},
    content: {type: Mixed},
    username: {type: String}
}, {
    versionKey: false, // создание параметра __V при редактировании увеличивается
    collection: 'MessageCollection'
});

module.exports = mongoose.model('MessageModel', MessageSchema);