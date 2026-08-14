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
        （登場回数：${p.todayCount}）
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

// 次のラリーを生成
function nextRound() {
  const activePlayers = players.filter(p => p.status === "active");
  const activeCount = activePlayers.length;

  if (activeCount < 4) {
    alert("参加中の人数が4人未満です。");
    return;
  }

  const courtCount = decideCourtCount(activeCount);
  const maxPlayersUsed = courtCount * 4;
  const shuffled = shuffle(activePlayers);

  const usedPlayers = shuffled.slice(0, maxPlayersUsed);
  const restPlayers = shuffled.slice(maxPlayersUsed);

  // todayCount を増やす
  usedPlayers.forEach(p => {
    p.todayCount += 1;
  });

  // コートごとのペアを作る
  const courts = [];
  for (let c = 0; c < courtCount; c++) {
    const base = c * 4;
    const p1 = usedPlayers[base];
    const p2 = usedPlayers[base + 1];
    const p3 = usedPlayers[base + 2];
    const p4 = usedPlayers[base + 3];
    courts.push({
      court: c + 1,
      pairA: [p1.id, p2.id],
      pairB: [p3.id, p4.id]
    });
    // courtHistory に追加
    [p1, p2, p3, p4].forEach(p => p.courtHistory.push(c + 1));
  }

  roundNumber += 1;

  const roundRecord = {
    round: roundNumber,
    courts: courts,
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
      ペアA：${pA1.id}・${pA2.id}
       vs 
      ペアB：${pB1.id}・${pB2.id}
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
