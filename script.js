import { ALL_WORDS } from "./words.js";

let correctWord = "ghost";
let guessCount = 0;
let lettersHidden = false;

const BOARD_WIDTH = 15;
const BOARD_LENGTH = BOARD_WIDTH;
const NUM_TILES = BOARD_WIDTH * BOARD_LENGTH;
const ALERT_DURATION = 1000;

const horizontalWrong = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow"
        >
          <rect x="27.5" y="14" width="6" height="12" fill="gray"/>
          <path d="M 28.5 18 v 4 l 4 -2 z" fill="black" stroke-width="0.2" stroke="black"></path>
        </svg>`;
const verticalWrong = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow"
        >
          <rect x="14" y="27.5" width="12" height="6" fill="gray"/>
          <path d="M 18 28.5 h 4 l -2 4 z" fill="black" stroke-width="0.2" stroke="black"></path>
        </svg>`;


const horizontalCorrect = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow"
        >
          <rect x="27.5" y="14" width="6" height="12" fill="lawngreen"/>
          <path d="M 28.5 18 v 4 l 4 -2 z" fill="black" stroke-width="0.2" stroke="black"></path>
        </svg>`;
const verticalCorrect = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow"
        >
          <rect x="14" y="27.5" width="12" height="6" fill="lawngreen"/>
          <path d="M 18 28.5 h 4 l -2 4 z" fill="black" stroke-width="0.2" stroke="black"></path>
        </svg>`;

const horizontalWrongSpot = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow"
        >
          <rect x="27.5" y="14" width="6" height="12" fill="yellow"/>
          <path d="M 28.5 18 v 4 l 4 -2 z" fill="black" stroke-width="0.2" stroke="black"></path>
        </svg>`;
const verticalWrongSpot = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow"
        >
          <rect x="14" y="27.5" width="12" height="6" fill="yellow"/>
          <path d="M 18 28.5 h 4 l -2 4 z" fill="black" stroke-width="0.2" stroke="black"></path>
        </svg>`;

const keyboard = document.getElementById("keyboard");
const board = document.getElementById("board");
const alerts = document.getElementById("alert-container");
const giveUpModal = document.getElementById("giveup");
const resultsModal = document.getElementById("results");
const helpModal = document.getElementById("help");
const menu = document.getElementById("menu-button-container");
const filledTiles = [];
const selectedTiles = [];

let guessing;
let gameOver = false;
let hasWon = false;
let nextGuessIsVertical = false;

initBoard();

function showAlert(str) {
  const alert = document.createElement("div");
  alert.className = "alert";
  alert.textContent = str;
  alerts.prepend(alert);
  if (alerts.children.length > 5) {
    alerts.children[alerts.children.length - 1].remove();
  }

  setTimeout(() => {
    alert.classList.add("hidden");
    alert.addEventListener("transitionend", () => {
      alert.remove();
    });
  }, ALERT_DURATION);
}

function initBoard() {

  //correctWord = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];

  for (let i = 0; i < BOARD_WIDTH; i++) {
    for (let j = 0; j < BOARD_LENGTH; j++) {
      const tile = document.createElement("button");
      tile.className = "tile";
      //tile.tabIndex = "-1";
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
  board.addEventListener("click", pressTile);
  keyboard.addEventListener("click", handleMouse);
  document.addEventListener("keydown", handleKey);
  document.addEventListener("keyup", animateKeyRelease);

  board.addEventListener("mouseover", selectTiles);
  board.addEventListener("mouseout", handleMouseOut);

  board.querySelectorAll(".tile").forEach((tile) => {
    tile.addEventListener("focus", focusSelectTiles);
  });

  helpModal.addEventListener("click", handleHelpModal);
  giveUpModal.addEventListener("click", handleGiveUpModal);
  resultsModal.addEventListener("click", handleResultsModal);

  menu.addEventListener("click", handleMenu);
}

function stopListening() {
  board.removeEventListener("click", pressTile);
  keyboard.removeEventListener("click", handleMouse);
  board.removeEventListener("mouseover", selectTiles);
  board.removeEventListener("mouseout", handleMouseOut);

  board.querySelectorAll(".tile").forEach((tile) => {
    tile.removeEventListener("focus", focusSelectTiles);
  });

  giveUpModal.removeEventListener("click", handleGiveUpModal);
}

function handleMenu(e) {
  if (e.target.matches("[data-help]")) {
    helpModal.style.display = "block";
  }
}


function animateKeyRelease(e) {
  if (e.key.match(/^[a-z]$/i)) {
    const key = getKey(e.key);
    key.classList.remove("pressed");
  } else if (e.key === "Enter") {
    keyboard.querySelector("[data-enter]").classList.remove("pressed");
  } else if (e.key === "Backspace" || e.key === "Delete") {
    keyboard.querySelector("[data-delete]").classList.remove("pressed");
  } else if (e.key === "Shift") {
    keyboard.querySelector("[data-select]").classList.remove("pressed");
  }
}

function handleKey(e) {
  if (e.key.match(/^[a-z]$/i)) {
    const key = getKey(e.key);
    key.classList.add("pressed");
    if (!gameOver) pressKey(e.key);
  } else if (e.key === "Enter") {
    if (!(document.activeElement instanceof HTMLButtonElement)) {
      keyboard.querySelector("[data-enter]").classList.add("pressed");
      if (!gameOver) submitGuess();
    }
  } else if (e.key === "Backspace" || e.key === "Delete") {
    keyboard.querySelector("[data-delete]").classList.add("pressed");
    if (!gameOver) deleteKey();
  } else if (e.key === "Shift") {
    const button = keyboard.querySelector("[data-select]");
    button.classList.add("pressed");
    if (gameOver)
      hideShowLetters(button);
    else
      pressSelect();
  } else if (e.key === "Escape") {
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.style.display = "none";
    });
  }
}

function pressSelect() {
  if (!guessing) {
    nextGuessIsVertical = !nextGuessIsVertical;
    if (selectedTiles.length > 0) {
      let temp = selectedTiles[0];
      deselectTiles();
      highlightTiles(temp);
    }
  } else {
    while (filledTiles.length > 0) {
      deleteKey();
    }
    const guessTiles = board.querySelectorAll("[data-active='true']");
    guessTiles.forEach((tile) => {
      tile.dataset.active = "false";
      if (tile.dataset.letter == null)
        delete tile.dataset.active;
    });
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
  } else if (e.target.matches("[data-select]")) {
    pressSelect();
  } else if (e.target.matches("[data-giveup]")) {
    giveUpModal.style.display = "block";
  }
}

function handleGiveUpModal(e) {
  if (e.target.matches(".confirm")) {
    giveUpModal.style.display = "none";
    showResults();
    } else if (e.target.matches(".close")) {
    giveUpModal.style.display = "none";
  }

}

function handleResultsModal(e) {
  if (e.target.matches(".close")) {
    resultsModal.style.display = "none";
  }
}

function handleHelpModal(e) {
  if (e.target.matches(".close")) {
    helpModal.style.display = "none";
  }
}

function showResults() {
  gameOver = true;
  stopListening();
  if (hasWon) { // if game is won
    showAlert("You win!");
    resultsModal.children[0].insertAdjacentHTML("beforeend", "<p>Congratulations!</p>");
  } else { // if game is lost
    resultsModal.children[0].insertAdjacentHTML("beforeend", "<p>Better luck next time!</p>");
  }
  resultsModal.children[0].insertAdjacentHTML("beforeend", "<p>The word was \"" + correctWord.toUpperCase() + "\"</p><p>Guesses used: " + guessCount + "</p>");
  resultsModal.style.display = "block";

  // convert giveup button to results button
  const resultsButton = keyboard.querySelector("[data-giveup]");
  resultsButton.addEventListener("click", reviewResults);
  resultsButton.textContent = "Results";

  // convert select button to hide letters button
  const hideLettersButton = keyboard.querySelector("[data-select]");
  hideLettersButton.addEventListener("click", handleHideShowLetters);
  hideLettersButton.textContent = "Hide Letters";
}

function hideShowLetters(button) {
  const letters = board.querySelectorAll("[data-letter]");
  if (lettersHidden) {
    letters.forEach((letter) => {
      letter.classList.remove("hidden");
    });
    keyboard.querySelectorAll("[data-key]").forEach((key) => {
      key.classList.remove("hidden");
    });
    button.textContent = "Hide Letters";
  } else {
    letters.forEach((letter) => {
      letter.classList.add("hidden");
    });
    keyboard.querySelectorAll("[data-key]").forEach((key) => {
      key.classList.add("hidden");
    });
    button.textContent = "Show Letters";
  }
  lettersHidden = !lettersHidden;
}

function handleHideShowLetters(e) {
  const button = e.target;
  hideShowLetters(button);
}

function reviewResults() {
  resultsModal.style.display = "block";
}


function pressTile(e) {
  const tile = e.target;
  tile.blur();
  if (guessing) return;

  if (selectedTiles.length < correctWord.length) {
    showAlert("Guess must be " + correctWord.length + " letters long");
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

  if (guessCount > 0 && !hasConnected) {
    showAlert("Guess must be connected");
    return;
  }

  if (!hasDisconnected) {
    showAlert("Already guessed");
    return;
  }

  
  // check if there is a letter before word
  let firstIndex = getIndex(selectedTiles[0])
  if (firstIndex - inc > 0) {
    if (board.children[firstIndex - inc].dataset.letter) {
      showAlert("Guess must be " + correctWord.length + " letters long");
      return;
    }
  }

  // check if there is a letter after word
  let lastIndex = getIndex(selectedTiles[correctWord.length - 1])
  if (lastIndex < NUM_TILES - inc) {
    if (board.children[lastIndex + inc].dataset.letter) {
      showAlert("Guess must be " + correctWord.length + " letters long");
      return;
    }
  }  


  selectedTiles.forEach((tile) => {
    tile.dataset.active = 'true';
    tile.classList.remove("selected");
  });
  selectedTiles.length = 0;
  enableGuessing();
}

function getIndex(tile) {
  return [...board.children].indexOf(tile);
}

function disableGuessing() {
  guessing = false;
  keyboard.querySelector("[data-select]").textContent = "Rotate Guess";
}

function handleMouseOut() {
  if (guessing) return;
  if (document.activeElement.matches(".tile")) return;
  deselectTiles();
}

function deselectTiles() {
  selectedTiles.forEach((tile) => {
    tile.classList.remove("selected");
  });
  selectedTiles.length = 0;
}

function selectTiles(e) {
  if (guessing) return;
  if (document.activeElement.matches(".tile")) return;
  let tile = e.target;
  if (!tile.matches(".tile")) return;
  highlightTiles(tile);
}

function focusSelectTiles(e) {
  if (guessing) return;
  deselectTiles();

  let tile = e.target;
  if (!tile.matches(".tile")) return;
  highlightTiles(tile);
}

function highlightTiles(tile) {
  let tileIndex = getIndex(tile);
  if (nextGuessIsVertical) {
    for (let i = tileIndex; i < tileIndex + correctWord.length*BOARD_LENGTH; i+=BOARD_LENGTH) {
      if (i % BOARD_LENGTH < tileIndex % BOARD_LENGTH) break;
      board.children[i].classList.add("selected");
      selectedTiles.push(board.children[i]);
    }
  } else {
    for (let i = tileIndex; i < tileIndex + correctWord.length; i++) {
      if (i % BOARD_LENGTH < tileIndex % BOARD_WIDTH) break;
      board.children[i].classList.add("selected");
      selectedTiles.push(board.children[i]);
    }
  }
}

function enableGuessing() {
  guessing = true;
  keyboard.querySelector("[data-select]").textContent = "Change Tiles";
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
    showAlert("Not enough letters");
    return;
  }
  
  const guess = Array.from(guessTiles).reduce((word, tile) => {
    return word + tile.dataset.letter;
  }, "");

  let invalidWord = false;

  if (binarySearch(ALL_WORDS, guess) < 0) {
    notInListAlert(guess, guessTiles);
    invalidWord = true;
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
    let wordTiles = [];

    //TODO: check if out of bounds
    let prevTile = board.children[getIndex(tile) - inc];
    let num = 2;
  
    while (prevTile.dataset.letter) {
      word = prevTile.dataset.letter + word;
      wordTiles.push(prevTile);
      wordTiles
      prevTile = board.children[getIndex(tile) - num * inc];
      num++;
    }

    wordTiles.push(tile);
  
    let nextTile = board.children[getIndex(tile) + inc];
    num = 2;
    while (nextTile.dataset.letter) {
      word += nextTile.dataset.letter;
      wordTiles.push(nextTile);
      nextTile = board.children[getIndex(tile) + num * inc];
      num++;
    }

    if (word.length <= 1) continue;

    if (binarySearch(ALL_WORDS, word) < 0) {
      notInListAlert(word, wordTiles);
      invalidWord = true;
    }
  }

  if (invalidWord) return;

  // guess submitted
  guessCount++;
  nextGuessIsVertical = !nextGuessIsVertical;
  disableGuessing();
  checkAccuracy(guessTiles, guess);
  guessTiles.forEach((tile) => {
    tile.dataset.active = "false";
  });
  filledTiles.length = 0;
}

function notInListAlert(word, wordTiles) {
  showAlert("\"" + word.toUpperCase() + "\" is not in word list");
  wordTiles.forEach((tile) => {
    tile.classList.add("shake");
    tile.addEventListener(
      "animationend",
      () => {
        tile.classList.remove("shake");
      },
      { once: true },
    );
  });
}

function checkAccuracy(tiles, guess) {
  if (guess == correctWord) {
    tiles.forEach((tile) => {
      const key = getKey(tile.dataset.letter);
      correctLetter(key, tile);
    });
    hasWon = true;
    showResults();
    return;
  }
  const wrongSpotTiles = [];
  let answer = correctWord;
  tiles.forEach((tile, index) => {
    const key = getKey(tile.dataset.letter);
    if (!correctWord.includes(tile.dataset.letter)) { // gray
      wrongLetter(key, tile);
    } else if (correctWord[index] == tile.dataset.letter) { // lawngreen
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