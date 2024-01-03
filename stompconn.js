require('dotenv').config();
const express = require('express');
const {Client} = require('@stomp/stompjs');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

if (!process.env.WSS_ENDPOINT || !process.env.RABBITMQ_USERNAME || !process.env.RABBITMQ_PASSWORD || !process.env.EXCHANGE_NAME || !process.env.TOPIC_NAME || !process.env.STOMP_PORT) {
    throw new Error('Environment variables are not set correctly');
}

const {
    WSS_ENDPOINT,
    RABBITMQ_USERNAME,
    RABBITMQ_PASSWORD,
    EXCHANGE_NAME,
    TOPIC_NAME,
    STOMP_PORT
} = process.env;


const stompClient = configureStompClient();

function configureStompClient() {
    Client.WebSocketClass = WebSocket;
    return new Client({
        brokerURL: WSS_ENDPOINT,
        connectHeaders: {
            login: RABBITMQ_USERNAME,
            passcode: RABBITMQ_PASSWORD,
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        webSocketFactory: () => new WebSocket(WSS_ENDPOINT),
        onConnect: handleStompConnection,
        onStompError: handleStompError,
    });
}

function handleStompConnection(frame) {
    const subscribeDestination = `/exchange/${EXCHANGE_NAME}/${TOPIC_NAME}`;
    stompClient.subscribe(subscribeDestination, handleMessage);
    console.log('Connected:', frame);
}

function handleStompError(frame) {
    console.error('Broker reported error:', frame.headers['message']);
    console.error('Additional details:', frame.body);
}

function handleMessage(message) {
    let receivedMessage;
    try {
        receivedMessage = JSON.parse(message.body);
    } catch (error) {
        console.error('Received message is not valid JSON: ', message.body);
        return;
    }
    console.log('Received message: ', receivedMessage);
}

function publishMessage(message) {
    const messageStr = JSON.stringify(message);
    const publishDestination = `/exchange/${EXCHANGE_NAME}/${TOPIC_NAME}`;
    stompClient.publish({destination: publishDestination, body: messageStr});
}

stompClient.activate();

const app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
    req.requestTime = Date.now();
    next();
});

app.post('/publish', (req, res) => {
    const message = req.body;
    if (!stompClient.connected) {
        return res.status(503).send('Service Unavailable. STOMP client not connected.');
    }
    if (message) {
        publishMessage(message);
        const processingTime = Date.now() - req.requestTime;
        res.setHeader('X-Processing-Time', `${processingTime}ms`);
        return res.status(200).json({message: 'Message sent successfully'});
    } else {
        return res.status(400).json({error: 'Message text is empty'});
    }
});

const handleErrors = (err, req, res) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
};

app.use(handleErrors);

app.listen(STOMP_PORT || 3002, () => {
    console.log(`Server is running on port ${STOMP_PORT || 3002}`);
});