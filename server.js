const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 靜態檔案路徑
app.use(express.static("public"));
app.use("/pdf", express.static("uploads"));

// PDF 儲存設定
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

// 全域共享狀態
const room = {
    page: 1,
    pdfA: null,
    pdfB: null
};

// 上傳 A 版
app.post("/uploadA", upload.single("pdf"), (req, res) => {
    if (req.file) {
        room.pdfA = "/pdf/" + req.file.filename;
        io.emit("state", room);
    }
    res.redirect("/");
});

// 上傳 B 版
app.post("/uploadB", upload.single("pdf"), (req, res) => {
    if (req.file) {
        room.pdfB = "/pdf/" + req.file.filename;
        io.emit("state", room);
    }
    res.redirect("/");
});

// Socket 通訊
io.on("connection", (socket) => {
    // 剛連線時同步目前狀態
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

// QR Code 頁面
app.get("/qr", (req, res) => {
    const url = req.protocol + '://' + req.get('host');
    res.send(`
        <html>
        <body style="text-align:center;font-family:Arial;padding-top:50px;">
            <h2>掃描進入教室</h2>
            <img src="https://qrserver.com{url}">
            <p style="font-size:20px;color:#666;">${url}</p>
            <button onclick="window.close()" style="padding:10px 20px;">關閉視窗</button>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Classroom v13 運行中：http://localhost:${PORT}`);
});
