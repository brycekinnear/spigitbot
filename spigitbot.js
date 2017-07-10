var fs = require('fs');
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
	
    rtm.on(RTM_EVENTS.MESSAGE, (message) => {
		// set default response text
		var responseText = "Default";
		
		var trimmedMessage = message.text.trim();
		var command;

		// checking to make sure message is for bot
		if (trimmedMessage.charAt(0) !== "!") {
			return;
		}
		
		// check to make sure message does not originate from bot, or is just an edit
		if ('bot_message' === message.subtype || 'message_changed' === message.subtype) {
			return;
		}
		
		// isolate the command from ! and whitespace
		command = trimmedMessage.substr(1, trimmedMessage.length + 1).trim();
		
		// generate response text based on message received
		switch(command.toLowerCase()) {
		case "help":
			responseText = "These are some commands you can give me: \n!idea [title] : posts an idea with title \n!random idea : displays a random idea from your community";
			break;
		case "welcome":
			responseText = "Thank you!";
			break;
		case "thanks":
		case "thank you":
			responseText = "Your wish is my command.";
			break;
		case "hi":
		case "hello":
		case "salutations":
		case "greetings":
		case "what\'s up?":
			responseText = "Well hello there!";
			break;
		case "idea":
			responseText = "Posting idea...";
			break;
		case "random idea":
			responseText = "Viewing random idea...";
		break;
		default:
			responseText = `I\'m sorry; I don\'t understand \'${command}\'.`;
			break;
		}
		
		let responseMessage = {
			"attachments": [
				{
					"fallback": "Notibot Message",
					"title": responseText,
					"color": "#36a64f"
					//"ts": 123456789
					// not sure if timestamp is neccessarily needed here
				}
			]
		};

		// posts response to user
		web.chat.postMessage(message.channel, "", responseMessage, (err, data) => {});
    });
}

// initiates Slack RTM API
function initiate() {
    rtm.start();
}
