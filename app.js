const sheetId = "1r8BtslMkYsPrT3gRfWNOGKM8-QjrsfuN8ts8N5JqZXQ";
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName1 = "Matches";
const sheetName2 = "Players";
const query = encodeURIComponent("Select *");
const url1 = `${base}&sheet=${sheetName1}&tq=${query}`;
const url2 = `${base}&sheet=${sheetName2}&tq=${query}`;

const PARAMS = {
  "Foosball": {
    "INIT_RATING": 1000.0,
    "BASE": 10.0,
    "DIVISOR": 400.0,
    "K": 100.0
  },
  "Pong": {
    "INIT_RATING": 1000.0,
    "BASE": 10.0,
    "DIVISOR": 400.0,
    "K": 100.0
  },
  "Mario Kart": {
    "INIT_RATING": 1000.0,
    "BASE": 10.0,
    "DIVISOR": 400.0,
    "K": 100.0
  }
}

const SHORTS = new Map([["Foosball", "foos"], ["Pong", "pong"], ["Mario Kart", "kart"]]);

let gameData;
let playerNameData;

let playerRatings;
let playerNames;

async function init() {
  await fetch(url1).then(res => res.text()).then(rep => {
    gameData = JSON.parse(rep.substring(47).slice(0,-2)).table.rows;
  });

  await fetch(url2).then(res => res.text()).then(rep => {
    playerNameData = JSON.parse(rep.substring(47).slice(0,-2)).table.rows;
  });

  playerNames = new Map();
  for (let i = 0; i < playerNameData.length; i ++) {
    let id = Number(playerNameData[i].c[0].v);
    let name = playerNameData[i].c[1].v;
    playerNames.set(id, name);
  }

  calculateRatings();
}
window.addEventListener("DOMContentLoaded", init);

function getPlayerRating(game, id) {
  if (playerRatings[game].has(id)) {
    return playerRatings[game].get(id);
  }
  playerRatings[game].set(id, PARAMS[game].INIT_RATING);
  return PARAMS[game].INIT_RATING;
}

function setPlayerRating(game, id, rating) {
  playerRatings[game].set(id, rating);
}

function calculateRatings() {
  playerRatings = {
    "Foosball": new Map(),
    "Pong": new Map(),
    "Mario Kart": new Map()
  };

  for (let r = 0; r < gameData.length; r ++) {
    // get game
    let game = gameData[r].c[1].v;

    // get player ids
    let ids = [];
    ids[0] = Number(gameData[r].c[2].v);
    ids[1] = Number(gameData[r].c[3].v);
    ids[2] = gameData[r].c[4] != null ? Number(gameData[r].c[4].v) : 0;
    ids[3] = gameData[r].c[5] != null ? Number(gameData[r].c[5].v) : 0;

    // get player ratings (or set to 1000 if new)
    let Rs = []; // prior ratings
    let playerCount = 0;
    for (let i = 0; i < 4; i ++) {
      if (ids[i] != 0) {
        Rs[i] = getPlayerRating(game, ids[i]);
        playerCount ++;
      }
      else {
        Rs[i] = Rs[i-2];
      }
    }

    if (game == "Mario Kart") {
      let Qs = []; // q values
      for (let i = 0; i < playerCount; i ++) {
        Qs[i] = Math.pow(PARAMS[game].BASE, Rs[i] / PARAMS[game].DIVISOR);
      }

      let Es = [new Array(playerCount), new Array(playerCount), new Array(playerCount), new Array(playerCount)]; // estimated scores
      for (let i = 0; i < playerCount; i ++) {
        for (let j = 0; j < playerCount; j ++) {
          Es[i][j] = Qs[i] / (Qs[i] + Qs[j]); // player i playing against player j
        }
      }

      let Ss = [Number(gameData[r].c[7].v), Number(gameData[r].c[8].v), Number(gameData[r].c[9].v), Number(gameData[r].c[10].v)]; // actual scores

      for (let i = 0; i < playerCount; i ++) {
        let mult = 0;
        for (let j = 0; j < playerCount; j ++) {
          if (i == j) { continue; }
          let wld = Ss[i] > Ss[j] ? 1 : Ss[i] < Ss[j] ? 0 : 0.5; // win-lose-draw
          mult += wld - Es[i][j];
        }
        setPlayerRating(game, ids[i], Rs[i] + PARAMS[game].K / (playerCount - 1) * mult);
      }
    }
    else { // foos & pong
      let Rt = [Math.max(Rs[0], Rs[2]), Math.max(Rs[1], Rs[3])]; // ratings for team 1 and 2
      let Qs = [Math.pow(PARAMS[game].BASE, Rt[0] / PARAMS[game].DIVISOR), Math.pow(PARAMS[game].BASE, Rt[1] / PARAMS[game].DIVISOR)];
      let Es = [Qs[0] / (Qs[0] + Qs[1]), Qs[1] / (Qs[0] + Qs[1])]; // estimated scores for team 1 and 2
      let Ss = [gameData[r].c[6].v == "P1 and P3" ? 1 : 0, gameData[r].c[6].v == "P2 and P4" ? 1 : 0]; // actual scores for team 1 and 2

      for (let i = 0; i < 4; i ++) {
        if (ids[i] == 0) { continue; }
        setPlayerRating(game, ids[i], Rs[i] + PARAMS[game].K * (Ss[i % 2] - Es[i % 2]));
      }
    }
  }

  refreshLeaderboard();
}

function refreshLeaderboard() {
  for (let i = 0; i < Array.from(SHORTS.keys()).length; i ++) {
    let rankedMap = new Map(Array.from(playerRatings[Array.from(SHORTS.keys())[i]]).sort((b, a) => a[1] - b[1]));
    document.getElementById(Array.from(SHORTS.values())[i] + "-board").innerHTML = makeBoardHTML(Array.from(rankedMap.values()), Array.from(rankedMap.keys()));
  }

  // let cards = document.querySelectorAll(".player-card");
  // cards.forEach((el) => observer.observe(el));
}

function makeBoardHTML(values, keys) {
  let html = "";

  for (let i = 0; i < keys.length; i ++) {
    let playerName = playerNames.get(keys[i]) ? playerNames.get(keys[i]) : "Anonymous";

    let delay = i * 0; // ms

    let tieCount = 0;
    while (i > 0 && Math.round(values[i]) == Math.round(values[i - 1])) {
      i --;
      tieCount ++;
    }

    html += "<div class='player-card' style='transition-delay: " + delay + "ms;'><div class='player-ranking";

    html += i == 0 ? " first" : i == 1 ? " second" : i == 2 ? " third" : "";
    
    html += "'>" + (i + 1) + "</div><div class=player-name>" + playerName + "</div><div class=player-rating>" + Math.round(values[i]) + "</div></div>";

    i += tieCount;
  }

  return html;
}

function changeBoard(id) {
  document.querySelectorAll(".board-container").forEach(el => {
    el.style.display = "none";
  });
  document.querySelectorAll(".button").forEach(el => {
    el.classList.remove("selected");
  });
  document.getElementById(SHORTS.get(id) + "-board").style.display = "";
  document.getElementById(SHORTS.get(id) + "-button").classList.add("selected");
}
document.querySelectorAll(".button").forEach(el => {
  el.addEventListener("click", event => {changeBoard(el.value);});
});

function filterSearch() {
  let cards = document.querySelectorAll(".player-card");
  let input = document.getElementById("search").value.toUpperCase();
  for (let i = 0; i < cards.length; i ++) {
    let name = cards[i].getElementsByClassName("player-name")[0].innerHTML;
    if (name.toUpperCase().indexOf(input) > -1) {
      cards[i].style.display = "";
    }
    else {
      cards[i].style.display = "none";
    }
  }
}
document.getElementById("search").addEventListener("keyup", filterSearch);

// const observer = new IntersectionObserver((entries) => {
//   entries.forEach((entry) => {
//     if (entry.isIntersecting) {
//       entry.target.classList.add("show");
//     }
//     else {
//       entry.target.classList.remove("show");
//     }
//   });
// });