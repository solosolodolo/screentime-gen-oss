
// NODE built-in module
const readline = require('readline');
const fs = require("fs").promises;

// 1. Readline interface

process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
process.stdin.resume();

// 2. Clean Exit Handling

let isExiting = false;

function cleanupAndExit() {
    if (isExiting) return;
    isExiting = true;

    console.log('\n[EXIT] Interrupted by user');
    process.exit(0);
}

process.on('SIGINT', cleanupAndExit);

// 3. SINGLE-LINE RENDER ENGINE
function render(text) {
    process.stdout.write(`${text}`);
}

async function waitForKey() {
    return new Promise((resolve) => {
        function onData(key) {

            if (key === '\u0003') {
                cleanupAndExit();
            }

            process.stdin.off('data', onData);
            resolve(key);
        }

        process.stdin.on('data', onData);
    });
}

async function askYesNo(question) {
    let input = '';
    process.stdout.write(`${question} (y/n): `);

    while (true) {
        const key = await waitForKey();

        if (key === '\r') {
            // Enter key pressed
            const trimmedInput = input.toLowerCase().trim();

            if (trimmedInput === 'y' || trimmedInput === 'yes') {
                console.log('');
                return 'yes';
            } else if (trimmedInput === 'n' || trimmedInput === 'no') {
                console.log('');
                return 'no';
            } else {
                console.log('');
                console.log('Invalid input. Please type yes or no (y/n).')
                input = '';
                process.stdout.write(`${question} (y/n): `);
                continue;
            }
        }

        if (key === '\u007f') {
            // Backspace
            if (input.length > 0) {
                input = input.slice(0, -1);
                process.stdout.write('\b \b');
            }
        } else if (key !== '\u0003') {
            // Regular character (not Ctrl+C)
            input += key;
            process.stdout.write(key);
        }
    }
}

let screenTimePassword = [];
for (let i = 0; i < 4; i++) {
    screenTimePassword.push(Math.floor(Math.random() * 10));
}

async function savePasswordToFile() {
    try {
        const passwordString = screenTimePassword.join('');
        const randomCharCount = Math.floor(Math.random() * 20000) + 50000;
        

        const makeRandomDigits = () => {
            
            const minSkew = Math.ceil(randomCharCount * 0.4);
            const maxSkew = Math.floor(randomCharCount * 0.8);

            const skewedCharCount = Math.floor(Math.random() * (maxSkew - minSkew + 1)) + minSkew;

            return Array.from({length: skewedCharCount}, () => Math.floor(Math.random() * 10)).join('');
        }

        const rtfEscape = (str) => {
            return String(str)
                .replace(/\\/g, '\\\\')
                .replace(/{/g, '\\{')
                .replace(/}/g, '\\}');
        }
        
        const safePassword = rtfEscape(passwordString);

        const fileText = '{\\rtf1\\ansi\\ansicpg1252{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}\\f0 ' + `${makeRandomDigits()}{\\b ${safePassword}}${makeRandomDigits()}\\par}`;

        await fs.writeFile("screenTimePassword.rtf", fileText, 'utf8');
        console.log("Password saved to external file");
    } catch(err) {
        console.error("Error saving file:", err);
    }
}

async function runSimulationOnce(screenTimePassword) {

    // 1. See secret password
    let inputField = [];

    // 2. Direct the User
    function directUser(action) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`${action}`);
    }

    // 3. Get iteration barrier with skew
    function getIterationBarrier(j) {
        let minBarrier = 3;
        let maxBarrier = 15;
        let skew = 0.8 - (0.20 * j);
        let rand = Math.random();
        let skewedRand = Math.pow(rand, 1 - skew);
        return Math.floor(skewedRand * (maxBarrier - minBarrier + 1)) + minBarrier;
    }

    directUser(`Secret password: ${screenTimePassword.join(' ')}`);

    // 4. For loop
    for (let i = 0; i < 3; i++){

        let iterationBarrier = getIterationBarrier(i);
        let safety = 0;
        let cycle = 0;

        while (true) {
            safety++;
            cycle++;

            if (safety > 1000) {
                console.log("Safety cap hit at digit", i + 1);
                return;
            }

            if (cycle > iterationBarrier) {
                if (inputField.length === i + 1) {
                    if (inputField[i] !== screenTimePassword[i]) {
                        inputField.pop();
                        directUser("Press delete");
                        await waitForKey();

                        inputField.push(screenTimePassword[i]);
                        directUser(`Press ${screenTimePassword[i]}`);
                        await waitForKey();
                    }
                }
                else if (inputField.length < i + 1) {
                    inputField.push(screenTimePassword[i]);
                    directUser(`Press ${screenTimePassword[i]}`);
                    await waitForKey();
                } 
                else {
                    while (inputField.length > i) {
                        inputField.pop();
                        directUser("Press delete");
                        await waitForKey();
                    }
                    inputField.push(screenTimePassword[i]);
                    directUser(`Press ${screenTimePassword[i]}`);
                    await waitForKey();
                }

                break;
            } 
            else {
                let addProbability = Math.max(0.1, 1.0 - (inputField.length / 4) * 0.7);
                let addOrDelete = Math.random() < addProbability ? "add" : "delete";
                if (addOrDelete === "add" && inputField.length < 3) {
                    let randomDigit = Math.floor(Math.random() * 10);
                    inputField.push(randomDigit);
                    directUser(`Press ${randomDigit}`);
                    await waitForKey();

                } else if (addOrDelete === "delete" && inputField.length > i) {
                    inputField.pop();
                    directUser(`Press delete`);
                    await waitForKey();

                } else {
                    cycle--
                }
            }
        }   
    }

    // 5. Final result
    inputField.push(screenTimePassword[3]);
    directUser(`Press ${screenTimePassword[3]}`);
    await waitForKey();

    // 6. Matching Passwords
    const passwordsMatch = inputField.length === screenTimePassword.length && 
    inputField.every((val, index) => val === screenTimePassword[index]);
    
    console.log(`\nDone! Password gen was ${passwordsMatch ? "successful" : "unsuccessful. Please exit and redo the process"}\n`);
}

// 7. Master loop with confirmation

async function main() {
    
    await savePasswordToFile();

    let keepRunning = true;

    while (keepRunning) {
        await runSimulationOnce(screenTimePassword);

        const runAgain = await askYesNo('Ready to run again?');

        if (runAgain === 'no') {
            keepRunning = false;
            render("\nGoodbye\n");
        }
    }

    process.exit(0);
}

// 8. Run Simulation
main();