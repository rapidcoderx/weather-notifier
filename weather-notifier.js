const notifier = require('node-notifier');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

// Define the external data source
const dataUrl = "https://api.weatherapi.com/v1/current.json?key=process.env.WEATHER_KEY&q=Calgary";

// Function to fetch data from the external source
const fetchData = () => {
    return axios.get(dataUrl)
        .then(response => response.data)
        .catch(error => {
            throw error;
        });
};

// Function to send a notification
const sendNotification = (data, name) => {
    const {
        current
    } = data;
    const {
        temp_c,
        feelslike_c
    } = current;

// Send the notification
    notifier.notify({
            title: `Weather in ${name}`,
            message: `Current temperature: ${temp_c}°C\nFeels like: ${feelslike_c}°C`,
            icon: path.join(__dirname, 'icon.png'),
            sound: false,
            appId: 'com.personal.weathernotifier', // Change this to the name you want to display
            appIcon: path.join(__dirname, 'icon.png'),
        },
        function () {
        });
};

// Function to run the service
const runService = async () => {
// Fetch data from the external source
    const data = await fetchData();

// Get the city name from the data
    const name = data.location.name;

// Send the first notification immediately
    sendNotification(data, name);

// Schedule subsequent notifications every 30 seconds
    setInterval(() => {
        sendNotification(data, name);
    }, 30 * 1000);
};

module.exports.runService = runService;