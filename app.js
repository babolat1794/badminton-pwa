let players = [];
let history = [];
let roundNumber = 0;

// 参加者を初期化
function initPlayers(count) {
  players = [];
  for (let i = 1; i <= count; i++) {
    players.push({
      id: i,
      status: "active",      // active / rest / left
      todayCount: 0,
      courtHistory: [],
      pairHistory: {},
      vsHistory: {}
    });
  }
  roundNumber = 0;
  history = [];
  renderPlayerStatusList();
  renderHistory();
  document.getElementById("roundInfo").textContent = "";
  document.getElementById("courts").innerHTML = "";
  document.getElementById("restArea").innerHTML = "";
}

// ステータス表示
function renderPlayerStatusList() {
  const container = document.getElementById("playerStatusList");
  container.innerHTML = "";
  players.forEach(p => {
    const div = document.createElement("div");
    div.className = "player-status-item";
    const statusClass =
      p.status === "active" ? "status-active" :
      p.status === "rest" ? "status-rest" :
      "status-left";

    div.innerHTML = `
      <span class="${statusClass}">
        ${p.id}：${p.status === "active" ? "参加中" :
                  p.status === "rest" ? "休憩中" : "帰宅"}
        （今日の登場回数：${p.todayCount}）
      </span>
      <button data-id="${p.id}" data-action="active">参加</button>
      <button data-id="${p.id}" data-action="rest">休憩</button>
      <button data-id="${p.id}" data-action="left">帰宅</button>
    `;
    container.appendChild(div);
  });

  // ボタンイベント
  container.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      const action = btn.getAttribute("data-action");
      const player = players.find(p => p.id === id);
      if (!player) return;
      player.status = action === "active" ? "active"
                    : action === "rest" ? "rest"
                    : "left";
      renderPlayerStatusList();
    });
  });
}

// シャッフル関数
function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// コート数を決める（簡易版）
function decideCourtCount(activeCount) {
  if (activeCount >= 12) return 3;
  if (activeCount >= 8) return 2;
  return 1;
}

// ★ 改善版 nextRound（偏りスコア方式）
function nextRound() {
  const activePlayers = players.filter(p => p.status === "active");
  const activeCount = activePlayers.length;

  if (activeCount < 4) {
    alert("参加中の人数が4人未満です。");
    return;
  }

  const courtCount = decideCourtCount(activeCount);
  const maxPlayersUsed = courtCount * 4;

  // 直前ラリーのペア情報（連続ペア禁止用）
  const lastRound = history[history.length - 1] || null;
  let lastPairs = new Set();
  if (lastRound) {
    lastRound.courts.forEach(c => {
      lastPairs.add(`${c.pairA[0]}-${c.pairA[1]}`);
      lastPairs.add(`${c.pairB[0]}-${c.pairB[1]}`);
    });
  }

  let bestScore = Infinity;
  let bestResult = null;

  const TRY_COUNT = 1200; // 5秒以内に収まる

  for (let t = 0; t < TRY_COUNT; t++) {
    const shuffled = shuffle(activePlayers);
    const usedPlayers = shuffled.slice(0, maxPlayersUsed);
    const restPlayers = shuffled.slice(maxPlayersUsed);

    // ペア生成
    const courts = [];
    let score = 0;

    for (let c = 0; c < courtCount; c++) {
      const base = c * 4;
      const p1 = usedPlayers[base];
      const p2 = usedPlayers[base + 1];
      const p3 = usedPlayers[base + 2];
      const p4 = usedPlayers[base + 3];

      const pairA = [p1, p2];
      const pairB = [p3, p4];

      // ペア偏りスコア
      score += (p1.pairHistory[p2.id] || 0) * 10;
      score += (p3.pairHistory[p4.id] || 0) * 10;

      // 連続ペア禁止
      if (lastPairs.has(`${p1.id}-${p2.id}`)) score += 200;
      if (lastPairs.has(`${p3.id}-${p4.id}`)) score += 200;

      // 対戦偏りスコア
      score += (p1.vsHistory[p3.id] || 0) * 4;
      score += (p1.vsHistory[p4.id] || 0) * 4;
      score += (p2.vsHistory[p3.id] || 0) * 4;
      score += (p2.vsHistory[p4.id] || 0) * 4;

      // コート偏りスコア（軽め）
      [p1, p2, p3, p4].forEach(p => {
        const lastCourt = p.courtHistory[p.courtHistory.length - 1];
        if (lastCourt === c + 1) score += 2; // 連続コートペナルティ
      });

      courts.push({
        court: c + 1,
        pairA: [p1.id, p2.id],
        pairB: [p3.id, p4.id]
      });
    }

    if (score < bestScore) {
      bestScore = score;
      bestResult = { courts, usedPlayers, restPlayers };
    }
  }

  // 最良の組み合わせを採用
  const { courts, usedPlayers, restPlayers } = bestResult;

  // todayCount 更新
  usedPlayers.forEach(p => p.todayCount++);

  // 履歴更新
  courts.forEach(c => {
    const pA1 = players.find(p => p.id === c.pairA[0]);
    const pA2 = players.find(p => p.id === c.pairA[1]);
    const pB1 = players.find(p => p.id === c.pairB[0]);
    const pB2 = players.find(p => p.id === c.pairB[1]);

    // ペア履歴
    pA1.pairHistory[pA2.id] = (pA1.pairHistory[pA2.id] || 0) + 1;
    pA2.pairHistory[pA1.id] = (pA2.pairHistory[pA1.id] || 0) + 1;

    pB1.pairHistory[pB2.id] = (pB1.pairHistory[pB2.id] || 0) + 1;
    pB2.pairHistory[pB1.id] = (pB2.pairHistory[pB1.id] || 0) + 1;

    // 対戦履歴
    [pA1, pA2].forEach(pa => {
      [pB1, pB2].forEach(pb => {
        pa.vsHistory[pb.id] = (pa.vsHistory[pb.id] || 0) + 1;
        pb.vsHistory[pa.id] = (pb.vsHistory[pa.id] || 0) + 1;
      });
    });

    // コート履歴
    [pA1, pA2, pB1, pB2].forEach(p => p.courtHistory.push(c.court));
  });

  roundNumber++;
  const roundRecord = {
    round: roundNumber,
    courts,
    rest: restPlayers.map(p => p.id)
  };
  history.push(roundRecord);

  renderRound(roundRecord);
  renderHistory();
  renderPlayerStatusList();
}

// 現在ラリーの表示
function renderRound(roundRecord) {
  const info = document.getElementById("roundInfo");
  info.textContent = `第${roundRecord.round}ラリー`;

  const courtsDiv = document.getElementById("courts");
  courtsDiv.innerHTML = "";

  roundRecord.courts.forEach(c => {
    const div = document.createElement("div");
    div.className = "court-card";

    const pA1 = players.find(p => p.id === c.pairA[0]);
    const pA2 = players.find(p => p.id === c.pairA[1]);
    const pB1 = players.find(p => p.id === c.pairB[0]);
    const pB2 = players.find(p => p.id === c.pairB[1]);

    const text = `
      【コート${c.court}】<br>
      ペアA：${pA1.id}(${pA1.todayCount})・${pA2.id}(${pA2.todayCount})
       vs 
      ペアB：${pB1.id}(${pB1.todayCount})・${pB2.id}(${pB2.todayCount})
    `;
    div.innerHTML = text;
    courtsDiv.appendChild(div);
  });

  const restDiv = document.getElementById("restArea");
  if (roundRecord.rest.length > 0) {
    restDiv.innerHTML = `休憩：${roundRecord.rest.join(", ")}`;
  } else {
    restDiv.innerHTML = "休憩：なし";
  }
}

// 履歴表示
function renderHistory() {
  const container = document.getElementById("historyList");
  container.innerHTML = "";
  history.forEach(r => {
    const div = document.createElement("div");
    div.className = "history-item";
    let html = `【第${r.round}ラリー】<br>`;
    r.courts.forEach(c => {
      html += `コート${c.court}：${c.pairA[0]}・${c.pairA[1]} vs ${c.pairB[0]}・${c.pairB[1]}<br>`;
    });
    html += `休憩：${r.rest.length > 0 ? r.rest.join(", ") : "なし"}`;
    div.innerHTML = html;
    container.appendChild(div);
  });
}

// イベント設定
window.addEventListener("DOMContentLoaded", () => {
  const initBtn = document.getElementById("initBtn");
  const nextRoundBtn = document.getElementById("nextRoundBtn");

  initBtn.addEventListener("click", () => {
    const count = Number(document.getElementById("playerCount").value);
    if (count < 4 || count > 25) {
      alert("参加人数は4〜25人で指定してください。");
      return;
    }
    initPlayers(count);
  });

  nextRoundBtn.addEventListener("click", () => {
    nextRound();
  });

  // デフォルトで14人生成
  initPlayers(14);
});
