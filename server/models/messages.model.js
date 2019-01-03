"user strict";
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Mixed = mongoose.Mixed;
//const {Schema} = require('mongoose');

const MessageSchema = new Schema({
    date: {type: Date},
    room: {type: String},
    type: {type: String},
    code: {type: String},
    content: {type: Mixed},
    username: {type: String},
    sessionId: {type: String},
    removeDate: {type: Date},
    isRead: {type: Boolean}
}, {
    versionKey: false, // создание параметра __V при редактировании увеличивается
    collection: 'MessageCollection'
});

module.exports = mongoose.model('MessageModel', MessageSchema);