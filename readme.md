# Solunch Bot

A bot designed for Solink's Slack team to handle lunch polls.

## Installation & Deployment

Clone this repository then head into the directory and use `npm install` to install all the necessary dependancies.

You will need to get a [bot token for Slack](https://my.slack.com/services/new/bot), set up [an incoming webhook integration](https://my.slack.com/services/new/incoming-webhook/) and get the [user IDs](https://api.slack.com/methods/users.list) of users that will be able to start and close polls. 

Edit `bot/solunch_bot.js` and put the user IDs into the `validUsers` array.

### In Linux/OSX

While in the `bot` folder, run:

```
token=<YOUR BOT TOKEN> webhook=<YOUR WEBHOOK URL> node solunch_bot.js
```

### In Windows

While in the `bot` folder, type the following commands into the command prompt:

```
set token=<YOUR BOT TOKEN>
set webhook=<YOUR WEBHOOK URL>
```

Then to run the bot:

```
node solunch_bot.js
```

### Deploy Indefinitely

If you would like to leave the bot running indefinitely, install the Forever node package:

```
npm install -g forever
```

When you're ready to run the bot, you can run the command on Windows or Linux/OSX:

```
forever start <COMMAND TO RUN BOT>
```

To stop the bot:

```
forever stop solunch_bot.js
```
