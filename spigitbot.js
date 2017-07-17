var request = require('request');

fs = require('fs');
var RtmClient = require('@slack/client').RtmClient;
var WebClient = require('@slack/client').WebClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

var bot_token = process.env.SLACK_BOT_TOKEN || '';
var rtm = new RtmClient(bot_token);
var web = new WebClient(bot_token);

authenticate();
initiate();
listen();

// logs into slack team
function authenticate() {
    rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
		let self = rtmStartData.self;
		console.log(`Logged in as ${self.name} of team ${rtmStartData.team.name}`);
    });
}

// listens for message and responds
function listen() {

    var identifier = '!';
	var auth_token = "";

    rtm.on(RTM_EVENTS.MESSAGE, (message) => {
		// check to make sure message does not originate from bot, or is just an edit
        if ('bot_message' === message.subtype || 'message_changed' === message.subtype) {
            return;
        }

		var channel = message.channel;

		// set default response text
        var responseText = "I'm sorry, there must've been an error! :(";

        var trimmedMessage = message.text.trim(); // cut off extraneous white space to avoid interference
        var command;

		// checking to make sure message is for bot
		if (trimmedMessage.charAt(0) !== identifier) {
			return;
		}
		
		// isolate the command from ! and split args into array
		var arg = trimmedMessage.substr(1, Math.max(trimmedMessage.indexOf(','), trimmedMessage.length)).split(',');

		// trim whitespace from every arg
		for (var i = 0; i < arg.length; i++) {
			arg[i] = arg[i].trim();
		}

		console.log(`Length of args: ${arg.length}\n`);
		console.log(`arg[1]: ${arg[1]}\n`);
		console.log(`arg[2]: ${arg[2]}\n`);
		console.log(`arg[3]: ${arg[3]}\n\n\n`);		

		var command = arg[0].toLowerCase();

		// generate response text based on message received
		switch(command) {
		case "help":
			respond(message, "These are some commands you can give me: \n!idea [title]\t\t\t\t: posts an idea with title \n!random idea\t\t\t: displays a random idea from your community");
			break;
		case "welcome":
			respond(message, "Thank you!");
			break;
		case "thanks":
		case "thank you":
			respond(message, "Your wish is my command.");
			break;
		case "hi":
		case "hey":
		case "hello":
		case "salutations":
		case "greetings":
			respond(message, "Well hello there!");
			break;
		case "setauth":
			auth_token = arg[1];
			respond(message, "Set auth token.");
			break;
		break;
		case "config":
			var communityID;
			var communityHost;

			findCommunity(auth_token, arg[1], arg[2], (id, host) => {
					communityID = id;
					communityHost = host;
					respond(message, logPair(channel, communityID, communityHost));
				},
				() => {
					respond(message, `Failed to find ${arg[2]} at base ${arg[1]}.spigit.com`);
				}
			);
			break;
		case "idea":			
			var idea = {
				title: "Default title",
				description: "Default description",
				tags: "Default tag"
			}
			
			if (arg[1] !== undefined)
				idea.title = arg[1];
			if (arg[2] !== undefined)
				idea.description = arg[2];
			if (arg[3] !== undefined) {
				// splitting tags by spaces, replacing with commas
				var splitTags = arg[3].split(' ');
				var tagString = splitTags[0];			
				for (var i = 1; i < splitTags.length; i++) {
					tagString = tagString + ', ' + splitTags[i];
				}

				idea.tags = tagString;
			}
			
			postIdea(auth_token, channel, idea, (text) => {
				respond(message, text);
			});

			break;
		case "random idea":
			respond(message, "Viewing random idea...");
			break;
		default:
			respond(message, `I\'m sorry; I don\'t understand \'${command}\'.`);
			break;
		}
    });
}

// responds to user with message
function respond(message, text) {
	let responseMessage = {
		"attachments": [
			{
				"fallback": "Notibot Message",
				"title": text,
				"footer_icon": "https://avatars.slack-edge.com/2017-07-07/209849865429_a68b0ea005d80030e515_48.png",
				"color": "#36a64f",
				"footer": "Spigitbot"
				//"ts": 123456789
				// not sure if timestamp is neccessarily needed here
			}
		]
	};

    web.chat.postMessage(message.channel, "", responseMessage, (err, data) => {});
}

// initiates Slack RTM API
function initiate() {
    rtm.start();
}

// log channel - community pair
// also returns responseText
function logPair(channel, communityID, communityHost) {
	if (communityID === undefined) {
		return `I'm sorry, but that doesn't appear to be a valid community/challenge.`;
	}

	fs.writeFile(
		`/root/spigitbot/data/${channel}`,
		(communityID + "," + communityHost),
		(err) => {
			if(!err)
				console.log(`Wrote to file ${channel}\n`)
			else
				console.log(err);
		}
	);

	return "This channel is now synced with your community!";
}

// find community ID
function findCommunity(auth_token, sub, name, callback, failureCallback) {
	url = `https://${sub}.spigit.com/api/v1/communities?offset=0&limit=100&site_type=challenge&challenge_status=open&sort=id&include_hidden=true&include_disabled=false`;

	var obj;

	var header = {
		"Authorization": `Bearer ${auth_token}`
	}

	var options = {
		url: url,
		headers: header
	}

	request.get(options, (error, response, body) => {
			obj = JSON.parse(body);
			
			if (error != null) {
				console.log(error);
				return;
			} else {
				console.log("No network error.\n");
				
				if (obj == undefined) {
        			console.log("Failed to retrieve community list.\n");
        			
					console.log(`Body returned from GET: ${body}`);
					failureCallback();
					return;
				}

				var communities = obj.content;
				
				if (communities == undefined) {
					console.log("Failed to retrieve communities from list.");
					
					console.log(`Body returned from GET: ${body}`);
					failureCallback();
					return;
				}

    			for (var i = 0; i < communities.length; i++) {
					if (name.toLowerCase() === communities[i].title.toLowerCase()) {
						var cID = communities[i].id;
						var cHost = communities[i].community_name.substr(0, communities[i].community_name.indexOf('/'));
            			callback(id=cID, host=cHost);
						console.log(`\nFound correct community: ${cID}, ${cHost}\n`);
            			return;
					}
					
				}

    			console.log("Failed to find community.\n");
				failureCallback();	
			}
		} // end of lambda
	);
}

// posts idea to Spigit API
function postIdea(auth_code, channel, idea, callback) {
	var communityHost;
	var communityID;
	var response;

	// attempting to retrieve host and ID from channel pair
	// checking for existence	
	fs.stat(`/root/spigitbot/data/${channel}`, (err, stat) => {
		if (err != null) {
			callback("This channel has not yet been synced to a community. 'Use !config, [community name]' to do so.");
		} else {
			// read file
			fs.readFile(`/root/spigitbot/data/${channel}`, 'utf8', (err, data) => {
				if (err != null) {
					callback("Error reading channel-community pair, re!configure the channel please");
				} else {
					var items = data.split(',');
					communityID = items[0];
					communityHost = items[1];

					url = `https://${communityHost}/api/v1/communities/${communityID}/ideas`;

					console.log(`Attempting post to ${url}...\n`);

					var data = JSON.stringify({
						"title" : idea.title,
						"category_id" : null,
						"tags" : idea.tags,
						"post_anonymously" : false,
						"template_fields" : { 
							"Content" : idea.description
						}   
					}); 
					
					var header = {
						"Authorization": `Bearer ${auth_code}`,
						"Content-Type": "application/json"
					}   
	
					var options = {
						url: url,
						body: data,
						headers: header
					}   

					request.post(options, (error, response, body) => {
						console.log(body);

						bodyObj = JSON.parse(body);

						if (error != null || "code" in bodyObj) {
							console.log(error);
							callback("There was an error in posting the idea.");
						} else {
							if(idea.tags == "Default tag")
								callback(`Posted idea!\nTitle: ${idea.title}\nDescription: ${idea.description}\n`);
							else
								callback(`Posted idea!\nTitle: ${idea.title}\nDescription: ${idea.description}\nTags: ${idea.tags}\n`);
						}
					});
				}
			});
		}	
	}); // end stat and lambda
}
