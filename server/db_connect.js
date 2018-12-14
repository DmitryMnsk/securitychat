"use strict";

module.exports = mongoose => {
    mongoose.connect('mongodb://DmitryMinsk:DmitryMinsk1@ds159676.mlab.com:59676/secure_chat', {
        useNewUrlParser: true
    });
    mongoose.Promise = require('bluebird'); //���� ��� ��������
};