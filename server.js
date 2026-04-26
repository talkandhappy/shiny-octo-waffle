/* =========================
   1. 增加資料夾自動檢查
   避免如果沒有 uploads 資料夾會噴錯
========================= */
const fs = require("fs");
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

/* =========================
   2. 修正上傳邏輯
   上傳新簡報時，把頁碼重置回 1 (老師通常希望換檔案就從第一頁開始)
========================= */
app.post("/uploadA", upload.single("pdf"), (req, res) => {
    if (req.file) {
        room.pdfA = "/pdf/" + req.file.filename;
        room.page = 1; // <--- 建議加上這行，換檔時重設頁碼
        io.emit("state", room);
    }
    res.redirect("/");
});

app.post("/uploadB", upload.single("pdf"), (req, res) => {
    if (req.file) {
        room.pdfB = "/pdf/" + req.file.filename;
        room.page = 1; // <--- 建議加上這行
        io.emit("state", room);
    }
    res.redirect("/");
});

/* =========================
   3. 強化 Socket 連線
   確保斷線重連的人能立刻拿到最新的狀態
========================= */
io.on("connection", (socket) => {
    // 發送目前完整的狀態給剛進教室的人
    socket.emit("state", room);

    socket.on("next", () => {
        room.page++;
        io.emit("state", room);
    });

    socket.on("prev", () => {
        if(room.page > 1) { // 防止頁碼小於 1
            room.page--;
            io.emit("state", room);
        }
    });

    // 增加一個同步機制：萬一學生端畫面怪怪的，老師可以按按鈕強制所有人重整
    socket.on("force_sync", () => {
        io.emit("state", room);
    });
});
