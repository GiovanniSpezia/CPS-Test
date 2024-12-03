let clickCount = 0;
let timeRemaining = 5; // Modifica qui la durata del test in secondi
let cps = 0;
let testStarted = false;
let intervalId;

const clickArea = document.getElementById('clickArea');
const timeRemainingDisplay = document.getElementById('time-remaining');
const clickCountDisplay = document.getElementById('click-count');
const cpsDisplay = document.getElementById('cps');
const restartButton = document.getElementById('restartButton');

function startTimer() {
  intervalId = setInterval(() => {
    timeRemaining--;
    timeRemainingDisplay.textContent = timeRemaining;

    if (timeRemaining <= 0) {
      clearInterval(intervalId);
      clickArea.style.pointerEvents = 'none';
      calculateCPS();
    }
  }, 1000);
}

function calculateCPS() {
  cps = clickCount / 5;
  cpsDisplay.textContent = cps.toFixed(2);
}

clickArea.addEventListener('click', () => {
  if (!testStarted) {
    testStarted = true;
    startTimer();
  }

  if (timeRemaining > 0) {
    clickCount++;
    clickCountDisplay.textContent = clickCount;
  }
});

restartButton.addEventListener('click', () => {
  clickCount = 0;
  timeRemaining = 5;
  cps = 0;
  testStarted = false;

  timeRemainingDisplay.textContent = timeRemaining;
  clickCountDisplay.textContent = clickCount;
  cpsDisplay.textContent = cps.toFixed(2);

  clickArea.style.pointerEvents = 'auto';

  clearInterval(intervalId);
});