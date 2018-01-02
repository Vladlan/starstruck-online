var map;
var layer;
var player;
var facing = 'left';
var cursors;
var jumpButton;
var bg;
var socket, players = {};
var live;

var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'phaser-example',
    {preload: preload, create: create, update: update, render: render});

function preload() {
    game.load.tilemap('level1', 'assets/level1.json',
        null, Phaser.Tilemap.TILED_JSON);
    game.load.image('tiles-1', 'assets/tiles-1.png');
    game.load.spritesheet('dude', 'assets/dude.png', 32, 48);
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
    game.physics.arcade.gravity.y = 250;


    socket.on("add_players", function(data) {
        data = JSON.parse(data);
        for (let playerId in data) {
            if (players[playerId] == null && data[playerId].live) {
                gameActions.addPlayer(playerId);
            }
        }
        live = true;
    }); //создаем игроков

    socket.on("add_player", function(data) {
        data = JSON.parse(data);
        if (data.player.live) {
            gameActions.addPlayer(data.id);
        }
    }); //создаем игрока

    socket.on("player_position_update", function(data) {
        data = JSON.parse(data);
        players[socket.id].player.body.velocity.x = 0;
        players[socket.id].player.body.velocity.y = 0;
        players[data.id].player.body.velocity.x = data.velocity.x;
        players[data.id].player.body.velocity.y = data.velocity.y;
        players[data.id].player.animations.play(data.animation);
    }); //обновляем положение игроков

    cursors = game.input.keyboard.createCursorKeys();
    keybord = game.input.keyboard.createCursorKeys();
    jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

// ________________________________________________________
    socket.on('player_disconnect', function(id) {
        players[id].player.kill();
    }); //убираем отключившихся игроков
}

function update() {
    if (live == true) {
        gameActions.characterController(); //управление
    }
    gameActions.collideLayer();
}

function render() {

    // game.debug.text(game.time.physicsElapsed, 32, 32);
    // game.debug.body(player);
    // game.debug.bodyInfo(player, 16, 24);

}

var gameActions = {
    addPlayer: function(playerId) {
        player = game.add.sprite(32, 32, 'dude');
        game.physics.enable(player, Phaser.Physics.ARCADE);
        game.physics.arcade.collide(player, layer);
        player.body.bounce.y = 0.2;
        player.body.collideWorldBounds = true;
        player.body.setSize(20, 32, 5, 16);
        player.animations.add('left', [0, 1, 2, 3], 10, true);
        player.animations.add('turn', [4], 20, true);
        player.animations.add('right', [5, 6, 7, 8], 10, true);
        game.camera.follow(player);
        player.id = playerId;

        players[playerId] = {player};
        game.camera.follow(players[socket.id].player);
    },
    sendPosition: function(character) {
        socket.emit("player_move", JSON.stringify({
            "id": socket.id,
            "character": character
        }));
    },
    characterController: function() {
        if (game.input.keyboard.isDown(Phaser.Keyboard.A) || keybord.left.isDown) {
            this.sendPosition("A");
        }
        if (game.input.keyboard.isDown(Phaser.Keyboard.D) || keybord.right.isDown) {
            this.sendPosition("D");
        }
        if (game.input.keyboard.isDown(Phaser.Keyboard.W) || keybord.up.isDown) {
            this.sendPosition("W");
        }
        if (game.input.keyboard.isDown(Phaser.Keyboard.S) || keybord.down.isDown) {
            this.sendPosition("S");
        }
    },
    collideLayer: function() {
        for (let x in players) {
            game.physics.arcade.collide(players[x].player, layer);
        }
    }
}
