const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

const room = {
    pdfA: null,
    pdfB: null,
    active: "A"
};

// ===== upload A =====
app.post("/uploadA", upload.single("pdf"), (req, res) => {

    room.pdfA = "/uploads/" + req.file.filename;
    room.active = "A";

    io.emit("pdf", room);

    res.redirect("/");
});

// ===== upload B =====
app.post("/uploadB", upload.single("pdf"), (req, res) => {

    room.pdfB = "/uploads/" + req.file.filename;
    room.active = "B";

    io.emit("pdf", room);

    res.redirect("/");
});

// ===== socket =====
io.on("connection", (socket) => {
    socket.emit("pdf", room);

    socket.on("switch", (type) => {
        room.active = type;
        io.emit("pdf", room);
    });
});

// ===== start =====
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("running on", PORT);
});
