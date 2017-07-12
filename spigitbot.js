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

    rtm.on(RTM_EVENTS.MESSAGE, (message) => {
		// set default response text
		var responseText = "Default";
		
		var trimmedMessage = message.text.trim(); // cut off extraneous white space to avoid interference
		var command;

		// checking to make sure message is for bot
		if (trimmedMessage.charAt(0) !== identifier) {
			return;
		}
		
		// check to make sure message does not originate from bot, or is just an edit
		if ('bot_message' === message.subtype || 'message_changed' === message.subtype) {
			return;
		}
		
		// isolate the command from ! and split args into array
		var arg = trimmedMessage.substr(1, Math.max(trimmedMessage.indexOf(','), trimmedMessage.length)).split(',');

		// trim whitespace from every arg
		for (var i = 0; i < arg.length; i++) {
			arg[i] = arg[i].trim();
		}

		var command = arg[0].toLowerCase();

		// generate response text based on message received
		switch(command) {
		case "help":
			responseText = "These are some commands you can give me: \n!idea [title]\t\t\t\t: posts an idea with title \n!random idea\t\t\t: displays a random idea from your community";
			break;
		case "welcome":
			responseText = "Thank you!";
			break;
		case "thanks":
		case "thank you":
			responseText = "Your wish is my command.";
			break;
		case "hi":
		case "hey":
		case "hello":
		case "salutations":
		case "greetings":
		case "what\'s up?":
			responseText = "Well hello there!";
			break;
		case "post":
			postIdea(0);

			responseText = `POSTING TO ${arg[1]}`;
			break;
		case "idea":
			var auth_code = "1c255dce513f8d685e615cb94e8bf9c5";
			
			postIdea(auth_code);

			responseText = "Posting idea with default settings. \nTitle: Default Title \nDesc: Default description \nTags: Default tag";
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
					"footer_icon": "https://avatars.slack-edge.com/2017-07-07/209849865429_a68b0ea005d80030e515_48.png",
					"color": "#36a64f",
					"footer": "Spigitbot"
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

// posts idea to Spigit API
function postIdea(auth_code, url="https://qa40.spigit.com/api/v1/communities/1780/ideas") {
	console.log(`Attempting post to ${url}...\n`);

	var data = JSON.stringify({
		"title" : "Slack post",
		"category_id" : 10781,
		"tags" : "this, is a, tag",
		"post_anonymously" : false,
		"template_fields" : {
	    		"Content" : "Hi from Spigitbot"
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
	
	request.post(options, function (error, response, body) {
			console.log(body);
			console.log("\n ----error---- \n");
			console.log(error);
		}
	);
}
