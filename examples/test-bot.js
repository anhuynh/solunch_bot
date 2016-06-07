
var Botkit = require('../lib/Botkit.js');
var name, userID = '__YOUR USER ID__';

process.env['token'] = '__BOT TOKEN__';

if (!process.env.token) {
   console.log('Error: Specify token in environment');
   process.exit(1);
}

var controller = Botkit.slackbot({
   debug: false,
   json_file_store: 'solunch-bot-storage'
});

controller.spawn({
   token: process.env.token
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

controller.hears('poll options', 'direct_mention', function(bot, message) {
   bot.reply(message, "Here are the poll options: \n1) Big bone bbq\n2) Chinese\n3) Dagwoods\n4) Indian\n5) McDonald's\n6) Pho\n7) Pizza\n8) Shawarma\n9) Thai\n10) Wiches cauldron\n11) The works\n");
});

controller.hears('start poll', ['direct_mention', 'mention'], function(bot, message) {
   controller.storage.channels.save(
      {
         id: message.channel,
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
      }, function(err, id) {
      bot.reply(message, "The lunch poll is now open!\nType `@solunch_bot vote` and then the number of an option. To see the numbers and options, type `poll options`.\nThe poll will automatically close in 2 hours. :timer_clock:");
   });

   setTimeout(function() {
      controller.storage.channels.get(message.channel, function(err, channel_data) {
         if (channel_data['status'] === 'open') {
            closePoll(bot, message);
         }
      });
   }, 2 * 3600000);
});

controller.hears('vote (.*)', 'direct_mention', function(bot, message) {
   controller.storage.channels.get(message.channel, function(err, channel_data) {
      if (channel_data['status'] === 'open') {
         var vote = message.match[1];
         if (channel_data.options.hasOwnProperty(vote)) {
            bot.api.users.info({user: message.user}, function(err, response) {
               if (err) { 
                  bot.reply(message, "Sorry, I don't think you exist! :ghost:");
               } else {
                  if (channel_data.userVotes.hasOwnProperty(response.user.real_name)) {
                     var previousVote = channel_data.userVotes[response.user.real_name];
                     channel_data.options[previousVote].count--;
                     channel_data.options[vote].count++;
                     bot.reply(message, "Thanks for revoting, " + response.user.profile.first_name +". You previously voted for: *" + channel_data.options[previousVote].name +
                        "*\nYour current vote is: *" + channel_data.options[vote].name + 
                        "*\nVote again if you wish, I won't judge your indecisiveness! :wizard:");
                  } else {
                     channel_data.options[vote].count++;
                     bot.reply(message, "Thanks for voting, " + response.user.profile.first_name + ". You voted for: *" + channel_data.options[vote].name + 
                        "*\nFeel free to vote again to change your vote. To see more commands, see the list in Pinned Items.");
                  }
                  channel_data.userVotes[response.user.real_name] = vote;
                  controller.storage.channels.save(channel_data);
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
   closePoll(bot, message);
});

controller.hears('poll status', 'direct_mention', function(bot, message) {
   controller.storage.channels.get(message.channel, function(err, channel_data) {
      var results = '',
      status = 'Poll status: *' + channel_data['status'] + '*';
      for (var option in channel_data.options) {
         results = results.concat("\n" + channel_data.options[option].name + ": " + channel_data.options[option].count);
      }
      if (channel_data.status === 'closed') {
         status = status.concat("\nWinner: *" + channel_data['winner'] + "*");
      };
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

function closePoll(bot, message) {
   controller.storage.channels.get(message.channel, function(err, channel_data) {
      channel_data['status'] = 'closed';
      var winner = {name: [''], votes: 0};
      for (var option in channel_data.options) {
         if (channel_data.options[option].count > winner.votes) {
            winner = {name: [channel_data.options[option].name], votes: channel_data.options[option].count};
         } else if(channel_data.options[option].count == winner.votes) {
            winner['name'].push(channel_data.options[option].name);
         }
      }
      shuffleArray(winner['name']);
      channel_data['winner'] = winner['name'][0];
      controller.storage.channels.save(channel_data, function(err, id) {
         bot.reply(message, "The lunch poll is now closed.\n:tada: The winner is *" + winner['name'][0] + "* with " + winner['votes'] + " votes! :tada:");
      });
   });
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

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

controller.hears(['hello','hi','hey', 'good day sir'], ['direct_message','direct_mention','mention'], function(bot, message){
   bot.startConversation(message, function(err, convo) {
      bot.api.users.info({user: message.user}, function(err, response) {
         convo.say("Hey there " + response.user.profile.first_name + "!");
         convo.ask("Are you hungry?", [
            {
               pattern: bot.utterances.yes,
               callback: function(response, convo) {
                  convo.say("Oh no! Let me help you out. Ask me for `menu` and I'll give you a list of what you can choose from.");
                  convo.next();
               }
            },
            {
               pattern: bot.utterances.no,
               callback: function(response, convo){
                  convo.say("Ok, have a great day then! :smiley:");
                  convo.next();
               }
            }
         ]);
      });
   });
});

controller.hears('menu', ['direct_message','direct_mention','mention'], function(bot, message) {
   bot.reply(message, "DM me one of the keywords. Here is what I have available:\n\n*Pizza:* `pizzatime`\n*Thai:* `thai`")
});

//*****************************************************************************************************************************//
//                                                          FOOD ORDERING                                                      //
//*****************************************************************************************************************************//

controller.hears(['thai'], ['direct_message'], function(bot, message) {
   bot.startConversation(message, function(err, convo) {
      convo.say("Take a look at the lunch menu! sabaithaicuisine.ca/#!lunch/c23f6");
      convo.ask("Choose from the stir fry, curry, or stir fry noodles. Which dish would you like?", function(response, convo) {
         convo.ask("What type of meat/tofu? (Beef, chicken or tofu)", function(response, convo) {
            convo.ask("What spice level? (0 star to 5 star) :hot_pepper:", function(response, convo) {
               convo.next();
            }, {'key': 'spice'});
            convo.next();
         }, {'key': 'meat'});
         convo.next();
      }, {'key': 'type'});

      convo.on('end', function() {
         if (convo.status == 'completed') {
            var type = convo.extractResponse('type'),
               meat = convo.extractResponse('meat'),
               spice = convo.extractResponse('spice');

            bot.reply(message, "Your order has been received! :+1:");

            bot.startPrivateConversation({'user': userID}, function(err, convo) {
               bot.api.users.info({user: message.user}, function(err, response) {
                  name = response.user.real_name;
                  convo.say(
                     {text:"*" + name + "*",
                     username: "Thai Bot",
                     icon_emoji:":flag-th:",
                        attachments: [
                        {
                           text: "Dish: " + type + "\nMeat: " + meat + "\nSpice: " + spice,
                           color: "#7CD197"
                        }
                        ]
                     }
                  );
               });
            });
         } else {
               // this happens if the conversation ended prematurely for some reason
               bot.reply(message, 'OK, nevermind!');
         }
      });

   });
});


controller.hears(['pizzatime'],['direct_message'],function(bot, message) {
   console.log(message.channel);
   bot.startConversation(message, function(err, convo) {
      convo.ask("What kind of pizza do you want?", function(response, convo) {
         convo.ask("How many slices?", function(response, convo) {
         convo.next();
         }, {'key': 'num'});
         convo.next();
      }, {'key': 'type'});

      convo.on('end', function() {
         if (convo.status == 'completed') {
            var type = convo.extractResponse('type'),
               number = convo.extractResponse('num');
            
            bot.reply(message, "Your order has been received! :+1:");

            bot.startPrivateConversation({'user': userID}, function(err, convo) {
               bot.api.users.info({user: message.user}, function(err, response) {
                  name = response.user.real_name;
                  convo.say(
                     {text:"*" + name + "*",
                     username: "Pizza Bot",
                     icon_emoji:":pizza:",
                        attachments: [
                        {
                           text: "Type: " + type + "\nNumber of slices: " + number,
                           color: "#7CD197"
                        }
                        ]
                     }
                  );
               });
            });
         } else {
               // this happens if the conversation ended prematurely for some reason
               bot.reply(message, 'OK, nevermind!');
         }
      });

   });
});