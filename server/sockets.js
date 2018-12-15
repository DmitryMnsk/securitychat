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
        })
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

        socket.on('msg', (content, room) => {
            if (!room) {
                return;
            }
            const obj = {
                date: new Date(),
                content: content,
                username: socket.id
            };
           /*��� ����������� ���� ��� ����
            const model = new MessageModel(obj);
            model.save();*/
            MessageModel.create(obj, err => {
                if (err) return console.error("MessageModel", err);
                socket.emit('message', obj);
                socket.to(room).emit('message', obj);
            });
        });

        socket.on('receiveHistory', room => {
            MessageModel
                .find({})
                .sort({date: -1})
                .limit(50)
                .sort({date: 1})
                .lean()     //������� ��������� �������� mongoose
                .exec((err, messages) => {
                    if (!err){
                        socket.emit('history', messages);
                    }
                });
        });
    });
};