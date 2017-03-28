// This loads the environment variables from the .env file
require('dotenv-extended').load();

var wechat = require('wechat-enterprise');
var Swagger = require('swagger-client');
var rp = require('request-promise');
var Q = require('q');
/*
 for client
 */
// config items
var pollInterval = 1000;
var directLineSecret = 'xFs2O9vcjSI.cwA.D3k.OSVu8Q0CQ86aqDQjqp-kwCB-66E5GfZEXWwKPW87pKk';
var directLineClientName = 'DirectLineClient';
var directLineSpecUrl = 'https://docs.botframework.com/en-us/restapi/directline3/swagger.json';

var config = {
    token: process.env.WEIXIN_TOKEN,
    encodingAESKey: process.env.WEIXIN_ENCODINGAESKEY,
    corpId: process.env.WEIXIN_CORPID
};

var textHandler = wechat(config, function (req, res, next) {
    var message = req.weixin;
    directLineClient.then(function (client) {
        // once the client is ready, create a new conversation
        client.Conversations.Conversations_StartConversation()
            .then(function (response) {
                return response.obj.conversationId;
            })                            // obtain id
            .then(function (conversationId) {
                if (message.MsgType === 'text') {
                    sendMessages(client, conversationId, message.Content);
                }
                pollMessages(client, conversationId, res);
            }).then(function () {
                console.log(JSON.stringify(next));
                // next(client, conversationId, res);
        });
    });
});

var createConn = function (client) {
    return client.Conversations.Conversations_StartConversation();
};

// Read from console (stdin) and send input to conversation using DirectLine client
function sendMessages(client, conversationId, msg) {
    if (msg) {
        // send message
        client.Conversations.Conversations_PostActivity(
            {
                conversationId: conversationId,
                activity: {
                    textFormat: 'plain',
                    text: msg,
                    type: 'message',
                    from: {
                        id: directLineClientName,
                        name: directLineClientName
                    }
                }
            }).catch(function (err) {
            console.error('Error sending message:', err);
        });
    }
}

// Poll Messages from conversation using DirectLine client
function pollMessages(client, conversationId, res) {
    console.log('Starting polling message for conversationId: ' + conversationId);
    var watermark = null;
    setInterval(function () {
        client.Conversations.Conversations_GetActivities({conversationId: conversationId, watermark: watermark})
            .then(function (response) {
                watermark = response.obj.watermark;
                if (response.obj.activities && response.obj.activities.length) {
                    console.log('polling message: ' + JSON.stringify(response.obj.activities));
                    console.log('watermark: ' + watermark);
                    return response.obj.activities;
                } else {
                    return null;
                }
            })
            .then(function (activities) {
                if (activities) {
                    printMessages(activities, res);
                }
            });
    }, pollInterval);
}

function printMessages(activities, res) {
    // ignore own messages
    activities = activities.filter(function (m) {
        return m.from.id !== directLineClientName
    });
    if (activities && activities.length) {
        // print other messages
        for (var i = activities.length - 1; i >= 0; i--) {
            var activity = activities[i];
            if (activity.text) {
                res.reply(activity.text);
            }
            if (activity.attachments) {
                activity.attachments.forEach(function (attachment) {
                    switch (attachment.contentType) {
                        case "application/vnd.microsoft.card.hero":
                            res.reply(renderHeroCard(attachment));
                    }
                });
            }
        }
    }
}

function renderHeroCard(attachment) {
    var width = 70;
    var contentLine = function (content) {
        return ' '.repeat((width - content.length) / 2) +
            content +
            ' '.repeat((width - content.length) / 2);
    };

    console.log('/' + '*'.repeat(width + 1));
    console.log('*' + contentLine(attachment.content.title) + '*');
    console.log('*' + ' '.repeat(width) + '*');
    console.log('*' + contentLine(attachment.content.text) + '*');
    console.log('*'.repeat(width + 1) + '/');
    return attachment.content.text;
}

var directLineClient = rp(directLineSpecUrl)
    .then(function (spec) {
        // client
        return new Swagger({
            spec: JSON.parse(spec.trim()),
            usePromise: true
        });
    })
    .then(function (client) {
        // add authorization header to client
        console.log(client.clientAuthorizations);
        client.clientAuthorizations.add('AuthorizationBotConnector', new Swagger.ApiKeyAuthorization('Authorization', 'Bearer ' + directLineSecret, 'header'));
        return client;
    })
    .catch(function (err) {
        console.error('Error initializing DirectLine client', err);
    });


module.exports = textHandler;