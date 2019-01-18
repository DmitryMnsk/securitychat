"use strict";

const express = require('express');
const app = express();
const path = require('path');
const nunjucks = require('nunjucks');
const server = require('http').Server(app);
const io = require('socket.io')(server, {serveClient: true});
const mongoose = require('mongoose');
const compressor = require('node-minify');

//Конфигурируем шаблонизатор. Теперь доступ просто по имени шаблона в папке client/views
nunjucks.configure(path.join(__dirname, '..', 'client', 'views'), {
    autoescape: true,
    express: app
});

if (!~process.argv.indexOf('dev')) {
    compressor.minify({
        compressor: 'babel-minify',
        input: path.join(__dirname, '..', 'client', 'public', 'js', '*.js'),
        output: path.join(__dirname, '..', 'client', 'public', 'js.js'),
        callback: function (err, min) {
            startServ();
        }
    });
} else {
    startServ();
}

function startServ () {
    server.listen((process.env.PORT || 5000), () => {
        console.log('server started on port ' + (process.env.PORT || 5000));
        //Подключаем ресты и пути к файлам (статика)
        require('./initservices')(app);
        //Подключаем БД
        require('./db_connect')(mongoose);
        //Инициализируем сокеты
        require('./sockets')(io);
    });
}



