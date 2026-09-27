const startScreen = document.getElementById('start-screen');
const startTitle = document.getElementById('start-title');
const startButton = document.getElementById('start-button');
const decodeStartButton = document.getElementById('decode-start-button');

const passwordScreen = document.getElementById('password-screen');
const passwordScreenEl = passwordScreen.querySelectorAll('*');

const pauseScreen = document.getElementById('pause-screen');

const passwordInstructionsText = document.getElementById('password-instructions-text');
const passwordButton = document.getElementById('password-button');

const redoScreen = document.getElementById('redo-screen');
const redoButton = document.getElementById('redo-button');

const endScreen = document.getElementById('end-screen');
const retryButton = document.getElementById('retry-button');
const exitButton = document.getElementById('exit-button');

const decodeScreen = document.getElementById('decode-screen');
const decodeInput = document.getElementById("decode-input");
const decodeButton = document.getElementById('decode-button');

const timer = document.getElementById('timer');
const timerScreen = document.getElementById('timer-screen');

let screenTimePassword = [];
let readyToRestart = false;
let isRetrying = false;
let isDecodedPassword = false;

function generatePassword() {
    screenTimePassword = [];
    for (let i = 0; i < 4; i++) {
        screenTimePassword.push(Math.floor(Math.random() * 10));
    }
}

function pseudoRNG(seed) {
    return function() {
        let p = (seed += 0x87A3FE52)
        p = Math.imul(p ^ (p >>> 13), p | 1);
        p ^= p + Math.imul(p ^ (p >>> 3), p | 85);
        return ((p ^ (p >>> 10)) >>> 0) / 4294967296;
    };
}

function decodePasscode(storedOutput) {
    const storedOutputArr = storedOutput.split('\n').map(Number);

    for (let seed = 0; seed <= 9999; seed++) {
        const gen = pseudoRNG(seed);
        const candidate = Array.from({ length: storedOutputArr.length }, () => gen());
        if (candidate.every((val, i) => val === storedOutputArr[i])) {
            return seed;
        }
    }

    return null;
}


function* runProgram(password) {
    let inputField = [];

    function getIterationBarrier(j) {
        let minBarrier = 3;
        let maxBarrier = 15;
        let skew = 0.8 - (0.20 * j);
        let rand = Math.random();
        let skewedRand = Math.pow(rand, 1 - skew);
        return Math.floor(skewedRand * (maxBarrier - minBarrier + 1)) + minBarrier;
    }

    for (let i = 0; i < 3; i++) {

        let iterationBarrier = getIterationBarrier(i);
        let safety = 0;
        let cycle = 0;

        while (true) {
            safety++;
            cycle++;

            if (safety > 1000) {
                console.error("Safety cap hit at digit", i + 1);
                return;
            }

            if (cycle > iterationBarrier) {
                if (inputField.length === i + 1) {
                    if (inputField[i] !== screenTimePassword[i]) {
                        inputField.pop();
                        yield "Press delete";
                        inputField.push(password[i]);
                        yield `Press ${password[i]}`;
                    }
                } else if (inputField.length < i + 1) {
                    inputField.push(password[i]);
                    yield `Press ${password[i]}`;
                } else {
                    while (inputField.length > i) {
                        inputField.pop();
                        yield "Press delete";
                    }
                    inputField.push(password[i]);
                    yield `Press ${password[i]}`;
                }

                break
            }
            else {
                let addProbabilty = Math.max(0.1, 1.0 - (inputField.length / 4) * 0.7);
                let addOrDelete = Math.random() < addProbabilty ? "add" : "delete";
                if (addOrDelete === "add" && inputField.length < 3) {
                    let randomDigit = Math.floor(Math.random() * 10);
                    inputField.push(randomDigit);
                    yield `Press ${randomDigit}`;
                } else if (addOrDelete === "delete" && inputField.length > i) {
                    inputField.pop();
                    yield `Press delete`;
                } else {
                    cycle--
                }
            }
        }
    }

    inputField.push(screenTimePassword[3]);
    console.log(
        inputField.length === password.length && inputField.every((val, index) => val === screenTimePassword[index])
    );

    readyToRestart = !readyToRestart;

    yield `Press ${screenTimePassword[3]}`;
}

function savePasswordToFile(filename) {

    const passwordSeed = Number(screenTimePassword.join(''));

    const gen = pseudoRNG(passwordSeed);
    const genArr = Array.from({ length: 30 }, () => gen());

    const blob = new Blob([genArr.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function directUser(action) {
    passwordInstructionsText.textContent = action;

    passwordInstructionsText.classList.remove('flash');
    void passwordInstructionsText.offsetWidth;
    passwordInstructionsText.classList.add('flash');

    passwordButton.disabled = true;
    passwordInstructionsText.addEventListener('animationend', () => {
        passwordButton.disabled = false;
    }, { once: true });
}

let generator = null;

async function start() {

    if (!isDecodedPassword) {
        generatePassword();
        alert("A decoding key for your Screentime password will be saved to your downloads folder in a .txt file. DO NOT DELETE THIS FILE. Otherwise, you will have to do forget your password on iOS and generate a new one.");
        savePasswordToFile('screentime_password_decoding_key.txt');

        startScreen.style.display = "none"
        passwordScreen.style.display = "flex";
        document.body.style.backgroundColor = "var(--jet-black)";
    } else {
        screenTimePassword = [];
        const output = decodeInput.value;
        const text = decodePasscode(output);

        if (!text) {
            alert("Invalid decoder key. Please try again.")
            return;
        } else {
            screenTimePassword = text.toString().split('');
            decodeScreen.style.display = "none";
            alert("Your password has been succesfully decoded. A 5-minute timer will commence before you can re-enter the password.");
        }

        timerScreen.style.display = "flex";

        await startCountdown(300, (remaining) => {
            timer.innerText = formatTime(remaining);
        });

        transitionText(timerScreen, passwordScreen, () => {
            document.body.style.backgroundColor = "var(--jet-black)";
        });
    }

    generator = runProgram(screenTimePassword);
    advance();
}

function pause() {
    transitionText(passwordScreen, pauseScreen);
    setTimeout(() => transitionText(pauseScreen, redoScreen), 5000);
}

function restart() {
    if (isRetrying) {
        transitionText(endScreen, passwordScreen);
    } else {
        transitionText(redoScreen, passwordScreen);
    }

    generator = runProgram(screenTimePassword);
    advance();
}

function reset () {
    screenTimePassword = [];
    readyToRestart = false;
    isRetrying = false;
    endScreen.style.display = "none";
    startScreen.style.display = "flex";
    document.body.style.backgroundColor = "var(--teal)"
}

function end() {
    passwordButton.disabled = true;

    passwordInstructionsText.classList.remove('flash');

    transitionText(passwordScreen, endScreen);
}

function swapDisplays(elOne, elTwo) {
        
        elOne.style.display = 'none';
        elTwo.style.display = 'flex';
        
        fadeIn(elTwo);
}

function advance() {
    const result = generator.next();
    if (result.done && !readyToRestart || result.done && isDecodedPassword) {
        end();
        return;
    } else if (result.done && readyToRestart) {
        pause();
        return;
    }

    directUser(result.value);
}

function fadeIn(el) {
    el.classList.remove('flash', 'fade-in', 'fade-out');
    void el.offsetWidth;
    el.classList.add('fade-in');
}

function fadeOut(el) {
    el.classList.remove('flash', 'fade-in', 'fade-out');
    void el.offsetWidth;
    el.classList.add('fade-out');
}

function transitionText(elOne, elTwo, onStart) {
    fadeOut(elOne);

    elOne.addEventListener('animationend', function onFadeOut(event) {
        if (event.animationName !== 'fade-out') return;
        if (onStart) onStart();
        swapDisplays(elOne, elTwo);
        elOne.removeEventListener('animationend', onFadeOut);
    });
}

function startCountdown(seconds, onTick) {

    return new Promise((resolve) => {
        const endTime = Date.now() + seconds * 1000;

        function tick() {
            const remainingTime = Math.round((endTime - Date.now()) / 1000);

            if (remainingTime <= 0) {
                onTick(0);
                resolve();
                return;
            }

            onTick(remainingTime);
            setTimeout(tick, 1000);
        }   

        tick();
    });
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const displayedMinutes = String(minutes).padStart(2, '0');
    const displayedSeconds = String(seconds).padStart(2, '0');

    return `${displayedMinutes}:${displayedSeconds}`;
}

startButton.addEventListener('click', start);

passwordButton.addEventListener('click', advance);

redoButton.addEventListener('click', restart);

decodeButton.addEventListener('click', () => {
    isDecodedPassword = true;
    start();
})

decodeStartButton.addEventListener('click', () => {
    startScreen.style.display = "none";
    decodeScreen.style.display = "flex";
})

retryButton.addEventListener('click', () => {
    isRetrying = true;
    restart();
});

exitButton.addEventListener('click', reset);
