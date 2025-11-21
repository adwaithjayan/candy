"use strict";

const CANDIES = [
  { name: "Blue", color: "#2563eb" },
  { name: "Orange", color: "#fb923c" },
  { name: "Green", color: "#10b981" },
  { name: "Yellow", color: "#facc15" },
  { name: "Red", color: "#ef4444" },
  { name: "Purple", color: "#8b5cf6" },
];
const ROWS = 9,
  COLS = 9;
const TILE_SIZE = 64;

let board = [];
let score = 0;
let combo = 0;
let isProcessing = false;

function randCandy() {
  return CANDIES[Math.floor(Math.random() * CANDIES.length)];
}

function createTile(r, c) {
  const $t = $("<div>").addClass("tile").attr("data-r", r).attr("data-c", c);
  $t.data("special", null);
  setCandyToTile($t, randCandy());
  return $t;
}

function setCandyToTile($t, candyObj) {
  $t.data("candy", candyObj.name);
  $t.css(
    "background-image",
    `linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02)), radial-gradient(circle at 30% 20%, rgba(255,255,255,0.12), transparent 30%), linear-gradient(0deg, ${darken(
      candyObj.color,
      0.05
    )}, ${candyObj.color})`
  );
  $t.removeClass("blank stripe-vertical stripe-horizontal wrapped color-bomb");
  const special = $t.data("special");
  if (special === "stripeV") $t.addClass("stripe-vertical");
  if (special === "stripeH") $t.addClass("stripe-horizontal");
  if (special === "wrapped") $t.addClass("wrapped");
  if (special === "bomb") $t.addClass("color-bomb");
}

function darken(hex, amt) {
  const c = hex.replace("#", "");
  const num = parseInt(c, 16);
  let r = (num >> 16) - Math.round(255 * amt);
  let g = ((num >> 8) & 0x00ff) - Math.round(255 * amt);
  let b = (num & 0x0000ff) - Math.round(255 * amt);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

function initBoard() {
  $("#board").empty();
  board = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const $tile = createTile(r, c);
      $("#board").append($tile);
      row.push($tile);
    }
    board.push(row);
  }
}

function tileAt(r, c) {
  if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return null;
  return board[r][c];
}

function swapTiles($a, $b, animate = true) {
  const r1 = parseInt($a.attr("data-r")),
    c1 = parseInt($a.attr("data-c"));
  const r2 = parseInt($b.attr("data-r")),
    c2 = parseInt($b.attr("data-c"));

  const tmpCandy = $a.data("candy"),
    tmpSpec = $a.data("special");
  $a.data("candy", $b.data("candy"));
  $a.data("special", $b.data("special"));
  $b.data("candy", tmpCandy);
  $b.data("special", tmpSpec);
  setCandyToTile(
    $a,
    CANDIES.find((x) => x.name === $a.data("candy"))
  );
  setCandyToTile(
    $b,
    CANDIES.find((x) => x.name === $b.data("candy"))
  );
}

function findMatches() {
  const crushMap = {};
  const specials = [];

  for (let r = 0; r < ROWS; r++) {
    let start = 0;
    for (let c = 1; c <= COLS; c++) {
      const prev = tileAt(r, c - 1);
      const cur = tileAt(r, c);
      const same = cur && prev && prev.data("candy") === cur.data("candy");
      if (!same) {
        const len = c - start;
        if (len >= 3) {
          for (let k = start; k < c; k++) {
            crushMap[`${r}-${k}`] = true;
          }
          if (len === 4) {
            specials.push({ type: "stripeH", r, c: start });
          }
          if (len >= 5) {
            specials.push({ type: "bomb", r, c: start });
          }
        }
        start = c;
      }
    }
  }

  for (let c = 0; c < COLS; c++) {
    let start = 0;
    for (let r = 1; r <= ROWS; r++) {
      const prev = tileAt(r - 1, c);
      const cur = tileAt(r, c);
      const same = cur && prev && prev.data("candy") === cur.data("candy");
      if (!same) {
        const len = r - start;
        if (len >= 3) {
          for (let k = start; k < r; k++) {
            crushMap[`${k}-${c}`] = true;
          }
          if (len === 4) {
            specials.push({ type: "stripeV", r: start, c });
          }
          if (len >= 5) {
            specials.push({ type: "bomb", r: start, c });
          }
        }
        start = r;
      }
    }
  }

  return { crushMap, specials };
}

function applyCrush(crushMap, specials) {
  const keys = Object.keys(crushMap);
  if (keys.length === 0) return 0;

  let bombTriggered = [];
  keys.forEach((k) => {
    const [r, c] = k.split("-").map(Number);
    const $t = tileAt(r, c);
    if ($t.data("special") === "bomb") bombTriggered.push({ r, c });
  });

  if (bombTriggered.length) {
    const pick = randCandy().name;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (tileAt(r, c).data("candy") === pick) {
          crushMap[`${r}-${c}`] = true;
        }
      }
  }

  specials.forEach((s) => {
    if (s.type === "bomb") {
      const r = s.r,
        c = s.c;
      tileAt(r, c).data("special", "bomb");
      setCandyToTile(
        tileAt(r, c),
        CANDIES.find((x) => x.name === tileAt(r, c).data("candy"))
      );
      delete crushMap[`${r}-${c}`];
    }
    if (s.type === "stripeH") {
      const r = s.r,
        c = s.c;
      tileAt(r, c).data("special", "stripeH");
      setCandyToTile(
        tileAt(r, c),
        CANDIES.find((x) => x.name === tileAt(r, c).data("candy"))
      );
      delete crushMap[`${r}-${c}`];
    }
    if (s.type === "stripeV") {
      const r = s.r,
        c = s.c;
      tileAt(r, c).data("special", "stripeV");
      setCandyToTile(
        tileAt(r, c),
        CANDIES.find((x) => x.name === tileAt(r, c).data("candy"))
      );
      delete crushMap[`${r}-${c}`];
    }
  });

  const removed = [];
  Object.keys(crushMap).forEach((k) => {
    const [r, c] = k.split("-").map(Number);
    const $t = tileAt(r, c);
    createParticles($t);
    $t.data("candy", null);
    $t.data("special", null);
    $t.addClass("blank");
    removed.push({ r, c });
  });

  removed.forEach((cell) => {
    const $t = tileAt(cell.r, cell.c);
    if (!$t) return;
    const special = $t.data("special");
    if (special === "stripeH") {
      for (let cc = 0; cc < COLS; cc++) {
        const key = `${cell.r}-${cc}`;
        if (!crushMap[key]) {
          crushMap[key] = true;
          tileAt(cell.r, cc).data("candy", null);
          tileAt(cell.r, cc).addClass("blank");
        }
      }
    }
    if (special === "stripeV") {
      for (let rr = 0; rr < ROWS; rr++) {
        const key = `${rr}-${cell.c}`;
        if (!crushMap[key]) {
          crushMap[key] = true;
          tileAt(rr, cell.c).data("candy", null);
          tileAt(rr, cell.c).addClass("blank");
        }
      }
    }
    if (special === "wrapped") {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = cell.r + dr,
            cc = cell.c + dc;
          if (rr < 0 || cc < 0 || rr >= ROWS || cc >= COLS) continue;
          const key = `${rr}-${cc}`;
          if (!crushMap[key]) {
            crushMap[key] = true;
            tileAt(rr, cc).data("candy", null);
            tileAt(rr, cc).addClass("blank");
          }
        }
    }
  });

  const base = 30;
  const removedCount = Object.keys(crushMap).length;
  const gained = removedCount * base * Math.max(1, combo);
  score += gained;
  updateHUD();

  return removedCount;
}

function updateHUD() {
  $("#score").text(score);
  if (combo > 1) {
    $("#combo")
      .text(`Combo x${combo}`)
      .show()
      .css({ opacity: 1 })
      .stop(true)
      .animate({ opacity: 0 }, 800, function () {
        $(this).hide().css({ opacity: 1 });
      });
  }
}

function collapseAndRefill() {
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      const $t = tileAt(r, c);
      if ($t.data("candy")) {
        if (write !== r) {
          tileAt(write, c).data("candy", $t.data("candy"));
          tileAt(write, c).data("special", $t.data("special"));
          setCandyToTile(
            tileAt(write, c),
            CANDIES.find((x) => x.name === tileAt(write, c).data("candy"))
          );
          tileAt(write, c).removeClass("blank");
          $t.data("candy", null);
          $t.data("special", null);
          $t.addClass("blank");
        }
        write--;
      }
    }
    for (let r = write; r >= 0; r--) {
      tileAt(r, c).data("candy", randCandy().name);
      tileAt(r, c).data("special", null);
      setCandyToTile(
        tileAt(r, c),
        CANDIES.find((x) => x.name === tileAt(r, c).data("candy"))
      );
      tileAt(r, c).removeClass("blank");
    }
  }
}

function createParticles($t) {
  const parent = $("#board");
  const offset = $t.position();
  for (let i = 0; i < 12; i++) {
    const p = $("<div>").addClass("particle");
    p.css({
      left: offset.left + TILE_SIZE / 2 + (Math.random() * 40 - 20),
      top: offset.top + TILE_SIZE / 2 + (Math.random() * 40 - 20),
      background: CANDIES[Math.floor(Math.random() * CANDIES.length)].color,
    });
    parent.append(p);
    p.animate(
      {
        left: offset.left + (Math.random() * 200 - 100),
        top: offset.top + (Math.random() * 200 - 100),
        opacity: 0,
        width: 2,
        height: 2,
      },
      600,
      function () {
        p.remove();
      }
    );
  }
}

async function resolveBoard() {
  if (isProcessing) return;
  isProcessing = true;
  combo = 0;
  while (true) {
    const { crushMap, specials } = findMatches();
    const removed = Object.keys(crushMap).length;
    if (removed === 0) break;
    combo++;
    updateHUD();
    applyCrush(crushMap, specials);
    await sleep(220);
    collapseAndRefill();
    await sleep(150);
  }
  combo = 0;
  updateHUD();
  isProcessing = false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let dragStartTile = null;

function attachInteraction() {
  $("#board").on("mousedown touchstart", ".tile", function (e) {
    if (isProcessing) return;
    e.preventDefault();
    dragStartTile = $(this);
  });

  $("#board").on("mouseup touchend", ".tile", function (e) {
    if (isProcessing) return;
    if (!dragStartTile) return;
    const end = getEventLocation(e);
    const $endEl = elemAtPoint(end.x, end.y);
    if ($endEl && $endEl.hasClass("tile")) {
      trySwap(dragStartTile, $endEl);
    }
    dragStartTile = null;
  });

  let touchOrigin = null;
  $("#board").on("touchstart", ".tile", function (e) {
    if (isProcessing) return;
    touchOrigin = getEventLocation(e);
    $(this).addClass("active");
  });
  $("#board").on("touchend", ".tile", function (e) {
    if (isProcessing || !touchOrigin) return;
    const end = getEventLocation(e);
    const dx = end.x - touchOrigin.x,
      dy = end.y - touchOrigin.y;
    if (Math.abs(dx) + Math.abs(dy) > 30) {
      const $start = $(this);
      let dir = null;
      if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
      else dir = dy > 0 ? "down" : "up";
      let r = parseInt($start.attr("data-r")),
        c = parseInt($start.attr("data-c"));
      let r2 = r,
        c2 = c;
      if (dir === "left") c2 = c - 1;
      if (dir === "right") c2 = c + 1;
      if (dir === "up") r2 = r - 1;
      if (dir === "down") r2 = r + 1;
      const $target = tileAt(r2, c2);
      if ($target) trySwap($start, $target);
    }
    touchOrigin = null;
    $(this).removeClass("active");
  });
}

function getEventLocation(e) {
  const ev =
    (e.originalEvent &&
      e.originalEvent.touches &&
      e.originalEvent.touches[0]) ||
    (e.originalEvent &&
      e.originalEvent.changedTouches &&
      e.originalEvent.changedTouches[0]) ||
    e;
  return { x: ev.clientX, y: ev.clientY };
}

function elemAtPoint(x, y) {
  const boardOff = $("#board").offset();
  const localX = x - boardOff.left,
    localY = y - boardOff.top;
  const c = Math.floor(localX / (TILE_SIZE + 6));
  const r = Math.floor(localY / (TILE_SIZE + 6));
  if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return null;
  return tileAt(r, c);
}

async function trySwap($a, $b) {
  if ($a.is($b)) return;
  const r1 = parseInt($a.attr("data-r")),
    c1 = parseInt($a.attr("data-c"));
  const r2 = parseInt($b.attr("data-r")),
    c2 = parseInt($b.attr("data-c"));
  const adj =
    (r1 === r2 && Math.abs(c1 - c2) === 1) ||
    (c1 === c2 && Math.abs(r1 - r2) === 1);
  if (!adj) return;
  swapTiles($a, $b);
  const m = findMatches();
  if (Object.keys(m.crushMap).length === 0) {
    await sleep(120);
    swapTiles($a, $b);
    return;
  }
  await resolveBoard();
}

function findHint() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const $t = tileAt(r, c);
      const dirs = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ];
      for (const d of dirs) {
        const nr = r + d[0],
          nc = c + d[1];
        if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS) continue;
        swapTiles($t, tileAt(nr, nc));
        const m = findMatches();
        swapTiles($t, tileAt(nr, nc));
        if (Object.keys(m.crushMap).length > 0) return { r, c, nr, nc };
      }
    }
  return null;
}

$(function () {
  initBoard();
  attachInteraction();
  resolveBoard();

  $("#btnRestart").on("click", function () {
    score = 0;
    updateHUD();
    initBoard();
    resolveBoard();
  });
  $("#btnHint").on("click", function () {
    const h = findHint();
    if (!h) {
      alert("No moves! Restarting.");
      $("#btnRestart").click();
      return;
    }
    const $a = tileAt(h.r, h.c);
    const $b = tileAt(h.nr, h.nc);
    $a.animate({ transform: "scale(1.05)" }, 200);
    $b.animate({ transform: "scale(1.05)" }, 200);
    setTimeout(() => {
      $a.stop(true, true);
      $b.stop(true, true);
    }, 400);
  });
});
