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
                code: message.code,
                type: message.type || 'text',
                username: message.username,
                sessionId: message.sessionId
            };
            /*Это равносильно тому что ниже
             const model = new MessageModel(obj);
             model.save();*/
            MessageModel.create(obj, (err, result) => {
                if (err) return console.error("MessageModel", err);
                socket.emit('message', result, true);           //отправка себе
                socket.to(room).emit('message', result);                       //отправка остальным
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

        socket.on('setRead', (room, sessionId) => {
            modelUpdateRemoteDate (
                {
                    date: {$lt: new Date()},
                    room: room,
                    sessionId: {$ne: sessionId},
                });
        });

        socket.on('setDeleted', ids => {
            if (!ids || !ids.length) {
                return;
            }
            let apply = function (ids) {
                modelUpdateRemoteDate({_id: {$in: ids}},
                    {
                        content: '',
                        isUserDeleted: true
                    },
                    () => {
                        socket.emit('deleteMsg', ids);
                    });
            }(ids);
        });

        function modelUpdateRemoteDate (condition, params = {}, callback) {
            MessageModel.updateMany(
                Object.assign({removeDate: null}, condition),
                { $set: Object.assign({removeDate: new Date()}, params) }
            ).exec((err) => {
                if (!err) {
                    callback && callback();
                }
            });
        }
    });
};