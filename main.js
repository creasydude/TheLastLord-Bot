import fs from 'fs';
import axios from 'axios';
import cron from 'node-cron';
import figlet from 'figlet';
import chalk from 'chalk';
const payloadPath = './payload.json';

//Header
function renderHeader() {
    return async function () {
        return new Promise((resolve, reject) => {
            const Colors = {
                RESET: "\x1b[0m",
                YELLOW: "\x1b[33m",
                CYAN: "\x1b[36m",
                WHITE: "\x1b[37m"

            }
            process.stdout.write('\x1Bc');
            figlet('|| CREASY EVERYWHERE ||', (err, data) => {
                if (err) {
                    console.log('Something went wrong...');
                    console.dir(err);
                    reject(err);
                    return;
                }
                console.log(Colors.YELLOW + data + Colors.RESET);
                console.log('\n\n');
                resolve();
            });
        });
    };
}
const header = renderHeader();

//Variables
const SLEEP_DLY = 2500
const POST_DAILY_CHECKIN_PATH = "https://thelastlord.games/api/checkin"

const colorMap = {
    'sky blue': chalk.hex('#87CEEB'), // Sky blue color
    'white': chalk.white,
    'red': chalk.red,
    'yellow': chalk.yellow,
    'green lime': chalk.hex('#00FF00') // Lime green color
};

//Utils
function betterConsoleLog(message, color = 'white') {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0]; // Extracts the time in HH:MM:SS format

    // Get the desired color from the colorMap, default to white if not found
    const messageColor = colorMap[color.toLowerCase()] || chalk.white;

    // Log with white timestamp and colored message
    console.log(`${chalk.white(`[${time}]`)} ${messageColor(message)}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


//AXIOS CALLS
async function makePostRequest(url, postData) {
    try {

        const response = await axios.post(url, postData, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
            }
        });

        return response.data
    } catch (error) {
        // Check if error.response exists to handle different types of errors
        if (error.response) {
            // Server responded with a status code out of the 2xx range
            return {
                data: error.response.data, // The response data from the server
                status: error.response.status, // The HTTP status code (e.g., 400)
                message: error.response.statusText // The status text (e.g., "Bad Request")
            };
        } else if (error.request) {
            // The request was made but no response was received
            return {
                data: null,
                status: null,
                message: 'No response received from the server. Please check your network connection.',
            };
        } else {
            // Something happened in setting up the request that triggered an error
            return {
                data: null,
                status: null,
                message: `Request error: ${error.message}`,
            };
        }
    }
}


//First , Get Json Array And Make It Js Array
function getPayloadFromJSON() {
    try {
        const data = fs.readFileSync(payloadPath, 'utf8');
        const payload = JSON.parse(data);
        return payload;
    } catch (err) {
        betterConsoleLog("Error reading or parsing payload.json:", err);
        return [];
    }
}

//Main Functions
async function main() {

    try {
        const payloadArray = await getPayloadFromJSON()

        // Post each item in the payload array to the API
        for (const item of payloadArray) {
            const { wallet, secure_token } = item;
            const payload = { wallet, secure_token };
            betterConsoleLog(`[INFO] Checking In For Wallet: ${wallet}`, "yellow");
            const response = await makePostRequest(POST_DAILY_CHECKIN_PATH, payload);
            betterConsoleLog(`[ACTION] Success : ${response?.status} ,Message:${response?.message}, Consecutive days: ${response?.consecutive_days}`, "green lime")
            await sleep(SLEEP_DLY)
        }
    } catch (error) {
        betterConsoleLog(`Error: ${error}`, "red");
    }
}


async function scheduledTask() {
    try {
        await header()
        await main();
        betterConsoleLog(`[INFO] Finished , Waiting For 24H`, "sky blue");
    } catch (error) {
        betterConsoleLog(`[ERROR] An error occurred during scheduledTask execution: ${error}`, "red");
    }
}
scheduledTask().then(() => {
    // Schedule the task to run every 3 hours
    cron.schedule('0 0 * * *', async () => {
        betterConsoleLog('[INFO] Cron job Started', "yellow");
        await scheduledTask();
    });
})

