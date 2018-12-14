"use strict";
const express = require('express');
const path = require('path');

module.exports = app => {
    app.use('/assets', express.static(path.join(__dirname, '..', 'client', 'public')));
    app.use('/vendor', express.static(path.join(__dirname, '..', 'node_modules')));

    app.get('/', (req, res) => {
        console.log(req, res);
        //res.sendFile(path.join(__dirname, '..', 'client', 'index.html'))
        res.render('index.html', {
            date: new Date()
        });
    });
};
