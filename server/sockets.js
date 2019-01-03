"use strict";

const MessageModel = require('./models/messages.model');

module.exports = io => {
    io.on('connection', (socket) => {
        socket.emit('connected', 'You are connected!');

        //socket.join('all');
        socket.on('join', room => {
            socket.room = room;
           socket.join(room);
        });
        socket.on('disconnect', () => {
            console.log('disc');
        });
        socket.on('leave', room => {
           socket.leave(room);
        });
        //todo Доделать что печатает
        socket.on('typing', function () {
            socket.broadcast.emit('typing', {
                username: socket.username
            });
        });
        socket.on('stop typing', function () {
            socket.broadcast.emit('stop typing', {
                username: socket.username
            });
        });

        socket.on('msg', (message, room) => {
            if (!room) {
                return;
            }
            const obj = {
                room: room,
                date: new Date(),
                content: message.content,
                type: message.type || 'text',
                username: socket.id
            };
            /*Это равносильно тому что ниже
             const model = new MessageModel(obj);
             model.save();*/
            MessageModel.create(obj, err => {
                if (err) return console.error("MessageModel", err);
                socket.emit('message', obj, true);           //отправка себе
                socket.to(room).emit('message', obj);                       //отправка остальным
            });
        });

        socket.on('receiveHistory', room => {
            MessageModel
                .find({
                    room: room
                })
                .sort({date: -1})
                .sort({date: 1})
                .lean()     //убирает парамтры привязки mongoose
                .exec((err, messages) => {
                    if (!err){
                        socket.emit('history', messages);
                    }
                });
        });
    });
};