const amqp = require('amqplib');
const fs = require('fs');

require('dotenv').config();

const ca = [fs.readFileSync('rmq.pem')];

async function validateRabbitMQConnection(rabbitMqConnectionString) {
    let connection = null;
    try {
        connection = await amqp.connect(rabbitMqConnectionString);
        console.log('Connected successfully to RabbitMQ');
        return true;
    } catch (error) {
        console.error('Failed to connect to RabbitMQ', error);
        return false;
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Connection closed');
            } catch (err) {
                console.error('Failed to close the connection', err);
            }
        }
    }
}

async function manageRabbitMQConnection(rabbitMqConnectionString) {
    let validationStatus = await validateRabbitMQConnection(rabbitMqConnectionString);
    if (validationStatus) {
        console.log("RabbitMQ Connection validated successfully.");
    } else {
        console.error("Validation Error: Failed to connect to RabbitMQ.");
    }
}

const rabbitMQOptions = {
    protocol: 'amqps', // Use 'amqps' for secure connection
    hostname: process.env.RABBITMQ_HOSTNAME,
    port: 5671, // Change this to the RabbitMQ TLS port
    username: process.env.RABBITMQ_USERNAME,
    password: process.env.RABBITMQ_PASSWORD,
    locale: 'en_US',
    frameMax: 0,
    heartbeat: 0,
    ca: ca
};

const AMQP_CONNECTION_STRING = `amqps://${rabbitMQOptions.username}:${rabbitMQOptions.password}@${rabbitMQOptions.hostname}:${rabbitMQOptions.port}`;

manageRabbitMQConnection(AMQP_CONNECTION_STRING).catch(error => console.error(`Error managing connection: ${error}`));