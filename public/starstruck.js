var map;
var layer;
var player;
var facing = 'left';
var jumpButton;
var bg;
var socket, players = {};
var live;
var quantityOfplayers = 0;
var jumpTimer = 0;


var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'phaser-example',
    {preload: preload, create: create, update: update, render: render});

function preload() {
    game.load.tilemap('level1', 'assets/level1.json',
        null, Phaser.Tilemap.TILED_JSON);
    game.load.image('tiles-1', 'assets/tiles-1.png');
    game.load.spritesheet('dude', 'assets/dude.png', 32, 48);
    game.load.spritesheet('dude1', 'assets/dude1.png', 32, 48);
    game.load.spritesheet('dude2', 'assets/dude2.png', 32, 48);
    game.load.image('background', 'assets/background2.png');
}

function create() {
    socket = io.connect(window.location.host);

    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.stage.backgroundColor = '#000000';
    bg = game.add.tileSprite(0, 0, 800, 600, 'background');
    bg.fixedToCamera = true;
    map = game.add.tilemap('level1');
    map.addTilesetImage('tiles-1');
    map.setCollisionByExclusion([13, 14, 15, 16, 46, 47, 48, 49, 50, 51]);
    layer = map.createLayer('Tile Layer 1');

    //  Un-comment this on to see the collision tiles
    // layer.debug = true;
    layer.resizeWorld();
    game.physics.arcade.gravity.y = 750;


    socket.on("add_players", function(data) {
        data = JSON.parse(data);
        for (let playerId in data) {
            //Для создания противников
            if (players[playerId] == null && data[playerId].live) {
                gameActions.addPlayer(playerId,
                    data[playerId]["x"], data[playerId]['y'] - 5,
                    0, 0);
            }
        }
        live = true;
    }); //создаем игроков

    socket.on("add_player", function(data) {
        data = JSON.parse(data);
        if (data.player.live) {
            gameActions.addPlayer(data.id, data["player"]["x"], data["player"]["y"],
                data["player"]["velocity"]["x"], data["player"]["velocity"]["y"]);
        }
        game.camera.follow(players[socket.id].player);
    }); //создаем игрока

    socket.on("player_position_update", function(data) {
        data = JSON.parse(data);
        // players[socket.id].player.body.velocity.x = 0;
        // players[socket.id].player.body.velocity.y = 0;
        players[data.id].player.body.velocity.x = data.velocity.x;
        players[data.id].player.body.velocity.y = data.velocity.y;
        players[data.id].player.animations.play(data.animation);
    }); //обновляем положение игроков

    keybord = game.input.keyboard.createCursorKeys();
    jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    socket.on('player_disconnect', function(id) {
        players[id].player.kill();
    }); //убираем отключившихся игроков
}

function update() {
    if (live == true) {
        gameActions.characterController(); //управление
        gameActions.collideLayer();
        socket.emit("sendPosition", JSON.stringify({
            "id": socket.id,
            "x": players[socket.id].player.body.x,
            "y": players[socket.id].player.body.y
        }));
    }

}

function render() {

    // game.debug.text(game.time.physicsElapsed, 32, 32);
    // game.debug.body(player);
    // game.debug.bodyInfo(player, 16, 24);

}

var gameActions = {
    addPlayer: function(playerId, x, y, velocityX, velocityY) {

        for (let p in players) {
            quantityOfplayers++;
        }

        if (quantityOfplayers === 0) {
            player = game.add.sprite(x, y, 'dude');
        }
        else if (quantityOfplayers === 1) {
            player = game.add.sprite(x, y, 'dude1');
        }
        else {
            player = game.add.sprite(x, y, 'dude2');
        }
        game.physics.enable(player, Phaser.Physics.ARCADE);
        player.body.collideWorldBounds = true;
        player.body.setSize(20, 32, 5, 16);
        player.animations.add('left', [0, 1, 2, 3], 10, true);
        player.animations.add('turn', [4], 20, true);
        player.animations.add('right', [5, 6, 7, 8], 10, true);
        player.body.velocity.x = velocityX;
        player.body.velocity.y = velocityY;

        player.id = playerId;

        players[playerId] = {player};

    },
    sendPosition: function(character) {
        socket.emit("player_move", JSON.stringify({
                "id": socket.id,
                "character": character,
                "velocity": {
                    "x": players[socket.id].player.body.velocity.x,
                    "y": players[socket.id].player.body.velocity.y
                }
            })
        );

    },
    characterController: function() {
        if (game.input.keyboard.isDown(Phaser.Keyboard.A) || keybord.left.isDown) {
            this.sendPosition("A");
        }
        else if (game.input.keyboard.isDown(Phaser.Keyboard.D) || keybord.right.isDown) {
            this.sendPosition("D");
        }
        else if ((game.input.keyboard.isDown(Phaser.Keyboard.W) || keybord.up.isDown)
            && game.time.now > jumpTimer) {
            this.sendPosition("W");
            jumpTimer = game.time.now + 750;
        }
        // else if (game.input.keyboard.isDown(Phaser.Keyboard.S) || keybord.down.isDown) {
        //     this.sendPosition("S");
        // }
        else {
            if (players[socket.id].player.body.onFloor()) {
                players[socket.id].player.body.velocity.x = 0;
                players[socket.id].player.animations.stop();
            }
        }
    },
    collideLayer: function() {
        for (let x in players) {
            game.physics.arcade.collide(players[x].player, layer);
        }
    }
}
