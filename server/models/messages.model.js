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
    isUserDeleted: {type: Boolean},
    removeDate: {type: Date}
}, {
    versionKey: false, // создание параметра __V при редактировании увеличивается
    collection: 'MessageCollection'
});

module.exports = mongoose.model('MessageModel', MessageSchema);