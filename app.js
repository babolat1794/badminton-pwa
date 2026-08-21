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
            restCount: 0,
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

    // コート数自動決定
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

    // 休憩回数の公平性：restCount が少ない順
    restCandidates.sort((a, b) => a.restCount - b.restCount);

    // 連続休憩禁止
    let filtered = restCandidates.filter(p => p.lastRestRound !== roundNumber - 1);
    if (filtered.length > 0) {
        restCandidates = filtered;
    }

    const restPlayers = restCandidates;
    restPlayers.forEach(p => {
        p.lastRestRound = roundNumber;
        p.restCount++;
    });

    // 5. todayCount++
    playersForThisRound.forEach(p => p.todayCount++);

    // 6. 最適化ペア作成
    const pairs = createOptimizedPairs(playersForThisRound);

    // 7. ペア履歴更新
    pairs.forEach(pair => {
        const [p1, p2] = pair;

        p1.pairHistory[p2.id] = (p1.pairHistory[p2.id] || 0) + 1;
        p2.pairHistory[p1.id] = (p2.pairHistory[p1.id] || 0) + 1;

        p1.lastPair = p2.id;
        p2.lastPair = p1.id;
    });

    // 8. 最適化コート割り当て
    const courts = assignOptimizedCourts(pairs);

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
// ペア最適化ロジック
// =========================

function createOptimizedPairs(playersForThisRound) {
    const trials = 200; // 探索回数（増やすとより公平だが重くなる）
    let bestPairs = null;
    let bestScore = Infinity;

    for (let t = 0; t < trials; t++) {
        const shuffled = shuffle([...playersForThisRound]);
        const tempPairs = [];
        let valid = true;
        let score = 0;

        for (let i = 0; i < shuffled.length; i += 2) {
            const p1 = shuffled[i];
            const p2 = shuffled[i + 1];

            // 連続ペア禁止（強ペナルティ）
            if (p1.lastPair === p2.id || p2.lastPair === p1.id) {
                valid = false;
                break;
            }

            const pairCount = (p1.pairHistory[p2.id] || 0) + (p2.pairHistory[p1.id] || 0);

            // ペア履歴に応じたペナルティ
            if (pairCount === 0) {
                score += 0;
            } else if (pairCount === 1) {
                score += 10;
            } else if (pairCount === 2) {
                score += 50;
            } else {
                score += 200;
            }

            tempPairs.push([p1, p2]);
        }

        if (!valid) continue;

        if (score < bestScore) {
            bestScore = score;
            bestPairs = tempPairs;
        }
    }

    if (bestPairs) return bestPairs;

    // 最悪時のフォールバック
    return shuffle([...playersForThisRound]).reduce((acc, cur, idx, arr) => {
        if (idx % 2 === 0) acc.push([arr[idx], arr[idx + 1]]);
        return acc;
    }, []);
}

// =========================
// コート最適化ロジック
// =========================

function assignOptimizedCourts(pairs) {
    const trials = 200;
    let bestCourts = null;
    let bestScore = Infinity;

    for (let t = 0; t < trials; t++) {
        const shuffled = shuffle([...pairs]);
        const courts = [];
        let valid = true;
        let score = 0;

        for (let i = 0; i < courtCount; i++) {
            const A = shuffled[i * 2];
            const B = shuffled[i * 2 + 1];
            const courtNumber = i + 1;

            // 連続同一コートペナルティ
            [A[0], A[1], B[0], B[1]].forEach(p => {
                if (p.lastCourt === courtNumber) {
                    score += 20;
                }
            });

            courts.push({ A, B });
        }

        if (!valid) continue;

        if (score < bestScore) {
            bestScore = score;
            bestCourts = courts;
        }
    }

    if (bestCourts) return bestCourts;

    // フォールバック
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
