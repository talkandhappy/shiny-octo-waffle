const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/pdf", express.static("uploads"));
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => { cb(null, Date.now() + ".pdf"); }
});

const upload = multer({ storage });
const room = { page: 1, pdfA: null, pdfB: null };

// 上傳路由
app.post("/uploadA", upload.single("pdf"), (req, res) => { room.pdfA = "/pdf/"+req.file.filename; room.page = 1; io.emit("state", room); res.redirect("/"); });
app.post("/uploadB", upload.single("pdf"), (req, res) => { room.pdfB = "/pdf/"+req.file.filename; room.page = 1; io.emit("state", room); res.redirect("/"); });

// 清除路由
app.post("/clear", (req, res) => {
    if (req.body.target === "A") room.pdfA = null;
    if (req.body.target === "B") room.pdfB = null;
    io.emit("state", room);
    res.redirect("/");
});

io.on("connection", (socket) => {
    socket.emit("state", room);
    socket.on("next", () => { room.page++; io.emit("state", room); });
    socket.on("prev", () => { room.page = Math.max(1, room.page - 1); io.emit("state", room); });
});

server.listen(process.env.PORT || 3000, () => console.log("Server running on port 3000"));
