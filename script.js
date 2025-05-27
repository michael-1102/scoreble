import { WORDS } from "./words.js"

let correctWord = "ghost";
const BOARD_WIDTH = 15;
const BOARD_LENGTH = BOARD_WIDTH;
const NUM_TILES = BOARD_WIDTH * BOARD_LENGTH;
const WORD_LENGTH = 5;

const horizontalCorrect = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow"
        >
          <rect x="27.5" y="17" width="6" height="6" fill="lime"/>
          <path d="M 28.5 18 v 4 l 4 -2 z" fill="transparent" stroke-width="0.2" stroke="black"></path>
        </svg>`;
const verticalCorrect = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow"
        >
          <rect x="17" y="27.5" width="6" height="6" fill="lime"/>
          <path d="M 18 28.5 h 4 l -2 4 z" fill="transparent" stroke-width="0.2" stroke="black"></path>
        </svg>`;

const horizontalWrongSpot = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow"
        >
          <rect x="27.5" y="17" width="6" height="6" fill="yellow"/>
          <path d="M 28.5 18 v 4 l 4 -2 z" fill="transparent" stroke-width="0.2" stroke="black"></path>
        </svg>`;
const verticalWrongSpot = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow"
        >
          <rect x="17" y="27.5" width="6" height="6" fill="yellow"/>
          <path d="M 18 28.5 h 4 l -2 4 z" fill="transparent" stroke-width="0.2" stroke="black"></path>
        </svg>`;

const keyboard = document.getElementById("keyboard");
const board = document.getElementById("board");
const filledTiles = [];
const selectedTiles = [];
const debug = document.getElementById("debug");

let guessing;
let nextGuessIsVertical = false;

initBoard();

function print(str) {
  debug.innerHTML = str;
}

function initBoard() {
  for (let i = 0; i < BOARD_WIDTH; i++) {
    for (let j = 0; j < BOARD_LENGTH; j++) {
      let tile = document.createElement("button");
      tile.className = "tile";
      tile.tabIndex = "-1";
      board.appendChild(tile);
    }
  }
  let center = Math.floor(NUM_TILES / 2);
  let halfWordLength = Math.floor(WORD_LENGTH / 2);
  for (let i = center - halfWordLength; i <= center + halfWordLength; i++)
    board.children[i].dataset.active = 'true';
  

  //correctWord = WORDS[Math.floor(Math.random() * WORDS.length)];

  enableGuessing();
  startListening();
}

function startListening() {
  document.addEventListener("click", handleMouse);
  document.addEventListener("keydown", handleKey);
}


function stopListening() {
  document.removeEventListener("click", handleMouse);
  document.removeEventListener("keydown", handleKey);
  board.removeEventListener("mouseover", selectTiles);
  board.removeEventListener("mouseout", deselectTiles);
}

function handleKey(e) {
  if (e.key.match(/^[a-z]$/i)) {
    pressKey(e.key);
  } else if (e.key === "Enter") {
    submitGuess();
  } else if (e.key === "Backspace" || e.key === "Delete") {
    deleteKey();
  } else if (e.key === "Shift") {
    if (!guessing) {
      nextGuessIsVertical = !nextGuessIsVertical;
      if (selectTiles.length > 0) {
        let temp = selectedTiles[0];
        deselectTiles();
        highlightTiles(temp);
      }
    }
  } else if (e.key === "Escape") {
    if (filledTiles.length == 0) {
      const guessTiles = board.querySelectorAll("[data-active='true']");
      guessTiles.forEach((tile) => {
        if (tile.dataset.letter == null)
          delete tile.dataset.active;
      });
    }
    disableGuessing();
  }
}

function handleMouse(e) {
  if (e.target.matches("[data-key]")) {
    pressKey(e.target.dataset.key);
  } else if (e.target.matches("[data-enter]")) {
    submitGuess();
  } else if (e.target.matches("[data-delete]")) {
    deleteKey();
  } else if (e.target.matches(".tile")) {
    pressTile(e.target);
  }
}

function pressTile(tile) {
  tile.blur();
  if (guessing) return;

  if (selectedTiles.length < WORD_LENGTH) {
    print("Guess must be exactly " + WORD_LENGTH + " letters");
    return;
  }

  let inc; 
  if (nextGuessIsVertical)
    inc = BOARD_WIDTH
  else
    inc = 1;

  // check if word is connected to but not equal to existing word
  let hasConnected = false;
  let hasDisconnected = false;
  selectedTiles.forEach((tile) => {
    if (tile.dataset.letter) {
      hasConnected = true;
    } else {
      hasDisconnected = true;
    }
  });

  if (!hasConnected) {
    print("Guess must be connected to existing word");
    return;
  }

  if (!hasDisconnected) {
    print("Guess must not entirely overlap existing word");
    return;
  }
  
  // check if there is a letter before word
  let firstIndex = getIndex(selectedTiles[0])
  if (firstIndex > 0) {
    if (board.children[firstIndex - inc].dataset.letter) {
      print("Guess must be exactly " + WORD_LENGTH + " letters");
      return;
    }
  }

  // check if there is a letter after word
  let lastIndex = getIndex(selectedTiles[WORD_LENGTH - 1])
  if (lastIndex < NUM_TILES - inc) {
    if (board.children[lastIndex + inc].dataset.letter) {
      print("Guess must be exactly " + WORD_LENGTH + " letters");
      return;
    }
  }  


  selectedTiles.forEach((tile) => {
    tile.dataset.active = 'true';
    tile.dataset.selected = 'false';
  });
  selectedTiles.length = 0;
  enableGuessing();
}

function getIndex(tile) {
  return [...board.children].indexOf(tile);
}

function disableGuessing() {
  guessing = false;
  board.addEventListener("mouseover", selectTiles);
  board.addEventListener("mouseout", deselectTiles);
}

function deselectTiles() {
  selectedTiles.forEach((tile) => {
    tile.dataset.selected = "false";
  });
  selectedTiles.length = 0;
}

function selectTiles(e) {
  let tile = e.target;
  if (tile.className != "tile") return;
  highlightTiles(tile);
}

function highlightTiles(tile) {
  let tileIndex = getIndex(tile);
  if (nextGuessIsVertical) {
    for (let i = tileIndex; i < tileIndex + WORD_LENGTH*BOARD_LENGTH; i+=BOARD_LENGTH) {
      if (i % BOARD_LENGTH < tileIndex % BOARD_LENGTH) break;
      board.children[i].dataset.selected = "true";
      selectedTiles.push(board.children[i]);
    }
  } else {
    for (let i = tileIndex; i < tileIndex + WORD_LENGTH; i++) {
      if (i % BOARD_LENGTH < tileIndex % BOARD_WIDTH) break;
      board.children[i].dataset.selected = "true";
      selectedTiles.push(board.children[i]);
    }
  }
}

function enableGuessing() {
  guessing = true;
  board.removeEventListener("mouseover", selectTiles);
  board.removeEventListener("mouseout", deselectTiles);

}

function pressKey(key) {
  const nextTile = board.querySelector(":not([data-letter])[data-active='true']");
  if (nextTile != null) {
    nextTile.dataset.letter = key.toLowerCase();
    nextTile.textContent = key;
    filledTiles.push(nextTile);
  }
}

function deleteKey() {
  if (filledTiles.length <= 0) return;
  filledTiles[filledTiles.length - 1].textContent = "";
  delete filledTiles[filledTiles.length - 1].dataset.letter;
  filledTiles.pop();
}

function submitGuess() {
  if (!guessing) return;
  const guessTiles = board.querySelectorAll("[data-letter][data-active='true']");
  if (guessTiles.length < WORD_LENGTH) {
    print("Not enough letters");
    return;
  }
  

  const guess = Array.from(guessTiles).reduce((word, tile) => {
    return word + tile.dataset.letter;
  }, "");


  if (!WORDS.includes(guess)) {
    print("Invalid word");
    return;
  }

  //TODO: check if connected words are invalid

  // guess submitted
  nextGuessIsVertical = !nextGuessIsVertical;
  disableGuessing();
  checkAccuracy(guessTiles, guess);
  guessTiles.forEach((tile) => {
    tile.dataset.active = "false";
  });
  filledTiles.length = 0;
}

function checkAccuracy(tiles, guess) {
  if (guess == correctWord) {
    print("You win!");
    stopListening();
    tiles.forEach((tile) => {
      const key = getKey(tile.dataset.letter);
      correctLetter(key, tile);
    });
    return;
  }
  const wrongSpotTiles = [];
  let answer = correctWord;
  tiles.forEach((tile, index) => {
    const key = getKey(tile.dataset.letter);
    if (!correctWord.includes(tile.dataset.letter)) { // gray
      wrongLetter(key, tile);
    } else if (correctWord[index] == tile.dataset.letter) { // green
      correctLetter(key, tile);
      answer = answer.substring(0,index) + '.' + answer.substring(index+1);
    } else { // yellow
      wrongSpotTiles.push(tile);
    }
  });

  wrongSpotTiles.forEach((tile) => { // yellows
    const key = getKey(tile.dataset.letter);
    let index = answer.indexOf(tile.dataset.letter);
    if (index >= 0) {
      wrongSpotLetter(key, tile);
      answer = answer.substring(0,index) + '.' + answer.substring(index+1);
    } else {
      wrongLetter(key, tile);
    }
  });
}

function getKey(char) {
  return keyboard.querySelector(`[data-key='${char.toUpperCase()}']`);
}

function wrongLetter(key, tile) {
  if (key.dataset.state != "correct" && key.dataset.state != "wrong-spot") key.dataset.state = "wrong";
}

function correctLetter(key, tile) {
  key.dataset.state = "correct";
  if (nextGuessIsVertical)
    tile.insertAdjacentHTML("beforeend", horizontalCorrect);
  else
    tile.insertAdjacentHTML("beforeend", verticalCorrect);
}

function wrongSpotLetter(key, tile) {
  if (key.dataset.state != "correct") key.dataset.state = "wrong-spot";
  if (nextGuessIsVertical)
    tile.insertAdjacentHTML("beforeend", horizontalWrongSpot);
  else
    tile.insertAdjacentHTML("beforeend", verticalWrongSpot);
}