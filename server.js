const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 1. 確保 uploads 資料夾存在（解決部署 Status 1 報錯）
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. 核心修正：加入 Cache-Control 標頭
// 這是為了防止瀏覽器快取 PDF，確保翻頁指令能即時讓 iframe 重新渲染
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(express.static("public"));
app.use("/pdf", express.static("uploads"));

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        // 檔名加上時間戳，確保檔案更新時路徑會變，強迫瀏覽器抓新的
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

let room = {
    page: 1,
    pdfA: null,
    pdfB: null
};

// 3. 上傳邏輯：換教材時強制將頁碼歸 1
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

// 4. Socket 通訊
io.on("connection", (socket) => {
    socket.emit("state", room);

    socket.on("next", () => {
        room.page++;
        io.emit("state", room);
    });

    socket.on("prev", () => {
        if (room.page > 1) {
            room.page--;
            io.emit("state", room);
        }
    });

    // 強制全體同步（當有人畫面卡住時可用）
    socket.on("sync", () => {
        io.emit("state", room);
    });
});

app.get("/qr", (req, res) => {
    const url = req.protocol + '://' + req.get('host');
    res.send(`<html><body style="text-align:center;padding:50px;font-family:sans-serif;"><h2>教室 QR Code</h2><img src="https://qrserver.com{url}"><p>${url}</p></body></html>`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("🚀 Server running on port", PORT);
});
