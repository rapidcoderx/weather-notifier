const express = require('express');
const bodyParser = require('body-parser');
const kafka = require('kafka-node');

require('dotenv').config();

class KafkaProducer {
    constructor(kafkaHost, kafkaTopic, useSASL, username, password) {
        this.kafkaHost = kafkaHost;
        this.kafkaTopic = kafkaTopic;
        this.useSASL = useSASL;
        this.username = username;
        this.password = password;

        this.kafkaOptions = this.useSASL === true
            ? {
                kafkaHost: this.kafkaHost,
                sasl: {
                    mechanism: 'scram-sha-512',
                    username: this.username,
                    password: this.password,
                },
                protocol: ['SASL_SSL'],
                connectTimeout: 60000,
                requestTimeout: 60000,
            }
            : {kafkaHost: this.kafkaHost};

        console.log(this.kafkaOptions);
        this.client = new kafka.KafkaClient(this.kafkaOptions);
        this.producer = new kafka.Producer(this.client);

        // Setup Express app
        this.app = express();
        this.port = process.env.KPUSH_PORT || 3001;
        this.app.use(bodyParser.json());

        // Handle producer ready event
        this.producer.on('ready', () => {
            console.log('Kafka producer is ready');
        });

        // Handle producer error event
        this.producer.on('error', (err) => {
            console.error('Kafka producer error:', err);
        });

        // Setup Express endpoint to receive messages
        this.app.post('/publish', this.publishMessage.bind(this));
    }

    // Express endpoint handler to publish messages to Kafka
    publishMessage(req, res) {
        // Stringify the whole body to be able to send via kafka
        const payload = JSON.stringify(req.body);

        if (!payload) {
            return res.status(400).json({ error: 'Payload is required in the request body' });
        }

        // Create a KeyedMessage object
        const keyedMessage = new kafka.KeyedMessage('', payload);

        // Create a ProduceRequest payload
        const payloads = [
            {
                topic: this.kafkaTopic,
                messages: [keyedMessage],
            },
        ];

        // Send the message to Kafka
        this.producer.send(payloads, (err, data) => {
            if (err) {
                console.error('Failed to send message to Kafka:', err);
                res.status(500).json({error: 'Failed to send message to Kafka'});
            } else {
                console.log('Message sent to Kafka:', data);
                res.status(200).json({status: 'success', message: 'Message sent to Kafka'});
            }
        });
    }

    // Start the Express server
    startServer() {
        this.app.listen(this.port, () => {
            console.log(`Express server is running on http://localhost:${this.port}`);
        });
    }
}

// Example usage
const kafkaProducer = new KafkaProducer(
    process.env.KAFKA_HOST || 'localhost:9092',
    process.env.KAFKA_TOPIC || 'your-kafka-topic',
    process.env.USE_SASL || false, // Set to true if SASL is required, false otherwise
    process.env.KAFKA_USERNAME, // Replace with your SASL username
    process.env.KAFKA_PASSWORD // Replace with your SASL password
);
kafkaProducer.startServer();
