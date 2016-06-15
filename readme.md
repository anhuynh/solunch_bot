# Solunch Bot

A bot designed for Solink's Slack team to handle lunch polls.

## Installation & Deployment

Clone this repository then head into the directory and use `npm install` to install all the necessary dependancies.

You will need to get a [bot token for Slack](https://my.slack.com/services/new/bot) and set up [an incoming webhook integration](https://my.slack.com/services/new/incoming-webhook/).

Go into the bot folder and create a new .env file. In the file, insert the following lines:
```
token=<YOUR BOT TOKEN>
webhook=<YOUR INCOMING WEBHOOK URL>
```

Then to deploy the bot, run:
```
node solunch_bot.js
```

### Deploy Indefinitely

If you would like to leave the bot running indefinitely, install the Forever node package:
```
npm install -g forever
```

When you're ready to run the bot, you can run the command:
```
forever start solunch_bot.js
```

To stop the bot:
```
forever stop solunch_bot.js
```

## First Deployment

When you first deploy the bot, you will need to grant yourself admin priviledges. Open a DM with the bot and send a message using this command:
```
add admin @<YOUR USERNAME>
```

Note that if you want to add yourself as an admin, you won't be able to use autocomplete from Slack's @mentions. **You have to type out your full username.** The very first user that is added as an admin will be given the **super** admin property. The super admin is the only user that will be able to add and remove admins.

## List of Commands

### Administrative Commands

The following must be direct messaged to the bot:

`add admin @<USERNAME>`: Adds the user as an admin (**super admin only**).

`remove admin @<USERNAME>`: Removes admin priviledges from the user (**super admin only**).

`list admins`: Gives a list of current admins.

`user status`: Lists the status of the poll. Displays users that have not answered or have answered that they are not attending.

### Poll Commands

The folowing must be called in the channel that the bot is in by direct mentioning the bot before the command:

`start poll`: Launches the lunch poll which will have the bot direct message all users (**admins only**).

`close poll`, `end poll`, `stop poll`: Closes the poll and announces the winner (**admins only**).

`options`: View a list of the poll options and numbers to vote for.

`status`: View the current status of the poll.

`vote <CHOICE>`: Submit a vote using the number or name of corresponding option.

`help`: View a list of available poll commands.
