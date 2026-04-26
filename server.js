const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // 關鍵：確保 fs 有被引入

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 確保 uploads 資料夾存在，否則部署在雲端會報錯
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use(express.static("public"));
app.use("/pdf", express.static("uploads"));

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        // 使用原始檔名，避免一些編碼問題
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

let room = {
    page: 1,
    pdfA: null,
    pdfB: null
};

// 上傳 A
app.post("/uploadA", upload.single("pdf"), (req, res) => {
    if (req.file) {
        room.pdfA = "/pdf/" + req.file.filename;
        room.page = 1;
        io.emit("state", room);
    }
    res.redirect("/");
});

// 上傳 B
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
    res.send(`
        <html>
        <body style="text-align:center;font-family:Arial;padding-top:50px;">
            <h2>Classroom QR</h2>
            <img src="https://qrserver.com{url}">
            <p>${url}</p>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("🚀 Server is running on port", PORT);
});
