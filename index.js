// --- Utility Functions ---
/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffleArray(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

// --- Game Setup ---
const numSectors = 36; // Number of sectors on the wheel
let userMoney = 1000; // Initial user money
let currentBetAmount = 5; // Initial bet amount
let selectedColorBet = null; // Currently selected color bet (red or black)
let selectedNumberBet = null; // Currently selected number bet
let betPlaced = false; // Flag to check if a bet is placed before spinning
const minBetAmount = 5; // Minimum bet amount
const betIncrement = 5;  // Bet increment/decrement value
const holdDelay = 200;    // Delay in ms before continuous increment/decrement starts
const incrementInterval = 100; // Interval in ms for continuous increment/decrement

// Payout ratios (Roulette style)
const colorBetPayout = 1;   // 1:1 payout for Red/Black bets
const numberBetPayout = 35;  // 35:1 payout for Number bets

// Define sector colors - now dynamically assigned in generateSectors
const redColor = "#FF4136";
const blackColor = "#111111";


// Function to generate sectors with randomized numbers and roulette-style alternating colors
function generateSectors(count) {
    const sectors = [];
    const numbers = Array.from({ length: count }, (_, i) => i + 1); // Create array of numbers 1 to 36
    shuffleArray(numbers); // Shuffle the numbers array

    // Determine starting color - let's start with red for the first number in shuffled array
    let currentColor = redColor;

    for (let i = 0; i < count; i++) {
        const number = numbers[i];
        const color = currentColor;
        const textColor = (color === redColor) ? "#000000" : "#FFFFFF"; // Black text on red, White text on black
        sectors.push({
            color: color,
            text: textColor,
            label: number.toString(), // Label is the sector number as a string
            number: number         // Store the number in the sector object
        });
        // Alternate color for the next sector
        currentColor = (currentColor === redColor) ? blackColor : redColor;
    }
    return sectors;
}


// Generate sectors array with 36 sections and randomized numbers and alternating colors
let sectors = generateSectors(numSectors);


// --- Event Management (retained from original code) ---
const events = {
  listeners: {},
  addListener: function (eventName, fn) {
    this.listeners[eventName] = this.listeners[eventName] || [];
    this.listeners[eventName].push(fn);
  },
  fire: function (eventName, ...args) {
    if (this.listeners[eventName]) {
      for (let fn of this.listeners[eventName]) {
        fn(...args);
      }
    }
  },
};

// --- Wheel Drawing and Animation ---
const rand = (m, M) => Math.random() * (M - m) + m;
const tot = sectors.length;
const spinEl = document.querySelector("#spin");
const ctx = document.querySelector("#wheel").getContext("2d");
const dia = ctx.canvas.width;
const rad = dia / 2;
const PI = Math.PI;
const TAU = 2 * PI;
const arc = TAU / sectors.length;

const friction = 0.991;
let angVel = 0;
let ang = 0;

let spinButtonClicked = false;

const getIndex = () => Math.floor(tot - (ang / TAU) * tot) % tot;

function drawSector(sector, i) {
  const ang = arc * i;
  ctx.save();

  // Draw sector color
  ctx.beginPath();
  ctx.fillStyle = sector.color;
  ctx.moveTo(rad, rad);
  ctx.arc(rad, rad, rad, ang, ang + arc);
  ctx.lineTo(rad, rad);
  ctx.fill();

  // Draw sector text (number)
  ctx.translate(rad, rad);
  ctx.rotate(ang + arc / 2);
  ctx.textAlign = "right";
  ctx.fillStyle = sector.text;
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(sector.label, rad - 20, 10);

  ctx.restore();
}

function rotate() {
  const sector = sectors[getIndex()];
  ctx.canvas.style.transform = `rotate(${ang - PI / 2}rad)`;

  spinEl.textContent = !angVel ? "SPIN" : sector.label;
  spinEl.style.background = sector.color;
  spinEl.style.color = sector.text;
}

function frame() {
  if (!angVel && spinButtonClicked) {
    const finalSector = sectors[getIndex()];
    events.fire("spinEnd", finalSector);
    spinButtonClicked = false;
    return;
  }

  angVel *= friction;
  if (angVel < 0.002) angVel = 0;
  ang += angVel;
  ang %= TAU;
  rotate();
}

function engine() {
  frame();
  requestAnimationFrame(engine);
}

// --- Betting UI Elements and Logic ---
const moneyDisplay = document.getElementById('current-money');
const betAmountDisplay = document.getElementById('bet-amount-display');
const increaseBetButton = document.getElementById('increase-bet');
const decreaseBetButton = document.getElementById('decrease-bet');
const redBetButton = document.getElementById('red-bet-button');
const blackBetButton = document.getElementById('black-bet-button');
const numberButtonsContainer = document.querySelector('.number-buttons');
const placeBetMessage = document.getElementById('place-bet-message');
const spinButton = document.getElementById('spin');
const betAmountDesc = document.getElementById('bet-amount-desc'); // Now part of placeBetMessage

let betAmountChangeInterval; // Variable to hold the interval for bet amount change
let holdTimer; // Timer to detect hold duration

// Update money display on the page
function updateMoneyDisplay() {
  moneyDisplay.textContent = userMoney;
}

// Function to handle bet amount increment/decrement and button state updates
function adjustBetAmount(increment) {
  let newBetAmount = currentBetAmount + increment;

  if (increment > 0 && newBetAmount > userMoney) {
      newBetAmount = userMoney; // Cap bet amount at user's money when increasing
  }

  if (newBetAmount >= minBetAmount && newBetAmount <= userMoney) {
    currentBetAmount = newBetAmount;
  } else if (newBetAmount < minBetAmount) {
    currentBetAmount = minBetAmount; // Ensure bet amount doesn't go below minimum
  }


  betAmountDisplay.textContent = currentBetAmount;
  updateBetAmountButtonsState(); // Update button states based on new amount
  updateBetDescription(); // Update bet description text (now updates placeBetMessage)
  updateSpinButtonState(); // Update spin button state as bet amount changes
}

// Function to update the disabled state of bet amount buttons
function updateBetAmountButtonsState() {
  increaseBetButton.classList.toggle('disabled', currentBetAmount >= userMoney);
  decreaseBetButton.classList.toggle('disabled', currentBetAmount <= minBetAmount); // Disable decrease button if bet is at minimum
}
// Function to update the disabled state of spin button
function updateSpinButtonState() {
    spinButton.classList.toggle('disabled', !(selectedColorBet || selectedNumberBet) || currentBetAmount > userMoney || currentBetAmount <= 0);
}


// Function to create number buttons for betting
function createNumberButtons() {
  for (let i = 1; i <= 36; i++) {
    const button = document.createElement('button');
    button.classList.add('number-button');
    button.textContent = i;
    button.addEventListener('click', () => {
      selectNumberBet(i);
    });
    numberButtonsContainer.appendChild(button);
  }
}

// Function to handle color bet selection
function selectColorBet(color) {
  selectedColorBet = color;
  selectedNumberBet = null; // Deselect number bet if color is selected
  updateButtonSelectionUI();
  updateSpinButtonState(); // Update spin button state after bet selection
  updateBetDescription(); // Update bet description text (now updates placeBetMessage)
}

// Function to handle number bet selection
function selectNumberBet(number) {
  selectedNumberBet = number;
  selectedColorBet = null; // Deselect color bet if number is selected
  updateButtonSelectionUI();
  updateSpinButtonState(); // Update spin button state after bet selection
  updateBetDescription(); // Update bet description text (now updates placeBetMessage)
}

// Function to update the visual state of buttons to reflect selections
function updateButtonSelectionUI() {
  // Color buttons
  redBetButton.classList.toggle('selected', selectedColorBet === 'red');
  blackBetButton.classList.toggle('selected', selectedColorBet === 'black');

  // Number buttons
  document.querySelectorAll('.number-button').forEach(button => {
    button.classList.toggle('selected', parseInt(button.textContent) === selectedNumberBet);
  });
}

// Reset bet selections
function resetBetSelections() {
  selectedColorBet = null;
  selectedNumberBet = null;
  betPlaced = false;
  updateButtonSelectionUI();
  updateSpinButtonState(); // Update spin button state after reset
  updateBetDescription(); // Update bet description text to default (updates placeBetMessage)
}

// Function to dynamically update the bet description text (now updates placeBetMessage)
function updateBetDescription() {
  let betTypeString = "No bet selected";
  if (selectedColorBet) {
    betTypeString = `Betting on ${selectedColorBet}`;
  } else if (selectedNumberBet) {
    betTypeString = `Betting on number ${selectedNumberBet}`;
  }
  placeBetMessage.textContent = `${betTypeString}, Bet: $${currentBetAmount}`; // Corrected line
  betAmountDesc.textContent = currentBetAmount.toString(); // Still update bet amount span (though now redundant in text display)
}


// --- Event Listeners for Betting Controls ---
increaseBetButton.addEventListener('mousedown', () => {
    holdTimer = setTimeout(() => { // Start timer for hold delay
        startIncrementTimer();
    }, holdDelay);
});

increaseBetButton.addEventListener('mouseup', () => {
    clearTimeout(holdTimer); // Clear hold timer if mouseup before holdDelay
    stopBetAdjustmentTimer();
    if (!betAmountChangeInterval) { // If not already incrementing continuously, perform single increment
        adjustBetAmount(betIncrement);
    }
});

increaseBetButton.addEventListener('mouseleave', () => {
    clearTimeout(holdTimer);
    stopBetAdjustmentTimer();
});


decreaseBetButton.addEventListener('mousedown', () => {
    holdTimer = setTimeout(() => { // Start timer for hold delay
        startDecrementTimer();
    }, holdDelay);
});

decreaseBetButton.addEventListener('mouseup', () => {
    clearTimeout(holdTimer); // Clear hold timer if mouseup before holdDelay
    stopBetAdjustmentTimer();
    if (!betAmountChangeInterval) { // If not already decrementing continuously, perform single decrement
        adjustBetAmount(-betIncrement);
    }
});

decreaseBetButton.addEventListener('mouseleave', () => {
    clearTimeout(holdTimer);
    stopBetAdjustmentTimer();
});


redBetButton.addEventListener('click', () => selectColorBet('red'));
blackBetButton.addEventListener('click', () => selectColorBet('black'));


// --- Spin Button Event Listener ---
spinEl.addEventListener("click", () => {
  if (!angVel && !betPlaced) { // Allow spin only if wheel is stopped and no bet is placed yet from previous spin
    if (selectedColorBet || selectedNumberBet) { // Check if a bet is selected
      if (currentBetAmount <= userMoney && currentBetAmount > 0) { // Check if bet amount is valid
        angVel = rand(0.25, 0.45);
        spinButtonClicked = true;
        betPlaced = true; // Mark bet as placed for current spin
        placeBetMessage.textContent = "Good luck!"; // Instructional message now overwritten on spin
        updateSpinButtonState(); // Disable spin button immediately after click
      } else {
        placeBetMessage.textContent = "Invalid bet amount or insufficient funds!";
      }
    } else {
        placeBetMessage.textContent = "Please select a bet type (Red/Black or Number)!";
    }
  }
});


// --- Spin End Event Listener (modified to handle betting outcomes) ---
events.addListener("spinEnd", (finalSector) => {
  let winnings = 0;
  let winMessage = "Sorry, you lost!";

  if (selectedColorBet) {
    const betColor = selectedColorBet;
    const sectorRouletteColor = finalSector.color;
    let actualWinningColor = (sectorRouletteColor === redColor) ? 'red' : 'black';

    if (betColor === actualWinningColor) {
      winnings = currentBetAmount * colorBetPayout; // 1:1 payout for color bet
      winMessage = `Congratulations! You won $${winnings} on ${actualWinningColor}!`;
      userMoney += winnings + currentBetAmount; // Add winnings and bet back to user money
    } else {
      userMoney -= currentBetAmount; // Deduct bet amount from user money on loss
    }
  } else if (selectedNumberBet) {
    const betNumber = selectedNumberBet;
    const winningNumber = finalSector.number;

    if (betNumber === winningNumber) {
      winnings = currentBetAmount * numberBetPayout; // 35:1 payout for number bet
      winMessage = `JACKPOT! You won $${winnings} on number ${winningNumber}!`;
      userMoney += winnings + currentBetAmount; // Add winnings and bet back to user money
    } else {
      userMoney -= currentBetAmount; // Deduct bet amount from user money on loss
    }
  }

  updateMoneyDisplay(); // Update money display after spin
  placeBetMessage.textContent = winMessage; // Display win/loss message (overwrites bet description temporarily)

  // Reset bet amount to max affordable if current bet is now too high after losing
  if (currentBetAmount > userMoney) {
      currentBetAmount = Math.max(userMoney, minBetAmount); // Ensure it doesn't go below minBetAmount if userMoney is still enough for min bet
      betAmountDisplay.textContent = currentBetAmount;
      updateBetDescription(); // Update bet description to reflect new bet amount
  }

  updateBetAmountButtonsState(); // Update bet amount buttons state after win/loss and potential bet reset
  updateSpinButtonState(); // Update spin button state after spin end


  if (userMoney <= 0) {
    placeBetMessage.textContent = "Game Over! You are out of money."; // Game over message also in placeBetMessage
    userMoney = 0; // Ensure money doesn't go below zero
    spinEl.style.pointerEvents = 'none'; // Disable spin button interaction
    spinButton.classList.add('disabled'); // Also visually disable spin button
  }

  resetBetSelections(); // Reset bet selections for next spin, which also resets placeBetMessage to bet description
});


// --- Bet Amount Adjustment Timer Functions ---
function startIncrementTimer() {
    betAmountChangeInterval = setInterval(() => {
        adjustBetAmount(betIncrement);
    }, incrementInterval); // Increment every 'incrementInterval' ms
}

function startDecrementTimer() {
    betAmountChangeInterval = setInterval(() => {
        adjustBetAmount(-betIncrement);
    }, incrementInterval); // Decrement every 'incrementInterval' ms
}

function stopBetAdjustmentTimer() {
    clearInterval(betAmountChangeInterval);
    betAmountChangeInterval = null; // Reset interval variable
}


// --- Initialization ---
function init() {
  sectors = generateSectors(numSectors); // Generate sectors with randomized numbers and alternating colors
  sectors.forEach(drawSector);
  rotate();
  engine();
  createNumberButtons(); // Create number buttons on initialization
  updateMoneyDisplay(); // Initial money display update
  resetBetSelections(); // Ensure no bets are selected at start, also sets initial bet description in placeBetMessage
  updateBetAmountButtonsState(); // Initialize bet amount buttons state
  updateSpinButtonState(); // Initialize spin button state
  updateBetDescription(); // Initialize bet description text (now updates placeBetMessage initially)
}

init();
