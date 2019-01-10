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
                .lean()     //убирает парамтры привязки mongoose
                .exec((err, messages) => {
                    if (!err && Array.isArray(messages)){
                        let bigMessages = [],
                            result =  messages.map(item => {
                               if (item.type == 'img' && item.content.size > 800) {
                                   bigMessages.push({
                                       _id: item._id,
                                       dataURL: item.content.dataURL
                                   });
                                   item.content = Object.assign({}, item.content, {
                                       dataURL: '',
                                       isLoading: true
                                   });
                                   return item;
                               }
                               return item;
                            });
                        socket.emit('history', result);
                        if (bigMessages.length) {
                            setTimeout(() => {
                                socket.emit('bigMessages', bigMessages);
                            }, 1000);
                        }
                    }
                });
        });

        socket.on('setDeletedMy', (room, sessionId) => {
            MessageModel
                .find({
                    room: room,
                    sessionId: sessionId,
                    date: {$lt: new Date()},
                    isUserDeleted: {$ne: true}
                })
                .lean()     //убирает парамтры привязки mongoose
                .exec((err, messages) => {
                    if (Array.isArray(messages) && messages.length) {
                        let ids = messages.map(item => item.id);
                        let apply = function (ids) {
                            modelUpdate(true,
                                {
                                    _id: {$in: ids}
                                },
                                {
                                    $set: {
                                        content: '',
                                        isUserDeleted: true
                                    }
                                },
                                () => {
                                    modelUpdateRemoteDate(false,
                                        {
                                            _id: {$in: ids}
                                        }, {},
                                        () => {
                                            socket.emit('deleteMsg', ids);
                                            socket.to(room).emit('deleteMsg', ids);
                                        });
                                });
                        }(ids);
                    }
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
                modelUpdate(false,
                    {
                        _id: id,
                        sessionId: sessionId
                    },
                    {
                        $set: {
                            content: '',
                            isUserDeleted: true
                        }
                    },
                    () => {
                        modelUpdateRemoteDate(false,
                            {
                                _id: id,
                                sessionId: sessionId
                            }, {},
                            () => {
                                socket.emit('deleteMsg', [id]);
                                socket.to(room).emit('deleteMsg', [id]);
                            });
                    });
            }(id, sessionId);
        });

        function modelUpdateRemoteDate (isMany, condition, params = {}, callback) {
            modelUpdate(isMany,
                Object.assign({removeDate: null}, condition),
                { $set: Object.assign({removeDate: new Date()}, params) },
                () => {
                    callback && callback();
                });
        }

        function modelUpdate (isMany, condition = {}, params = {}, callback) {
            MessageModel[!!isMany ? 'updateMany': 'updateOne'](
                condition,
                params
            ).exec(err => {
                if (!err) {
                    callback && callback();
                }
            });
        }
    });
};