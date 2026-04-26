const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/pdf", express.static("uploads"));

/* ✅ 這裡是關鍵修正：一定要副檔名 */
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + ".pdf");
    }
});

const upload = multer({ storage });

/* ===== 教室狀態 ===== */
const room = {
    page: 1,
    pdfA: null,
    pdfB: null
};

/* ===== upload A ===== */
app.post("/uploadA", upload.single("pdf"), (req, res) => {
    room.pdfA = "/pdf/" + req.file.filename;
    room.page = 1;

    io.emit("state", room);
    res.redirect("/");
});

/* ===== upload B ===== */
app.post("/uploadB", upload.single("pdf"), (req, res) => {
    room.pdfB = "/pdf/" + req.file.filename;
    room.page = 1;

    io.emit("state", room);
    res.redirect("/");
});

/* ===== QR ===== */
app.get("/qr", (req, res) => {
    const url = "https://shiny-octo-waffle.onrender.com";

    res.send(`
    <html>
    <body style="text-align:center;font-family:Arial">
        <h2>Classroom QR</h2>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${url}">
        <p>${url}</p>
    </body>
    </html>
    `);
});

/* ===== socket ===== */
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("running on", PORT);
});
