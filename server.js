const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

const room = {
    slidesA: [],
    slidesB: [],
    currentA: 0,
    currentB: 0,
    active: "A",
    uploadedA: false,
    uploadedB: false
};

/* PDF → PNG */
function convertPDF(filePath, tag) {
    const dir = path.join(__dirname, "public/slides");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const prefix = path.join(dir, tag + "-" + Date.now());
    execSync(`pdftoppm -png "${filePath}" "${prefix}"`);

    return fs.readdirSync(dir)
        .filter(f => f.startsWith(tag))
        .sort()
        .map(f => ({ img: "/slides/" + f }));
}

/* emit（分離） */
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

/* upload */
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

/* socket */
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

/* QR */
app.get("/qr", (req, res) => {
    const url = `http://localhost:3000`;
    res.send(`
        <html><body style="text-align:center">
        <h2>掃描進入</h2>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${url}">
        <p>${url}</p>
        </body></html>
    `);
});

server.listen(3000, () => {
    console.log("🚀 http://localhost:3000");
});
