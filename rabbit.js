const rabbitMQLib = require('amqplib');
const notifier = require('node-notifier');
const path = require('path');
require('dotenv').config();

const rabbitMQOptions = {
    protocol: 'amqps',
    hostname: process.env.RABBITMQ_HOSTNAME,
    port: 5671,
    username: process.env.RABBITMQ_USERNAME,
    password: process.env.RABBITMQ_PASSWORD
};

const exchangeName = process.env.EXCHANGE_NAME || 'core';
const topicName = process.env.TOPIC_NAME || 'banking';
const queueName = process.env.QUEUE_NAME || 'accounts';
const exchangeType = 'topic';

function getConnectionString() {
    return `${rabbitMQOptions.protocol}://${rabbitMQOptions.username}:${rabbitMQOptions.password}@${rabbitMQOptions.hostname}:${rabbitMQOptions.port}`;
}

const sendNotification = (messageData) => {
    notifier.notify({
        title: 'Core Notification',
        message: messageData,
        icon: path.join(__dirname, 'icon.png'),
        sound: false,
        appId: 'com.personal.weathernotifier',
        appIcon: path.join(__dirname, 'icon.png'),
    });
};

const setupRabbitMQ = async () => {
    try {
        const connection = await rabbitMQLib.connect(getConnectionString());
        const channel = await connection.createChannel();
        await channel.assertExchange(exchangeName, exchangeType, {durable: true});
        const { queue } = await channel.assertQueue(queueName, { exclusive: false });
        channel.bindQueue(queue, exchangeName, topicName);

        return { channel, queue };
    } catch (error) {
        console.error('Error setting up RabbitMQ:', error);
        throw error;
    }
};

const consumeAndAcknowledgeMessage = async (channel, queue) => {
    const timeoutDuration = process.env.TIMEOUT || 60000; // Set your desired timeout duration in milliseconds (e.g., 60 seconds)

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Message processing timeout exceeded (${timeoutDuration} ms)`));
        }, timeoutDuration);
    });

    const processMessagePromise = new Promise((resolve) => {
        channel.consume(queue, async (msg) => {
            try {
                console.log(msg.content.toString());
                const message = JSON.parse(msg.content.toString());
                if (message.processed) {
                    return;
                }
                console.log('Received message:', message);
                sendNotification(message.data);
                channel.publish(exchangeName, topicName, Buffer.from(JSON.stringify({...message, processed: true})));
            } catch (error) {
                console.log('Skipping error message');
            } finally {
                channel.ack(msg);
                resolve(); // Resolve the promise once the message is processed
            }
        });
    });

    // Use Promise.race to handle the first resolved promise (either timeout or successful message processing)
    await Promise.race([processMessagePromise, timeoutPromise]);
};

const runService = async () => {
    try {
        const { channel, queue } = await setupRabbitMQ();
        await consumeAndAcknowledgeMessage(channel, queue);
    } catch (error) {
        console.error('Error running service:', error);
    }
};

(async () => {
    await runService();
    // Rest of your code
})();
