const sheetId = "1r8BtslMkYsPrT3gRfWNOGKM8-QjrsfuN8ts8N5JqZXQ";
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName1 = "Matches";
const sheetName2 = "Players";
const query = encodeURIComponent("Select *");
const url1 = `${base}&sheet=${sheetName1}&tq=${query}`;
const url2 = `${base}&sheet=${sheetName2}&tq=${query}`;

let gameData;
let playerNameData;

let playerFoosRatings;
let playerPongRatings;

let playerNames = new Map();

async function init() {
  await fetch(url1).then(res => res.text()).then(rep => {
    // console.log(rep.substring(47).slice(0,-2));
    gameData = JSON.parse(rep.substring(47).slice(0,-2)).table.rows;
    console.log(gameData);
  });

  await fetch(url2).then(res => res.text()).then(rep => {
    playerNameData = JSON.parse(rep.substring(47).slice(0,-2)).table.rows;
    console.log(playerNameData);
  });

  for (let i = 0; i < playerNameData.length; i ++) {
    let id = Number(playerNameData[i].c[0].v);
    let name = playerNameData[i].c[1].v;
    playerNames.set(id, name);
  }

  calculateRatings();
}
window.addEventListener("load", await init);
document.getElementById("refresh-scores").addEventListener("click", init);

function getPlayerRating(game, id) {
  if (game == "Foosball") {
    if (playerFoosRatings.has(id)) {
      return playerFoosRatings.get(id);
    }
    else
    {
      playerFoosRatings.set(id, 1000);
      return 1000;
    }
  }
  else if (game == "Pong") {
    if (playerPongRatings.has(id)) {
      return playerPongRatings.get(id);
    }
    else
    {
      playerPongRatings.set(id, 1000);
      return 1000;
    }
  }
}

function setPlayerRating(game, id, rating) {
  if (game == "Foosball") {
    playerFoosRatings.set(id, rating);
  }
  else if (game == "Pong") {
    playerPongRatings.set(id, rating);
  }
}

function calculateRatings() {
  playerFoosRatings = new Map();
  playerPongRatings = new Map();

  for (let i = 0; i < gameData.length; i ++) {
    // get game
    let game = gameData[i].c[1].v;

    // get player ids
    let w1id = Number(gameData[i].c[3].v);
    let w2id = gameData[i].c[4] != null ? Number(gameData[i].c[4].v) : 0;
    let l1id = Number(gameData[i].c[5].v);
    let l2id = gameData[i].c[6] != null ? Number(gameData[i].c[6].v) : 0;

    // get player ratings (or set to 1000 if new)
    let w1r = getPlayerRating(game, w1id);
    let w2r = w1r;
    if (w2id != 0) {
      w2r = getPlayerRating(game, w2id);
    }

    let rw = Math.max(w1r, w2r);

    let l1r = getPlayerRating(game, l1id);
    let l2r = l1r;
    if (l2id != 0) {
      l2r = getPlayerRating(game, l2id);
    }

    let rl = Math.max(l1r, l2r);

    // calc estimated scores and deltas
    let qw = Math.pow(10, rw / 400.0);
    let ql = Math.pow(10, rl / 400.0);

    let ew = qw / (qw + ql);
    let el = ql / (qw + ql);

    let dw = 100 * (1 - ew);
    let dl = 100 * -el;

    // update ratings
    setPlayerRating(game, w1id, w1r + dw);
    if (w2id != 0) {
      setPlayerRating(game, w2id, w2r + dw)
    }

    setPlayerRating(game, l1id, l1r + dl);
    if (l2id != 0) {
      setPlayerRating(game, l2id, l2r + dl);
    }
  }
    
  // console.log(playerRatings);

  refreshLeaderboard();
}

function refreshLeaderboard() {
  let rankedFoosMap = new Map(Array.from(playerFoosRatings).sort((b, a) => a[1] - b[1]));
  let rankedPongMap = new Map(Array.from(playerPongRatings).sort((b, a) => a[1] - b[1]));

  // console.log(rankedFoosMap);

  let htmlFoos = "";
  let htmlPong = "";

  let rank = 1;
  rankedFoosMap.forEach((value, key) => {
    htmlFoos += "<div class=player-card><p class='player-ranking";
    
    switch (rank) {
      case 1:
        htmlFoos += ' first';
        break;
      case 2:
        htmlFoos += ' second';
        break;
      case 3:
        htmlFoos += ' third';
        break;
      default:
        break;
    }
    
    htmlFoos += "'>" + rank + "</p><p class=player-name>" + playerNames.get(key) + "</p><p class=player-rating>" + Math.round(value) + "</p></div>";
    rank ++;
  });

  rank = 1;
  rankedPongMap.forEach((value, key) => {
    htmlPong += "<div class=player-card><p class='player-ranking";
    
    switch (rank) {
      case 1:
        htmlPong += ' first';
        break;
      case 2:
        htmlPong += ' second';
        break;
      case 3:
        htmlPong += ' third';
        break;
      default:
        break;
    }
    
    htmlPong += "'>" + rank + "</p><p class=player-name>" + playerNames.get(key) + "</p><p class=player-rating>" + Math.round(value) + "</p></div>";
    rank ++;
  });

  document.getElementById("foos-board").innerHTML = htmlFoos;
  document.getElementById("pong-board").innerHTML = htmlPong;
}