const {
    app,
    Tray,
    Menu
} = require('electron');
const path = require('path');
const weatherNotifier = require('./weather-notifier');
app.setAppUserModelId('com.personal.weathernotifier');
let tray = null;

app.on('ready', () => {
// Create a tray icon
    tray = new Tray(path.join(__dirname, 'icon.png'));

// Create a context menu for the tray
    const contextMenu = Menu.buildFromTemplate([{
        label: 'Exit',
        type: 'normal',
        click: () => app.quit()
    }]);

// Set the context menu for the tray
    tray.setToolTip('Weather Notifier');
    tray.setContextMenu(contextMenu);

// Start the weather notifier service
    weatherNotifier.runService();
});

// Don't show the app in the dock
if (app.dock) {
    app.dock.hide();
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});