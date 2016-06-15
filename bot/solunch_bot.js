var Botkit = require('../lib/Botkit.js');
var schedule = require('node-schedule');
require('dotenv').config();

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

controller.storage.teams.get('admins', function(err, data){
   if (data == null) {
      controller.storage.teams.save({id: 'admins', users: {}});
      console.log("Created admin file");
   }
});

controller.hears(['are you there'], ['direct_message','direct_mention','mention'], function(bot, message) {
   bot.reply(message,"I'm here!");
});

//*****************************************************************************************************************************//
//                                                          ADMINISTRATION                                                     //
//*****************************************************************************************************************************//
controller.hears('add admin (.*)', 'direct_message', function(bot, message) {
   controller.storage.teams.get('admins', function(err, data) {
      if (isEmpty(data.users) || data.users[message.user].hasOwnProperty('super')) {
         if (message.match[1][0] == "<" && message.match[1][1] == "@"){
            var addUser = message.match[1].split('<')[1].split('@')[1].split('>')[0];
            if (data.users.hasOwnProperty(addUser)) {
               bot.reply(message, "That user is already an admin!");
            } else {
               bot.api.users.info({user: addUser}, function(err, response) {
                  if (isEmpty(data.users)) {
                     data.users[addUser] = {name: response.user.real_name, super: true};
                  } else {
                     data.users[addUser] = {name: response.user.real_name};
                  }
                  controller.storage.teams.save(data);
                  bot.reply(message, "Successfully added new admin.");
                  setTimeout(function() {
                     listAdmins(bot, message);
                  }, 500);
               });
            }
         } else {
            bot.reply(message, "Sorry, but that is not a valid username. Use Slack's @mention to select a user to add as an admin.");
         }
      } else {
         bot.reply(message, "Sorry, you are not authorized to add admins.");
      }
   });
});

controller.hears('remove admin (.*)', 'direct_message', function(bot, message) {
   controller.storage.teams.get('admins', function(err, data) {
      if (data.users[message.user].hasOwnProperty('super')) {
         if (message.match[1][0] == "<" && message.match[1][1] == "@"){
            var remUser = message.match[1].split('<')[1].split('@')[1].split('>')[0];
            if (data.users.hasOwnProperty(message.user)) {
               delete data.users[remUser];
               controller.storage.teams.save(data);
               bot.reply(message, "Successfully removed admin.");
               setTimeout(function() {
                     listAdmins(bot, message);
               }, 500);
            } else {
               bot.reply(message, "That user is not an admin.");
            }
         } else {
            bot.reply(message, "Sorry, but that is not a valid username. Use Slack's @mention to select a user to remove admin priviledges.");
         }
      } else {
         bot.reply(message, "Sorry, you are not authorized to remove admins.");
      }
   });
});

controller.hears('list admins', 'direct_message', function(bot, message) {
   listAdmins(bot, message);
});

controller.hears('user status', 'direct_message', function(bot, message) {
   controller.storage.teams.get('admins', function(err, data) {
      if (data.users.hasOwnProperty(message.user)) {
         var notAttend = '', noAnswer = '';
         controller.storage.teams.get("users", function(err, data) {
            for (var id in data) {
               if (data[id].attending == false) {
                  if (notAttend === '') {
                     notAttend = data[id].name;
                  } else {
                     notAttend = notAttend.concat(", " + data[id].name);
                  }
               }
               if (data[id].answered == false) {
                  if (noAnswer === '') {
                     noAnswer = data[id].name;
                  } else {
                     noAnswer = noAnswer.concat(", " + data[id].name);
                  }
               }
            };
            bot.reply(message, "*Here are the users that will not be attending:*\n" + notAttend + "\n*Here are the users that have not answered:*\n" + noAnswer);
         });
      } else {
         bot.reply(message, "Sorry, you are not authorized to view this information.");
      }
   });
});

function listAdmins(bot, message) {
   controller.storage.teams.get('admins', function(err, data) {
      if (data.users.hasOwnProperty(message.user)) {
         var userList = '';
         for (var id in data.users) {
            if (userList === '') {
               userList = data.users[id].name;
            } else {
               userList = userList.concat(", " + data.users[id].name);
            }
         }
         bot.reply(message, "*Here is the list of admins:*\n" + userList);
      } else {
         bot.reply(message, "Sorry, you are not authorized to view admins.");
      }
   });
}

//*****************************************************************************************************************************//
//                                                          POLL STUFFS                                                        //
//*****************************************************************************************************************************//

schedule.scheduleJob({hour: 10, minute: 0, dayOfWeek: 4}, function() {
   startPoll();
});

controller.hears('options', 'direct_message', function(bot, message) {
   bot.reply(message, "Here are the poll options: \n1) Big bone bbq\n2) Chinese\n3) Dagwoods\n4) Indian\n5) McDonald's\n6) Pho\n7) Pizza\n8) Shawarma\n9) Thai\n10) Wiches cauldron\n11) The Works\n");
});

controller.hears('start poll', ['direct_mention', 'mention'], function(bot, message) {
   controller.storage.teams.get('admins', function(err, data) {
      if (data.users.hasOwnProperty(message.user)) {
         startPoll();
      } else {
         bot.reply(message, "Sorry, you are not authorized to launch a poll.");
      }
   });
});

controller.hears('vote (.*)', 'direct_message', function(bot, message) {
   controller.storage.teams.get('lunchSave', function(err, data) {
      if (data['status'] === 'open') {
         var vote = message.match[1];
         if (isNaN(parseInt(vote)) == false) {
            if (data.options.hasOwnProperty(vote)) {
               submitVote(bot, message, data, vote);
            } else {
               bot.reply(message, "Sorry, that is not an option. Type `options` to see valid numbers for voting.");
            }
         } else {
            var valid = false;
            for (var option in data.options) {
               if (vote === data.options[option].name.toLowerCase()) {
                  submitVote(bot,message, data, option);
                  valid = true;
               }
            }
            if (valid == false) {
               bot.reply(message, "Sorry, that is not an option. Type `options` to see valid options or make sure that your spelling is correct.");
            }
         }
      } else {
         bot.reply(message, "Sorry, but the poll is now closed. :sleeping:");
      }
   });
});

controller.hears(['close poll', 'end poll', 'stop poll'], ['direct_mention', 'mention'], function(bot, message) {
   controller.storage.teams.get('admins', function(err, data) {
      if (data.users.hasOwnProperty(message.user)) {
         closePoll();
      } else {
         bot.reply(message, "Sorry, you are not authorized to close a poll.");
      }
   });
});

controller.hears('status', 'direct_message', function(bot, message) {
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
            '11': {name: 'The Works', count: 0}
         }
      });

   bot.sendWebhook({text: "The lunch poll is now open!\nSolunch_bot should have sent you a message. If not, open a direct message with the bot to submit a vote.\nThe poll will automatically close in 2 hours. :timer_clock:"});

   var team = {id: 'users'};
   bot.api.users.list({}, function(err, response) {
      for (var i = 0; i < response.members.length; i++) {
         if (response.members[i].deleted == false && response.members[i].is_bot == false && response.members[i].name !== "slackbot") {
            team[response.members[i].id] = {name: response.members[i].real_name, answered: false, attending: true, vote: ''};
            bot.startPrivateConversation({'user': response.members[i].id}, function(err, convo) {
               convo.ask("Hey! It's time to submit your vote for Friday's lunch! Will you be joining us for lunch tomorrow?", [
                  {
                     pattern: bot.utterances.yes,
                     callback: function(response, convo) {
                        convo.say("Awesome! Whenever you're ready, submit a vote by typing `vote` and then the name or number of an option. Ask for help if you need more assistance!");
                        controller.storage.teams.get('users', function(err, data) {
                           data[response.user].answered = true;
                           controller.storage.teams.save(data);
                        });
                        convo.next();
                     }
                  },
                  {
                     pattern: bot.utterances.no,
                     callback: function(response, convo){
                        convo.say("Aw, ok :slightly_frowning_face:\nIf you change your mind, feel free to submit a vote!");
                        controller.storage.teams.get('users', function(err, data) {
                           data[response.user].attending = false;
                           data[response.user].answered = true;
                           controller.storage.teams.save(data);
                        });
                        convo.next();
                     }
                  }
               ]);
            });
         }
      }
      controller.storage.teams.save(team);
   });

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

function submitVote(bot, message, data, vote) {
   controller.storage.teams.get("users", function(err, user_data) {
      if (user_data[message.user].attending == false) {
         user_data[message.user].attending = true;
      }
      var name = user_data[message.user].name;
      if (user_data[message.user].vote !== '') {
         var previousVote = user_data[message.user].vote;
         data.options[previousVote].count--;
         data.options[vote].count++;
         bot.reply(message, "Thanks for revoting, " + name.split(" ")[0] +". You previously voted for: *" + data.options[previousVote].name +
            "*\nYour current vote is: *" + data.options[vote].name +
            "*\nVote again if you wish, I won't judge your indecisiveness! :wizard:");
      } else {
         data.options[vote].count++;
         bot.reply(message, "Thanks for voting, " + name.split(" ")[0] + ". You voted for: *" + data.options[vote].name +
            "*\nFeel free to vote again to change your vote. To see more commands, ask for help!");
      }
      user_data[message.user].vote = vote;
      controller.storage.teams.save(data);
      controller.storage.teams.save(user_data);
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

//*****************************************************************************************************************************//
//                                                      HELPER FUNCTIONS                                                       //
//*****************************************************************************************************************************//

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
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

//*****************************************************************************************************************************//
//                                                          CHAT STUFFS                                                        //
//*****************************************************************************************************************************//
var commands = "Here is a list of my commands:\n`status`: view the current status of the poll\n`options`: view valid options for voting\n`vote `: submit a vote using the name or number for an option\n";

controller.hears(['hello','hi','hey', 'good day sir'], 'direct_message', function(bot, message) {
   controller.storage.teams.get("users", function(err, user_data) {
      bot.reply(message, "Hey there " + user_data[message.user].name.split(" ")[0] + "! " + commands);
   });
});

controller.hears(['help', 'assist', 'assistance'], 'direct_message', function(bot, message) {
   bot.reply(message, commands + "If you need anymore assistance, please contact my creator.");
});

controller.hears('who is your creator', ['direct_message', 'direct_mention'], function(bot, message) {
   bot.reply(message, 'An is my creator!');
});

controller.hears('(.*)', 'direct_message', function(bot, message) {
   bot.reply(message, "Sorry, I don't understand. " + commands);
});
