var Botkit = require('../lib/Botkit.js');
var schedule = require('node-schedule');
var name, validUsers = [];

if (!process.env.token) {
   console.log('Error: Specify token in environment');
   process.exit(1);
}

var controller = Botkit.slackbot({
   debug: false,
   json_file_store: 'solunch-bot-storage'
});

var bot = controller.spawn({
   token: process.env.token,
   incoming_webhook: {url: process.env['webhook']}
}).startRTM(function(err) {
   if (err) {
      throw new Error(err);
   }
});

controller.hears(['are you there'], ['direct_message','direct_mention','mention'], function(bot, message) {
   bot.reply(message,"I'm here!");
});

//*****************************************************************************************************************************//
//                                                          POLL STUFFS                                                        //
//*****************************************************************************************************************************//

schedule.scheduleJob({hour: 10, minute: 0, dayOfWeek: 4}, function() {
   startPoll();
});

controller.hears('poll options', 'direct_message', function(bot, message) {
   bot.reply(message, "Here are the poll options: \n1) Big bone bbq\n2) Chinese\n3) Dagwoods\n4) Indian\n5) McDonald's\n6) Pho\n7) Pizza\n8) Shawarma\n9) Thai\n10) Wiches cauldron\n11) The works\n");
});

controller.hears('start poll', ['direct_mention', 'mention'], function(bot, message) {
   if (validUsers.indexOf(message.user) != -1) {
      startPoll();
   } else {
      bot.reply(message, "Sorry, you are not authorized to launch a poll.");
   }
});

controller.hears('vote (.*)', 'direct_message', function(bot, message) {
   controller.storage.teams.get('lunchSave', function(err, data) {
      if (data['status'] === 'open') {
         var vote = message.match[1];
         if (data.options.hasOwnProperty(vote)) {
            bot.api.users.info({user: message.user}, function(err, response) {
               if (err) { 
                  bot.reply(message, "Sorry, I don't think you exist! :ghost:");
               } else {
                  if (data.userVotes.hasOwnProperty(response.user.real_name)) {
                     var previousVote = data.userVotes[response.user.real_name];
                     data.options[previousVote].count--;
                     data.options[vote].count++;
                     bot.reply(message, "Thanks for revoting, " + response.user.profile.first_name +". You previously voted for: *" + data.options[previousVote].name +
                        "*\nYour current vote is: *" + data.options[vote].name + 
                        "*\nVote again if you wish, I won't judge your indecisiveness! :wizard:");
                  } else {
                     data.options[vote].count++;
                     bot.reply(message, "Thanks for voting, " + response.user.profile.first_name + ". You voted for: *" + data.options[vote].name + 
                        "*\nFeel free to vote again to change your vote. To see more commands, see the list in Pinned Items.");
                  }
                  data.userVotes[response.user.real_name] = vote;
                  controller.storage.teams.save(data);
               }
            });
         } else {
            bot.reply(message, "Sorry, that is not an option. Type  `poll options` or see the Pinned Items for number orders.");
         }
      } else {
         bot.reply(message, "Sorry, but the poll is now closed. :sleeping:");
      }
   });
});

controller.hears('close poll', ['direct_mention', 'mention'], function(bot, message) {
   if (validUsers.indexOf(message.user) != -1) {
      closePoll();
   } else {
      bot.reply(message, "Sorry, you are not authorized to close a poll.");
   }
});

controller.hears('poll status', 'direct_message', function(bot, message) {
   controller.storage.teams.get('lunchSave', function(err, data) {
      var results = '',
      status = 'Poll status: *' + data['status'] + '*',
      winning = winningOption(data);
      for (var option in data.options) {
         results = results.concat("\n" + data.options[option].name + ": " + data.options[option].count);
      }
      if (data.status === 'closed') {
         status = status.concat("\nWinner: *" + data['winner'] + "*");
      } else {
         status = status.concat("\nCurrently in the lead: *" + winning['name'] + "*");
      }
      bot.reply(message, 
               {text: status + '\nHere are the current results: ', 
                  attachments: [
                     {
                        text: results,
                        color: "#7CD197"
                     }
                  ]
               }
      );
   });
});

function startPoll() {
   controller.storage.teams.save(
      {
         id: 'lunchSave',
         status: 'open',
         userVotes: {},
         options: {
            '1':  {name: 'Big Bone Bbq', count: 0},
            '2':  {name: 'Chinese', count: 0},
            '3':  {name: 'Dagwoods', count: 0},
            '4':  {name: 'Indian', count: 0},
            '5':  {name: 'McDonalds', count: 0},
            '6':  {name: 'Pho', count: 0},
            '7':  {name: 'Pizza', count: 0},
            '8':  {name: 'Shawarma', count: 0},
            '9':  {name: 'Thai', count: 0},
            '10': {name: 'Wiches Cauldron', count: 0},
            '11': {name: 'The works', count: 0}
         }
      });

   bot.sendWebhook({text: "The lunch poll is now open!\nType `@solunch_bot vote` and then the number of an option. To see the numbers and options, type `poll options`.\nThe poll will automatically close in 2 hours. :timer_clock:"});

   setTimeout(function() {
      controller.storage.teams.get('lunchSave', function(err, data) {
         if (data['status'] === 'open') {
            closePoll();
         }
      });
   }, 2 * 3600000);
}

function closePoll() {
   controller.storage.teams.get('lunchSave', function(err, data) {
      data['status'] = 'closed';
      var winner = winningOption(data);
      data['winner'] = winner['name'][0];
      bot.sendWebhook({text: "The lunch poll is now closed.\n:tada: The winner is *" + winner['name'][0] + "* with " + winner['votes'] + " votes! :tada:"});
      controller.storage.teams.save(data);
   });
}

function winningOption(data) {
   var winner = {name: [''], votes: 0};
   for (var option in data.options) {
      if (data.options[option].count > winner.votes) {
         winner = {name: [data.options[option].name], votes: data.options[option].count};
      } else if(data.options[option].count == winner.votes) {
         winner['name'].push(data.options[option].name);
      }
   }
   shuffleArray(winner['name']);
   return winner;
}

/*
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
