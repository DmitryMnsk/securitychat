"use strict";

const express = require('express');
const app = express();
const path = require('path');
const nunjucks = require('nunjucks');
const server = require('http').Server(app);
const io = require('socket.io')(server, {serveClient: true});
const mongoose = require('mongoose');

mongoose.connect('mongodb://DmitryMinsk:DmitryMinsk1@ds159676.mlab.com:59676/secure_chat', {
    useNewUrlParser: true
});
mongoose.Promise = require('bluebird'); //Либа для промисов


//const mongoose = require('mongoose');

nunjucks.configure(path.join(__dirname, '..', 'client', 'views'), {
    autoescape: true,
    express: app
});

app.use('/assets', express.static(path.join(__dirname, '..', 'client', 'public')));
app.use('/vendor', express.static(path.join(__dirname, '..', 'node_modules')));

app.get('/', (req, res) => {
    //res.sendFile(path.join(__dirname, '..', 'client', 'index.html'))
    res.render('index.html', {
        date: new Date()
    });
});

require('./sockets')(io);


server.listen(7777, '0.0.0.0', () => {
    console.log('server started on port 7777');
});
