// =========================
// 初期設定
// =========================

let players = [];
let courtCount = 2;
let roundNumber = 0;
let history = [];

// 参加者登録
function setupPlayers() {
    const count = parseInt(document.getElementById("playerCount").value);
    players = [];

    for (let i = 1; i <= count; i++) {
        players.push({
            id: i,
            status: "active",
            todayCount: 0,
            lastRestRound: -1,
            pairHistory: {},       // 誰と何回ペアになったか
            opponentHistory: {},   // 誰と何回対戦したか
            lastPair: null,
            lastOpponent: null
        });
    }

    renderPlayerStatus();
    renderPairHistory();
}

// 参加者状態表示
function renderPlayerStatus() {
    const div = document.getElementById("playerStatus");
    div.innerHTML = "";

    players.forEach(p => {
        const s = document.createElement("div");
        s.className = "player-status-item";

        let statusText = "";
        if (p.status === "active") statusText = "参加中";
        if (p.status === "rest") statusText = "休憩";
        if (p.status === "left") statusText = "帰宅";

        s.innerHTML = `${p.id}：${statusText}（今日の登場回数：${p.todayCount}）`;
        div.appendChild(s);
    });
}

// 状態変更
function setStatus(id, newStatus) {
    const p = players.find(x => x.id === id);
    if (!p) return;

    p.status = newStatus;
    renderPlayerStatus();
    renderPairHistory();
}

// =========================
// 公平アルゴリズムによる試合生成
// =========================

function generateMatches() {

    roundNumber++;

    // 1. 参加中の人を抽出
    let activePlayers = players.filter(p => p.status === "active");

    // 2. todayCount が少ない順に並べる
    activePlayers.sort((a, b) => a.todayCount - b.todayCount);

    // 3. 必要人数
    const playersNeeded = courtCount * 4;

    // 4. 試合に出る人
    let playersForThisRound = activePlayers.slice(0, playersNeeded);

    // 5. 休憩候補
    let restCandidates = activePlayers.slice(playersNeeded);

    // 6. ★連続休憩禁止
    restCandidates = restCandidates.filter(p => p.lastRestRound !== roundNumber - 1);

    if (restCandidates.length === 0) {
        restCandidates = activePlayers.slice(playersNeeded);
    }

    const restPlayers = restCandidates;
    restPlayers.forEach(p => p.lastRestRound = roundNumber);

    // 7. todayCount++
    playersForThisRound.forEach(p => p.todayCount++);

    // 8. ペア作成（公平性のためシャッフル）
    playersForThisRound = shuffle(playersForThisRound);

    const pairs = [];
    for (let i = 0; i < playersForThisRound.length; i += 2) {
        pairs.push([playersForThisRound[i], playersForThisRound[i + 1]]);
    }

    // 9. ペア履歴更新
    pairs.forEach(pair => {
        const [p1, p2] = pair;

        p1.pairHistory[p2.id] = (p1.pairHistory[p2.id] || 0) + 1;
        p2.pairHistory[p1.id] = (p2.pairHistory[p1.id] || 0) + 1;

        p1.lastPair = p2.id;
        p2.lastPair = p1.id;
    });

    // 10. コート割り当て
    const courts = [];
    for (let i = 0; i < courtCount; i++) {
        courts.push({
            A: pairs[i * 2],
            B: pairs[i * 2 + 1]
        });
    }

    // 11. 対戦履歴更新
    courts.forEach(c => {
        const A = c.A;
        const B = c.B;

        A.forEach(a => {
            B.forEach(b => {
                a.opponentHistory[b.id] = (a.opponentHistory[b.id] || 0) + 1;
                b.opponentHistory[a.id] = (b.opponentHistory[a.id] || 0) + 1;

                a.lastOpponent = b.id;
                b.lastOpponent = a.id;
            });
        });
    });

    // 12. 表示（登場回数のカッコ書きは消す）
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

    // 13. 履歴追加
    history.push(courts);

    renderPlayerStatus();
    renderPairHistory();
    renderHistory();
}

// =========================
// 表示：ペア履歴
// =========================

function renderPairHistory() {
    const div = document.getElementById("pairHistory");
    div.innerHTML = "";

    players.forEach(p => {
        let html = `<div class="pair-history-item">`;
        html += `<strong>${p.id}番：</strong> 今日の登場回数 ${p.todayCount}回<br>`;
        html += `ペア履歴：`;

        const entries = Object.entries(p.pairHistory);
        if (entries.length === 0) {
            html += `（まだ誰ともペアになっていません）`;
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
    const div = document.getElementById("history");
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
// ユーティリティ：シャッフル
// =========================

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
