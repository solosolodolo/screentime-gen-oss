
// NODE built-in module
const readline = require('readline');

// 1. NODE: Wait-for-any-key function
function waitForAnyKey() {
    return new Promise((resolve, reject) => {

        process.stdin.setRawMode(true);
        readline.emitKeypressEvents(process.stdin);

        function onKey(str, key) {
            process.stdin.removeListener('keypress', onKey);
            process.stdin.setRawMode(false);

            if (key && key.name === 'q') {
                reject(new Error('QUIT'));
            } else {
                resolve();
            }
        }
        process.stdin.on('keypress', onKey);
    })
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 2. Ask the user for a yes/no answer
function askYesNo(question) {
    return new Promise((resolve) => {
        rl.question(question + ' (y/n) ', (answer) => {
            resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes');
        });
    });
}

// 1. Generate Secret Password
let screenTimePassword = [];
for (let i = 0; i < 4; i++) {
    screenTimePassword.push(Math.floor(Math.random() * 10));
}

// 3. NODE: Asynchronous function
async function runSimulationOnce(screenTimePassword) {

    // 1. See secret password
    let inputField = [];

    // 2. Direct the User
    function directUser(action) {
        const text = `[SIM] ${action}`;
        process.stdout.write('\r\x1b[K' + text);
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
                        await waitForAnyKey();

                        inputField.push(screenTimePassword[i]);
                        directUser(`Press ${screenTimePassword[i]}`);
                        await waitForAnyKey();
                    }
                }
                else if (inputField.length < i + 1) {
                    inputField.push(screenTimePassword[i]);
                    directUser(`Press ${screenTimePassword[i]}`);
                    await waitForAnyKey();
                } 
                else {
                    while (inputField.length > i) {
                        inputField.pop();
                        directUser("Press delete");
                        await waitForAnyKey();
                    }
                    inputField.push(screenTimePassword[i]);
                    directUser(`Press ${screenTimePassword[i]}`);
                    await waitForAnyKey();
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
                    await waitForAnyKey();

                } else if (addOrDelete === "delete" && inputField.length > i) {
                    inputField.pop();
                    directUser(`Press delete`);
                    await waitForAnyKey();

                } else {
                    cycle--
                }
            }
        }   
    }

    // 5. Final result
    inputField.push(screenTimePassword[3]);
    directUser(`Press ${screenTimePassword[3]}`);
    await waitForAnyKey();
    console.log(`FInishing password: `, inputField);

    // 6. Matching Passwords
    const passwordsMatch = inputField.length === screenTimePassword.length && inputField.every((val, index) => val === screenTimePassword[index]);
    console.log(`\nDone! The passwords ${passwordsMatch ? "match!" : "do not match!"}\n`);
}

// 3. Master loop with confirmation

async function main() {

    let keepRunning = true;
    while (keepRunning) {
        try {
            await runSimulationOnce(screenTimePassword);

            const again = await askYesNo('\nDid it work okay? Run another?');
            if (!again) {
                keepRunning = false;
                console.log('Thank you for using!');
            }
        } catch (err) {
            if (err.message === 'QUIT') {
                console.log('\nSimulation stopped by user.');
                keepRunning = false;
            } else {
                console.error('Unexpected error:', err);
                keepRunning = false;
            }
        }
    }
    
    rl.close();
    process.stdin.setRawMode(false);
}

// 4. Run Simulation
main();