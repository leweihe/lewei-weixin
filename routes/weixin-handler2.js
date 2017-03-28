// This loads the environment variables from the .env file
require('dotenv-extended').load();

var wechat = require('wechat-enterprise');

var config = {
    token: process.env.WEIXIN_TOKEN,
    encodingAESKey: process.env.WEIXIN_ENCODINGAESKEY,
    corpId: process.env.WEIXIN_CORPID
};

var textHandler = wechat(config, function (req, res, next) {

    //------------------------------------------------------------------------
    //get message from wechat client
    var message = req.weixin;

    //=========================================================================================================
    var touserid = message.FromUserName;
    //send message entity
    var messageBody = {
        "type": "message",
        "from": {
            "id": message.FromUserName,
            "FromUserName": 'WeChatUser'
        },
        "text": message.Content
    };

    //send message to botframework
    sendMessageToBotframework(_tokenObject, messageBody, touserid);

    //response for wechat client
    res.reply('message send successfully, waiting for response');

    //=========================================================================================================
});

var client = require('directline-api-v3');
var secret = 'xFs2O9vcjSI.cwA.D3k.OSVu8Q0CQ86aqDQjqp-kwCB-66E5GfZEXWwKPW87pKk';
var _tokenObject;
var _conversationWss;
var _watermark = 0;

//noinspection JSAnnotator
client.getTokenObject(secret).subscribe(
    (tokenObject) => {
    _tokenObject = tokenObject;

//noinspection JSAnnotator
client.initConversationStream(_tokenObject).subscribe(
    (message) => {
    _conversationWss = message;
},
(err) => console.log(err),
    () => console.log("1.2:get conversation successfully")
)

//maybe need refresh token here
setTimeout(function () {
    refreshToken()
}, (_tokenObject.expires_in - 30) * 1000);

},
(err) => console.log(err),
    () => console.log('1.1:get token successfully')
)
//=========================================================================================================
function refreshToken() {
    console.log('------------------------refreshToken-----------------------------')
    client.refTokenObject(secret).subscribe(
        (tokenObject) => {
        _tokenObject = tokenObject;
},
    (err) => console.log(err),
        () => console.log('1.3:refresh token successfully')
)
}


//send message to bot framework
function sendMessageToBotframework(_tokenObject, messageBody, touserid) {
    client.sendMessage(_tokenObject, messageBody).subscribe(
        (data) => {
        var sendMessageid = data.id;

    //time out function get message from botframework
    setTimeout(function () {
        getmessagefrombotframework(touserid, _tokenObject, sendMessageid, _watermark)
    }, 10000);
},
    (err) => {
    },
    () => {
        console.log("2.2:send message to bot botframework successfully");
    }
);
}

//get message from bot framework function
function getmessagefrombotframework(senduserid, tokenobject, sendmsgid, sendwatermark) {
    //noinspection JSAnnotator
    // client.getMessage(tokenobject, sendwatermark).subscribe(
    //     (result) => {
    //     _watermark = result.watermark;
    //
    //         //filter activities
    //         var getResponseMessages = _.where(result.activities, { replyToId: sendmsgid });
    //         //send message to wechat client
    //         sendMessageToClient(senduserid, getResponseMessages);
    //     },
    //     (err) => {
    //     },
    //     () => console.log("3.1:get message from botframework successfully")
    // )
    sendMessageToClient(senduserid, [{text: 'abc'}]);
}

//send to message to wechat client
function sendMessageToClient(senduserid, getResponseMessages) {
    if (getResponseMessages) {

        //forEach message
        getResponseMessages.forEach(function (getResponseMessageItem) {

            //process message from botframework
            api.sendText(senduserid, getResponseMessageItem.text, function (err, result) {
                if (err) {
                }
            });


            //process attachment
            if (getResponseMessageItem.attachments) {
                getResponseMessageItem.attachments.forEach(function (getResponseMessageAttachmentItem) {
                    if (getResponseMessageAttachmentItem.contentType == 'application/vnd.microsoft.card.thumbnail' || getResponseMessageAttachmentItem.contentType == 'application/vnd.microsoft.card.hero')

                    //-------------upload media
                        api.uploadMedia(getResponseMessageAttachmentItem.content.images[0].url, 'image', function (err, result) {
                            // console.log('start upload image' + result);
                            if (err) {
                            }
                            else {
                                //-------------send image
                                api.sendImage(senduserid, result.media_id, function (err, result) {
                                    if (err) {
                                    }
                                });
                                //-------------
                            }
                        });
                    //-------------


                    api.sendText(senduserid, getResponseMessageAttachmentItem.content.title + '\r' + getResponseMessageAttachmentItem.content.subtitle + '\r' + getResponseMessageAttachmentItem.content.text, function (err, result) {
                        if (err) {
                        }
                    });

                });
            }
        });


    }
}

module.exports = textHandler;