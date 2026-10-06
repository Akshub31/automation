const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// These read your tokens safely from your cloud host settings
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// 1. Webhook Verification (Meta Handshake)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED successfully!');
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }
    return res.sendStatus(400);
});

// 2. Receive Real-Time Comments from Instagram
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'instagram') {
        for (const entry of body.entry) {
            const changes = entry.changes || [];
            for (const change of changes) {
                if (change.field === 'comments') {
                    await processComment(change.value);
                }
            }
        }
        return res.status(200).send('EVENT_RECEIVED');
    } else {
        return res.sendStatus(404);
    }
});

// 3. Check Trigger Keywords and Send DMs
async function processComment(commentData) {
    try {
        const text = commentData.text || '';
        const fromUser = commentData.from; // Contains username and user ID

        console.log(`New comment from @${fromUser.username}: "${text}"`);

        // Change these trigger words to whatever you want (e.g., "INFO", "GUIDE")
        const triggerKeywords = ['info', 'guide', 'price', 'link'];
        const lowerText = text.toLowerCase();

        const matchesTrigger = triggerKeywords.some(keyword => lowerText.includes(keyword));

        if (matchesTrigger) {
            const messageBody = `Hey @${fromUser.username}! Thanks for your comment. Here is the link you requested: https://example.com`;
            await sendInstagramDirectMessage(fromUser.id, messageBody);
        }
    } catch (error) {
        console.error('Error processing comment workflow:', error.message);
    }
}

// 4. Dispatch the Automated Direct Message via Graph API
async function sendInstagramDirectMessage(recipientId, messageText) {
    try {
        const url = `https://graph.facebook.com/v22.0/me/messages`;
        const payload = {
            recipient: { id: recipientId },
            message: { text: messageText }
        };

        const response = await axios.post(url, payload, {
            params: { access_token: PAGE_ACCESS_TOKEN }
        });

        console.log('Direct message sent successfully to recipient:', recipientId);
    } catch (error) {
        console.error('Failed to send DM:', error.response ? error.response.data : error.message);
    }
}

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Automation server running on port ${PORT}`);
});