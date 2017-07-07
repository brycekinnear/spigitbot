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
			
		command = trimmedMessage.substr(1, trimmedMessage.length + 1).trim();
		
		// generate response text based on message received
		switch(command.toLowerCase()) {
		case "hi":
			responseText = "Well hello there!";
			break;
		case "idea":
			responseText = "Negative, Ghost Rider.";
			break;
		default:
			responseText = `Command \'${command}\' not understood.`;
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

		web.chat.postMessage(message.channel, "", responseMessage, (err, data) => {});
    });
}

// initiates Slack RTM API
function initiate() {
    rtm.start();
}
