const cron = require('node-cron');
const express = require('express');
const axios = require('axios');
var fs = require('fs');
let stateResults = [];
const accountSid = '';
const authToken = '';
const client = require('twilio')(accountSid, authToken);
const bigResultSize = 500;
const battlegroundStates = ["NV", "AZ", "GA", "NC", "PA"];

(async () => {
    try {
        await main();
        app = express();
        cron.schedule('*/30 * * * *', async () => {
            await main();
        });
        app.listen(3000);
    } catch (e) {
        console.log(e);
        throw e;
    }
})();

async function main() {
    let lastUpdated = await axios.get(
        'https://interactive.guim.co.uk/2020/11/us-general-election-data/prod/last_updated.json'
    );

    let states = (await axios.get(
        `https://interactive.guim.co.uk/2020/11/us-general-election-data/prod/data-out/${lastUpdated.data.time}/president_details.json`
    )).data;

    for (const state in states) {
        let stateData = states[state];

        let stateResult = {};

        stateResult.state = state;
        stateResult.totalVotes = stateData.totalVotes;
        stateResult.joeVotes = stateData.candidates.filter(x => x.party.toLowerCase() === 'd')[0].votes;
        stateResult.donVotes = stateData.candidates.filter(x => x.party.toLowerCase() === 'r')[0].votes;

        let existingState = stateResults.filter(x => x.state === state);
        if (existingState[0]) {
            existingState = existingState[0];
            var today = new Date();
            var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
            var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
            var dateTime = date + ' ' + time;

            let body = "";

            let resultChange = false;
            let bigResult = (stateResult.totalVotes - existingState.totalVotes) > bigResultSize ? true : false;
    
            if (existingState.totalVotes !== stateResult.totalVotes) {
                fs.appendFileSync('results.txt', `${dateTime} Update in ${existingState.state}` + '\r\n');
                console.log(`${dateTime} Update in ${existingState.state}` + '\r\n');
                body += `Update in ${existingState.state}` + '\r\n';
                resultChange = true;
            }

            if (existingState.donVotes !== stateResult.donVotes) {
                let message = `Don gained ${stateResult.donVotes - existingState.donVotes} in ${existingState.state}` + '\r\n';
                console.log(message);
                fs.appendFileSync('results.txt', message);
                body += message;
                existingState.donVotes = stateResult.donVotes;
            }

            if (existingState.joeVotes !== stateResult.joeVotes) {
                let message = `Don gained ${stateResult.donVotes - existingState.donVotes} in ${existingState.state}` + '\r\n';
                console.log(message);
                fs.appendFileSync('results.txt', message);
                body += message;
                existingState.joeVotes = stateResult.joeVotes;
            }

            let donSummaryMessage = `Don: ${(stateResult.donVotes / stateResult.totalVotes) * 100}%` + '\r\n'
            let joeSummaryMessage = `Joe: ${(stateResult.joeVotes / stateResult.totalVotes) * 100}%` + '\r\n'
            if (resultChange) {
                console.log(donSummaryMessage);
                console.log(joeSummaryMessage);
                fs.appendFileSync('results.txt', donSummaryMessage);
                fs.appendFileSync('results.txt', joeSummaryMessage);
            }

            if (battlegroundStates.includes(state) && bigResult) {
                if (existingState.totalVotes !== stateResult.totalVotes && bigResult) {
                    body += donSummaryMessage;
                    body += joeSummaryMessage;
                    await client.messages
                        .create({
                            body: body,
                            from: '',
                            to: ''
                        });
                }
            }

            existingState.totalVotes = stateResult.totalVotes;
        }
        else {
            if (stateResult.state !== 'US') {
                stateResults.push(stateResult);
            }
        }
    }
}