const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { fromPath } = require("pdf2pic");

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

// ===== PDF → PNG（真正可用）=====
async function convertPDF(filePath, tag) {

    const outputDir = path.join(__dirname, "public/slides");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const converter = fromPath(filePath, {
        density: 100,
        saveFilename: tag,
        savePath: outputDir,
        format: "png",
        width: 1280,
        height: 720
    });

    // 轉前 10 頁（教室夠用）
    const results = [];

    for (let i = 1; i <= 10; i++) {
        try {
            const res = await converter(i);
            results.push({
                img: "/slides/" + path.basename(res.path)
            });
        } catch (e) {
            break;
        }
    }

    return results;
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
app.post("/uploadA", upload.single("pdf"), async (req, res) => {

    room.slidesA = await convertPDF(req.file.path, "A");
    room.currentA = 0;
    room.uploadedA = true;
    room.active = "A";

    emitSlides();
    emitIndex();
    emitUI();

    res.redirect("/");
});

// ===== upload B =====
app.post("/uploadB", upload.single("pdf"), async (req, res) => {

    room.slidesB = await convertPDF(req.file.path, "B");
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
        room.active = type;
        emitIndex();
    });
});

// ===== QR =====
app.get("/qr", (req, res) => {
    const url = "https://shiny-octo-waffle.onrender.com";

    res.send(`
        <html>
        <body style="text-align:center">
        <h2>QR</h2>
        <img src="https://api.qrserver.com/v1/create-qr-code/?data=${url}&size=200x200">
        <p>${url}</p>
        </body>
        </html>
    `);
});

// ===== start =====
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("running on", PORT);
});
