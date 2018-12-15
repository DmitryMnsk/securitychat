"user strict";
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Mixed = mongoose.Mixed;
//const {Schema} = require('mongoose');

const MessageSchema = new Schema({
    date: {type: String},
    content: {type: Mixed},
    username: {type: String}
}, {
    versionKey: false, // �������� ��������� __V ��� �������������� �������������
    collection: 'MessageCollection'
});

module.exports = mongoose.model('MessageModel', MessageSchema);