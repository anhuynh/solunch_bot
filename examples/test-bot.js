
var Botkit = require('../lib/Botkit.js');
var name, userID = '__YOUR USER ID__';

process.env['token'] = '__BOT TOKEN__';

if (!process.env.token) {
   console.log('Error: Specify token in environment');
   process.exit(1);
}

var controller = Botkit.slackbot({
   debug: false,
   json_file_store: 'test-bot-storage'
});

controller.spawn({
   token: process.env.token
}).startRTM(function(err) {
   if (err) {
      throw new Error(err);
   }
   setTimeout(function() {
      bot.closeRTM();
   }, 600000);
});

controller.hears(['are you there'], ['direct_message','direct_mention','mention'], function(bot, message) {
   bot.reply(message,"I'm here!");
});

//*****************************************************************************************************************************//
//                                                          POLL STUFFS                                                        //
//*****************************************************************************************************************************//

controller.hears('poll suggestions', 'ambient', function(bot, message) {
   bot.reply(message, "Here are some suggestions: \nBig bone bbq\nChinese\nDagwoods\nIndian\nMcDonald's\nPho\nPizza\nShawarma\nThai\nWiches cauldron\nThe works\n");
});

controller.hears(['start poll (.*)'], 'ambient', function(bot, message) {
   controller.storage.channels.save({id: message.channel, question: message.match[1], status: 'open'}, function(err, id) {
      bot.reply(message, "Current poll: *" + message.match[1] + "* Type `vote` and then an option.");
   });
});

controller.hears('vote (.*)', 'ambient', function(bot, message) {
   controller.storage.channels.get(message.channel, function(err, channel_data) {
      if (channel_data['status'] === 'open') {
         var vote = message.match[1].toLowerCase(),
             thanks = "Thank you for your vote! :+1:";
         if (channel_data.hasOwnProperty(vote)) {
            channel_data[vote]++;
            controller.storage.channels.save(channel_data, function(err, id) {
               bot.reply(message, thanks);
            });
         } else {
            channel_data[vote] = 1;
            controller.storage.channels.save(channel_data, function(err, id) {
               bot.reply(message, thanks);
            });
         }
      } else {
         bot.reply(message, "Sorry, but the poll is now closed.");
      }
   });
});

controller.hears('close poll', 'ambient', function(bot, message) {
   controller.storage.channels.get(message.channel, function(err, channel_data) {
      channel_data['status'] = 'closed';
      var winner = {key: '', votes: 0};
      for (var property in channel_data) {
         if (channel_data[property] > winner['votes']) {
            winner = {key: property, votes: channel_data[property]};
         } else if (channel_data[property] == winner['votes']) {
            winner['key'] = winner['key'].concat(" or " + property);
            winner['votes'] = channel_data[property];
         }
      }
      controller.storage.channels.save(channel_data, function(err, id) {
         bot.reply(message, "The poll *" + channel_data['question'] + "* is now closed.\n:tada: The winner is *" + winner['key'] + "* with " + winner['votes'] + " votes! :tada:");
      });
   });
});

controller.hears('poll status', 'ambient', function(bot, message) {
   getPollResults(bot, message);
});

function getPollResults(bot, message) {
   controller.storage.channels.get(message.channel, function(err, channel_data) {
      var results = '';
      for (var property in channel_data) {
         if (property != 'id' && property != 'question' && property != 'status') {
            results = results.concat("\n" + property + ": " + channel_data[property]);
         }
      }

      bot.reply(message, 
               {text: 'Poll status: *' + channel_data['status'] +'*\n' + 'Question: *' + channel_data['question'] + '*\nHere are the current results: ', 
                  attachments: [
                     {
                        text: results,
                        color: "#7CD197"
                     }
                  ]
               }
      );
   });
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

controller.hears(['dm an'],['direct_message','direct_mention'],function(bot, message) {
   bot.reply(message, "Direct messaging An...");
   bot.startPrivateConversation({'user': userID}, function(err, convo) {
      bot.api.users.info({user: message.user}, function(err, response) {
         convo.say(response.user.real_name + " says hello!");
      });
      convo.next();
   });
});

//*****************************************************************************************************************************//
//                                                          FOOD ORDERING                                                      //
//*****************************************************************************************************************************//

controller.hears(['thai'], ['direct_message'], function(bot, message) {
   bot.startConversation(message, function(err, convo) {
      convo.say({text: "Take a look at the lunch menu! sabaithaicuisine.ca/#!lunch/c23f6"});
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