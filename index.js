var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3456;
var players = {};

io.on("connection", function(socket) { //при подключении нового игрока
    console.log('an user connected ' + socket.id);
    players[socket.id] = {
        "live": true,
        "velocity": {
            "x": 0,
            "y": 0
        },
        "x": 400,
        "y": 40,
        "animation": 'left'
    }; //генерирует параметры нового юнита
    io.sockets.emit('add_player', JSON.stringify({
        "id": socket.id,
        "player": players[socket.id],
    })); //отправляет на клиент данные нового юнита
    socket.emit('add_players', JSON.stringify(players));// отправляет на клиент данные нового юнита,
    // если игроков более одного

    socket.on('player_move', function(data) {
        data = JSON.parse(data);
        data.velocity = {};
        data.animation = 'left';

        switch (data.character) {
            case "W":
                players[data.id].velocity.y = -550;
                data.velocity.y = -550;
                break;
            case "A":
                players[data.id].velocity.x = -150;
                players[data.id].animation = 'left';
                data.velocity.x = -150;
                data.animation = 'left';
                break;
            case "D":
                players[data.id]['velocity']['x'] = 150;
                players[data.id].animation = 'right';
                data.velocity.x = 150;
                data.animation = 'right';
                break;
        }
        io.sockets.emit('player_position_update', JSON.stringify(data));
    }); // движение

    socket.on('sendPosition', function(data) {
        data = JSON.parse(data);
        players[data.id]["x"] = data["x"];
        players[data.id].y = data.y;
    });

    socket.on('disconnect', function() {
        console.log("an user disconnected " + socket.id);
        delete players[socket.id];
        io.sockets.emit('player_disconnect', socket.id);
    });

});

app.use("/", express.static(__dirname + "/public")); //пути к файлам клиента
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/public/index.html"); // главная страница
});

http.listen(port, function() {
    console.log('listening on *:' + port); // запуск сервера
});