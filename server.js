const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/pdf", express.static("uploads"));

const upload = multer({ dest: "uploads/" });

const room = {
    pdfA: null,
    pdfB: null,
    pageA: 1,
    pageB: 1,
    active: "A",
    totalA: 1,
    totalB: 1
};

// ===== upload A =====
app.post("/uploadA", upload.single("pdf"), (req, res) => {
    room.pdfA = "/pdf/" + req.file.filename;
    room.pageA = 1;
    room.active = "A";
    io.emit("state", room);
    res.redirect("/");
});

// ===== upload B =====
app.post("/uploadB", upload.single("pdf"), (req, res) => {
    room.pdfB = "/pdf/" + req.file.filename;
    room.pageB = 1;
    room.active = "B";
    io.emit("state", room);
    res.redirect("/");
});

// ===== QR =====
app.get("/qr", (req, res) => {
    const url = "https://shiny-octo-waffle.onrender.com";

    res.send(`
    <html>
    <body style="text-align:center;font-family:Arial">
        <h2>Classroom QR</h2>
        <img src="https://api.qrserver.com/v1/create-qr-code/?data=${url}&size=220x220">
        <p>${url}</p>
    </body>
    </html>
    `);
});

// ===== socket =====
io.on("connection", (socket) => {

    socket.emit("state", room);

    socket.on("next", () => {
        if (room.active === "A") room.pageA++;
        else room.pageB++;
        io.emit("state", room);
    });

    socket.on("prev", () => {
        if (room.active === "A") room.pageA = Math.max(1, room.pageA - 1);
        else room.pageB = Math.max(1, room.pageB - 1);
        io.emit("state", room);
    });

    socket.on("switch", (t) => {
        room.active = t;
        io.emit("state", room);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("running", PORT));
