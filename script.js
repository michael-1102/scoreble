import { ANSWERS } from "./words.js";
import { ALL_WORDS } from "./words.js";

  

const startDate = new Date(2025, 5, 2);
const todayDate = new Date();
todayDate.setHours(0, 0, 0, 0);
const msDifference = todayDate - startDate;
const dayDifference = Math.max(0, Math.floor(msDifference / 86400000));
const correctWord = ANSWERS[dayDifference % ANSWERS.length];
let guessCount = 0;
let lettersHidden = false;

const BOARD_WIDTH = 15;
const NUM_TILES = BOARD_WIDTH * BOARD_WIDTH;
const ALERT_DURATION = 1000;

const helpPages = ["<p>(More visual/detailed instructions coming soon.)</p><p>The goal of Scoreble is to guess the correct word using as few guesses as possible.</p>",
  "<p>Guesses can be placed horizontally or vertically on the board, but every guess (except the first) must use at least one letter from a previous guess.</p>",
  "<p>Your guess must be exactly as long as the correct word. Any additional words created on the board by your guesses can be any length, but must be valid words according to the word list.</p>",
  "<p>After guessing, a horizontal or vertical arrow will appear on your guess' letters. A green arrow means the letter is in the correct position. A yellow arrow means the letter is in the correct word, but in the wrong position. A gray arrow means the letter is not in the correct word at all.</p>",
  "<p>After guessing, keys on the on-screen keyboard may change color. A green key indicates that you know where the letter is in the word. A yellow key indicates that you know the letter is in the word, but not its location. A gray key indicates that you know the letter is not in the word.</p>",
  "<p>The game will not detect if you have made it impossible to fit the correct answer into the board, so it is up to you to press Give Up if you cannot figure out the answer and would like to know it.</p>",
  "<p>You may press the eye icon in the top right to toggle high-contrast/colorblind mode. A slash through the eye means that this mode is off. In high-contrast mode, green (correct location) becomes orange and yellow (incorrect location) becomes blue.</p>",
  "<p> You may press the moon / sun icon in the top right to toggle dark / light mode.</p > <p>You may press the ? icon in the top right to re-open this How To Play menu.</p>"
];

const horizontalArrow = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow COLOR">
          <rect x="27.5" y="12.5" width="6" height="15"/>
          <path d="M 28.5 18 v 4 l 4 -2 z" fill="black" stroke-width="0.2" stroke="black"></path>
        </svg>`;
const verticalArrow = String.raw`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          width="40"
          height="40"
          class="arrow COLOR">
          <rect x="12.5" y="27.5" width="15" height="6"/>
          <path d="M 18 28.5 h 4 l -2 4 z" fill="black" stroke-width="0.2" stroke="black"></path>
        </svg>`;

const body = document.body;
const favicon = document.getElementById("favicon");
const keyboard = document.getElementById("keyboard");
const board = document.getElementById("board");
const alerts = document.getElementById("alert-container");
const giveUpModal = document.getElementById("giveup");
const resultsModal = document.getElementById("results");
const timeTravelWarningModal = document.getElementById("time-travel");
const countdownElement = resultsModal.querySelector(".countdown");
const helpModal = document.getElementById("help");
const menu = document.getElementById("menu-button-container");
const filledTiles = [];

const allTiles = [];
let guessing;
let gameOver = false;
let hasWon = false;
let nextGuessIsVertical = false;
let keyboardEnabled = true;
let hasSavedTiles = false;
let modalsDisabled = false;
let helpPage = 0;

init();

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

function initIfNull(item, val) {
  if (localStorage.getItem(item) == null) {
    localStorage.setItem(item, val);
  }
}


function init() {
  helpModal.querySelector(".text").innerHTML = helpPages[helpPage];
  helpModal.querySelector(".prev").disabled = true;

  //localStorage.clear();
  initIfNull("currentStreak", "0");
  initIfNull("averageGuesses", "N/A");
  initIfNull("totalSolves", "0");
  initIfNull("highestStreak", "0");
  let date = new Date(0);
  initIfNull("lastWinYear", date.getFullYear().toString());
  initIfNull("lastWinMonth", date.getMonth().toString());
  initIfNull("lastWinDay", date.getDate().toString());
  
  initIfNull("lastSavedYear", date.getFullYear().toString());
  initIfNull("lastSavedMonth", date.getMonth().toString());
  initIfNull("lastSavedDay", date.getDate().toString());
  
  initIfNull("guessCount", "0");  
  initIfNull("gameState", "ongoing");

  
  let lettersHiddenStr = localStorage.getItem("lettersHidden");
  if (lettersHiddenStr == "true") {
    lettersHidden = true;
  } else if (lettersHiddenStr == null) {
    localStorage.setItem("lettersHidden", "false");
  }

  let isDark = localStorage.getItem("isDark");
  if (isDark == null) {
    isDark == "false";
    localStorage.setItem("isDark", "false");
  }

  let isColorblind = localStorage.getItem("isColorblind");
  if (isColorblind == null) {
    isColorblind = "false";
    localStorage.setItem("isColorblind", "false");
  }

  setLightDarkMode(isDark, menu.querySelector("[data-lightdark]"));
  setColorblindMode(isColorblind, menu.querySelector("[data-colorblind]"));

  for (let i = 0; i < BOARD_WIDTH; i++) {
    for (let j = 0; j < BOARD_WIDTH; j++) {
      const tile = document.createElement("button");
      tile.className = "tile";
      board.appendChild(tile);
    }
  }
  
  allTiles.push(...board.querySelectorAll(".tile")); 
      startListening();
  if (!addSavedTiles()) {
    const warningText = timeTravelWarningModal.querySelector(".text");
    const date = getDate("lastSavedDay", "lastSavedMonth", "lastSavedYear").toDateString();
    warningText.innerHTML = `<p>The last time you played Scoreble was: <span class="bold">${date}</span>.`;
    warningText.insertAdjacentHTML("beforeend", `<p>This date is in the future. This means you have either changed your device's time, traveled to a different time zone, or you are a time traveler.</p>`);
    warningText.insertAdjacentHTML("beforeend", `<p>Pressing Acknowledge will let you play today's game, but you will lose your streak. Your other options are to wait until or set your device's time to a date on or after: <span class="bold">${date}</span>.</p>`);    
    openModal(timeTravelWarningModal);
    body.style.display = "block";
    return;
  }
  if (!gameOver) {
    if (hasSavedTiles) {
      disableGuessing();
    } else {
      activateMiddleTiles();
      enableGuessing();
    }
  } else if (lettersHidden) {
    hideLetters(board.querySelectorAll("[data-letter]"), keyboard.querySelector("[data-select]"));
  }
  if (localStorage.getItem("totalSolves") == "0" && localStorage.getItem("gameState") == "ongoing") {
    openModal(helpModal);
  }
  body.style.display = "block";
}

function activateMiddleTiles() {
  let center = Math.floor(NUM_TILES / 2);
  let halfWordLength = Math.floor(correctWord.length / 2);
  let offset = (correctWord.length - 1) % 2;
  for (let i = center - halfWordLength; i <= center + halfWordLength - offset; i++)
    board.children[i].dataset.active = 'true';
}

function addSavedTiles() {
  const lastSavedDate = getDate("lastSavedDay", "lastSavedMonth", "lastSavedYear");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (lastSavedDate.getTime() === today.getTime()) {
    guessCount = parseInt(localStorage.getItem("guessCount"));
    allTiles.forEach((tile, index) => {
      const tileData = localStorage.getItem(`tile${index}`);
      if (tileData != null) {
        hasSavedTiles = true;
        const tokens = tileData.split(" ");
        if (tokens.length == 0) return;
        tile.dataset.letter = tokens[0];
        tile.textContent = tokens[0];
        tile.dataset.active = "false";
        for (let i = 1; i < tokens.length; i+=2) {
          if (tokens[i] == "h") {
            tile.insertAdjacentHTML("beforeend", horizontalArrow.replace("COLOR", tokens[i + 1]));
            tile.dataset.horizontal = tokens[i + 1];
          } else if (tokens[i] == "v") {
            tile.insertAdjacentHTML("beforeend", verticalArrow.replace("COLOR", tokens[i + 1]));
            tile.dataset.vertical = tokens[i + 1];
          }
        }
      }
      keyboard.querySelectorAll("[data-key]").forEach((key, index) => {
        const keyboardData = localStorage.getItem(`key${index}`);
        if (keyboardData == null) return;
        key.dataset.state = keyboardData;
      });
    });
    const gameState = localStorage.getItem("gameState");
    if (gameState == "won") {
      hasWon = true;
      showResults(false);
    } else if (gameState == "lost") {
      showResults(false);
    }
  } else if (lastSavedDate.getTime() > today.getTime()) {
    return false;
  } else {
    allTiles.forEach((tile, index) => {
      localStorage.removeItem(`tile${index}`);
    });
    keyboard.querySelectorAll("[data-key]").forEach((key, index) => {
      localStorage.removeItem(`key${index}`);
    });
    localStorage.setItem("gameState", "ongoing");
    localStorage.setItem("guessCount", "0");
  }
  localStorage.setItem("lastSavedYear", today.getFullYear().toString());
  localStorage.setItem("lastSavedMonth", today.getMonth().toString());
  localStorage.setItem("lastSavedDay", today.getDate().toString());
  return true;
}

function startListening() {
  board.addEventListener("click", pressTile);
  keyboard.addEventListener("click", handleMouse);
  document.addEventListener("keydown", handleKey);
  document.addEventListener("keyup", animateKeyRelease);

  board.addEventListener("mouseover", handleMouseOverTile);
  board.addEventListener("mouseout", handleMouseOutTile);

  allTiles.forEach((tile) => {
    tile.addEventListener("focus", handleFocusTile);
    tile.addEventListener("blur", handleBlurTile);
  });

  helpModal.addEventListener("click", handleHelpModal);
  giveUpModal.addEventListener("click", handleGiveUpModal);
  resultsModal.addEventListener("click", handleGenericModal);
  timeTravelWarningModal.addEventListener("click", handleTimeTravelWarningModal);

  menu.addEventListener("click", handleMenu);
}

function stopListening() {
  board.removeEventListener("click", pressTile);
  keyboard.removeEventListener("click", handleMouse);
  keyboard.addEventListener("click", animateKeyPress);
  board.removeEventListener("mouseover", handleMouseOverTile);
  board.removeEventListener("mouseout", handleMouseOutTile);

  allTiles.forEach((tile) => {
    tile.removeEventListener("focus", handleFocusTile);
    tile.removeEventListener("blur", handleBlurTile);
  });

  giveUpModal.removeEventListener("click", handleGiveUpModal);
}

function handleMenu(e) {
  if (e.target.matches("[data-help]")) {
    openModal(helpModal);
  } else if (e.target.matches("[data-lightdark]")) {
    let isDark = localStorage.getItem("isDark");
    if (isDark == "true") {
      isDark = "false";
      localStorage.setItem("isDark", "false");
    } else {
      isDark = "true";
      localStorage.setItem("isDark", "true");
    }
    setLightDarkMode(isDark, e.target);
    e.target.disabled = true;
    setTimeout(() => {
      e.target.disabled = false;
    }, 1000);
  } else if (e.target.matches("[data-colorblind]")) {
    let isColorblind = localStorage.getItem("isColorblind");
    if (isColorblind == "true") {
      showAlert("Colorblind Mode: Off");
      isColorblind = "false";
      localStorage.setItem("isColorblind", "false");
    } else {
      showAlert("Colorblind Mode: On");
      isColorblind = "true";
      localStorage.setItem("isColorblind", "true");
    }
    setColorblindMode(isColorblind, e.target);
  }
}

function setColorblindMode(isColorblind, button) {
  if (isColorblind == "true") {
    body.classList.add("colorblind");
  } else {
    body.classList.remove("colorblind");
  }
}

function setLightDarkMode(isDark, button) {
  if (isDark == "true") {
    body.classList.add("color-change");
    body.classList.add("dark");
    favicon.href = "dark-favicon.svg?v=2";
    setTimeout(() => {
      body.classList.remove("color-change");
    }, 1000);
  } else {
    body.classList.add("color-change");
    body.classList.remove("dark");
    favicon.href = "light-favicon.svg?v=2";
    setTimeout(() => {
      body.classList.remove("color-change");
    }, 1000);  }
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
  if (keyboardEnabled) {
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
    }
  } else if (e.key === "Escape") {
    closeModal(document.querySelector(".modal.open"));
  } else if (e.key === "ArrowRight") {
    document.querySelector(".next").click();
  } else if (e.key === "ArrowLeft") {
    document.querySelector(".prev").click();
  }
}

function rotateGuess() {
  nextGuessIsVertical = !nextGuessIsVertical;
  if (nextGuessIsVertical) {
    document.getElementById("rotation-icon-selector").classList.add("right");
  } else {
    document.getElementById("rotation-icon-selector").classList.remove("right");
  }
}

function pressSelect() {
  if (!guessing) {
    let highlightedTiles = board.querySelectorAll(".tile.highlighted");
    rotateGuess();
    if (highlightedTiles.length > 0) {
      unHighlightTiles();
      let temp = highlightedTiles[0];
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
    animateKeyPress(e);
    pressKey(e.target.dataset.key);
  } else if (e.target.matches("[data-enter]")) {
    animateKeyPress(e);
    submitGuess();
  } else if (e.target.matches("[data-delete]")) {
    animateKeyPress(e);
    deleteKey();
  } else if (e.target.matches("[data-select]")) {
    animateKeyPress(e);
    pressSelect();
  } else if (e.target.matches("[data-giveup]")) {
    animateKeyPress(e);
    openModal(giveUpModal);
  }
}

function animateKeyPress(e) {
  if (e.screenX === 0) {
    e.target.classList.add("pressed");
    setTimeout(() => {
      e.target.classList.remove("pressed");
    }, 100);
  }
}

function handleGiveUpModal(e) {
  if (e.target.matches(".confirm")) {
    closeModal(giveUpModal);
    localStorage.setItem("gameState", "lost");
    showResults(true);
    } else if (e.target.matches(".close")) {
    closeModal(giveUpModal);
  }
}

function openModal(modal) {
  if (modalsDisabled) return;
  keyboardEnabled = false;
  modal.classList.add("open");
  document.querySelectorAll("button:not([disabled])").forEach((button) => {
    if (!modal.contains(button)) {
      button.disabled = true;
      button.classList.add("turn-on");
    }
  });
}

function closeModal(modal) {
  keyboardEnabled = true;
  modal.classList.remove("open");
  document.querySelectorAll("button.turn-on").forEach((button) => {
    if (!modal.contains(button)) {
      button.disabled = false; 
      button.classList.remove("turn-on");
    }
  });
}

function handleGenericModal(e) {
  if (e.target.matches(".close, .confirm")) {
    closeModal(e.target.closest(".modal"));
  }
}

function handleHelpModal(e) {
  const helpText = helpModal.querySelector(".text");
  if (e.target.matches(".close")) {
    helpPage = 0;
    helpText.innerHTML = helpPages[0];
    helpModal.querySelector(".prev").disabled = true;
    helpModal.querySelector(".next").disabled = false;
    closeModal(helpModal);
  } else if (e.target.matches(".next")) {
    if (helpPage < helpPages.length - 1) {
      helpPage++;
      helpText.innerHTML = helpPages[helpPage];

      helpModal.querySelector(".prev").disabled = false;
      if (helpPage == helpPages.length - 1) {
        e.target.disabled = true;
      }
    }
  } else if (e.target.matches(".prev")) {
    if (helpPage > 0) {
      helpPage--;
      helpText.innerHTML = helpPages[helpPage];

      if (helpPages.length > 1) helpModal.querySelector(".next").disabled = false;
      if (helpPage == 0) {
        e.target.disabled = true;
      }
    }
  } 
}

function handleTimeTravelWarningModal(e) {
  if (e.target.matches(".confirm")) {
    closeModal(timeTravelWarningModal);
    localStorage.setItem("currentStreak", "0");
    allTiles.forEach((tile, index) => {
      localStorage.removeItem(`tile${index}`);
    });
    keyboard.querySelectorAll("[data-key]").forEach((key, index) => {
      localStorage.removeItem(`key${index}`);
    });
    localStorage.setItem("gameState", "ongoing");
    localStorage.setItem("guessCount", "0");
    const today = new Date();
    localStorage.setItem("lastSavedYear", today.getFullYear().toString());
    localStorage.setItem("lastSavedMonth", today.getMonth().toString());
    localStorage.setItem("lastSavedDay", today.getDate().toString());
    activateMiddleTiles();
    enableGuessing();
    if (lettersHidden)
      hideLetters(board.querySelectorAll("[data-letter]"), keyboard.querySelector("[data-select]"));
  }
}

function countdown() {
  const now = new Date().getTime();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1); 
  tomorrow.setHours(0, 0, 0, 0);
  const distance = tomorrow.getTime() - now;
  let hours = Math.floor((distance % 86400000) / 3600000);
  let minutes = Math.floor((distance % 3600000) / 60000);
  let seconds = Math.floor((distance % 60000) / 1000);
  if (hours < 10) hours = "0" + hours;
  if (minutes < 10) minutes = "0" + minutes;
  if (seconds < 10) seconds = "0" + seconds;
  countdownElement.textContent = `New word in: ${hours}h ${minutes}m ${seconds}s`;
}

function showResults(isNewGame) {
  gameOver = true;
  body.classList.add("game-over");
  stopListening();
  allTiles.forEach((tile) => {
    tile.disabled = true;
  });

  const resultsText = resultsModal.querySelector(".text");
  if (hasWon) { // if game is won
    if (isNewGame) saveWinningScore();
    resultsText.insertAdjacentHTML("beforeend", "<p>Congratulations!</p>");
  } else { // if game is lost
    if (isNewGame) saveLosingScore();
    resultsText.insertAdjacentHTML("beforeend", "<p>Better luck next time!</p>");
  }
  resultsText.insertAdjacentHTML("beforeend", `<p>The word was "${correctWord.toUpperCase()}"</p>`);
  resultsText.insertAdjacentHTML("beforeend", `<p>Guesses used: ${guessCount}</p>`);
  resultsText.insertAdjacentHTML("beforeend", `<p>Total solves: ${localStorage.getItem("totalSolves")}</p>`);  
  const averageGuesses = localStorage.getItem("averageGuesses");
  resultsText.insertAdjacentHTML("beforeend", `<p>Average guesses used per solve: ${averageGuesses == "N/A" ? averageGuesses : parseFloat(averageGuesses).toFixed(3)}</p>`);  
  resultsText.insertAdjacentHTML("beforeend", `<p>Current streak: ${localStorage.getItem("currentStreak")}</p>`);  
  resultsText.insertAdjacentHTML("beforeend", `<p>Highest streak: ${localStorage.getItem("highestStreak")}</p>`);  

  countdown();
  setInterval(countdown, 1000);
  
  if (isNewGame) {
    modalsDisabled = true;
    setTimeout(() => {
      modalsDisabled = false;
      openModal(resultsModal);
    }, ALERT_DURATION);
  } else {
    openModal(resultsModal);
  }

  // convert giveup button to results button
  const resultsButton = keyboard.querySelector("[data-giveup]");
  resultsButton.addEventListener("click", reviewResults);
  resultsButton.textContent = "Results";

  // convert select button to hide letters button
  const hideLettersButton = keyboard.querySelector("[data-select]");
  hideLettersButton.addEventListener("click", handleHideShowLetters);
  document.getElementById("select-text").textContent = "Hide Letters";
}

function saveWinningScore() {
  let averageGuesses = localStorage.getItem("averageGuesses");
  if (averageGuesses == "N/A") {
    averageGuesses = 0;
  } else {
    averageGuesses = parseFloat(averageGuesses);
  }
  const totalSolves = parseInt(localStorage.getItem("totalSolves"));
  let currentStreak = parseInt(localStorage.getItem("currentStreak"));
  const highestStreak = parseInt(localStorage.getItem("highestStreak"));
  localStorage.setItem("totalSolves", (totalSolves + 1).toString());
  localStorage.setItem("averageGuesses", ((averageGuesses*totalSolves+guessCount)/(totalSolves+1)).toString());

  if (currentStreak == 0) {
    localStorage.setItem("currentStreak", "1");
    currentStreak++;
  } else {

    const lastWinDate = getDate("lastWinDay", "lastWinMonth", "lastWinYear");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); 
    yesterday.setHours(0, 0, 0, 0);
    if (lastWinDate.getTime() === yesterday.getTime()) {
      localStorage.setItem("currentStreak", (++currentStreak).toString());
    } else {
      localStorage.setItem("currentStreak", "1");
      currentStreak = 1;
    }
  }

  let now = new Date();
  localStorage.setItem("lastWinYear", now.getFullYear().toString());
  localStorage.setItem("lastWinMonth", now.getMonth().toString());
  localStorage.setItem("lastWinDay", now.getDate().toString());

  if (currentStreak > highestStreak) {
    localStorage.setItem("highestStreak", currentStreak.toString());
  }
}

function saveLosingScore() {
  localStorage.setItem("currentStreak", 0);
}

function getDate(dayItemName, monthItemName, yearItemName) {
  let day = parseInt(localStorage.getItem(dayItemName));
  if (day < 10) day = "0" + day;
  let month = parseInt(localStorage.getItem(monthItemName));
  if (month < 10) month = "0" + month;
  let year = parseInt(localStorage.getItem(yearItemName));
  if (year < 1000) {
    if (year < 100) {
      if (year < 10) {
        year = "0" + year;   
      }
      year = "0" + year;   
    }
    year = "0" + year;
  }

  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
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
    document.getElementById("select-text").textContent = "Hide Letters";
  } else {
    hideLetters(letters, button);
  }
  lettersHidden = !lettersHidden;
  if (lettersHidden)
    localStorage.setItem("lettersHidden", "true");
  else
    localStorage.setItem("lettersHidden", "false");
}

function hideLetters(letters, button) {
  letters.forEach((letter) => {
    letter.classList.add("hidden");
  });
  keyboard.querySelectorAll("[data-key]").forEach((key) => {
    key.classList.add("hidden");
  });
  document.getElementById("select-text").textContent = "Show Letters";
}

function handleHideShowLetters(e) {
  const button = e.target;
  hideShowLetters(button);
}

function reviewResults() {
  openModal(resultsModal);
}


function pressTile(e) {
  const tile = e.target;
  if (!tile.matches(".tile")) return;
  tile.blur();
  highlightTiles(tile);
  let highlightedTiles = board.querySelectorAll(".tile.highlighted");
  if (highlightedTiles.length < correctWord.length) {
    showAlert(`Guess must be ${correctWord.length} letters long`);
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
  highlightedTiles.forEach((tile) => {
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
    showAlert("Guess must use existing tile(s)");
    return;
  }

  if (!hasDisconnected) {
    showAlert("Already guessed");
    return;
  }

  
  // check if there is a letter before word
  let firstIndex = getIndex(highlightedTiles[0])
  if (firstIndex - inc > 0) {
    if (board.children[firstIndex - inc].dataset.letter) {
      showAlert(`Guess must be ${correctWord.length} letters long`);
      return;
    }
  }

  // check if there is a letter after word
  let lastIndex = getIndex(highlightedTiles[correctWord.length - 1])
  if (lastIndex < NUM_TILES - inc) {
    if (board.children[lastIndex + inc].dataset.letter) {
      showAlert(`Guess must be ${correctWord.length} letters long`);
      return;
    }
  }  


  highlightedTiles.forEach((tile) => {
    tile.dataset.active = "true";
    tile.classList.remove("highlighted");
  });
  enableGuessing();
}

function getIndex(tile) {
  return [...board.children].indexOf(tile);
}

function disableGuessing() {
  guessing = false;
  body.classList.remove("guessing");
  allTiles.forEach((tile) => {
    tile.disabled = false;
  });
}


function handleMouseOverTile(e) {
  if (guessing) return;
  const tile = e.target;
  if (!tile.matches(".tile")) return;
  if (document.activeElement.matches(".tile")) return;
  highlightTiles(tile);
}

function handleFocusTile(e) {
  highlightTiles(e.target);
}

function handleBlurTile() {
  unHighlightTiles();
}

function handleMouseOutTile() {
  if (guessing) return;
  if (document.activeElement.matches(".tile")) return;
  unHighlightTiles();
}

function highlightTiles(tile) {
  unHighlightTiles();
  let tileIndex = getIndex(tile);
  if (nextGuessIsVertical) {
    for (let i = tileIndex; i < tileIndex + correctWord.length * BOARD_WIDTH; i += BOARD_WIDTH) {
      if (i >= NUM_TILES) return;
      board.children[i].classList.add("highlighted");
    }
  } else {
    for (let i = tileIndex; i < tileIndex + correctWord.length; i++) {
      if (i % BOARD_WIDTH < tileIndex % BOARD_WIDTH) break;
      board.children[i].classList.add("highlighted");
    }
  }
}

function unHighlightTiles() {
  board.querySelectorAll(".tile.highlighted").forEach((tile) => {
    tile.classList.remove("highlighted");
  });
}

function enableGuessing() {
  guessing = true;
  body.classList.add("guessing");
  allTiles.forEach((tile) => {
    tile.disabled = true;
  });
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
  if (filledTiles.length == 0) return;
  filledTiles[filledTiles.length - 1].textContent = "";
  delete filledTiles[filledTiles.length - 1].dataset.letter;
  filledTiles.pop();
}

function submitGuess() {
  if (!guessing) return;
  const guessTiles = board.querySelectorAll("[data-letter][data-active='true']");
  if (guessTiles.length < correctWord.length) {
    shakeTilesAlert("Not enough letters", guessTiles);
    return;
  }
  
  const guess = Array.from(guessTiles).reduce((word, tile) => {
    return word + tile.dataset.letter;
  }, "");

  let invalidWord = false;

  if (binarySearch(ALL_WORDS, guess) < 0) {
    shakeTilesAlert(`"${guess.toUpperCase()}" is not in word list`, guessTiles);
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

    let prevIndex = getIndex(tile) - inc;
    if (prevIndex >= 0) {
      let prevTile = board.children[prevIndex];
      let num = 2;
      while (prevTile.dataset.letter) {
        word = prevTile.dataset.letter + word;
        wordTiles.push(prevTile);
        prevIndex = getIndex(tile) - num * inc;
        if (prevIndex < 0) break;
        prevTile = board.children[prevIndex];
        num++;
      }
    }

    wordTiles.push(tile);

    let nextIndex = getIndex(tile) + inc;
    if (nextIndex < NUM_TILES) {
      let nextTile = board.children[getIndex(tile) + inc];
      let num = 2;
      while (nextTile.dataset.letter) {
        word += nextTile.dataset.letter;
        wordTiles.push(nextTile);
        nextIndex = getIndex(tile) + num * inc;
        if (nextIndex >= NUM_TILES) break;
        nextTile = board.children[nextIndex];
        num++;
      }
    }

    if (word.length <= 1) continue;

    if (binarySearch(ALL_WORDS, word) < 0) {
      shakeTilesAlert(`"${word.toUpperCase()}" is not in word list`, wordTiles);
      invalidWord = true;
    }
  }

  if (invalidWord) return;

  // guess submitted
  guessCount++;
  rotateGuess();
  disableGuessing();
  checkAccuracy(guessTiles, guess);
  guessTiles.forEach((tile) => {
    tile.dataset.active = "false";
  });
  saveGuessToStorage(guessTiles);
  filledTiles.length = 0;
}

function saveGuessToStorage(tiles) {
  localStorage.setItem("guessCount", guessCount.toString());
  tiles.forEach((tile) => {
    let tileData = tile.dataset.letter;
    if (tile.dataset.horizontal) {
      tileData += " h " + tile.dataset.horizontal;
    }
    if (tile.dataset.vertical) {
      tileData += " v " + tile.dataset.vertical;
    }
    localStorage.setItem(`tile${getIndex(tile)}`, tileData);
  });
  keyboard.querySelectorAll("[data-key]").forEach((key, index) => {
    if (key.dataset.state) {
      localStorage.setItem(`key${index}`, key.dataset.state);
    }
  });
}

function shakeTilesAlert(alertText, wordTiles) {
  showAlert(alertText);
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
      tile.classList.add("victory");
      const key = getKey(tile.dataset.letter);
      correctLetter(key, tile);
      tile.addEventListener(
        "animationend",
        () => {
          tile.classList.remove("victory");
        },
        { once: true },
      );
    });
    hasWon = true;
    localStorage.setItem("gameState", "won");
    showAlert("You win!");
    showResults(true);
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
      answer = answer.substring(0,index) + "." + answer.substring(index+1);
    } else { // yellow
      wrongSpotTiles.push(tile);
    }
  });

  wrongSpotTiles.forEach((tile) => { // yellows
    const key = getKey(tile.dataset.letter);
    let index = answer.indexOf(tile.dataset.letter);
    if (index >= 0) {
      wrongSpotLetter(key, tile);
      answer = answer.substring(0,index) + "." + answer.substring(index+1);
    } else {
      wrongLetter(key, tile);
    }
  });
}

function getKey(char) {
  return keyboard.querySelector(`[data-key="${char.toUpperCase()}"]`);
}

function wrongLetter(key, tile) {
  if (!(key.dataset.state == "correct" || key.dataset.state == "wrong-spot")) key.dataset.state = "wrong";
  if (nextGuessIsVertical) {
    tile.insertAdjacentHTML("beforeend", horizontalArrow.replace("COLOR", "gray"));
    tile.dataset.horizontal = "gray";
  } else {
    tile.insertAdjacentHTML("beforeend", verticalArrow.replace("COLOR", "gray"));
    tile.dataset.vertical = "gray";
  }
}


function correctLetter(key, tile) {
  key.dataset.state = "correct";
  if (nextGuessIsVertical) {
    tile.insertAdjacentHTML("beforeend", horizontalArrow.replace("COLOR", "green"));
    tile.dataset.horizontal = "green";
  } else {
    tile.insertAdjacentHTML("beforeend", verticalArrow.replace("COLOR", "green"));
    tile.dataset.vertical = "green";
  }
}

function wrongSpotLetter(key, tile) {
  if (key.dataset.state != "correct") key.dataset.state = "wrong-spot";
  if (nextGuessIsVertical) {
    tile.insertAdjacentHTML("beforeend", horizontalArrow.replace("COLOR", "yellow"));
    tile.dataset.horizontal = "yellow";
  } else {
    tile.insertAdjacentHTML("beforeend", verticalArrow.replace("COLOR", "yellow"));
    tile.dataset.vertical = "yellow";
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