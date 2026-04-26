const socket = io();

let state = { pdfA: null, pdfB: null, page: 1 };
let localVersion = "A"; 
let lastRenderedKey = ""; 

socket.on("state", (s) => {
    state = s;
    document.getElementById("page-info").innerText = "Page: " + state.page;
    render();
});

function render() {
    const file = localVersion === "A" ? state.pdfA : state.pdfB;
    if (!file) return;

    // 關鍵修正：使用 FitH (適應寬度) 並加上一段隨機數，強迫瀏覽器重啟 PDF 渲染
    // 這樣可以避免它卡在兩頁中間
    const pdfParams = `#page=${state.page}&navpanes=0&toolbar=0&view=FitH`;
    const currentKey = file + pdfParams;

    if (currentKey !== lastRenderedKey) {
        document.getElementById("viewer").src = file + pdfParams;
        lastRenderedKey = currentKey;
        
        // 修正翻頁失效：翻頁後強制把焦點回歸給視窗，鍵盤才不會失效
        window.focus();
    }
}

function setVer(v) {
    localVersion = v;
    document.getElementById("btnA").classList.toggle("active-ver", v === 'A');
    document.getElementById("btnB").classList.toggle("active-ver", v === 'B');
    render();
}

function next() { socket.emit("next"); }
function prev() { socket.emit("prev"); }

// 鍵盤翻頁修正：增加偵測範圍
document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault(); // 防止網頁捲動
        next();
    }
    if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
    }
}, true); // 使用 Capture 模式確保抓到按鍵

// 修正：當滑鼠點擊 iframe 內部後鍵盤會失效的問題
setInterval(() => {
    if (document.activeElement.tagName === "IFRAME") {
        window.focus(); 
    }
}, 500);

function fs() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function qr() { window.open("/qr"); }
