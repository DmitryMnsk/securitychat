"use strict";
const express = require('express');
const path = require('path');
const log = require('./logservice');

module.exports = app => {
    log.init(app);
    app.use('/assets', express.static(path.join(__dirname, '..', 'client', 'public')));
    app.use('/vendor', express.static(path.join(__dirname, '..', 'node_modules')));

    app.get('/*', (req, res) => {
        //res.sendFile(path.join(__dirname, '..', 'client', 'index.html'))
        res.render('index.html', {
            date: new Date()
        });
    });
};
