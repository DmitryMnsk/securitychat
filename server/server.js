"use strict";

const express = require('express');
const app = express();
const path = require('path');
const nunjucks = require('nunjucks');
const server = require('http').Server(app);
const io = require('socket.io')(server, {serveClient: true});
const mongoose = require('mongoose');

//Конфигурируем шаблонизатор. Теперь доступ просто по имени шаблона в папке client/views
nunjucks.configure(path.join(__dirname, '..', 'client', 'views'), {
    autoescape: true,
    express: app
});

server.listen((process.env.PORT || 5000), () => {
    console.log('server started on port');
    //Подключаем ресты и пути к файлам (статика)
    require('./initservices')(app);
    //Подключаем БД
    require('./db_connect')(mongoose);
    //Инициализируем сокеты
    require('./sockets')(io);
});
