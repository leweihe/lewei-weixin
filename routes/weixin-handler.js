// This loads the environment variables from the .env file
require('dotenv-extended').load();

var wechat = require('wechat-enterprise');
var HashMap = require('hashmap');
var Swagger = require('swagger-client');
var rp = require('request-promise');
var Q = require('q');
/*
 for client
 */
// config items
var pollTimer = 5000;
var directLineSecret = 'xFs2O9vcjSI.cwA.D3k.OSVu8Q0CQ86aqDQjqp-kwCB-66E5GfZEXWwKPW87pKk';
var directLineClientName = 'DirectLineClient';
var directLineSpecUrl = 'https://docs.botframework.com/en-us/restapi/directline3/swagger.json';

var config = {
    token: process.env.WEIXIN_TOKEN,
    encodingAESKey: process.env.WEIXIN_ENCODINGAESKEY,
    corpId: process.env.WEIXIN_CORPID
};

var conversationMap = new HashMap();
var tmpMsgMap = new HashMap();
var tmpIdMap = new HashMap();

var textHandler = wechat(config, function (req, res, next) {
    var message = req.weixin;
    var userId = message.FromUserName;
    directLineClient.then(function (client) {
        if (!conversationMap.get(userId)) {
            // once the client is ready, create a new conversation
            client.Conversations.Conversations_StartConversation()
                .then(function (response) {
                    conversationMap.set(userId, response.obj.conversationId);
                    console.log('create-bot conversation for user ' + userId + ', conversation id : ' + response.obj.conversationId);
                    return response.obj.conversationId;
                })
                .then(function (initedId) {
                    pollMessages(client, initedId, req, res);
                });
        } else {
            var watermark = null;
            var cid = conversationMap.get(userId);
            if (message.MsgType === 'location') {
                var lng = message.Location_Y;
                var lat = message.Location_X;
                //http://139.199.197.110/lewei-bus/#!/home-api?lng=118.182171&lat=24.483892
                var url = process.env.LINDE_BUS_URL + 'lng=' + lng + '&lat=' + lat;
                res.reply('点击查看' + url);
            } else {
                client.Conversations.Conversations_ReconnectToConversation({conversationId: cid})
                    .then(function (response) {
                        watermark = response.obj.watermark;
                        console.log('reconnect-bot for user ' + userId + ', conversation id : ' + response.obj.conversationId);
                        if (message.MsgType === 'text') {
                            sendMessages(client, cid, message.Content);
                        }
                    })
                    .then(function () {
                        pollMessages(client, cid, req, res);
                    });
            }
        }
    });
});

var refreshToken = function (client) {
    return client.Tokens.Tokens_RefreshToken({
        conversationId: conversationId
    });
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
            })
            .then(function (response) {
                tmpIdMap.set(conversationId, response.obj.id);
                console.log('sent-bot conversationId : ' + conversationId + ', entity id' + response.obj.id + ', text' + msg);
                // console.log(JSON.stringify(response));
            })
            .catch(function (err) {
                console.error('Error sending message:', err);
            });
    }
}

// Poll Messages from conversation using DirectLine client
function pollMessages(client, conversationId, req, res) {
    console.log('start poll msg + conversationId : ' + conversationId);
    var watermark = null;
    setInterval(
        client.Conversations.Conversations_GetActivities({conversationId: conversationId})
            .then(function (response) {
                watermark = response.obj.watermark;
                console.log('poll-bot watermark : ' + watermark);
                // console.log('response.obj.activities : ' + JSON.stringify(response.obj.activities));
                if (response.obj.activities && response.obj.activities.length) {
                    return response.obj.activities;
                } else {
                    return null;
                }
            })
            .then(function (activities) {
                if (activities) {
                    var flag = printMessages(activities, conversationId, req, res);
                    // if (flag) clearTimeout(timer);
                }
            })
        , pollTimer);
}

function printMessages(activities, conversationId, req, res) {
    // ignore own messages
    activities = activities.filter(function (m) {
        return m.from.id !== directLineClientName
    });
    if (activities && activities.length) {
        // print other messages
        for (var i = activities.length; i > 0; i--) {
            var activity = activities[i - 1];

            if (tmpIdMap.get(conversationId) && tmpIdMap.get(conversationId) !== activity.replyToId) {
                // console.log('skip nonsense msg conversationId : ' + conversationId + ', reply to id' + activity.replyToId);
                continue;
            }
            if (activity.text) {
                if (tmpMsgMap.get(req.weixin.FromUserName) === activity.text) {
                    // console.log('skip same msg conversationId : ' + conversationId + ', text' + activity.text);
                    continue;
                }
                console.log('send-weichat conversationId : ' + conversationId + ', to user ' + req.weixin.FromUserName + ', text : ' + activity.text);
                tmpMsgMap.set(req.weixin.FromUserName, activity.text);
                res.reply(activity.text);
                return true;
            }
            if (activity.attachments) {
                activity.attachments.forEach(function (attachment) {
                    var tmpMsg = '';
                    switch (attachment.contentType) {
                        case "application/vnd.microsoft.card.hero":
                            tmpMsg = attachment.content.title + '\n';
                            tmpMsg += attachment.content.subtitle + '\n';
                            tmpMsg += '点击查看' + attachment.content.buttons[0].value + '\n';
                            tmpMsg += '或发送位置信息给我';
                            tmpMsgMap.set(req.weixin.FromUserName, tmpMsg);
                            res.reply(tmpMsg);
                            return true;
                            break;
                        default:
                            res.reply('a card');
                            tmpMsg = 'a card';
                            tmpMsgMap.set(req.weixin.FromUserName, tmpMsg);
                            return true;
                            break;
                    }
                });
                tmpMsgMap.remove(res.req.weixin.FromUserName);
                tmpIdMap.remove(conversationId);
                conversationMap.remove(res.req.weixin.FromUserName);
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
        // console.log(client.clientAuthorizations);
        client.clientAuthorizations.add('AuthorizationBotConnector', new Swagger.ApiKeyAuthorization('Authorization', 'Bearer ' + directLineSecret, 'header'));
        return client;
    })
    .catch(function (err) {
        console.error('Error initializing DirectLine client', err);
    });


module.exports = textHandler;