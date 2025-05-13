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
    gameData = JSON.parse(rep.substring(47).slice(0,-2)).table.rows;
  });

  await fetch(url2).then(res => res.text()).then(rep => {
    playerNameData = JSON.parse(rep.substring(47).slice(0,-2)).table.rows;
  });

  for (let i = 0; i < playerNameData.length; i ++) {
    let id = Number(playerNameData[i].c[0].v);
    let name = playerNameData[i].c[1].v;
    playerNames.set(id, name);
  }

  calculateRatings();
}
window.addEventListener("DOMContentLoaded", init);

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

  document.getElementById("foos-board").innerHTML = makeBoardHTML(Array.from(rankedFoosMap.values()), Array.from(rankedFoosMap.keys()));
  document.getElementById("pong-board").innerHTML = makeBoardHTML(Array.from(rankedPongMap.values()), Array.from(rankedPongMap.keys()));
  // document.getElementById("kart-board").innerHTML = makeBoardHTML(Array.from(rankedKartMap.values()), Array.from(rankedKartMap.keys()));
}

function makeBoardHTML(values, keys) {
  let html = "";

  for (let i = 0; i < keys.length; i ++) {
    let playerName = playerNames.get(keys[i]) ? playerNames.get(keys[i]) : "Anonymous";

    html += "<div class='player-card' id='player-" + keys[i] + "'><div class='player-ranking";
    
    switch (i) {
      case 0:
        html += ' first';
        break;
      case 1:
        html += ' second';
        break;
      case 2:
        html += ' third';
        break;
      default:
        break;
    }
    
    html += "'>" + (i + 1) + "</div><div class=player-name>" + playerName + "</div><div class=player-rating>" + Math.round(values[i]) + "</div></div>";
  }

  return html;
}

function changeBoard(id) {
  document.querySelectorAll(".leaderboard").forEach(el => {
    el.style.display = "none";
  });
  document.querySelectorAll(".button").forEach(el => {
    el.setAttribute("class", "button");
  });
  switch(id) {
    case "Foosball":
      document.getElementById("foos-board").style.display = "";
      document.getElementById("foos-button").setAttribute("class", "button selected");
      break;
    case "Pong":
      document.getElementById("pong-board").style.display = "";
      document.getElementById("pong-button").setAttribute("class", "button selected");
      break;
    case "Mario Kart":
      document.getElementById("kart-board").style.display = "";
      document.getElementById("kart-button").setAttribute("class", "button selected");
      break;
  }
}
document.querySelectorAll(".button").forEach(el => {
  el.addEventListener("click", event => {changeBoard(el.value);});
});

function filterSearch() {
  let input = document.getElementById("search").value.toUpperCase();
  let cards = document.getElementsByClassName("player-card");
  for (let i = 0; i < cards.length; i ++) {
    let id = cards[i].getAttribute("id").substring(7);
    let name = cards[i].getElementsByClassName("player-name")[0].innerHTML;
    if (name.toUpperCase().indexOf(input) > -1 || id.indexOf(input) > -1) {
      cards[i].style.display = "";
    }
    else {
      cards[i].style.display = "none";
    }
  }
}
document.getElementById("search").addEventListener("keyup", filterSearch);