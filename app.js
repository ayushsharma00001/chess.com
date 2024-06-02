const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");
const { log } = require("console");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
const server = http.createServer(app);

const io = socket(server);

let chess = new Chess();

let players = {
    white: null,
    black: null,
};

const resetGame = () => {
    chess = new Chess();
    players.white = null;
    players.black = null;
};

app.get("/", (req, res, next) => {
    res.render("index", { title: "Chess" });
});

io.on("connection", (uniqueSocket) => {
    log("Connected");

    if (!players.white) {
        players.white = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "b");
    } else {
        uniqueSocket.emit("spectatorRole");
    }

    uniqueSocket.emit("boardState", chess.fen());

    uniqueSocket.on("disconnect", () => {
        log("Disconnected");
        if (uniqueSocket.id === players.white) {
            players.white = null;
        } else if (uniqueSocket.id === players.black) {
            players.black = null;
        }

        if (!players.white && !players.black) {
            resetGame();
        }
    });

    uniqueSocket.on("move", (move) => {
        try {
            if ((chess.turn() === "w" && uniqueSocket.id !== players.white) || 
                (chess.turn() === "b" && uniqueSocket.id !== players.black)) {
                return;
            }

            const result = chess.move(move);
            if (result) {
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            } else {
                log("Invalid move", move);
                uniqueSocket.emit("invalidMove", move);
            }
        } catch (err) {
            console.log(err);
            uniqueSocket.emit("invalidMove", move);
        }
    });
});

server.listen(3000, () => {
    log("Listening on port 3000");
});
