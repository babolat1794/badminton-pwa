// =========================
// 初期設定
// =========================

let players = [];
let courtCount = 1;
let roundNumber = 0;
let history = [];

// =========================
// 参加者生成（initBtn）
// =========================

document.getElementById("initBtn").onclick = () => {
    setupPlayers();
};

function setupPlayers() {
    const count = parseInt(document.getElementById("playerCount").value);
    players = [];

    for (let i = 1; i <= count; i++) {
        players.push({
            id: i,
            status: "active",
            todayCount: 0,
            restCount: 0,          // ★休憩回数（公平性のため追加）
            lastRestRound: -1,
            pairHistory: {},
            opponentHistory: {},
            lastPair: null,
            lastOpponent: null,
            lastCourt: null
        });
    }

    renderPlayerStatusList();
    renderPairHistory();
}

// =========================
// ステータス表示
// =========================

function renderPlayerStatusList() {
    const div = document.getElementById("playerStatusList");
    div.innerHTML = "";

    players.forEach(p => {
        const row = document.createElement("div");
        row.className = "player-status-item";

        row.innerHTML = `
            ${p.id}番（登場 ${p.todayCount}回 / 休憩 ${p.restCount}回）
            <button onclick="setStatus(${p.id}, 'active')">参加</button>
            <button onclick="setStatus(${p.id}, 'rest')">休憩</button>
            <button onclick="setStatus(${p.id}, 'left')">帰宅</button>
        `;

        div.appendChild(row);
    });
}

function setStatus(id, newStatus) {
    const p = players.find(x => x.id === id);
    if (!p) return;

    p.status = newStatus;

    renderPlayerStatusList();
    renderPairHistory();
}

// =========================
// 対戦カード生成
// =========================

document.getElementById("nextRoundBtn").onclick = () => {
    generateMatches();
};

function generateMatches() {

    roundNumber++;

    // 1. 参加中の人
    let activePlayers = players.filter(p => p.status === "active");

    // ★参加人数でコート数自動決定
    if (activePlayers.length >= 12) courtCount = 3;
    else if (activePlayers.length >= 8) courtCount = 2;
    else courtCount = 1;

    const playersNeeded = courtCount * 4;

    if (activePlayers.length < playersNeeded) {
        alert("参加者が不足しています");
        return;
    }

    // 2. todayCount が少ない順
    activePlayers.sort((a, b) => a.todayCount - b.todayCount);

    // 3. 試合に出る人
    let playersForThisRound = activePlayers.slice(0, playersNeeded);

    // 4. 休憩候補（残りの人）
    let restCandidates = activePlayers.slice(playersNeeded);

    // ★休憩回数の公平性：restCount が少ない順に並べる
    restCandidates.sort((a, b) => a.restCount - b.restCount);

    // ★連続休憩禁止
    restCandidates = restCandidates.filter(p => p.lastRestRound !== roundNumber - 1);

    // ★もし全員連続休憩になるなら、restCount が少ない人を優先
    if (restCandidates.length === 0) {
        restCandidates = activePlayers.slice(playersNeeded);
        restCandidates.sort((a, b) => a.restCount - b.restCount);
    }

    const restPlayers = restCandidates;

    // ★休憩回数を増やす
    restPlayers.forEach(p => {
        p.lastRestRound = roundNumber;
        p.restCount++;
    });

    // 5. todayCount++
    playersForThisRound.forEach(p => p.todayCount++);

    // 6. ★連続ペア禁止ロジック付きペア作成
    const pairs = createPairs(playersForThisRound);

    // 7. ペア履歴更新
    pairs.forEach(pair => {
        const [p1, p2] = pair;

        p1.pairHistory[p2.id] = (p1.pairHistory[p2.id] || 0) + 1;
        p2.pairHistory[p1.id] = (p2.pairHistory[p1.id] || 0) + 1;

        p1.lastPair = p2.id;
        p2.lastPair = p1.id;
    });

    // 8. ★連続コート禁止ロジック付きコート割り当て
    const courts = assignCourts(pairs);

    // 9. 対戦履歴更新
    courts.forEach((c, courtIndex) => {
        const A = c.A;
        const B = c.B;

        A.forEach(a => {
            B.forEach(b => {
                a.opponentHistory[b.id] = (a.opponentHistory[b.id] || 0) + 1;
                b.opponentHistory[a.id] = (b.opponentHistory[a.id] || 0) + 1;

                a.lastOpponent = b.id;
                b.lastOpponent = a.id;
            });

            a.lastCourt = courtIndex + 1;
        });

        B.forEach(b => {
            b.lastCourt = courtIndex + 1;
        });
    });

    // 10. 表示
    const roundInfo = document.getElementById("roundInfo");
    roundInfo.innerHTML = `第${roundNumber}ラリー（コート数：${courtCount}）`;

    const courtDiv = document.getElementById("courts");
    courtDiv.innerHTML = "";

    courts.forEach((c, idx) => {
        const div = document.createElement("div");
        div.className = "court-card";

        div.innerHTML =
            `コート${idx + 1}<br>
             ペアA：${c.A[0].id}・${c.A[1].id}<br>
             vs<br>
             ペアB：${c.B[0].id}・${c.B[1].id}`;

        courtDiv.appendChild(div);
    });

    // 11. 履歴追加
    history.push(courts);

    renderPlayerStatusList();
    renderPairHistory();
    renderHistory();
}

// =========================
// ★連続ペア禁止ロジック
// =========================

function createPairs(playersForThisRound) {

    let maxTry = 50;
    while (maxTry-- > 0) {

        let shuffled = shuffle([...playersForThisRound]);
        let valid = true;
        let tempPairs = [];

        for (let i = 0; i < shuffled.length; i += 2) {
            const p1 = shuffled[i];
            const p2 = shuffled[i + 1];

            if (p1.lastPair === p2.id || p2.lastPair === p1.id) {
                valid = false;
                break;
            }

            tempPairs.push([p1, p2]);
        }

        if (valid) return tempPairs;
    }

    return shuffle([...playersForThisRound]).reduce((acc, cur, idx, arr) => {
        if (idx % 2 === 0) acc.push([arr[idx], arr[idx + 1]]);
        return acc;
    }, []);
}

// =========================
// ★連続コート禁止ロジック
// =========================

function assignCourts(pairs) {

    let maxTry = 50;

    while (maxTry-- > 0) {

        let shuffled = shuffle([...pairs]);
        let courts = [];
        let valid = true;

        for (let i = 0; i < courtCount; i++) {
            const A = shuffled[i * 2];
            const B = shuffled[i * 2 + 1];

            const courtNumber = i + 1;

            if (
                A[0].lastCourt === courtNumber ||
                A[1].lastCourt === courtNumber ||
                B[0].lastCourt === courtNumber ||
                B[1].lastCourt === courtNumber
            ) {
                valid = false;
                break;
            }

            courts.push({ A, B });
        }

        if (valid) return courts;
    }

    return pairs.reduce((acc, cur, idx, arr) => {
        if (idx % 2 === 0) acc.push({ A: arr[idx], B: arr[idx + 1] });
        return acc;
    }, []);
}

// =========================
// ペア履歴表示
// =========================

function renderPairHistory() {
    const div = document.getElementById("pairHistory");
    div.innerHTML = "<h3>ペア履歴</h3>";

    players.forEach(p => {
        let html = `<div class="pair-history-item">`;
        html += `<strong>${p.id}番：</strong> 登場 ${p.todayCount}回 / 休憩 ${p.restCount}回<br>`;
        html += `ペア：`;

        const entries = Object.entries(p.pairHistory);
        if (entries.length === 0) {
            html += `（まだペアなし）`;
        } else {
            html += entries.map(([partnerId, count]) => `${partnerId}番(${count}回)`).join(", ");
        }

        html += `</div>`;
        div.innerHTML += html;
    });
}

// =========================
// 履歴表示
// =========================

function renderHistory() {
    const div = document.getElementById("historyList");
    div.innerHTML = "";

    history.forEach((round, idx) => {
        const item = document.createElement("div");
        item.className = "history-item";

        let text = `第${idx + 1}ラリー<br>`;
        round.forEach((c, i) => {
            text += `コート${i + 1}：${c.A[0].id}・${c.A[1].id} vs ${c.B[0].id}・${c.B[1].id}<br>`;
        });

        item.innerHTML = text;
        div.appendChild(item);
    });
}

// =========================
// シャッフル
// =========================

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
