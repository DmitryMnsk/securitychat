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

server.listen(7777, '0.0.0.0', () => {
    console.log('server started on port 7777');
    //Подключаем ресты и пути к файлам (статика)
    require('./initservices')(app);
    //Подключаем БД
    require('./db_connect')(mongoose);
    //Инициализируем сокеты
    require('./sockets')(io);
});
