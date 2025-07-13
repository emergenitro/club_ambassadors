const { App } = require('@slack/bolt');
const Airtable = require('airtable-plus');
require('dotenv').config();

const referralTable = new Airtable({
    baseID: process.env.AIRTABLE_BASE_ID,
    apiKey: process.env.AIRTABLE_API_KEY,
    tableName: 'Referrals'
});

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN
});

function createNewCode(username) {
    const referralCode = 'HC_' + username.toUpperCase().substring(0, 3) + '_' + Math.random().toString(36).substring(2, 5).toUpperCase() + '_' + Date.now().toString(36).toUpperCase();
    return referralCode;
}


app.command('/referclub', async ({ command, ack, respond }) => {
    await ack();
    try {
        const userId = command.user_id;
        const displayName = command.real_name || command.user_name;

        const referralCodes = await referralTable.read({
            filterByFormula: `{slackID} = '${userId}'`
        });

        let referralCode;
        let isNewCode = false;

        if (!referralCodes || referralCodes.length === 0) {
            referralCode = createNewCode(displayName);
            await referralTable.create({
                'slackID': userId,
                'referralCode': referralCode,
                'createdAt': new Date().toISOString(),
                'referralCount': 0,
                'isActive': true
            });
            isNewCode = true;
        } else {
            referralCode = referralCodes[0].fields['referralCode'];
        }

        await respond({
            response_type: 'ephemeral',
            text: isNewCode ? `A new referral code has been generated! :ultrafastparrot:\n\nYour referral code is: \`${referralCode}\`.\n\nShare this code with your friends to use when they apply for a club on apply.hackclub.com!` : `Your existing referral code is: \`${referralCode}\`.\n\nShare this code with your friends to use when they apply for a club on apply.hackclub.com!`
        });

    } catch (error) {
        console.error('Error responding to command:', error);
        await respond({
            response_type: 'ephemeral',
            text: 'There was an error processing your request. Please try again later.'
        });
    }
});

app.command('/referralstats', async ({ command, ack, respond }) => {
    await ack();

    try {
        const userId = command.user_id;

        const referralCodes = await referralTable.read({
            filterByFormula: `{slackID} = '${userId}'`
        });

        if (!referralCodes || referralCodes.length === 0) {
            await respond({
                response_type: 'ephemeral',
                text: 'You do not have a referral code yet. Use `/referclub` to generate one.'
            });
            return;
        }

        const referralCode = referralCodes[0].fields['referralCode'];
        const referralCount = referralCodes[0].fields['referralCount'] || 0;
        const referralGeneratedAt = new Date(referralCodes[0].fields['createdAt']).toLocaleDateString();

        await respond({
            response_type: 'ephemeral',
            text: `Your referral code is: \`${referralCode}\`\n\nYou have referred ${referralCount} people so far! Keep sharing your code! ${(refferalCount = 0) ? ':rocket:' : ''}\n\nYour referral code was generated on: ${referralGeneratedAt}`
        });
    } catch (error) {
        console.error('Error responding to command:', error);
        await respond({
            response_type: 'ephemeral',
            text: 'There was an error processing your request. Please try again later.'
        });
    }
});

(async () => {
    await app.start();
    console.log('Referral bot is running!');
})();