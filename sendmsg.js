const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqplib');
const kafka = require('kafka-node');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000; // Change this to your desired port

// RabbitMQ's connection details with TLS
const rabbitMQOptions = {
    protocol: 'amqps', // Use 'amqps' for secure connection
    hostname: process.env.RABBITMQ_HOSTNAME,
    port: 5671, // Change this to the RabbitMQ TLS port
    username: process.env.RABBITMQ_USERNAME,
    password: process.env.RABBITMQ_PASSWORD,
    locale: 'en_US',
    frameMax: 0,
    heartbeat: 0
};

const kafkaHost = process.env.KAFKA_HOST || 'localhost:9092';
const username = process.env.KAFKA_USERNAME;
const password = process.env.KAFKA_PASSWORD;
const useSASL = process.env.USE_SASL || false;
let kafkaOptions;

const exchangeName = process.env.EXCHANGE_NAME || 'core';
const topicName = process.env.TOPIC_NAME || 'banking';
const SUCCESS_MESSAGE = 'Message published to RabbitMQ';
const FAILURE_MESSAGE = 'Failed to publish message to RabbitMQ';
let channel = null;

//Initial connect to RabbitMQ and channel create
const AMQP_CONNECTION_STRING = `amqps://${rabbitMQOptions.username}:${rabbitMQOptions.password}@${rabbitMQOptions.hostname}:${rabbitMQOptions.port}`;

if (useSASL === true) {
    kafkaOptions = {
        kafkaHost,
        sasl: {
            mechanism: 'scram-sha-512',
            username,
            password
        },
        protocol: ['SASL_SSL'],
        connectTimeout: 1000,
        requestTimeout: 1000
    };
} else {
    kafkaOptions = {kafkaHost};
}

const setupRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(AMQP_CONNECTION_STRING);
        const currentChannel = await connection.createChannel();

        await currentChannel.assertExchange(exchangeName, 'topic', {durable: true});

        channel = currentChannel;

        console.log('Connected to RabbitMQ successfully.');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
    }
};

// Call the setupRabbitMQ function
(async () => {
    await setupRabbitMQ();
    // Rest of your code
})();

app.use(bodyParser.json());

const sendJsonResponse = (res, status, message, error) => {
    const responseContent = error
        ? {status, message, error: error.message}
        : {status, message};
    const statusCode = status === 'success' ? 200 : 500;

    res.status(statusCode).json(responseContent);
};

// Express endpoint to receive a message and publish it to RabbitMQ
const publishToRabbitMQ = (channel, exchangeName, topicName, bufferContent) => {
    channel.publish(exchangeName, topicName, bufferContent);
};

const publishMessage = async (req, res) => {
    console.log(req.body);
    const bufferContent = Buffer.from(JSON.stringify(req.body));
    const startTime = Date.now();

    if (channel) {
        publishToRabbitMQ(channel, exchangeName, topicName, bufferContent);
        const elapsedTime = Date.now() - startTime;
        res.set('Processing-Time', `${elapsedTime}ms`);
        sendJsonResponse(res, 'success', SUCCESS_MESSAGE);
    } else {
        const elapsedTime = Date.now() - startTime;
        res.set('Processing-Time', `${elapsedTime}ms`);
        console.error('Failed to publish message to RabbitMQ due to connection error');
        sendJsonResponse(res, 'failure', FAILURE_MESSAGE, {message: 'Connection error'});
    }
};

// Then, attach the route handler to the proper route

app.post('/publish', publishMessage);

const client = new kafka.KafkaClient(kafkaOptions);

const consumer = new kafka.Consumer(client, [{topic: process.env.KAFKA_TOPIC || 'your-kafka-topic'}], {autoCommit: true});

consumer.on('message', function (message) {
    console.log('Received message from Kafka:', message.value);

    // Convert string message to buffer
    const bufferContent = Buffer.from(message.value);

    if (channel) {
        publishToRabbitMQ(channel, exchangeName, topicName, bufferContent);
        console.log('Message published to RabbitMQ successfully');
    } else {
        console.error('Failed to publish message to RabbitMQ due to connection error');
    }
});

consumer.on('error', function (error) {
    console.error('Failed to receive message from Kafka:', error);
});
// Start the Express server
app.listen(port, () => {
    console.log(`Express server is running on http://localhost:${port}`);
});
