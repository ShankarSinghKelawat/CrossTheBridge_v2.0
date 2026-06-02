const gameShell = document.getElementById("gameShell");
const homeScreen = document.getElementById("homeScreen");
const playButton = document.getElementById("playButton");
const transactionToast = document.getElementById("transactionToast");
const transactionTitle = document.getElementById("transactionTitle");
const transactionDetail = document.getElementById("transactionDetail");
const inviteModal = document.getElementById("inviteModal");
const inviteLinkInput = document.getElementById("inviteLinkInput");
const inviteCloseBtn = document.getElementById("inviteCloseBtn");
const inviteCopyBtn = document.getElementById("inviteCopyBtn");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const baseCanvasWidth = canvas.width;
const baseCanvasHeight = canvas.height;

const walletModal =
    document.getElementById("walletModal");

const metaMaskBtn =
    document.getElementById("metaMaskBtn");

const rows = 4;
const cols = 2;
const activeViewStorageKey = "crossTheBridgeActiveView";

let tileW = 138;
let tileH = 86;
let gapY = 42;
let laneGap = 20;
let bridgeLeft = 0;
let bridgeRight = 0;
let firstRowY = 0;
let lastRowDrop = 0;
let startPlatform = null;
let finishPlatform = null;
let sideDecks = [];
let isMobileLayout = false;
let isTallMobileLayout = false;

function updateLayoutMetrics(){
    const isPhone = window.innerWidth <= 640;
    const isNarrowPhone = window.innerWidth <= 420;
    const aspectRatio = window.innerHeight / Math.max(window.innerWidth, 1);
    const isTallPhone = isPhone && aspectRatio >= 2;
    isMobileLayout = isPhone;
    isTallMobileLayout = isTallPhone;

    const layout = isPhone
        ? {
            tileW: isTallPhone ? 148 : 144,
            tileH: isTallPhone ? 94 : 90,
            gapY: isTallPhone ? 32 : 34,
            laneGap: isNarrowPhone ? 14 : 16,
            platformWidth: isTallPhone ? 436 : 424,
            platformHeight: 48,
            finishY: isTallPhone ? 136 : 130,
            startY: isTallPhone ? 674 : 666,
            firstRowOffset: isTallPhone ? 18 : 16,
            deckInset: isNarrowPhone ? 14 : 16,
            deckWidth: isTallPhone ? 94 : 90,
            deckTopOffset: isTallPhone ? 8 : 10,
            deckBottomOffset: isTallPhone ? 26 : 28,
            towerInset: isTallPhone ? 12 : 10
        }
        : {
            tileW: 138,
            tileH: 86,
            gapY: 42,
            laneGap: 20,
            platformWidth: 416,
            platformHeight: 52,
            finishY: 116,
            startY: canvas.height - 92,
            firstRowOffset: 28,
            deckInset: 18,
            deckWidth: 86,
            deckTopOffset: 34,
            deckBottomOffset: 38,
            towerInset: 10
        };

    tileW = layout.tileW;
    tileH = layout.tileH;
    gapY = layout.gapY;
    laneGap = layout.laneGap;

    const platformX = canvas.width / 2 - layout.platformWidth / 2;

    finishPlatform = {
        x: platformX,
        y: layout.finishY,
        w: layout.platformWidth,
        h: layout.platformHeight
    };

    startPlatform = {
        x: platformX,
        y: layout.startY,
        w: layout.platformWidth,
        h: layout.platformHeight
    };

    firstRowY = startPlatform.y - layout.firstRowOffset - tileH;
    const topRowY = firstRowY - (rows - 1) * (tileH + gapY);
    const targetTopRowY = finishPlatform.y + finishPlatform.h + layout.firstRowOffset;
    lastRowDrop = Math.max(0, targetTopRowY - topRowY);
    bridgeLeft = canvas.width / 2 - tileW - laneGap / 2 - 2;
    bridgeRight = canvas.width / 2 + tileW + laneGap / 2 + 2;

    const deckY = finishPlatform.y + finishPlatform.h + layout.deckTopOffset;
    const deckBottom = startPlatform.y - layout.deckBottomOffset;
    const deckHeight = Math.max(320, deckBottom - deckY);
    const leftDeckX = layout.deckInset;
    const rightDeckX = canvas.width - layout.deckInset - layout.deckWidth;

    sideDecks = [
        {
            x: leftDeckX,
            y: deckY,
            w: layout.deckWidth,
            h: deckHeight,
            railX: leftDeckX + layout.deckWidth,
            towerX: leftDeckX + layout.towerInset
        },
        {
            x: rightDeckX,
            y: deckY,
            w: layout.deckWidth,
            h: deckHeight,
            railX: rightDeckX,
            towerX: rightDeckX + layout.deckWidth - layout.towerInset - 52
        }
    ];

    if(animationFrame) return;

    if(gameOver && brokenTile){
        const brokenCenter = getTileCenter(brokenTile.row, brokenTile.col);
        playerX = brokenCenter.x;
        playerY = brokenCenter.y;
        return;
    }

    if(currentStep === rows - 1 && statusText === "YOU WIN"){
        const finishCenter = getFinishCenter();
        playerX = finishCenter.x;
        playerY = finishCenter.y;
        return;
    }

    const currentCenter = getStepCenter(playerVisualStep);
    playerX = currentCenter.x;
    playerY = currentCenter.y;
}

let gameSessionId = null;
let gameReady = false;
let knownSafeTiles = Array(rows).fill(null);

let currentStep = -1;
let gameOver = false;
let brokenTile = null;
let animationFrame = null;
let tileRequestPending = false;
let playerVisualStep = -1;
let playerX = canvas.width / 2;
let playerY = 0;
let statusText = "";
let statusColor = "#ffffff";
let playerPoints = 0;
let playerWins = 0;
let pebbleCount = 2;
let pebbleMode = false;
let pebbleFlight = null;
let revealedTiles = Array.from({ length: rows }, () => Array(cols).fill(null));
const walletBadge = { x: canvas.width - 108, y: 24, w: 88, h: 34 };
const homeButton = { x: canvas.width - 64, y: 32, w: 44, h: 44 };
const redeemButton = { x: canvas.width - 90, y: 120, w: 74, h: 38 };
const inviteButton = { x: 14, y: 140, w: 52, h: 46 };
const pebbleButton = { x: 26, y: 26, w: 62, h: 50 };
const playAgainButton = { x: canvas.width / 2 - 78, y: 388, w: 156, h: 42 };
let homeScreenVisible = true;
let isRedeeming = false;
let transactionMessageTimer = null;

updateLayoutMetrics();

const bgImage = new Image();
bgImage.src = "assets/bg.png";

const characterImage = new Image();
characterImage.src = "assets/character.png";

function clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
}

function showTransactionMessage(type, title, detail, persist = false){
    if(!transactionToast || !transactionTitle || !transactionDetail) return;

    window.clearTimeout(transactionMessageTimer);
    transactionToast.classList.remove("hidden", "success", "error", "loading");
    transactionToast.classList.add(type);
    transactionTitle.innerText = title;
    transactionDetail.innerText = detail;

    if(!persist){
        transactionMessageTimer = window.setTimeout(() => {
            transactionToast.classList.add("hidden");
        }, 5200);
    }
}

function isPointInRect(x, y, rect){
    return x > rect.x &&
        x < rect.x + rect.w &&
        y > rect.y &&
        y < rect.y + rect.h;
}

function getStoredActiveView(){
    try{
        return localStorage.getItem(activeViewStorageKey);
    }catch(error){
        return null;
    }
}

function storeActiveView(view){
    try{
        localStorage.setItem(activeViewStorageKey, view);
    }catch(error){
        // Ignore storage failures; the game should still run normally.
    }
}

function getInviteLink(){
    const inviteUrl = new URL(window.location.href);

    if(window.userWallet){
        inviteUrl.searchParams.set("ref", window.userWallet);
    }

    return inviteUrl.toString();
}

function openInviteModal(){
    if(!inviteModal || !inviteLinkInput) return;

    inviteLinkInput.value = getInviteLink();
    inviteModal.classList.remove("hidden");
    inviteLinkInput.select();
}

function closeInviteModal(){
    if(!inviteModal) return;

    inviteModal.classList.add("hidden");
}

async function copyInviteLink(){
    if(!inviteLinkInput) return;

    inviteLinkInput.select();

    try{
        await navigator.clipboard.writeText(inviteLinkInput.value);
        showTransactionMessage("success", "Invite link copied", "Share it with a friend to bring them into the game.");
    }catch(error){
        showTransactionMessage("error", "Copy failed", "Select the invite link and copy it manually.");
    }
}

function resizeCanvasDisplay(){
    updateLayoutMetrics();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const horizontalPadding = viewportWidth <= 420 ? 0 : (viewportWidth <= 640 ? 12 : 24);
    const verticalPadding = viewportWidth <= 420 ? 0 : (viewportWidth <= 640 ? 12 : 24);
    const availableWidth = Math.max(240, viewportWidth - horizontalPadding);
    const availableHeight = Math.max(320, viewportHeight - verticalPadding);
    const widthScale = availableWidth / baseCanvasWidth;
    const heightScale = availableHeight / baseCanvasHeight;
    const scale = viewportWidth <= 640
        ? Math.min(widthScale, heightScale, 1)
        : Math.min(widthScale, heightScale, 1);

    canvas.style.width = `${Math.floor(baseCanvasWidth * scale)}px`;
    canvas.style.height = `${Math.floor(baseCanvasHeight * scale)}px`;
}

function getPointerPosition(clientX, clientY){
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function resetGame(){
    gameSessionId = null;
    gameReady = false;
    knownSafeTiles = Array(rows).fill(null);
    currentStep = -1;
    gameOver = false;
    brokenTile = null;
    tileRequestPending = false;
    playerVisualStep = -1;
    playerX = canvas.width / 2;
    playerY = startPlatform.y + startPlatform.h - 14;
    statusText = "";
    statusColor = "#ffffff";
    pebbleCount = 2;
    pebbleMode = false;
    pebbleFlight = null;
    revealedTiles = Array.from({ length: rows }, () => Array(cols).fill(null));

    if(animationFrame){
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    startServerGame();
}

async function startServerGame(){
    try{
        if(!window.userWallet){
            throw new Error("Wallet required");
        }

        statusText = "LOADING";
        statusColor = "#fff7da";

        const response = await fetch(`${window.API_URL || "http://localhost:5000/api"}/game/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                wallet: window.userWallet
            })
        });

        if(!response.ok){
            throw new Error("Unable to start game session");
        }

        const data = await response.json();

        gameSessionId = data.gameId;
        gameReady = true;
        statusText = "";
        statusColor = "#ffffff";
    }catch(error){
        gameReady = false;
        statusText = "SERVER ERROR";
        statusColor = "#fecaca";
    }
}

async function chooseTile(row, col, action){
    if(!gameSessionId) return null;

    if(
        typeof isWalletStillConnected === "function" &&
        !await isWalletStillConnected(true)
    ){
        throw new Error("Wallet disconnected");
    }

    const response = await fetch(`${window.API_URL || "http://localhost:5000/api"}/game/choose`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            gameId: gameSessionId,
            wallet: window.userWallet,
            row,
            col,
            action
        })
    });

    if(!response.ok){
        throw new Error("Unable to validate tile");
    }

    return response.json();
}

function tilePosition(row, col){
    const x = canvas.width / 2 - tileW - laneGap / 2 + col * (tileW + laneGap);
    const rowDrop = rows > 1 ? lastRowDrop * (row / (rows - 1)) : 0;
    const y = firstRowY - row * (tileH + gapY) + rowDrop;
    return { x, y };
}

function drawBackground(){
    ctx.save();

    if(bgImage.complete){
        ctx.globalAlpha = 0.12;
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
    }

    const overlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
    overlay.addColorStop(0, "rgba(167, 91, 107, 0.9)");
    overlay.addColorStop(0.6, "rgba(153, 87, 103, 0.97)");
    overlay.addColorStop(1, "rgba(137, 78, 94, 1)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(96, 54, 63, 0.26)";
    ctx.lineWidth = 2;
    for(let x = 0; x < canvas.width; x += 130){
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for(let y = 68; y < canvas.height; y += 114){
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    ctx.fillStyle = "rgba(103, 56, 67, 0.28)";
    for(let x = 38; x < canvas.width; x += 94){
        for(let y = 36; y < canvas.height; y += 94){
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const lowerStageTop = startPlatform.y + startPlatform.h + 16;
    const lowerStageHeight = canvas.height - lowerStageTop;
    const lowerStageGradient = ctx.createLinearGradient(0, lowerStageTop, 0, canvas.height);
    lowerStageGradient.addColorStop(0, "rgba(130, 76, 92, 0.94)");
    lowerStageGradient.addColorStop(0.55, "rgba(103, 56, 67, 0.98)");
    lowerStageGradient.addColorStop(1, "rgba(66, 34, 44, 1)");
    ctx.fillStyle = lowerStageGradient;
    ctx.fillRect(0, lowerStageTop, canvas.width, lowerStageHeight);

    ctx.fillStyle = "rgba(36, 18, 27, 0.45)";
    ctx.fillRect(0, canvas.height - 88, canvas.width, 88);

    ctx.strokeStyle = "rgba(255, 207, 98, 0.24)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, lowerStageTop + 10);
    ctx.lineTo(canvas.width, lowerStageTop + 10);
    ctx.stroke();

    ctx.fillStyle = "rgba(55, 31, 40, 0.72)";
    for(let x = -20; x < canvas.width + 20; x += 58){
        ctx.beginPath();
        ctx.moveTo(x, lowerStageTop + 20);
        ctx.lineTo(x + 34, lowerStageTop + 20);
        ctx.lineTo(x + 18, canvas.height - 18);
        ctx.lineTo(x - 16, canvas.height - 18);
        ctx.closePath();
        ctx.fill();
    }

    ctx.strokeStyle = "rgba(255, 232, 192, 0.08)";
    ctx.lineWidth = 2;
    for(let y = lowerStageTop + 28; y < canvas.height - 12; y += 42){
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    ctx.restore();
}

function drawHud(){
    ctx.save();

    const panelW = isMobileLayout ? 278 : 284;
    const panelH = isMobileLayout ? 84 : 84;
    const panelX = canvas.width / 2 - panelW / 2;
    const panelY = isMobileLayout ? 8 : 10;
    const panelTitleY = panelY + (isMobileLayout ? 28 : 26);
    const panelSubtitleY = panelY + 54;
    const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGradient.addColorStop(0, "#88d3f5");
    panelGradient.addColorStop(1, "#5ba7d1");

    ctx.fillStyle = "rgba(39, 57, 76, 0.94)";
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 24);
    ctx.fill();

    ctx.fillStyle = panelGradient;
    ctx.beginPath();
    ctx.roundRect(panelX + 4, panelY + 4, panelW - 8, panelH - 8, 20);
    ctx.fill();

    ctx.strokeStyle = "#2a4056";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4, 22);
    ctx.stroke();

    ctx.strokeStyle = "rgba(233, 246, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX + 8, panelY + 8, panelW - 16, panelH - 16, 16);
    ctx.stroke();

    const titleText = "Steps Crossed";
    const progressText = `${Math.max(currentStep + 1, 0)} / ${rows}`;
    const subtitleText = `Pebbles: ${pebbleCount}  |  ${pebbleMode ? "Choose a front tile to test" : "Tap PEB to scout the next row"}`;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = isMobileLayout ? "bold 18px Trebuchet MS" : "bold 18px Trebuchet MS";
    const titleWidth = ctx.measureText(titleText).width;

    ctx.fillStyle = "#f5f0e6";
    ctx.fillText(titleText, canvas.width / 2 - titleWidth / 4, panelTitleY);

    ctx.fillStyle = "#ffd400";
    ctx.font = isMobileLayout ? "bold 26px Trebuchet MS" : "bold 28px Trebuchet MS";
    ctx.fillText(progressText, canvas.width / 2 + titleWidth / 2 + (isMobileLayout ? 22 : 26), panelTitleY);

    ctx.fillStyle = "rgba(55, 39, 48, 0.82)";
    ctx.font = isMobileLayout ? "bold 12px Trebuchet MS" : "bold 12px Trebuchet MS";
    ctx.fillText(subtitleText, canvas.width / 2, panelSubtitleY);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    function drawButton(x, y, w, h, label, topColor, bottomColor, textColor = "#dcffd8", disabled = false){
        const gradient = ctx.createLinearGradient(x, y, x, y + h);
        gradient.addColorStop(0, topColor);
        gradient.addColorStop(1, bottomColor);
        ctx.fillStyle = "#8f5b65";
        ctx.globalAlpha = disabled ? 0.58 : 1;
        ctx.beginPath();
        ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 12);
        ctx.fill();
        ctx.fillStyle = gradient;
        ctx.strokeStyle = "rgba(52, 34, 34, 0.45)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 3, w - 6, h - 6, 7);
        ctx.stroke();
        ctx.fillStyle = textColor;
        ctx.font = label === "HOME"
            ? "bold 13px Trebuchet MS"
            : (w > 50
                ? (isMobileLayout ? "bold 16px Trebuchet MS" : "bold 16px Trebuchet MS")
                : (isMobileLayout ? "bold 13px Trebuchet MS" : "bold 13px Trebuchet MS"));
        const labelLines = String(label).split("\n");

        if(labelLines.length > 1){
            ctx.font = isMobileLayout ? "bold 13px Trebuchet MS" : "bold 13px Trebuchet MS";
            const lineGap = 14;
            const firstLineY = y + h / 2 - lineGap / 2 + 5;

            labelLines.forEach((line, index) => {
                const labelWidth = ctx.measureText(line).width;
                ctx.fillText(line, x + (w - labelWidth) / 2, firstLineY + index * lineGap);
            });
        }else{
            const labelWidth = ctx.measureText(label).width;
            ctx.fillText(label, x + (w - labelWidth) / 2, y + h / 2 + (isMobileLayout ? 4 : 5));
        }
        ctx.globalAlpha = 1;
    }

    function drawInviteButton(x, y, w, h){
        drawButton(x, y, w, h, "", "#f6c453", "#c67d1f", "#fff8dc");

        ctx.save();
        ctx.fillStyle = "#fff8dc";
        ctx.strokeStyle = "rgba(93, 49, 14, 0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2 - 7, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(x + w / 2 - 13, y + h / 2 + 3, 26, 13, 8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function shortenWalletAddress(address){
        if(!address) return "WALLET";
        return `${address.slice(0, 5)}...${address.slice(-3)}`;
    }

    function drawWalletBadge(x, y, w, h){
        const gradient = ctx.createLinearGradient(x, y, x, y + h);
        gradient.addColorStop(0, "#88d3f5");
        gradient.addColorStop(1, "#5ba7d1");

        ctx.fillStyle = "#8f5b65";
        ctx.beginPath();
        ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 12);
        ctx.fill();

        ctx.fillStyle = gradient;
        ctx.strokeStyle = "rgba(52, 34, 34, 0.45)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 3, w - 6, h - 6, 7);
        ctx.stroke();

        ctx.fillStyle = "#f5fbff";
        ctx.font = isMobileLayout ? "bold 12px Trebuchet MS" : "bold 13px Trebuchet MS";
        const walletText = shortenWalletAddress(window.userWallet);
        const walletTextWidth = ctx.measureText(walletText).width;
        ctx.fillText(walletText, x + (w - walletTextWidth) / 2, y + h / 2 + 4);
    }

    function drawStatsBadge(x, y, w, h){
        const gradient = ctx.createLinearGradient(x, y, x, y + h);
        gradient.addColorStop(0, "#88d3f5");
        gradient.addColorStop(1, "#5ba7d1");

        ctx.fillStyle = "#8f5b65";
        ctx.beginPath();
        ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 12);
        ctx.fill();

        ctx.fillStyle = gradient;
        ctx.strokeStyle = "rgba(52, 34, 34, 0.45)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 3, w - 6, h - 6, 7);
        ctx.stroke();

        ctx.font = "bold 13px Trebuchet MS";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(52, 34, 34, 0.34)";
        ctx.strokeText(`POINTS ${playerPoints}`, x + w / 2, y + 22);
        ctx.strokeText(`WINS ${playerWins}`, x + w / 2, y + 40);
        ctx.fillStyle = "#f5fbff";
        ctx.fillText(`POINTS ${playerPoints}`, x + w / 2, y + 22);
        ctx.fillText(`WINS ${playerWins}`, x + w / 2, y + 40);
        ctx.textAlign = "start";
    }

    const statsBadge = isMobileLayout ? { x: 8, y: 12, w: 96, h: 56 } : { x: 10, y: 22, w: 102, h: 56 };
    const walletHudBadge = {
        x: canvas.width - statsBadge.x - statsBadge.w,
        y: statsBadge.y,
        w: statsBadge.w,
        h: statsBadge.h
    };
    const redeemHudButton = isMobileLayout ? { x: 8, y: 76, w: 52, h: 46 } : { x: 14, y: 86, w: 52, h: 46 };
    const homeHudButton = {
        x: canvas.width - redeemHudButton.x - redeemHudButton.w,
        y: redeemHudButton.y,
        w: redeemHudButton.w,
        h: redeemHudButton.h
    };
    const inviteHudButton = {
        x: redeemHudButton.x,
        y: redeemHudButton.y + redeemHudButton.h + 8,
        w: redeemHudButton.w,
        h: redeemHudButton.h
    };
    const pebbleHudButton = {
        x: homeHudButton.x,
        y: homeHudButton.y + homeHudButton.h + 8,
        w: homeHudButton.w,
        h: homeHudButton.h
    };

    pebbleButton.x = pebbleHudButton.x;
    pebbleButton.y = pebbleHudButton.y;
    pebbleButton.w = pebbleHudButton.w;
    pebbleButton.h = pebbleHudButton.h;
    walletBadge.x = walletHudBadge.x;
    walletBadge.y = walletHudBadge.y;
    walletBadge.w = walletHudBadge.w;
    walletBadge.h = walletHudBadge.h;
    homeButton.x = homeHudButton.x;
    homeButton.y = homeHudButton.y;
    homeButton.w = homeHudButton.w;
    homeButton.h = homeHudButton.h;
    redeemButton.x = redeemHudButton.x;
    redeemButton.y = redeemHudButton.y;
    redeemButton.w = redeemHudButton.w;
    redeemButton.h = redeemHudButton.h;
    inviteButton.x = inviteHudButton.x;
    inviteButton.y = inviteHudButton.y;
    inviteButton.w = inviteHudButton.w;
    inviteButton.h = inviteHudButton.h;

    drawStatsBadge(statsBadge.x, statsBadge.y, statsBadge.w, statsBadge.h);
    drawButton(pebbleButton.x, pebbleButton.y, pebbleButton.w, pebbleButton.h, "PEB", pebbleMode ? "#ffe27a" : "#f6c453", pebbleMode ? "#c89a22" : "#c67d1f", "#fff8dc");
    ctx.fillStyle = pebbleCount > 0 ? "#fef3c7" : "#fecaca";
    ctx.beginPath();
    ctx.arc(pebbleButton.x + pebbleButton.w - (isMobileLayout ? 7 : 8), pebbleButton.y + (isMobileLayout ? 7 : 8), isMobileLayout ? 11 : 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(93, 49, 14, 0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = pebbleCount > 0 ? "#7c4a12" : "#7f1d1d";
    ctx.font = isMobileLayout ? "bold 12px Trebuchet MS" : "bold 12px Trebuchet MS";
    ctx.fillText(`${pebbleCount}`, pebbleButton.x + pebbleButton.w - (isMobileLayout ? 12 : 12), pebbleButton.y + (isMobileLayout ? 12 : 12));
    drawWalletBadge(walletBadge.x, walletBadge.y, walletBadge.w, walletBadge.h);
    drawButton(homeButton.x, homeButton.y, homeButton.w, homeButton.h, "HOME", "#84d857", "#45a63a");
    drawButton(
        redeemButton.x,
        redeemButton.y,
        redeemButton.w,
        redeemButton.h,
        isRedeeming ? "..." : "RED\nEEM",
        isRedeeming ? "#b7c0aa" : "#84d857",
        isRedeeming ? "#76816e" : "#45a63a",
        "#dcffd8",
        isRedeeming
    );
    drawInviteButton(inviteButton.x, inviteButton.y, inviteButton.w, inviteButton.h);

    ctx.restore();
}

function drawSupportTower(x, topY, height){
    ctx.save();

    const width = 52;
    ctx.fillStyle = "#304254";
    ctx.fillRect(x, topY, width, height);
    ctx.fillStyle = "#42586f";
    ctx.fillRect(x + 8, topY, 10, height);
    ctx.fillRect(x + width - 18, topY, 10, height);

    ctx.strokeStyle = "rgba(19, 27, 36, 0.8)";
    ctx.lineWidth = 6;
    for(let y = topY + 10; y < topY + height - 20; y += 52){
        ctx.beginPath();
        ctx.moveTo(x + 10, y);
        ctx.lineTo(x + width - 10, y + 34);
        ctx.moveTo(x + width - 10, y);
        ctx.lineTo(x + 10, y + 34);
        ctx.stroke();
    }

    ctx.restore();
}

function drawSideDeck(deck){
    ctx.save();

    const deckGradient = ctx.createLinearGradient(deck.x, deck.y, deck.x, deck.y + deck.h);
    deckGradient.addColorStop(0, "#7f93a8");
    deckGradient.addColorStop(1, "#6e8195");
    ctx.fillStyle = deckGradient;
    ctx.fillRect(deck.x, deck.y, deck.w, deck.h);

    ctx.strokeStyle = "#293847";
    ctx.lineWidth = 4;
    ctx.strokeRect(deck.x, deck.y, deck.w, deck.h);

    ctx.fillStyle = "#445667";
    ctx.fillRect(deck.x, deck.y + deck.h, deck.w, 20);
    ctx.fillStyle = "#283644";
    ctx.fillRect(deck.x, deck.y + deck.h + 20, deck.w, 10);

    ctx.strokeStyle = "#384958";
    ctx.lineWidth = 5;
    for(let y = deck.y + 16; y < deck.y + deck.h - 10; y += 76){
        ctx.beginPath();
        ctx.moveTo(deck.railX, y - 18);
        ctx.lineTo(deck.railX, y + 16);
        ctx.stroke();
    }

    ctx.fillStyle = "rgba(66, 88, 111, 0.35)";
    for(let x = deck.x + 10; x < deck.x + deck.w - 10; x += 26){
        for(let y = deck.y + 16; y < deck.y + deck.h - 10; y += 48){
            ctx.fillRect(x, y, 14, 2);
        }
    }

    ctx.restore();
}

function drawFinishRailConnectors(){
    ctx.save();

    const connectorY = finishPlatform.y + finishPlatform.h - 2;
    const leftOuterRailX = bridgeLeft + 2;
    const rightOuterRailX = bridgeRight - 2;
    const leftDeckRailX = sideDecks[0].railX;
    const rightDeckRailX = sideDecks[1].railX;

    ctx.strokeStyle = "#384958";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(leftDeckRailX, connectorY);
    ctx.lineTo(leftOuterRailX, connectorY);
    ctx.moveTo(rightOuterRailX, connectorY);
    ctx.lineTo(rightDeckRailX, connectorY);
    ctx.stroke();

    ctx.restore();
}

function drawPlatformBlock(platform, label, accentColor, railSide = "top"){
    ctx.save();

    const deckGradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.h);
    deckGradient.addColorStop(0, "#7f93a8");
    deckGradient.addColorStop(1, "#6e8195");
    ctx.fillStyle = deckGradient;
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);

    ctx.strokeStyle = "#293847";
    ctx.lineWidth = 4;
    ctx.strokeRect(platform.x, platform.y, platform.w, platform.h);

    ctx.fillStyle = "#445667";
    ctx.fillRect(platform.x, platform.y + platform.h, platform.w, 28);
    ctx.fillStyle = "#283644";
    ctx.fillRect(platform.x, platform.y + platform.h + 28, platform.w, 12);

    const railY = railSide === "top" ? platform.y - 18 : platform.y + platform.h + 20;
    const postTop = railSide === "top" ? railY : platform.y + platform.h - 4;
    const postBottom = railSide === "top" ? platform.y + 4 : railY;

    ctx.strokeStyle = "#384958";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(platform.x + 8, railY);
    ctx.lineTo(platform.x + platform.w - 8, railY);
    ctx.stroke();
    for(let x = platform.x + 18; x < platform.x + platform.w - 10; x += 38){
        ctx.beginPath();
        ctx.moveTo(x, postTop);
        ctx.lineTo(x, postBottom);
        ctx.stroke();
    }

    ctx.fillStyle = "#2d2d2d";
    ctx.fillRect(platform.x, platform.y + 4, 18, platform.h - 8);
    ctx.fillRect(platform.x + platform.w - 18, platform.y + 4, 18, platform.h - 8);
    for(let y = platform.y + 8; y < platform.y + platform.h - 10; y += 18){
        ctx.fillStyle = "#f3c94a";
        ctx.beginPath();
        ctx.moveTo(platform.x, y);
        ctx.lineTo(platform.x + 18, y);
        ctx.lineTo(platform.x + 18, y + 9);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(platform.x + platform.w, y);
        ctx.lineTo(platform.x + platform.w - 18, y);
        ctx.lineTo(platform.x + platform.w - 18, y + 9);
        ctx.closePath();
        ctx.fill();
    }

    if(label !== "FINISH"){
        ctx.fillStyle = accentColor;
        ctx.font = label === "START" ? "bold 14px Trebuchet MS" : "bold 16px Trebuchet MS";
        ctx.textAlign = "center";
        ctx.fillText(label, platform.x + platform.w / 2, platform.y + (label === "START" ? 39 : 31));
        ctx.textAlign = "start";
    }

    if(label === "FINISH"){
        const flagY = platform.y + 8;
        const leftFlagX = platform.x + 86;
        const rightFlagX = platform.x + platform.w - 86;

        ctx.strokeStyle = "#384958";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(leftFlagX, platform.y + 2);
        ctx.lineTo(leftFlagX, flagY);
        ctx.moveTo(rightFlagX, platform.y + 2);
        ctx.lineTo(rightFlagX, flagY);
        ctx.stroke();

        const bannerX = leftFlagX;
        const bannerY = flagY;
        const bannerW = rightFlagX - leftFlagX;
        const bannerH = 18;
        const squareW = bannerW / 8;
        const squareH = bannerH / 2;

        for(let row = 0; row < 2; row++){
            for(let col = 0; col < 8; col++){
                const isDark = (row + col) % 2 === 0;
                ctx.fillStyle = isDark ? "#1f2937" : "#f8fafc";
                ctx.fillRect(bannerX + col * squareW, bannerY + row * squareH, squareW, squareH);
            }
        }

        ctx.strokeStyle = "#1f2937";
        ctx.lineWidth = 2;
        ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 14px Trebuchet MS";
        ctx.fillText(label, platform.x + platform.w / 2 - 28, platform.y + 43);
    }

    ctx.restore();
}

function drawBridgeFrame(){
    ctx.save();

    const bridgeTopRailY = finishPlatform.y + finishPlatform.h;
    const bridgeFillTopY = tilePosition(rows - 1, 0).y;
    const bridgeBottomRailY = startPlatform.y;
    const leftOuterRailX = bridgeLeft + 2;
    const centerLeftRailX = canvas.width / 2 - 8;
    const centerRightRailX = canvas.width / 2 + 8;
    const rightOuterRailX = bridgeRight - 2;

    const laneGradient = ctx.createLinearGradient(0, bridgeFillTopY, 0, bridgeBottomRailY);
    laneGradient.addColorStop(0, "#ac5a72");
    laneGradient.addColorStop(0.5, "#a4556d");
    laneGradient.addColorStop(1, "#985065");
    ctx.fillStyle = laneGradient;
    ctx.fillRect(leftOuterRailX, bridgeFillTopY, rightOuterRailX - leftOuterRailX, bridgeBottomRailY - bridgeFillTopY);

    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(centerLeftRailX + 5, bridgeFillTopY, centerRightRailX - centerLeftRailX - 10, bridgeBottomRailY - bridgeFillTopY);

    ctx.strokeStyle = "#f472d0";
    ctx.lineWidth = 8;
    ctx.shadowColor = "rgba(244, 114, 208, 0.35)";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(leftOuterRailX, bridgeBottomRailY);
    ctx.lineTo(leftOuterRailX, bridgeTopRailY);
    ctx.moveTo(centerLeftRailX, bridgeBottomRailY);
    ctx.lineTo(centerLeftRailX, bridgeTopRailY);
    ctx.moveTo(centerRightRailX, bridgeBottomRailY);
    ctx.lineTo(centerRightRailX, bridgeTopRailY);
    ctx.moveTo(rightOuterRailX, bridgeBottomRailY);
    ctx.lineTo(rightOuterRailX, bridgeTopRailY);
    ctx.stroke();

    ctx.shadowBlur = 0;

    const lightLeftX = leftOuterRailX - 7;
    const lightRightX = rightOuterRailX + 7;
    for(let y = bridgeFillTopY + 4; y <= bridgeBottomRailY - 4; y += 26){
        ctx.fillStyle = "#f8fafc";
        ctx.shadowColor = "rgba(255,255,255,0.45)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(lightLeftX, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lightRightX, y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(55, 65, 81, 0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lightLeftX, y, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(lightRightX, y, 5, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawGlassGlow(){
    ctx.save();
    const glow = ctx.createLinearGradient(canvas.width / 2, finishPlatform.y + 28, canvas.width / 2, startPlatform.y + 20);
    glow.addColorStop(0, "rgba(153, 223, 231, 0.06)");
    glow.addColorStop(1, "rgba(153, 223, 231, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(bridgeLeft - 18, finishPlatform.y + 30, tileW * 2 + 56, startPlatform.y - finishPlatform.y - 22);
    ctx.restore();
}

function drawBridge(){
    for(let r = 0; r < rows; r++){
        for(let c = 0; c < cols; c++){
            const pos = tilePosition(r, c);
            const isBroken = brokenTile && brokenTile.row === r && brokenTile.col === c;
            const isNextChoice = !gameOver && currentStep < rows - 1 && r === currentStep + 1;
            const revealState = revealedTiles[r][c];

            const glass = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y + tileH);
            glass.addColorStop(0, isBroken ? "#f8a0a7" : "#dffcff");
            glass.addColorStop(0.5, isBroken ? "#e46d79" : "#87dbe6");
            glass.addColorStop(1, isBroken ? "#b54358" : "#5eb6c2");

            ctx.save();
            ctx.shadowColor = isBroken ? "rgba(213, 76, 100, 0.32)" : "rgba(124, 225, 233, 0.24)";
            ctx.shadowBlur = 12;
            ctx.fillStyle = glass;
            ctx.fillRect(pos.x, pos.y, tileW, tileH);

            ctx.fillStyle = isBroken ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.35)";
            ctx.beginPath();
            ctx.moveTo(pos.x + 12, pos.y + 12);
            ctx.lineTo(pos.x + tileW - 18, pos.y + 12);
            ctx.lineTo(pos.x + tileW - 42, pos.y + 34);
            ctx.lineTo(pos.x + 22, pos.y + 34);
            ctx.closePath();
            ctx.fill();

            if(isBroken){
                const crackGlow = ctx.createRadialGradient(
                    pos.x + tileW / 2,
                    pos.y + tileH / 2,
                    6,
                    pos.x + tileW / 2,
                    pos.y + tileH / 2,
                    tileW / 1.2
                );
                crackGlow.addColorStop(0, "rgba(127, 29, 29, 0.28)");
                crackGlow.addColorStop(1, "rgba(127, 29, 29, 0)");
                ctx.fillStyle = crackGlow;
                ctx.fillRect(pos.x - 6, pos.y - 6, tileW + 12, tileH + 12);

                ctx.fillStyle = "rgba(127, 29, 29, 0.2)";
                ctx.beginPath();
                ctx.moveTo(pos.x + 12, pos.y + 12);
                ctx.lineTo(pos.x + 54, pos.y + 26);
                ctx.lineTo(pos.x + 42, pos.y + 72);
                ctx.lineTo(pos.x + 18, pos.y + 60);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(pos.x + 84, pos.y + 14);
                ctx.lineTo(pos.x + 122, pos.y + 18);
                ctx.lineTo(pos.x + 112, pos.y + 72);
                ctx.lineTo(pos.x + 76, pos.y + 54);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = "rgba(255, 214, 220, 0.58)";
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(pos.x + 16, pos.y + 14);
                ctx.lineTo(pos.x + 52, pos.y + 28);
                ctx.lineTo(pos.x + 44, pos.y + 70);
                ctx.moveTo(pos.x + 34, pos.y + 18);
                ctx.lineTo(pos.x + 68, pos.y + 40);
                ctx.lineTo(pos.x + 54, pos.y + 64);
                ctx.moveTo(pos.x + 82, pos.y + 14);
                ctx.lineTo(pos.x + 118, pos.y + 20);
                ctx.lineTo(pos.x + 108, pos.y + 68);
                ctx.moveTo(pos.x + 70, pos.y + 30);
                ctx.lineTo(pos.x + 88, pos.y + 46);
                ctx.lineTo(pos.x + 76, pos.y + 70);
                ctx.moveTo(pos.x + 44, pos.y + 38);
                ctx.lineTo(pos.x + 72, pos.y + 44);
                ctx.lineTo(pos.x + 96, pos.y + 34);
                ctx.stroke();

                ctx.strokeStyle = "rgba(109, 40, 52, 0.72)";
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(pos.x + 24, pos.y + 16);
                ctx.lineTo(pos.x + 18, pos.y + 32);
                ctx.lineTo(pos.x + 26, pos.y + 46);
                ctx.moveTo(pos.x + 98, pos.y + 16);
                ctx.lineTo(pos.x + 92, pos.y + 34);
                ctx.lineTo(pos.x + 102, pos.y + 52);
                ctx.stroke();
            }

            ctx.strokeStyle = isNextChoice ? "#ffe066" : "#4f7b85";
            ctx.lineWidth = isNextChoice ? 4 : 2;
            ctx.strokeRect(pos.x, pos.y, tileW, tileH);

            if(isNextChoice){
                ctx.strokeStyle = "rgba(255, 224, 102, 0.45)";
                ctx.lineWidth = 2;
                ctx.strokeRect(pos.x - 4, pos.y - 4, tileW + 8, tileH + 8);
            }

            if(revealState === "safe"){
                ctx.fillStyle = "rgba(94, 234, 132, 0.14)";
                ctx.fillRect(pos.x, pos.y, tileW, tileH);
                ctx.strokeStyle = "#8df2ae";
                ctx.lineWidth = 3;
                ctx.strokeRect(pos.x + 6, pos.y + 6, tileW - 12, tileH - 12);
                ctx.fillStyle = "#f0fff4";
                ctx.font = "bold 28px Trebuchet MS";
                ctx.fillText("✓", pos.x + tileW - 32, pos.y + 34);
            }else if(revealState === "wrong" && !isBroken){
                ctx.fillStyle = "rgba(127, 29, 29, 0.16)";
                ctx.fillRect(pos.x, pos.y, tileW, tileH);
                ctx.strokeStyle = "rgba(255, 214, 220, 0.78)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(pos.x + 24, pos.y + 22);
                ctx.lineTo(pos.x + tileW - 24, pos.y + tileH - 22);
                ctx.moveTo(pos.x + tileW - 24, pos.y + 22);
                ctx.lineTo(pos.x + 24, pos.y + tileH - 22);
                ctx.stroke();
            }
            ctx.restore();
        }
    }
}

function drawCharacter(x, y){
    const width = 82;
    const height = 100;

    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.45)";
    ctx.shadowBlur = 12;

    if(characterImage.complete){
        ctx.drawImage(characterImage, x - width / 2, y - height + 10, width, height);
    }else{
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(x, y - 24, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 16, y - 8, 32, 48);
    }

    ctx.restore();
}

function drawBrokenTileAfterJump(target, revealedSafeTiles = []){
    brokenTile = target;
    for(let row = target.row; row < rows; row++){
        const safeCol = revealedSafeTiles[row - target.row];
        if(typeof safeCol !== "number") continue;
        knownSafeTiles[row] = safeCol;
        revealedTiles[row][safeCol] = "safe";
    }
    gameOver = true;
    statusText = "GAME OVER";
    statusColor = "#fecaca";
}

function drawPlayer(){
    ctx.save();
    ctx.fillStyle = "rgba(32, 40, 49, 0.28)";
    ctx.beginPath();
    ctx.ellipse(playerX, playerY + 16, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawCharacter(playerX, playerY);
}

function drawStatus(){
    if(!statusText) return;

    const showPlayAgain = statusText === "YOU WIN" || statusText === "GAME OVER";
    const panelX = canvas.width / 2 - (showPlayAgain ? 164 : 142);
    const panelY = showPlayAgain ? 318 : 334;
    const panelW = showPlayAgain ? 328 : 284;
    const panelH = showPlayAgain ? 132 : 76;

    ctx.save();
    ctx.fillStyle = "rgba(53, 34, 39, 0.46)";
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 18);
    ctx.fill();

    ctx.fillStyle = statusColor;
    ctx.font = "bold 38px Trebuchet MS";
    const textWidth = ctx.measureText(statusText).width;
    ctx.fillText(statusText, canvas.width / 2 - textWidth / 2, showPlayAgain ? 366 : 383);

    if(showPlayAgain){
        playAgainButton.x = canvas.width / 2 - playAgainButton.w / 2;
        playAgainButton.y = 388;

        const gradient = ctx.createLinearGradient(
            playAgainButton.x,
            playAgainButton.y,
            playAgainButton.x,
            playAgainButton.y + playAgainButton.h
        );
        gradient.addColorStop(0, "#ffd978");
        gradient.addColorStop(1, "#f6b73f");

        ctx.fillStyle = gradient;
        ctx.strokeStyle = "rgba(52, 34, 34, 0.45)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(playAgainButton.x, playAgainButton.y, playAgainButton.w, playAgainButton.h, 14);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 250, 229, 0.58)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(playAgainButton.x + 4, playAgainButton.y + 4, playAgainButton.w - 8, playAgainButton.h - 8, 10);
        ctx.stroke();

        ctx.fillStyle = "#2b160d";
        ctx.font = "bold 16px Trebuchet MS";
        const buttonText = "PLAY AGAIN!";
        const buttonTextWidth = ctx.measureText(buttonText).width;
        ctx.fillText(
            buttonText,
            playAgainButton.x + (playAgainButton.w - buttonTextWidth) / 2,
            playAgainButton.y + 27
        );
    }

    ctx.restore();
}

function drawPebble(){
    if(!pebbleFlight) return;

    ctx.save();
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "rgba(55, 65, 81, 0.68)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(248, 250, 252, 0.4)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(pebbleFlight.x, pebbleFlight.y, 7, 5, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
}

function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    drawHud();
    drawSupportTower(sideDecks[0].towerX, sideDecks[0].y + sideDecks[0].h + 30, 124);
    drawSupportTower(sideDecks[1].towerX, sideDecks[1].y + sideDecks[1].h + 30, 124);
    drawSideDeck(sideDecks[0]);
    drawSideDeck(sideDecks[1]);
    drawFinishRailConnectors();
    drawPlatformBlock(finishPlatform, "FINISH", "#e9fff3");
    drawPlatformBlock(startPlatform, "START", "#e9fff3", "bottom");
    drawBridgeFrame();
    drawGlassGlow();
    drawBridge();
    drawPebble();
    drawPlayer();
    drawStatus();
}

function getStepCenter(step){
    if(step < 0){
        return {
            x: canvas.width / 2,
            y: startPlatform.y + startPlatform.h - 14
        };
    }

    const col = knownSafeTiles[step] ?? 0;
    const pos = tilePosition(step, col);
    return {
        x: pos.x + tileW / 2,
        y: pos.y + tileH / 2 + 10
    };
}

function getFinishCenter(){
    return {
        x: canvas.width / 2,
        y: finishPlatform.y + finishPlatform.h - 14
    };
}

function getTileCenter(row, col){
    const pos = tilePosition(row, col);
    return {
        x: pos.x + tileW / 2,
        y: pos.y + tileH / 2 + 10
    };
}

function animateJumpToPoint(target, onComplete){
    if(animationFrame){
        cancelAnimationFrame(animationFrame);
    }

    const from = getStepCenter(playerVisualStep);
    const to = target;
    const duration = 460;
    const start = performance.now();

    function step(now){
        const t = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const arc = Math.sin(t * Math.PI) * 56;

        playerX = from.x + (to.x - from.x) * eased;
        playerY = from.y + (to.y - from.y) * eased - arc;

        draw();

        if(t < 1){
            animationFrame = requestAnimationFrame(step);
        }else{
            playerX = to.x;
            playerY = to.y;
            animationFrame = null;
            if(onComplete){
                onComplete();
            }
            draw();
        }
    }

    animationFrame = requestAnimationFrame(step);
}

function animatePebbleThrow(row, col, isSafe, onComplete){
    if(animationFrame){
        cancelAnimationFrame(animationFrame);
    }

    const start = { x: playerX + 18, y: playerY - 56 };
    const tileCenter = getTileCenter(row, col);
    const end = { x: tileCenter.x, y: tileCenter.y - 8 };
    const returnTarget = { x: playerX + 12, y: playerY - 48 };
    const duration = isSafe ? 560 : 320;
    const startTime = performance.now();

    function step(now){
        const t = clamp((now - startTime) / duration, 0, 1);
        let from = start;
        let to = end;
        let localT = isSafe ? Math.min(t / 0.5, 1) : t;
        let arc = Math.sin(localT * Math.PI) * 36;

        if(isSafe && t > 0.5){
            from = end;
            to = returnTarget;
            localT = (t - 0.5) / 0.5;
            arc = Math.sin(localT * Math.PI) * 28;
        }

        pebbleFlight = {
            x: from.x + (to.x - from.x) * localT,
            y: from.y + (to.y - from.y) * localT - arc
        };

        draw();

        if(t < 1){
            animationFrame = requestAnimationFrame(step);
        }else{
            pebbleFlight = null;
            animationFrame = null;
            if(onComplete){
                onComplete(isSafe);
            }
            draw();
        }
    }

    animationFrame = requestAnimationFrame(step);
}

function renderLoop(){
    draw();
    requestAnimationFrame(renderLoop);
}

async function loadProfile(){

    if(!window.userWallet) return;

    const profile = await getProfile(window.userWallet);

    if(!profile) return;

    updateProfileUI(profile);

}

function updateProfileUI(profile){

    playerPoints = profile.points || 0;
    playerWins = profile.wins || 0;

    const pointsText =
        document.getElementById(
            "pointsText"
        );

    const winsText =
        document.getElementById(
            "winsText"
        );

    if(!pointsText || !winsText) return;

    pointsText.innerText =
        `Points: ${playerPoints}`;

    winsText.innerText =
        `Wins: ${playerWins}`;

}

loadProfile();

function handleWalletUnavailable(){
    gameReady = false;
    tileRequestPending = false;
    pebbleMode = false;
    gameSessionId = null;
    playerPoints = 0;
    playerWins = 0;
    statusText = "WALLET DISCONNECTED";
    statusColor = "#fecaca";

    if(animationFrame){
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    openHomeScreen();
    walletModal.classList.remove("hidden");
}

window.addEventListener("wallet-disconnected", handleWalletUnavailable);
window.addEventListener("wallet-changed", handleWalletUnavailable);
window.addEventListener("wallet-connected", async () => {
    await loadProfile();

    if(getStoredActiveView() === "game" && homeScreenVisible){
        startGame();
    }
});

async function verifyWalletAfterMetaMaskFocus(){
    if(homeScreenVisible || !gameReady) return;
    if(typeof isWalletStillConnected !== "function") return;

    const connected =
        await isWalletStillConnected();

    if(!connected){
        handleWalletUnavailable();
    }
}

window.addEventListener("focus", verifyWalletAfterMetaMaskFocus);

document.addEventListener("visibilitychange", () => {
    if(!document.hidden){
        verifyWalletAfterMetaMaskFocus();
    }
});

window.setInterval(() => {
    verifyWalletAfterMetaMaskFocus();
}, 1000);

async function handleRedeemRequest(){
    if(isRedeeming) return;

    if(!window.userWallet){
        showTransactionMessage("error", "Wallet required", "Connect your wallet before redeeming.");
        walletModal.classList.remove("hidden");
        return;
    }

    if(
        typeof isWalletStillConnected === "function" &&
        !await isWalletStillConnected(true)
    ){
        handleWalletUnavailable();
        return;
    }

    isRedeeming = true;
    showTransactionMessage("loading", "Redeeming tokens", "Transaction is processing please wait and keep this window open.", true);

    try{
        const result = await redeemTokens(window.userWallet);

        if(result && result.success){
            const txText = result.txHash
                ? `Transaction submitted: ${result.txHash}`
                : "Tokens redeemed successfully.";

            showTransactionMessage("success", "10 Tokens redeemed", txText);
            await loadProfile();
            return;
        }

        showTransactionMessage(
            "error",
            "Redemption failed",
            result?.message || "Unable to redeem right now. Please try again."
        );
    }catch(error){
        showTransactionMessage("error", "Redemption failed", "Unable to redeem right now. Please try again.");
    }finally{
        isRedeeming = false;
    }
}

async function handleCanvasPress(clientX, clientY){
    if(homeScreenVisible) return;

    const pointer = getPointerPosition(clientX, clientY);
    const mx = pointer.x;
    const my = pointer.y;

    if(
        (statusText === "YOU WIN" || statusText === "GAME OVER") &&
        isPointInRect(mx, my, playAgainButton)
    ){
        if(
            typeof isWalletStillConnected === "function" &&
            !await isWalletStillConnected(true)
        ){
            handleWalletUnavailable();
            return;
        }

        resetGame();
        return;
    }

    if(
        isPointInRect(mx, my, homeButton)
    ){
        openHomeScreen();
        return;
    }

    if(
        isPointInRect(mx, my, redeemButton)
    ){
        await handleRedeemRequest();
        return;
    }

    if(
        isPointInRect(mx, my, inviteButton)
    ){
        openInviteModal();
        return;
    }

    if(
        isPointInRect(mx, my, pebbleButton)
    ){
        if(!gameOver && currentStep < rows - 1 && !animationFrame){
            if(pebbleCount === 0){
                pebbleMode = false;
                statusText = "NO PEBBLES";
                statusColor = "#fde68a";
            }else{
                pebbleMode = !pebbleMode;
                statusText = pebbleMode ? "PEBBLE READY" : "";
                statusColor = "#fff7da";
            }
        }
        return;
    }

    if(!gameReady) return;
    if(gameOver || currentStep === rows - 1 || animationFrame || tileRequestPending) return;

    const nextStep = currentStep + 1;

    for(let c = 0; c < cols; c++){
        const pos = tilePosition(nextStep, c);

        if(mx > pos.x && mx < pos.x + tileW && my > pos.y && my < pos.y + tileH){
            if(pebbleMode){
                statusText = "";
                statusColor = "#ffffff";
                try{
                    tileRequestPending = true;
                    const result = await chooseTile(nextStep, c, "pebble");
                    const isSafe = result.safe;

                    if(isSafe){
                        knownSafeTiles[nextStep] = c;
                    }

                    animatePebbleThrow(nextStep, c, isSafe, () => {
                        revealedTiles[nextStep][c] = isSafe ? "safe" : "wrong";
                        pebbleMode = false;

                        if(isSafe){
                            statusText = "SAFE TILE";
                            statusColor = "#bbf7d0";
                        }else{
                            pebbleCount = typeof result.pebbles === "number"
                                ? result.pebbles
                                : Math.max(0, pebbleCount - 1);
                            statusText = "PEBBLE LOST";
                            statusColor = "#fecaca";
                        }
                    });
                    tileRequestPending = false;
                }catch(error){
                    tileRequestPending = false;
                    pebbleMode = false;
                    if(error.message === "Wallet disconnected"){
                        handleWalletUnavailable();
                    }else{
                        statusText = "SERVER ERROR";
                        statusColor = "#fecaca";
                    }
                }
                break;
            }

            try{
                tileRequestPending = true;
                const result = await chooseTile(nextStep, c, "jump");

                if(result.safe){
                    knownSafeTiles[nextStep] = c;
                    const targetStep = nextStep;
                    brokenTile = null;
                    statusText = "";
                    statusColor = "#ffffff";
                    animateJumpToPoint(getStepCenter(targetStep), () => {
                        currentStep = targetStep;
                        playerVisualStep = targetStep;
                        if(result.won){
                            animateJumpToPoint(
                                getFinishCenter(),
                                async () => {

                                    statusText = "YOU WIN";

                                    if(
                                        typeof result.points === "number" &&
                                        typeof result.wins === "number"
                                    ){
                                        updateProfileUI(result);
                                    }else{
                                        await loadProfile();
                                    }

                                }
                            );
                        }
                    });
                }else{
                    const failedTile = { row: nextStep, col: c };
                    animateJumpToPoint(getTileCenter(nextStep, c), () => {
                        drawBrokenTileAfterJump(failedTile, result.revealedSafeTiles);
                    });
                }
                tileRequestPending = false;
            }catch(error){
                tileRequestPending = false;
                statusText = error.message === "Wallet disconnected"
                    ? "WALLET DISCONNECTED"
                    : "SERVER ERROR";
                statusColor = "#fecaca";

                if(error.message === "Wallet disconnected"){
                    handleWalletUnavailable();
                }
            }
            break;
        }
    }
}

function updateCanvasCursor(clientX, clientY){
    if(homeScreenVisible){
        canvas.style.cursor = "default";
        return;
    }

    const pointer = getPointerPosition(clientX, clientY);
    const mx = pointer.x;
    const my = pointer.y;
    const overPlayAgain =
        (statusText === "YOU WIN" || statusText === "GAME OVER") &&
        isPointInRect(mx, my, playAgainButton);
    const overHudButton =
        isPointInRect(mx, my, homeButton) ||
        isPointInRect(mx, my, redeemButton) ||
        isPointInRect(mx, my, inviteButton) ||
        isPointInRect(mx, my, pebbleButton);
    let overTile = false;

    if(gameReady && !gameOver && currentStep < rows - 1 && !animationFrame && !tileRequestPending){
        const nextStep = currentStep + 1;

        for(let c = 0; c < cols; c++){
            const pos = tilePosition(nextStep, c);
            if(mx > pos.x && mx < pos.x + tileW && my > pos.y && my < pos.y + tileH){
                overTile = true;
                break;
            }
        }
    }

    canvas.style.cursor = overPlayAgain || overHudButton || overTile ? "pointer" : "default";
}

function setHomeScreenVisible(visible){
    homeScreenVisible = visible;
    homeScreen.classList.toggle("hidden", !visible);
    gameShell.classList.toggle("home-active", visible);
    canvas.style.cursor = "default";
    storeActiveView(visible ? "home" : "game");
}

function openHomeScreen(){
    setHomeScreenVisible(true);
}

function startGame(){
    if(!window.userWallet){
        walletModal.classList.remove("hidden");
        return;
    }

    resetGame();
    setHomeScreenVisible(false);
}

canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handleCanvasPress(e.clientX, e.clientY);
});

canvas.addEventListener("pointermove", (e) => {
    updateCanvasCursor(e.clientX, e.clientY);
});

canvas.addEventListener("pointerleave", () => {
    canvas.style.cursor = "default";
});

document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && inviteModal && !inviteModal.classList.contains("hidden")){
        closeInviteModal();
        return;
    }

    if(homeScreenVisible && e.key === "Enter"){
        if(window.userWallet){
            startGame();
        }else{
            walletModal.classList.remove("hidden");
        }

        return;
    }

    if(e.key.toLowerCase() !== "p") return;
    if(gameOver || currentStep === rows - 1 || animationFrame) return;

    if(pebbleCount === 0){
        pebbleMode = false;
        statusText = "NO PEBBLES";
        statusColor = "#fde68a";
        return;
    }

    pebbleMode = !pebbleMode;
    statusText = pebbleMode ? "PEBBLE READY" : "";
    statusColor = "#fff7da";
});

resizeCanvasDisplay();
window.addEventListener("resize", resizeCanvasDisplay);
window.addEventListener("orientationchange", resizeCanvasDisplay);
playButton.addEventListener("click", () => {
    if(window.userWallet){
        startGame();
        return;
    }

    walletModal.classList.remove("hidden");
});

inviteCloseBtn?.addEventListener("click", closeInviteModal);

inviteModal?.addEventListener("click", (e) => {
    if(e.target === inviteModal){
        closeInviteModal();
    }
});

inviteCopyBtn?.addEventListener("click", copyInviteLink);

metaMaskBtn.addEventListener("click", async () => {

    const connected =
        await connectWallet();

    if(connected){

        walletModal.classList.add("hidden");

        await loadProfile();

        startGame();

    }

});

renderLoop();
