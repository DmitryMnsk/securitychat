"use strict";

const MessageModel = require('./models/messages.model');
const ImageModel = require('./models/img.model');

module.exports = io => {
    io.on('connection', (socket) => {
        socket.emit('connected', 'You are connected!');

        //socket.join('all');
        socket.on('join', room => {
            if (socket.room) {
                socket.leave(socket.room);
            }
            socket.room = room;
            socket.join(room);
        });

        socket.on('resetAll', room => {
            socket.to(room).emit('resetAllFromOut');
        });

        socket.on('setUsersActive', (room, isActive) => {
            socket.isActive = isActive;
            let sockets = io.sockets.adapter.rooms[room].sockets,
                result = [];
            Object.keys(sockets).map((objectKey) => {
                if (sockets[objectKey]) {
                    result.push({
                        id: objectKey,
                        isActive: !!io.sockets.connected[objectKey].isActive
                    })
                }
            });
            socket.to(room).emit('setUsersInfo', result);
            socket.emit('setUsersInfo', result);
        });


        socket.on('disconnect', () => {
            if (socket.room) {
                socket.leave(socket.room);
            }
        });
        /*socket.on('leave', room => {
            //todo проверить
           socket.leave(room);
        });
        //todo Доделать что печатает
        socket.on('typing', function () {
            socket.broadcast.emit('typing', {               socket.broadcast.emit - всем кроме текущего сокета
                username: socket.username
            });
        });
        socket.on('stop typing', function () {
            socket.broadcast.emit('stop typing', {
                username: socket.username
            });
        });*/

        socket.on('msg', (message, room) => {
            if (!room) {
                return;
            }

            if ((message.content.toString() === '[object Object]') &&
                message.type === 'img'
            ) {
                ImageModel.create({
                    content: message.content.dataURL,
                    date: new Date()
                }, (err, result) => {
                    if (err) return console.error("MessageModel", err);
                    message.content = Object.assign({}, message.content, {
                        dataURL: '',
                        isLoading: true,
                        imgId: result._id
                    });
                    saveMsg(message, room, result);
                });
            } else {
                saveMsg(message, room);
            }
        });

        function saveMsg (message, room, resultImg) {
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
            let fun = function (resultImg) {
                MessageModel.create(obj, (err, result) => {
                    if (err) return console.error("MessageModel", err);
                    socket.emit('message', result, true);           //отправка себе
                    socket.to(room).emit('message', result);                       //отправка остальным

                    if (resultImg) {
                        const bigMessages = [];
                        bigMessages.push({
                            _id: result._id,
                            dataURL: resultImg.content.toString()
                        });
                        socket.emit('bigMessages', bigMessages);
                        socket.to(room).emit('bigMessages', bigMessages);
                        modelUpdate(ImageModel, false,
                            {
                                _id: resultImg._id
                            },
                            {
                                $set: {
                                    mainId: result._id
                                }
                            });
                    }
                });
            } (resultImg);
        }

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
                        let imgIds = [];
                            messages.forEach(item => {
                               if (item.type === 'img') {
                                   imgIds.push(item._id);
                               }
                            });
                        socket.emit('history', messages);
                        if (imgIds.length) {
                            ImageModel
                                .find({
                                    mainId: {$in: imgIds}
                                })
                                .lean()     //убирает парамтры привязки mongoose
                                .exec((err, messages) => {
                                    socket.emit('bigMessages',
                                        messages.map(item => {
                                            return {
                                                _id: item.mainId,
                                                dataURL: item.content.toString()
                                            }
                                        })
                                    );
                                })
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
                        let ids = messages.map(item => item._id);
                        let apply = function (ids) {
                            modelUpdate(MessageModel, true,
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
                                    modelUpdateRemoteDate(true,
                                        {
                                            _id: {$in: ids}
                                        }, {},
                                        () => {
                                            socket.emit('deleteMsg', ids, sessionId);
                                            socket.to(room).emit('deleteMsg', ids, sessionId);
                                        });
                                });
                            ImageModel
                                .find({ mainId: {$in: ids}})
                                .deleteMany()
                                .exec();
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

          /*  socket.rooms
            console.log(io.sockets.clients((error, clients) => {
                if (error) throw error;
                console.log(clients); // => [Anw2LatarvGVVXEIAAAD]
            }));*/

        });

        // удалить одно сообщение
        socket.on('setDeleted', (room, id, sessionId) => {
            if (!id || !sessionId) {
                return;
            }
            let apply = function (id, sessionId) {
                modelUpdate(MessageModel, false,
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
                        ImageModel
                            .find({mainId: id})
                            .deleteOne()
                            .exec();
                    });
            }(id, sessionId);
        });

        function modelUpdateRemoteDate (isMany, condition, params = {}, callback) {
            modelUpdate(MessageModel, isMany,
                Object.assign({removeDate: null}, condition),
                { $set: Object.assign({removeDate: new Date()}, params) },
                () => {
                    callback && callback();
                });
        }

        function modelUpdate (model, isMany, condition = {}, params = {}, callback) {
            model[!!isMany ? 'updateMany': 'updateOne'](
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