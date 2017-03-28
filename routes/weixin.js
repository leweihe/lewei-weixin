// This loads the environment variables from the .env file
require('dotenv-extended').load({
    errorOnMissing: true
});

var wechat = require('wechat');
var crypto = require('crypto');
var WXBizMsgCrypt = require('wechat-crypto');
var url = require('url');
var express = require('express');
var router = express.Router();

router.get('/', function (req, res, next) {
    var reqObj = url.parse(req.url, true);
    var params = reqObj['query'];
    var msg_signature = params['msg_signature'];
    var timestamp = params['timestamp'];
    var nonce = params['nonce'];
    var verifyEchostr = params['echostr'];
    var cryptor = new WXBizMsgCrypt(process.env.WEIXIN_TOKEN, process.env.WEIXIN_ENCODINGAESKEY, process.env.WEIXIN_CORPID);
    var result = cryptor.decrypt(verifyEchostr);
    console.log(result.message);
    console.log('--------------');
    res.send(result.message);
});
module.exports = router;
