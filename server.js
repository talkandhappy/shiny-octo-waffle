const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/pdf", express.static("uploads"));

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
    pdfB: null,
    active: "A"   // ⭐ 這次放回來（A/B 切換）
};

/* ===== upload A ===== */
app.post("/uploadA", upload.single("pdf"), (req, res) => {
    room.pdfA = "/pdf/" + req.file.filename;
    room.active = "A";
    room.page = 1;

    io.emit("state", room);
    res.redirect("/");
});

/* ===== upload B ===== */
app.post("/uploadB", upload.single("pdf"), (req, res) => {
    room.pdfB = "/pdf/" + req.file.filename;
    room.active = "B";
    room.page = 1;

    io.emit("state", room);
    res.redirect("/");
});

/* ===== socket ===== */
io.on("connection", (socket) => {

    socket.emit("state", room);

    socket.on("switch", (t) => {
        room.active = t;
        io.emit("state", room);
    });

    socket.on("next", () => {
        room.page++;
        io.emit("state", room);
    });

    socket.on("prev", () => {
        room.page = Math.max(1, room.page - 1);
        io.emit("state", room);
    });
});

server.listen(process.env.PORT || 3000);
