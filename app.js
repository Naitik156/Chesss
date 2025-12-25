const game = new Chess();
const boardEl = document.getElementById("board");
const canvas = document.getElementById("drawLayer");
const ctx = canvas.getContext("2d");

const SIZE = 480;
canvas.width = canvas.height = SIZE;

let setupMode = false;
let selected = null;
let arrows = [];
let highlights = [];

let courses = JSON.parse(localStorage.getItem("courses")) || {};
let activeCourse = null;
let activeChapter = null;
let activePosition = null;

// ---------------- BOARD ----------------

function renderBoard() {
  boardEl.innerHTML = "";
  const board = game.board().slice().reverse();

  board.forEach((rank, r) => {
    rank.forEach((p, f) => {
      const sq = document.createElement("div");
      sq.className = `square ${(r+f)%2===0?"light":"dark"}`;

      const square =
        "abcdefgh"[f] + (r+1);

      if (p) {
        const img = document.createElement("img");
        img.src = `assets/${p.color}${p.type}.svg`;
        sq.appendChild(img);
      }

      if (highlights.includes(square)) {
        sq.style.boxShadow =
          "inset 0 0 0 4px rgba(255,255,0,.6)";
      }

      sq.onclick = e => onSquare(square, e);
      boardEl.appendChild(sq);
    });
  });

  drawArrows();
  saveState();
}

// ---------------- INTERACTION ----------------

function onSquare(square, e) {
  if (setupMode) {
    game.remove(square);
    renderBoard();
    return;
  }

  if (e.shiftKey) {
    toggleHighlight(square);
    return;
  }

  if (!selected) {
    selected = square;
    return;
  }

  game.move({ from: selected, to: square, promotion: "q" });
  selected = null;
  renderBoard();
}

// ---------------- HIGHLIGHTS ----------------

function toggleHighlight(sq) {
  highlights.includes(sq)
    ? highlights = highlights.filter(x => x !== sq)
    : highlights.push(sq);
  renderBoard();
}

// ---------------- ARROWS ----------------

let arrowStart = null;
boardEl.oncontextmenu = e => e.preventDefault();

boardEl.onmousedown = e => {
  if (e.button === 2)
    arrowStart = getSquare(e);
};

boardEl.onmouseup = e => {
  if (e.button === 2 && arrowStart) {
    arrows.push({ from: arrowStart, to: getSquare(e) });
    arrowStart = null;
    renderBoard();
  }
};

function drawArrows() {
  ctx.clearRect(0,0,SIZE,SIZE);
  arrows.forEach(a => {
    const p1 = center(a.from);
    const p2 = center(a.to);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(p1.x,p1.y);
    ctx.lineTo(p2.x,p2.y);
    ctx.stroke();
  });
}

// ---------------- COURSE SYSTEM ----------------

function createCourse() {
  const name = courseName.value;
  if (!name) return;
  courses[name] = { chapters: [] };
  activeCourse = name;
  saveCourses();
  renderTree();
}

function addChapter() {
  if (!activeCourse) return;
  courses[activeCourse].chapters.push({
    title: chapterName.value,
    positions: []
  });
  saveCourses();
  renderTree();
}

function savePosition() {
  if (activeCourse === null) return;
  const chapter =
    courses[activeCourse].chapters.at(-1);
  chapter.positions.push({
    fen: game.fen(),
    explanation: explanation.value,
    arrows,
    highlights
  });
  arrows = [];
  highlights = [];
  saveCourses();
  renderTree();
}

// ---------------- TREE ----------------

function renderTree() {
  const tree = document.getElementById("courseTree");
  tree.innerHTML = "";

  for (const cname in courses) {
    const c = document.createElement("div");
    c.className = "course";
    c.textContent = "📘 " + cname;
    tree.appendChild(c);

    courses[cname].chapters.forEach((ch, ci) => {
      const chDiv = document.createElement("div");
      chDiv.className = "chapter";
      chDiv.textContent = "📂 " + ch.title;
      tree.appendChild(chDiv);

      ch.positions.forEach((p, pi) => {
        const pos = document.createElement("div");
        pos.className = "position";
        pos.textContent = "♟ Position " + (pi+1);
        pos.onclick = () => loadPosition(cname,ci,pi);
        tree.appendChild(pos);
      });
    });
  }
}

function loadPosition(c,ci,pi) {
  const pos =
    courses[c].chapters[ci].positions[pi];

  game.load(pos.fen);
  arrows = pos.arrows || [];
  highlights = pos.highlights || [];
  explanation.value = pos.explanation || "";

  activeCourse = c;
  activeChapter = ci;
  activePosition = pi;

  saveState();
  renderBoard();
}

// ---------------- STORAGE ----------------

function saveCourses() {
  localStorage.setItem("courses", JSON.stringify(courses));
}

function saveState() {
  localStorage.setItem("state", JSON.stringify({
    fen: game.fen(),
    arrows, highlights,
    activeCourse, activeChapter, activePosition
  }));
}

function restoreState() {
  const s = JSON.parse(localStorage.getItem("state"));
  if (!s) return;
  game.load(s.fen);
  arrows = s.arrows || [];
  highlights = s.highlights || [];
  if (s.activeCourse)
    loadPosition(
      s.activeCourse,
      s.activeChapter,
      s.activePosition
    );
}

// ---------------- TOOLS ----------------

function toggleSetup() {
  setupMode = !setupMode;
}

function clearBoard() {
  game.clear();
  renderBoard();
}

function resetBoard() {
  game.reset();
  renderBoard();
}

// ---------------- UTILS ----------------

function getSquare(e) {
  const r = boardEl.getBoundingClientRect();
  const x = Math.floor((e.clientX-r.left)/(SIZE/8));
  const y = 7-Math.floor((e.clientY-r.top)/(SIZE/8));
  return "abcdefgh"[x]+(y+1);
}

function center(sq) {
  const f = "abcdefgh".indexOf(sq[0]);
  const r = sq[1]-1;
  return {
    x: f*(SIZE/8)+(SIZE/16),
    y: (7-r)*(SIZE/8)+(SIZE/16)
  };
}

// ---------------- INIT ----------------

restoreState();
renderBoard();
renderTree();
