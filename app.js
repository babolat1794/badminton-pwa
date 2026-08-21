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
