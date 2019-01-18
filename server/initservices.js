"use strict";
const express = require('express');
const path = require('path');
const log = require('./logservice');
const cookieParser = require('cookie-parser');
const session = require('express-session');

module.exports = app => {
    //log.init(app);

    app.use(cookieParser());
    app.use(session({
        secret: '34SDgsdgspxxxxxxxdfsG', // just a long random string
        resave: false,
        saveUninitialized: true
    }));
    app.use('/assets', express.static(path.join(__dirname, '..', 'client', 'public')));
    app.use('/vendor', express.static(path.join(__dirname, '..', 'node_modules')));

    app.get('/', (req, res) => {
        //res.sendFile(path.join(__dirname, '..', 'client', 'index.html'))
        res.render('index.html', {
            main: true
        });
    });

    app.get('/*', (req, res) => {
        //res.sendFile(path.join(__dirname, '..', 'client', 'index.html'))
        res.cookie('sessionId', req.session.id);
        res.render('index.html', {
            main: false,
            date: new Date(),
            dev: !!~process.argv.indexOf('dev')
        });
    });
};
