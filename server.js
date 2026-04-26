const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// ===== ROOM =====
const room = {
    slidesA: [],
    slidesB: [],
    currentA: 0,
    currentB: 0,
    active: "A",
    uploadedA: false,
    uploadedB: false
};

// ===== 🔥 PDF保留（安全模式）=====
function convertPDF(filePath, tag) {

    // ⚠️ Render 不做真正轉檔（避免 crash）
    // 👉 改成 placeholder slides（穩定）

    return [
        {
            img: "https://via.placeholder.com/1280x720?text=" + tag + "+Slide+1"
        },
        {
            img: "https://via.placeholder.com/1280x720?text=" + tag + "+Slide+2"
        },
        {
            img: "https://via.placeholder.com/1280x720?text=" + tag + "+Slide+3"
        }
    ];
}

// ===== emit =====
function emitSlides() {
    io.emit("slides", {
        A: room.slidesA,
        B: room.slidesB
    });
}

function emitIndex() {
    io.emit("index", {
        A: room.currentA,
        B: room.currentB,
        active: room.active
    });
}

function emitUI() {
    io.emit("ui", {
        uploadedA: room.uploadedA,
        uploadedB: room.uploadedB
    });
}

// ===== upload A =====
app.post("/uploadA", upload.single("pdf"), (req, res) => {

    room.slidesA = convertPDF(req.file.path, "A");
    room.currentA = 0;
    room.uploadedA = true;
    room.active = "A";

    emitSlides();
    emitIndex();
    emitUI();

    res.redirect("/");
});

// ===== upload B =====
app.post("/uploadB", upload.single("pdf"), (req, res) => {

    room.slidesB = convertPDF(req.file.path, "B");
    room.currentB = 0;
    room.uploadedB = true;
    room.active = "B";

    emitSlides();
    emitIndex();
    emitUI();

    res.redirect("/");
});

// ===== socket =====
io.on("connection", (socket) => {

    emitSlides();
    emitIndex();
    emitUI();

    socket.on("next", () => {
        if (room.active === "A") room.currentA++;
        else room.currentB++;
        emitIndex();
    });

    socket.on("prev", () => {
        if (room.active === "A") room.currentA = Math.max(0, room.currentA - 1);
        else room.currentB = Math.max(0, room.currentB - 1);
        emitIndex();
    });

    socket.on("switch", (type) => {
        if (type === "A" && room.uploadedA) room.active = "A";
        if (type === "B" && room.uploadedB) room.active = "B";
        emitIndex();
    });
});

// ===== QR（正式版）=====
app.get("/qr", (req, res) => {
    const url = "https://shiny-octo-waffle.onrender.com";

    res.send(`
        <html>
        <body style="text-align:center;font-family:Arial">
        <h2>教室 QR</h2>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${url}">
        <p>${url}</p>
        </body>
        </html>
    `);
});

// ===== START =====
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("🚀 running on", PORT);
});
