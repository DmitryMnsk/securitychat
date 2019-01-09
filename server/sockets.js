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

        // получить все сообщения в комнате
        socket.on('receiveHistory', room => {
            MessageModel
                .find({
                    room: room
                })
                .sort({date: -1})
                .sort({date: 1})
                .exec((err, messages) => {
                    if (!err){
                        socket.emit('history', messages);
                    }
                });
        });

        socket.on('setDeletedMy', (room, sessionId) => {
            MessageModel
                .find({
                    room: room,
                    sessionId: sessionId,
                    date: {$lt: new Date()}
                })
                .exec((err, messages) => {
                    messages

                    console.log('xx')
                });
        });

        // пометить все НЕ СВОИ сообщения выше как прочитанные (удалить через 10 мин)
        socket.on('setRead', (room, sessionId) => {
            modelUpdateRemoteDate (true,
                {
                    date: {$lt: new Date()},
                    room: room,
                    sessionId: {$ne: sessionId},
                });
        });

        // удалить одно сообщение
        socket.on('setDeleted', (room, id, sessionId) => {
            if (!id || !sessionId) {
                return;
            }
            let apply = function (id, sessionId) {
                modelUpdateRemoteDate(false, {_id: id,
                    sessionId: sessionId},
                    {
                        content: '',
                        isUserDeleted: true
                    },
                    () => {
                        socket.emit('deleteMsg', id);
                        socket.to(room).emit('deleteMsg', id);
                    });
            }(id, sessionId);
        });

        function modelUpdateRemoteDate (isMany, condition, params = {}, callback) {
            MessageModel[!!isMany ? 'updateMany': 'updateOne'](
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