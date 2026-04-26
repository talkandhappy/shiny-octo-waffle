const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// -----------------------------------------
// 1. 部署環境優化：確保 uploads 資料夾存在
// -----------------------------------------
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("✅ Created uploads directory");
}

app.use(express.static("public"));
app.use("/pdf", express.static("uploads"));

// -----------------------------------------
// 2. Multer 檔案上傳設定
// -----------------------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        // 使用時間戳記防止檔名重複
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

// -----------------------------------------
// 3. 教室共享狀態
// -----------------------------------------
let room = {
    page: 1,
    pdfA: null,
    pdfB: null
};

// 上傳 A 版簡報
app.post("/uploadA", upload.single("pdf"), (req, res) => {
    if (req.file) {
        room.pdfA = "/pdf/" + req.file.filename;
        room.page = 1; // 換教材自動回第一頁
        io.emit("state", room);
    }
    res.redirect("/");
});

// 上傳 B 版簡報
app.post("/uploadB", upload.single("pdf"), (req, res) => {
    if (req.file) {
        room.pdfB = "/pdf/" + req.file.filename;
        room.page = 1; // 換教材自動回第一頁
        io.emit("state", room);
    }
    res.redirect("/");
});

// -----------------------------------------
// 4. Socket 通訊（同步翻頁關鍵）
// -----------------------------------------
io.on("connection", (socket) => {
    // 新連線者立刻取得目前狀態
    socket.emit("state", room);

    // 下一頁
    socket.on("next", () => {
        room.page++;
        io.emit("state", room);
        console.log("➡️ Moved to page:", room.page);
    });

    // 上一頁
    socket.on("prev", () => {
        if (room.page > 1) {
            room.page--;
            io.emit("state", room);
            console.log("⬅️ Moved to page:", room.page);
        }
    });

    // 強制重整同步（選配功能）
    socket.on("sync", () => {
        io.emit("state", room);
    });
});

// -----------------------------------------
// 5. QR Code 頁面
// -----------------------------------------
app.get("/qr", (req, res) => {
    const url = req.protocol + '://' + req.get('host');
    res.send(`
        <html>
        <head><title>QR Code</title><meta charset="UTF-8"></head>
        <body style="text-align:center; font-family:sans-serif; padding-top:50px; background:#f4f4f4;">
            <div style="background:white; display:inline-block; padding:30px; border-radius:15px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                <h2>掃描進入教室</h2>
                <img src="https://qrserver.com{url}">
                <p style="color:#666; margin-top:20px;">${url}</p>
                <button onclick="window.close()" style="margin-top:20px; padding:10px 20px; cursor:pointer;">關閉視窗</button>
            </div>
        </body>
        </html>
    `);
});

// -----------------------------------------
// 6. 啟動伺服器
// -----------------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
    🚀 ==========================================
    🚀 Classroom v13 伺服器啟動成功！
    🚀 運行網址: http://localhost:${PORT}
    🚀 ==========================================
    `);
});
