const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 1. 確保 uploads 資料夾存在 (解決部署失敗 Status 1)
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.static("public"));
app.use("/pdf", express.static("uploads"));

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

// 2. 核心狀態
let room = {
    page: 1,
    pdfA: null,
    pdfB: null
};

// 3. 上傳邏輯：強制重置頁碼 (內部改動：確保換檔案時學生不會卡在舊頁碼)
app.post("/uploadA", upload.single("pdf"), (req, res) => {
    if (req.file) {
        room.pdfA = "/pdf/" + req.file.filename;
        room.page = 1; // 強制重置
        io.emit("state", room);
    }
    res.redirect("/");
});

app.post("/uploadB", upload.single("pdf"), (req, res) => {
    if (req.file) {
        room.pdfB = "/pdf/" + req.file.filename;
        room.page = 1; // 強制重置
        io.emit("state", room);
    }
    res.redirect("/");
});

// 4. Socket 翻頁保護邏輯
io.on("connection", (socket) => {
    socket.emit("state", room);

    // 下一頁
    socket.on("next", () => {
        room.page++;
        io.emit("state", room);
    });

    // 上一頁 (內部改動：防止頁碼變成 0 或負數導致 PDF 插件崩潰)
    socket.on("prev", () => {
        if (room.page > 1) {
            room.page--;
            io.emit("state", room);
        }
    });

    // 額外新增：強制同步 (防止學生端卡住)
    socket.on("force_sync", () => {
        io.emit("state", room);
    });
});

app.get("/qr", (req, res) => {
    const url = req.protocol + '://' + req.get('host');
    res.send(`<html><body style="text-align:center;padding:50px;font-family:sans-serif;"><h2>教室 QR Code</h2><img src="https://qrserver.com{url}"><p>${url}</p></body></html>`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("🚀 Classroom Server Ready on Port", PORT);
});
