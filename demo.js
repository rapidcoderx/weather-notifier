const notifier = require('node-notifier');
const path = require('path');

const coulsonImagePath = path.join(__dirname, 'coulson.jpg');

// Create a new NotificationCenter instance (macOS only)
const nc = new notifier.NotificationCenter();
console.log(coulsonImagePath);
nc.notify(
    {
        title: 'Phil Coulson',           // Title of the notification
        subtitle: 'Agent of S.H.I.E.L.D.', // Subtitle of the notification
        message: "If I come out, will you shoot me? 'Cause then I won't come out.", // Body text
        sound: 'Funk',                   // Sound to play (names are case sensitive)
        wait: true,                      // Wait for user interaction before dismissing
        icon: coulsonImagePath,          // This will NOT change the notification icon on macOS
        contentImage: coulsonImagePath,  // Image to display within the notification
        open: 'file://' + coulsonImagePath // URL to open when the notification is clicked
    },
    function(error, response, metadata) {
        console.log('Error:', error);
        console.log('Response:', response);
        console.log('Metadata:', metadata);
    }
);