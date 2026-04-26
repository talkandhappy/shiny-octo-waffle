const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ===== middleware =====
app.use(cors());
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// ===== state =====
const room = {
    slidesA: [],
    slidesB: [],
    active: "A",
    current: 0
};

// ===== safe slide getter =====
function getSlides() {
    return room.active === "A" ? room.slidesA : room.slidesB;
}

// ===== fake PDF handler (避免 Render 爆) =====
// ⚠️ 先用圖片模式，確保穩定
function fakeConvert(file) {
    const fileName = file.filename;

    return [
        { img: "/sample/slide1.png" },
        { img: "/sample/slide2.png" }
    ];
}

// ===== upload A =====
app.post("/uploadA", upload.single("pdf"), (req, res) => {
    room.slidesA = fakeConvert(req.file);
    room.active = "A";
    room.current = 0;

    io.emit("slides", getSlides());
    io.emit("slide", 0);

    console.log("📘 A uploaded");
    res.json({ ok: true });
});

// ===== upload B =====
app.post("/uploadB", upload.single("pdf"), (req, res) => {
    room.slidesB = fakeConvert(req.file);
    room.active = "B";
    room.current = 0;

    io.emit("slides", getSlides());
    io.emit("slide", 0);

    console.log("📗 B uploaded");
    res.json({ ok: true });
});

// ===== socket =====
io.on("connection", (socket) => {
    console.log("user connected");

    socket.emit("slides", getSlides());
    socket.emit("slide", room.current);

    socket.on("next", () => {
        room.current++;
        io.emit("slide", room.current);
    });

    socket.on("prev", () => {
        room.current = Math.max(0, room.current - 1);
        io.emit("slide", room.current);
    });

    socket.on("switch", (type) => {
        room.active = type;
        room.current = 0;

        io.emit("slides", getSlides());
        io.emit("slide", 0);
    });
});

// ===== QR endpoint =====
app.get("/qr", (req, res) => {
    const url = "https://shiny-octo-waffle.onrender.com";

    res.send(`
        <html>
        <body style="text-align:center;font-family:Arial;">
            <h2>Classroom QR</h2>
            <p>${url}</p>
        </body>
        </html>
    `);
});

// ===== start server =====
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("🚀 running on", PORT);
});
