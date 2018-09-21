// tutorial code

// Create a new instance of the WebClient class with the token stored in your environment variable
const web = new WebClient(process.env.SLACK_ACCESS_TOKEN);
// The current date
const currentTime = new Date().toTimeString();

// Use the `apps.permissions.resources.list` method to find the conversation ID for an app home
web.apps.permissions.resources.list()
  .then((res) => {
    // Find the app home to use as the conversation to post a message
    // At this point, there should only be one app home in the whole response since only one user has installed the app
    const appHome = res.resources.find(r => r.type === 'app_home');

    // Use the `chat.postMessage` method to send a message from this app
    return web.chat.postMessage({
      channel: appHome.id,
      text: `The current time is ${currentTime}`,
    });
  })
  .then((res) => {
    console.log('Message posted!');
  })
  .catch(console.error);