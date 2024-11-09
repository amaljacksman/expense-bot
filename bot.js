const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const fs = require('fs');
const { TELEGRAM_BOT_TOKEN } = require('./env.js');

const app = express();
const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// CORS configuration
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
};

// Use CORS middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Path to the JSON file
const dataFilePath = 'expense_data.json';

// Create the JSON file if it doesn't exist
fs.access(dataFilePath, fs.constants.F_OK, (err) => {
    if (err) {
        console.log('JSON file does not exist. Creating a new one...');
        const initialData = {
            users: [],
            categories: []
        };
        fs.writeFileSync(dataFilePath, JSON.stringify(initialData));
    }
});

// Function to add a user to the JSON file if they don't exist
function addUserToJSON(chatId, username) {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            return;
        }

        const usersData = JSON.parse(data);
        if (!usersData.users.some(user => user.chatId === chatId)) {
            usersData.users.push({ chatId, username, expenses: [], organizations: [], events: [], categories: [] });
            fs.writeFile(dataFilePath, JSON.stringify(usersData, null, 2), (writeErr) => {
                if (writeErr) {
                    console.error('Error writing to JSON file:', writeErr);
                } else {
                    console.log(`User with chatId ${chatId} added to JSON file.`);
                }
            });
        }
    });
}

// Function to add an expense for a user
function addExpenseToUser(chatId, expense, category) {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            return;
        }

        const usersData = JSON.parse(data);
        const user = usersData.users.find(user => user.chatId === chatId);
        if (user) {
            user.expenses.push(expense);
            const categoryIndex = user.categories.findIndex(cat => cat.category === category);
            if (categoryIndex !== -1) {
                user.categories[categoryIndex].count++;
            }
            fs.writeFile(dataFilePath, JSON.stringify(usersData, null, 2), (writeErr) => {
                if (writeErr) {
                    console.error('Error writing to JSON file:', writeErr);
                } else {
                    console.log(`Expense added for user with chatId ${chatId}.`);
                }
            });
        } else {
            console.log(`User with chatId ${chatId} not found.`);
        }
    });
}

// Start command with options
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    addUserToJSON(chatId, username); // Add the user to the JSON file

    const welcomeMessage = 'Welcome to the Expense Tracker! Choose an option:';
    const options = {
     
        reply_markup: {
          

            keyboard: [
                ['Add Expense', 'Create Event'],
                ['Select Organization', 'Create Organization']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
    bot.sendMessage(chatId, welcomeMessage, options);
});

// Handle button presses
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    switch (msg.text) {
        case 'Add Expense':
            bot.sendMessage(chatId, 'Please enter the expense amount and category (e.g., "100 Food"):');
            bot.once('message', (msg) => {
                const expenseDetails = msg.text.split(' ');
                if (expenseDetails.length === 2) {
                    const expenseAmount = parseFloat(expenseDetails[0]);
                    const category = expenseDetails[1];
                    addExpenseToUser(chatId, { amount: expenseAmount, date: new Date().toISOString() }, category);
                    bot.sendMessage(chatId, 'Expense recorded successfully!');
                } else {
                    bot.sendMessage(chatId, 'Invalid format. Please use "amount category".');
                }
            });
            break;

        case 'Create Event':
            bot.sendMessage(chatId, 'Please enter the name of the event and the date (e.g., "Birthday 2023-12-25"):');
            bot.once('message', (msg) => {
                const eventDetails = msg.text.split(' ');
                if (eventDetails.length === 2) {
                    const eventName = eventDetails[0];
                    const eventDate = eventDetails[1];
                    // Logic to save the event can be added here
                    bot.sendMessage(chatId, `Event "${eventName}" on ${eventDate} created successfully!`);
                } else {
                    bot.sendMessage(chatId, 'Invalid format. Please use "event_name event_date".');
                }
            });
            break;

        case 'Select Organization':
            // Logic to handle organization selection can be added here
            bot.sendMessage(chatId, 'Please select an organization from the list.');
            break;

        case 'Create Organization':
            bot.sendMessage(chatId, 'Please enter the name of the organization:');
            bot.once('message', (msg) => {
                const organizationName = msg.text;
                // Logic to save the organization can be added here
                bot.sendMessage(chatId, `Organization "${organizationName}" created successfully!`);
            });
            break;

        default:
            bot.sendMessage(chatId, 'Please choose an option from the menu.');
            break;
    }
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
