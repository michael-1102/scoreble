import { ALL_WORDS } from "./words.js";

let correctWord = "ghost";
const BOARD_WIDTH = 15;
const BOARD_LENGTH = BOARD_WIDTH;
const NUM_TILES = BOARD_WIDTH * BOARD_LENGTH;

const horizontalWrong = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow"
        >
          <rect x="27.5" y="17" width="6" height="6" fill="gray"/>
          <path d="M 28.5 18 v 4 l 4 -2 z" fill="transparent" stroke-width="0.2" stroke="black"></path>
        </svg>`;
const verticalWrong = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow"
        >
          <rect x="17" y="27.5" width="6" height="6" fill="gray"/>
          <path d="M 18 28.5 h 4 l -2 4 z" fill="transparent" stroke-width="0.2" stroke="black"></path>
        </svg>`;


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

  //correctWord = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];

  for (let i = 0; i < BOARD_WIDTH; i++) {
    for (let j = 0; j < BOARD_LENGTH; j++) {
      let tile = document.createElement("button");
      tile.className = "tile";
      tile.tabIndex = "-1";
      board.appendChild(tile);
    }
  }
  let center = Math.floor(NUM_TILES / 2);
  let halfWordLength = Math.floor(correctWord.length / 2);
  let offset = (correctWord.length - 1) % 2;
  for (let i = center - halfWordLength; i <= center + halfWordLength - offset; i++)
    board.children[i].dataset.active = 'true';
  
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
        tile.dataset.active = "false";
        if (tile.dataset.letter == null)
          delete tile.dataset.active;
      });
      disableGuessing();
    }
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

  if (selectedTiles.length < correctWord.length) {
    print("Guess must be exactly " + correctWord.length + " letters");
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
      if (nextGuessIsVertical) {
        if (!tile.dataset.vertical)
          hasDisconnected = true;
      } else {
        if (!tile.dataset.horizontal)
          hasDisconnected = true;
      }
          
    } else {
      hasDisconnected = true;
    }
  });

  if (!hasConnected) {
    print("Guess must be connected to existing word");
    return;
  }

  if (!hasDisconnected) {
    print("Already guessed");
    return;
  }

  
  // check if there is a letter before word
  let firstIndex = getIndex(selectedTiles[0])
  if (firstIndex - inc > 0) {
    if (board.children[firstIndex - inc].dataset.letter) {
      print("Guess must be exactly " + correctWord.length + " letters");
      return;
    }
  }

  // check if there is a letter after word
  let lastIndex = getIndex(selectedTiles[correctWord.length - 1])
  if (lastIndex < NUM_TILES - inc) {
    if (board.children[lastIndex + inc].dataset.letter) {
      print("Guess must be exactly " + correctWord.length + " letters");
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
    for (let i = tileIndex; i < tileIndex + correctWord.length*BOARD_LENGTH; i+=BOARD_LENGTH) {
      if (i % BOARD_LENGTH < tileIndex % BOARD_LENGTH) break;
      board.children[i].dataset.selected = "true";
      selectedTiles.push(board.children[i]);
    }
  } else {
    for (let i = tileIndex; i < tileIndex + correctWord.length; i++) {
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
  if (guessTiles.length < correctWord.length) {
    print("Not enough letters");
    return;
  }
  
  const guess = Array.from(guessTiles).reduce((word, tile) => {
    return word + tile.dataset.letter;
  }, "");

  if (binarySearch(ALL_WORDS, guess) < 0) {
    print(guess + " is not in word list");
    return;
  }

  // for vertical word, check to left and right
  // for horizontal word, check above and below
  let inc; 
  if (nextGuessIsVertical)
    inc = 1
  else 
    inc = BOARD_WIDTH;

  for (let i = 0; i < guessTiles.length; i++) {
    let tile = guessTiles[i];
    let word = tile.dataset.letter;

    //TODO: check if out of bounds
    let prevTile = board.children[getIndex(tile) - inc];
    let num = 2;
  
    while (prevTile.dataset.letter) {
      word = prevTile.dataset.letter + word;
      prevTile = board.children[getIndex(tile) - num * inc];
      num++;
    }
  
    let nextTile = board.children[getIndex(tile) + inc];
    num = 2;
    while (nextTile.dataset.letter) {
      word += nextTile.dataset.letter;
      nextTile = board.children[getIndex(tile) + num * inc];
      num++;
    }

    if (word.length <= 1) continue;

    if (binarySearch(ALL_WORDS, word) < 0) {
      print(word + " is not in word list");
      return;
    }
  }

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
  if (nextGuessIsVertical) {
    tile.insertAdjacentHTML("beforeend", horizontalWrong);
    tile.dataset.horizontal = "true";
  } else {
    tile.insertAdjacentHTML("beforeend", verticalWrong);
    tile.dataset.vertical = "true";
  }
}


function correctLetter(key, tile) {
  key.dataset.state = "correct";
  if (nextGuessIsVertical) {
    tile.insertAdjacentHTML("beforeend", horizontalCorrect);
    tile.dataset.horizontal = "true";
  } else {
    tile.insertAdjacentHTML("beforeend", verticalCorrect);
    tile.dataset.vertical = "true";
  }
}

function wrongSpotLetter(key, tile) {
  if (key.dataset.state != "correct") key.dataset.state = "wrong-spot";
  if (nextGuessIsVertical) {
    tile.insertAdjacentHTML("beforeend", horizontalWrongSpot);
    tile.dataset.horizontal = "true";
  } else {
    tile.insertAdjacentHTML("beforeend", verticalWrongSpot);
    tile.dataset.vertical = "true";
  }
}

function binarySearch(arr, val) {
  let start = 0;
  let end = arr.length - 1;

  while (start <= end) {
    let mid = Math.floor((start + end) / 2);

    if (arr[mid] == val) {
      return mid;
    }

    if (val < arr[mid]) {
      end = mid - 1;
    } else {
      start = mid + 1;
    }
  }
  return -1;
}