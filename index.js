const cron = require('node-cron');
const express = require('express');
const axios = require('axios');
var fs = require('fs');
let stateResults = [];
const accountSid = '';
const authToken = '';
const client = require('twilio')(accountSid, authToken);
const bigResultSize = 100;

(async () => {
    try {
        await main();
        app = express();
        cron.schedule('*/10 * * * * *', async () => {
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

            let bigResult = (stateResult.totalVotes - existingState.totalVotes) > bigResultSize ? true : false;

            if (existingState.totalVotes !== stateResult.totalVotes) {
                fs.appendFileSync('results.txt', `${dateTime} Update in ${existingState.state}` + '\r\n');
                body += `Update in ${existingState.state}` + '\r\n';
            }

            if (existingState.donVotes !== stateResult.donVotes) {
                console.log(`Don just gained ${stateResult.donVotes - existingState.donVotes} in ${existingState.state} bringing him to ${(stateResult.donVotes / stateResult.totalVotes) * 100}%`);
                fs.appendFileSync('results.txt', `Don just gained ${stateResult.donVotes - existingState.donVotes} in ${existingState.state} bringing him to ${(stateResult.donVotes / stateResult.totalVotes) * 100}%` + '\r\n');
                body += `Don just gained ${stateResult.donVotes - existingState.donVotes} in ${existingState.state} bringing him to ${(stateResult.donVotes / stateResult.totalVotes) * 100}%` + '\r\n';
                existingState.donVotes = stateResult.donVotes;
            }

            if (existingState.joeVotes !== stateResult.joeVotes) {
                console.log(`Joe just gained ${stateResult.joeVotes - existingState.joeVotes} in ${existingState.state} bringing him to ${(stateResult.joeVotes / stateResult.totalVotes) * 100}%`);
                fs.appendFileSync('results.txt', `Joe just gained ${stateResult.joeVotes - existingState.joeVotes} in ${existingState.state} bringing him to ${(stateResult.joeVotes / stateResult.totalVotes) * 100}%` + '\r\n')
                body += `Joe just gained ${stateResult.joeVotes - existingState.joeVotes} in ${existingState.state} bringing him to ${(stateResult.joeVotes / stateResult.totalVotes) * 100}%` + '\r\n';
                existingState.joeVotes = stateResult.joeVotes;
            }

            if ((state === 'NV' ||
                state === 'AZ' ||
                state === 'GA' ||
                state === 'NC' ||
                state === 'PA') && bigResult) {

                if (existingState.totalVotes !== stateResult.totalVotes && bigResult) {
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