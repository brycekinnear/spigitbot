var request = require('request');

fs = require('fs');
var RtmClient = require('@slack/client').RtmClient;
var WebClient = require('@slack/client').WebClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

var bot_token = null; //enter actual token - default set to null
var rtm = new RtmClient(bot_token);
var web = new WebClient(bot_token);

authenticate();
initiate(bot_token);
listen();

// logs into slack team
function authenticate() {
    rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
		let self = rtmStartData.self;
		console.log(`Logged in as ${self.name} in team ${rtmStartData.team.name}`);
    });
}

// listens for message and responds
function listen() {

    var identifier = '<@U6GU69GE9>';
	var separator = ' ';
	var auth_token = "";

    rtm.on(RTM_EVENTS.MESSAGE, (message) => {
		// check to make sure message does not originate from bot, or is just an edit
        if ('bot_message' === message.subtype || 'message_changed' === message.subtype) {
            return;
        }

		var channel = message.channel;

		// cut off extraneous white space to avoid interference
		var trimmedMessage = message.text.trim();
		
		var command;

		// split command & args into array
		var arg = trimmedMessage.split(separator);

		if (arg[0] !== identifier) {
			console.log(arg[0]);
			return;
		}

		// trim whitespace from every arg
		for (var i = 0; i < arg.length; i++) {
			arg[i] = arg[i].trim();
		}

		console.log(`Length of args: ${arg.length}`);
		console.log(`arg[1]: ${arg[1]}`);
		console.log(`arg[2]: ${arg[2]}`);
		console.log(`arg[3]: ${arg[3]}\n`);		

		if (arg[1] !== undefined)
			var command = arg[1].toLowerCase();
		else
			command = "help";

		// generate response text & execute subprog based on command
		switch(command) {
		case "help":
			respond(message, "These are some commands you can give me: \nsetauth [auth token]: \n\t\t\tsets the authentication token manually \nchallenges [instance]: \n\t\t\tlists all challenges in given instance \nconfig [subdomain] [challenge]: \n\t\t\tconfigures this channel to a challenge \nlist ideas: \n\t\t\tlists all ideas in challenge \nlist stage [stage#]: \n\t\t\tlists all ideas in given stage \nidea [title]: \n\t\t\tposts an idea with title \nrandom idea: \n\t\t\tdisplays a random idea from your community \nfind idea [search term]: \n\t\t\treturns list of ideas containing the search term");
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
			respond(message, "Hello there!");
			break;
		/* Automating auth process - TODO remove
		case "setauth":
			auth_token = arg[2];
			respond(message, "Set auth token.");
			break;
		*/
		case "communities":
		case "challenges":
			listCommunities(auth_token, (text) => {
				respond(message, text);
			}, arg[2]);
			break;
		case "config":
			var communityID;
			var communityHost;

			findCommunity(auth_token, arg[2], arg[3], (id, host, name) => {
					communityID = id;
					communityHost = host;
					communityTitle = arg[3];
					communityName = name;
					respond(message, logPair(channel, communityID, communityHost, communityName, communityTitle));
				},
				() => {
					respond(message, `Failed to find ${arg[3]} at base ${arg[2]}.spigit.com`);
				}
			);
			break;
		case "idea":			
			var idea = {
				title: "Default title",
				description: "Default description",
				tags: ""
			}
				
			if (arg[2] !== undefined)
				idea.title = "";

			var mode = 0;

			for (var i = 2; i < arg.length; i++) {
				if (arg[i] == '|') {
					if (mode == 0)
						idea.description = "";

					mode++;
					continue;
				}
	
				if (mode == 0) {
					idea.title += arg[i];

					if(arg[i + 1] != '|')
						idea.title += " ";
				} else if (mode == 1) {
					idea.description += arg[i];
	
					if(arg[i + 1] != '|')
						idea.description += ' ';
				} else {
					idea.tags += arg[i];

					if (i != arg.length - 1)
						idea.tags += ', ';
				}
			}

			console.log(`Title: ${idea.title}, \nDescription: ${idea.description} \nTags: ${idea.tags}`);

			postIdea(auth_token, channel, idea, (text) => {
				respond(message, text);
			});

			break;
		case "random":
			if(arg[2] !== "idea") {
				respond("Did you mean 'random idea'?");
				break;
			}

			var stage = 0;
			if (arg[3] !== undefined)
				stage = arg[3];

			randomIdea(auth_token, channel, (text) => {
				respond(message, text);
			}, stage);			
			break;
		case "find":
			var stage = 0;

			if (arg[2] !== "idea") {
				respond("Did you mean 'find idea'?");
				break;
			}

			if (arg[4] != undefined) {
				stage = arg[4];
			}

			findIdea(auth_token, channel, arg[3], (text) => {
				respond(message, text);
			}, stage);
			break;
		case "attack":
			respond(message, `BEEP BOOP FOLLOWING ORDERS\n*pew pew pew* dealt ${Math.floor(Math.random() * 50)} damage points to ${arg[2]}`);
			break;
		case "list":
			switch (arg[2]) {
			case "stage":
				listIdeas(auth_token, channel, (text) => {
					respond(message, text);
				}, arg[3]);
				break;
			case "ideas":
				listAllIdeas(auth_token, channel, (text) => {
					respond(message, text);
				}, arg[3]);
				break;
			default:
				respond("Did you mean 'list stage' or 'list ideas'?");
				break;
			}
			break;
		default:
			respond(message, `I\'m sorry; I don\'t understand \'${command}\'.`);
			break;
		}
    });
}

// initiates Slack RTM API
function initiate(token) {
    rtm.start(token);
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
			}
		]
	};

    web.chat.postMessage(message.channel, "", responseMessage, (err, data) => {});
}

// getting OAuth2.0 authentication token
function authorize(instance, code, clientID, clientSecret) {
	url = `https://${instance}.spigit.com/oauth/token`;

	var header = {
		"Content-Type": "application/x-www-form-urlencoded"
	}

	var body = {
		"code": code,
		"grant_type": "authorization_code",
		"client_id": clientID,
		"client_secret": clientSecret
	}

	var options = {
		url: url,
		headers: header,
		body: body
	}

	// json object response body will be stored in
	var bodyObj;

	// posting to get authentication token
	request.post(options, (error, response, body) => { 
		// if error is returned
		if (error != null) {
			console.log("Error: " + error);
			console.log("Failed response body: " + body);
			respond("There was an error retrieving the OAuth token.");
			return; // leave method
		}

		// attempt to parse body
		try {
			bodyObj = JSON.parse(body);
		} catch (error) {
			console.log("Error parsing OAuth token JSON body");
			respond("There was an error retrieving the OAuth token.");
			return; // leave method
		}

		// make sure body is correct
		if (bodyObj.access_token == undefined) {
			console.log("No field 'access_token' in returbed body");
			respond("There was an error retrieving the OAuth token.");
			return; // leave method
		}

		console.log("Auth token: " + bodyObj.access_token); // TODO finish method- this is a to test authentication
	}); // end of post request
}

// log channel - community pair into data
// also returns responseText
function logPair(channel, communityID, communityHost, communityName, communityTitle) {
	if (communityID === undefined) {
		return `I'm sorry, but that doesn't appear to be a valid community/challenge.`;
	}

	fs.writeFile(
		`/root/spigitbot/data/${channel}`,
		(communityID + "," + communityHost + ',' + communityName + ',' + communityTitle),
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
function findCommunity(auth_token, sub, title, callback, failureCallback) {
	url = `https://${sub}.spigit.com/api/v1/communities?offset=0&limit=100&site_type=challenge&challenge_status=open&sort=id&include_hidden=true&include_disabled=false`;

	var obj;

	var header = {
		"Authorization": `Bearer ${auth_token}`
	}

	var options = {
		url: url,
		headers: header
	}

	console.log("Searching for community");

	request.get(options, (error, response, body) => {

			if (error != null || !isJson(body)) {
				console.log("Error: " + error);
				console.log("Body: " + body)
				failureCallback();
				return;
			}

			obj = JSON.parse(body);

			console.log("No network error.\n");
			
			if (obj == undefined) {
				console.log("Failed to retrieve community list.\n");
				
				console.log(`Body returned from GET: ${body}`);
				failureCallback();
				return;
			}

			var communities = obj.content;

			console.log(`Total amount of communities: ${obj.total_count}`);	

			if (communities == undefined) {
				console.log("Failed to retrieve communities from list.");
				
				console.log(`Body returned from GET: ${body}`);

				failureCallback();
				return;
			}

			for (var i = 0; i < communities.length; i++) {
				if (title.toLowerCase() === communities[i].title.toLowerCase()) {
					var cID = communities[i].id;
					var cHost = communities[i].community_name.substr(0, communities[i].community_name.indexOf('/'));
					var cTitle = communities[i].community_name.substr(communities[i].community_name.indexOf('/'), communities[i].community_name.length);
					callback(id=cID, host=cHost, title=cTitle);
					console.log(`\nFound correct community: ${cID}, ${cHost}, ${cTitle}\n`);
					return;
				}
				
			}

			console.log("Failed to find community.\n");
			failureCallback();	
		} // end of lambda
	);
}

function listCommunities(auth_token, callback, sub) {
	url = `https://${sub}.spigit.com/api/v1/communities?offset=0&limit=100&site_type=challenge&challenge_status=open&sort=id&include_hidden=true&include_disabled=false`;

	var obj;

	var header = {
		"Authorization": `Bearer ${auth_token}`
	}

	var options = {
		url: url,
		headers: header
	}

	console.log("Searching for community");

	request.get(options, (error, response, body) => {

			if (error != null || !isJson(body)) {
				console.log("Error: " + error);
				console.log("Body: " + body)

				callback("Failed to retrieve data. Did you specify an instance? This should be your subdomain -> [].spigit.com");
				return;
			} else {
				obj = JSON.parse(body);

				console.log("No network error.\n");
				
				if (obj == undefined) {
        			console.log("Failed to retrieve community list.\n");
        			
					console.log(`Body returned from GET: ${body}`);

					return;
				}

				var communities = obj.content;

				console.log(`Total amount of communities: ${obj.total_count}`);	

				if (communities == undefined) {
					console.log("Failed to retrieve communities from list.");

					console.log(`Body returned from GET: ${body}`);

					callback("Retrieved incorrect data");
					return;
				}

				response = `Found ${communities.length} communities in the ${sub} instance:\n`;

    			for (var i = 0; i < communities.length; i++) {
					response += `${communities[i].title}\n`;
				}

				callback(response);
			}
		} // end of lambda
	);
}

// retrieves community data from the community-channel pair in data
function retrieveCommunity(channel, callback) {
	fs.stat(`/root/spigitbot/data/${channel}`, (err, stat) => {
		if (err != null) {
			console.log(`/root/spigitbot/data/${channel} does not exist`);
			callback(null);
		} else {
			fs.readFile(`/root/spigitbot/data/${channel}`, "utf8", (err, data) => {
				if(err != null) {
					console.log(`Failed to read /root/spigitbot/data/${channel}`);
					callback(null);
				} else {
					var items = data.split(',');

					community = [items[0], items[1], items[2], items[3]];

					console.log(`logged com: '${community}'`);					

					callback(community);
				}
			});
		}
	});
}

// posts idea to Spigit API
function postIdea(auth_code, channel, idea, callback) {
	var communityHost;
	var communityID;
	var response;

	// retrieve community from channel-community pair
	retrieveCommunity(channel, (community) => {
		if (community == null) {
			console.log(`community == ${community}`);
			callback("This channel has not yet been synced to a community. Use 'config [subdomain] [community name]' to do so.");
		} else {
			communityID = community[0];
			communityHost = community[1];
			communityName = community[2];
			communityTitle = community[3];

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

			request.post(options, (err, response, body) => {
				console.log(body);

				bodyObj = JSON.parse(body);

				if (err !== null || "code" in bodyObj) {
					console.log(err);
					callback("There was an error in posting the idea.");
				} else {

					idea_id = bodyObj.id;

					post_url = `https://${communityHost}/${communityName}/Page/ViewIdea?ideaid=${idea_id}`;

					if(idea.tags == "Default tag")
						callback(`Posted idea!\nTitle: ${idea.title}\nDescription: ${idea.description}\n\n Visit here: ${post_url}`);
					else
						callback(`Posted idea!\nTitle: ${idea.title}\nDescription: ${idea.description}\nTags: ${idea.tags}\n\n Visit here: ${post_url}`);
				}
			});
		}
	});
}

function randomIdea(auth_token, channel, callback, stage=0) {
	retrieveCommunity(channel, (community) => {
		if (community == null) {
			console.log(`community == ${community}`);
			callback("This channel needs to be configured to sync with a Spigit challenge. Use config [subdomain] [challenge name]");
		} else {
			communityID = community[0];
		   	communityHost = community[1];
	        communityName = community[2];
			communityTitle = community[3];

			url = `https://${communityHost}/api/v1/communities/${communityID}/ideas?offset=0&limit=100&idea_stage=${stage}&idea_status=implemented`

			console.log(`Attempting to GET to ${url}...\n`);

			var header = {
				"Authorization": `Bearer ${auth_token}`,
			};

			var options = {
				url: url,
				headers: header
			};

			request.get(options, (err, response, body) => {
				bodyObj = JSON.parse(body);

				if (err != null || "code" in bodyObj) {
					console.log(err);
					callback("Failed to retrieve idea list.");
				} else {
					total = bodyObj.total_count;

					// choosing a random index
					index = Math.floor(Math.random() * total-1);

					idea = bodyObj.content[index];

					if (idea == undefined) {
						console.log(`Idea: ${idea}`);

						callback(`Something went wrong :( Maybe there aren't any ideas yet?`);
					} else {
						console.log(`content.length=${bodyObj.content.length}, total=${total}`);

						callback(`Random idea from ${total} ideas in ${communityName}: \n*"${idea.title}"*\nCheck out the idea here: https://${communityHost}/${communityName}/Page/ViewIdea?ideaid=${idea.id}`); 
					}
				}
			});
		}
	});
}

function listAllIdeas(auth_token, channel, callback) {
	retrieveCommunity(channel, (community) => {
		if (community == null) {
			console.log(`community == ${community}`);
			callback("This channel needs to be configured to sync with a Spigit challenge. Use 'config [subdomain] [challenge name]'");
		} else {
			communityID = community[0];
			communityHost = community[1];
			communityName = community[2];
			communityTitle = community[3];

			callback(`All ideas: \n`);

			for (var stage = 0; stage < 5; stage++) {
				// TODO - Add method of retrieving ideas across all stages
				url = `https://${communityHost}/api/v1/communities/${communityID}/ideas?offset=0&limit=100&idea_stage=${stage}&idea_status=implemented`;

				console.log(`Attempting to GET to ${url}...\n`);

				var header = {
					"Authorization": `Bearer ${auth_token}`,
				};

				var options = {
					url: url,
					headers: header
				};

				request.get(options, (err, response, body) => {
					
					var bodyObj;

					if (isJson(body)) {
						bodyObj = JSON.parse(body);
					} else {
						console.log(body);
						callback("Failed to receive JSON");
					}

					if (err != null || bodyObj == undefined || !("content" in bodyObj)) {
						console.log(err);
						callback("Failed to retrieve idea list.");
					} else {
						console.log("Retrieved content got stage " + stage);
						total = bodyObj.total_count;

						ideaList = bodyObj.content;
						
						var text = "";

						for (var i = 0; i < total; i++) {
							text += `${ideaList[i].title}\n`;
						}

						if (text != "") {
							console.log(`Responding with '${text}'`);
							callback(text);
						}
					}
				});
			}
		}
	});
}


function findIdea(auth_token, channel, searchStr, callback, stage) {
	retrieveCommunity(channel, (community) => {
		if (community == null) {
			console.log(`community == ${community}`);
			callback("This channel needs to be configured to sync with a Spigit challenge. Use 'config [subdomain] [challenge name]'");
		} else {
			communityID = community[0];
			communityHost = community[1];
			communityName = community[2];
			communityTitle = community[3];

			url = `https://${communityHost}/api/v1/communities/${communityID}/ideas?offset=0&limit=100&idea_stage=${stage}&idea_status=implemented`;

			console.log(`Attempting to GET to ${url}...\n`);

			var header = {
				"Authorization": `Bearer ${auth_token}`,
			};

			var options = {
				url: url,
				headers: header
			};

			request.get(options, (err, response, body) => {
				if (isJson(body)) {
					bodyObj = JSON.parse(body);
				} else {
					console.log(body);
					callback("Failed to receive JSON");
				}

				if (err != null || "code" in bodyObj) {
					console.log(err);
					callback("Failed to retrieve idea list.");
				} else {
					total = bodyObj.total_count;

					// array to hold search results
					var resultList = [];

					ideaList = bodyObj.content;
					for (var i = 0; i < total; i++) {
						if (ideaList[i].title.toLowerCase().indexOf(searchStr) !== -1) {
							// add the idea to the list of results
							resultList.push(ideaList[i]);
							console.log("pushed");
						} else {
							console.log(ideaList[i].title + " does not contain " + searchStr);
						}
					}

					var message = `Found ${resultList.length} ideas with '${searchStr}' in title out of a total of ${total} stage ${stage} ideas: \n`;

					for (var i = 0; i < resultList.length; i++) {
						message += resultList[i].title + "\n";
					}

					callback(message);
				}
			});
		}
	});
}

function listIdeas(auth_token, channel, callback, stage) {
	retrieveCommunity(channel, community => {
		if (community == null) {
			console.log("Failed to retrieve community");
			callback("This channel must be synced to a community!");
		} else {
			communityID = community[0];
			communityHost = community[1];
			communityName = community[2];
			communityTitle = community[3];

			url = `https://${communityHost}/api/v1/communities/${communityID}/ideas?offset=0&limit=100&idea_stage=${stage}&idea_status=implemented`;

			console.log(`Attempting to GET to ${url}`);

			var header = {
				"Authorization": `Bearer ${auth_token}`,
			};

			var options = {
				url: url,
				headers: header
			};

			request.get(options, (err, response, body) => {
				if (isJson(body)) {
					bodyObj = JSON.parse(body);
				} else {
					console.log(body);
					callback("Failed to receive JSON");
				}

				if (err != null || !("content" in bodyObj)) {
					console.log(err);
					callback("Failed to retrieve idea list.");
				} else {
					total = bodyObj.total_count;

					ideaList = bodyObj.content;

					var message = `Found ${ideaList.length} ideas in stage '${stage}': \n`;

					for (var i = 0; i < ideaList.length; i++) {
						message += ideaList[i].title + "\n";
					}

					callback(message);
				}
			});
		}
	});
}

function isJson(str) {
	try {
		JSON.parse(str);
	} catch(e) {
		return false;
	}

	return true;
}
