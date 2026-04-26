const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path"); // 確保這行存在
const fs = require("fs");     // 確保這行存在

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 解決部署平台沒有 uploads 資料夾的報錯
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.static("public"));
app.use("/pdf", express.static("uploads"));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

let room = {
    page: 1,
    pdfA: null,
    pdfB: null
};

app.post("/uploadA", upload.single("pdf"), (req, res) => {
    if (req.file) {
        room.pdfA = "/pdf/" + req.file.filename;
        room.page = 1;
        io.emit("state", room);
    }
    res.redirect("/");
});

app.post("/uploadB", upload.single("pdf"), (req, res) => {
    if (req.file) {
        room.pdfB = "/pdf/" + req.file.filename;
        room.page = 1;
        io.emit("state", room);
    }
    res.redirect("/");
});

io.on("connection", (socket) => {
    socket.emit("state", room);
    socket.on("next", () => {
        room.page++;
        io.emit("state", room);
    });
    socket.on("prev", () => {
        room.page = Math.max(1, room.page - 1);
        io.emit("state", room);
    });
});

app.get("/qr", (req, res) => {
    const url = req.protocol + '://' + req.get('host');
    res.send(`<html><body style="text-align:center;padding:50px;"><h2>掃描進入教室</h2><img src="https://qrserver.com{url}"><p>${url}</p></body></html>`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("🚀 Server running on port", PORT);
});
