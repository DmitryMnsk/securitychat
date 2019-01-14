"user strict";
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImageSchema = new Schema({
    date: {type: Date},
    content: {type: Buffer},
    mainId: {type: String}
}, {
    versionKey: false, // создание параметра __V при редактировании увеличивается
    collection: 'ImageCollection'
});

module.exports = mongoose.model('ImageSchema', ImageSchema);