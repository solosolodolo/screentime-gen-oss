async function runSimulationOnce(screenTimePassword) {
    let inputField = [];

    function directUser(action) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`${action}`);
    }

    function getIterationBarrier(j) {
        const minBarrier = 3;
        const maxBarrier = 15;
        const skew = 0.8 - (0.20 * j);
        const rand = Math.random();
        const skewedRand = Math.pow(rand, 1 - skew);
        return Math.floor(skewedRand * (maxBarrier - minBarrier + 1)) + minBarrier;
    }

    function getAddProbability(currentPosition, inputLength) {
        // Higher probability to add at the beginning
        if (currentPosition === 0) return 0.8;      // 80% add at position 0
        if (currentPosition === 1) return 0.6;      // 60% add at position 1
        if (currentPosition === 2) return 0.3;      // 30% add at position 2
        return 0.5;
    }

    directUser(`Secret password: ${screenTimePassword.join(' ')}`);

    for (let position = 0; position < 4; position++) {
        let iterationBarrier = getIterationBarrier(position);
        let cycle = 0;

        while (true) {
            cycle++;

            if (cycle > iterationBarrier) {
                // Time to lock in the correct digit
                while (inputField.length > position) {
                    inputField.pop();
                    directUser("Press delete");
                    await waitForKey();
                }
                
                inputField.push(screenTimePassword[position]);
                directUser(`Press ${screenTimePassword[position]}`);
                await waitForKey();
                break;
            }

            // Before the barrier, randomly add/delete
            const addProbability = getAddProbability(position, inputField.length);
            const shouldAdd = Math.random() < addProbability;

            if (shouldAdd && inputField.length < 4) {
                // Add a random digit
                const randomDigit = Math.floor(Math.random() * 10);
                inputField.push(randomDigit);
                directUser(`Press ${randomDigit}`);
                await waitForKey();
            } else if (!shouldAdd && inputField.length > position) {
                // Delete (but never go below current position)
                inputField.pop();
                directUser("Press delete");
                await waitForKey();
            }
            // If neither condition is met, skip this cycle (cycle++ without action)
        }
    }

    console.log(`\n\nFinishing password: `, inputField);

    const passwordsMatch = inputField.length === screenTimePassword.length && 
        inputField.every((val, index) => val === screenTimePassword[index]);
    
    console.log(`\nDone! The passwords ${passwordsMatch ? "match!" : "do not match!"}\n`);
}