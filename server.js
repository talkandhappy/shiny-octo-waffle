const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/pdf", express.static("uploads"));

const upload = multer({ dest: "uploads/" });

// ===== 教室共享狀態（只有頁數）=====
const room = {
    page: 1,
    pdfA: null,
    pdfB: null
};

// ===== upload A =====
app.post("/uploadA", upload.single("pdf"), (req, res) => {
    room.pdfA = "/pdf/" + req.file.filename;
    room.page = 1;

    io.emit("page", room.page);
    io.emit("files", { A: room.pdfA, B: room.pdfB });

    res.redirect("/");
});

// ===== upload B =====
app.post("/uploadB", upload.single("pdf"), (req, res) => {
    room.pdfB = "/pdf/" + req.file.filename;
    room.page = 1;

    io.emit("page", room.page);
    io.emit("files", { A: room.pdfA, B: room.pdfB });

    res.redirect("/");
});

// ===== socket =====
io.on("connection", (socket) => {

    socket.emit("page", room.page);
    socket.emit("files", {
        A: room.pdfA,
        B: room.pdfB
    });

    socket.on("next", () => {
        room.page++;
        io.emit("page", room.page);
    });

    socket.on("prev", () => {
        room.page = Math.max(1, room.page - 1);
        io.emit("page", room.page);
    });
});

// ===== start =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("running on", PORT);
});
