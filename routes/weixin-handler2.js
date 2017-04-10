// This loads the environment variables from the .env file
require('dotenv-extended').load();

var wechat = require('wechat-enterprise');
var HashMap = require('hashmap');
var Swagger = require('swagger-client');
var rp = require('request-promise');
var Q = require('q');
const LUISClient = require("luis_sdk");

var amap = require('./amap.js');
var whether = require('./whether.js');

var config = {
    token: process.env.WEIXIN_TOKEN,
    encodingAESKey: process.env.WEIXIN_ENCODINGAESKEY,
    corpId: process.env.WEIXIN_CORPID
};

const APPID = process.env.LUIS_ID;
const APPKEY = process.env.LUIS_KEY;

var LUISclient = LUISClient({
    appId: APPID,
    appKey: APPKEY,
    verbose: true
});

var HELP_MSG = 'Hi! 试着通过文字问问我有关班车或者天气的问题呗! \'火车站怎么走?\', \'明天天气如何?\n或者可以直接发送您的位置信息给我.';

var ENTER_STATE_PATH = 'enterPath';
var ENTER_STATE_CITY = 'enterCity';
var queryStateMap = new HashMap();

var textHandler = wechat(config, function (req, res, next) {
    var message = req.weixin;
    var userId = message.FromUserName;

    if (message.MsgType === 'location') {
        var lng = message.Location_Y;
        var lat = message.Location_X;
        //http://139.199.197.110/lewei-bus/#!/home-api?lng=118.182171&lat=24.483892
        var url = process.env.LINDE_BUS_URL + 'lng=' + lng + '&lat=' + lat;
        res.reply('点击查看' + url);
    } else if (message.MsgType === 'text') {
        if (queryStateMap.get(userId) === ENTER_STATE_PATH) {
            findBusStation([{entity: message.Content}], res);
            queryStateMap.remove(userId);
        } else if (queryStateMap.get(userId) === ENTER_STATE_CITY){
            findWheInfomtn({entity: message.Content}, res);
            queryStateMap.remove(userId);
        } else {
            LUISclient.predict(message.Content, {
                //On success of prediction
                onSuccess: function (response) {
                    if (response.topScoringIntent.intent === '路线查询') {
                        if (response.entities.length > 0 && response.entities[0].type === '地点') {
                            findBusStation(response.entities, res);
                        } else {
                            queryStateMap.set(userId, ENTER_STATE_PATH);
                            res.reply(queryPath());
                        }
                    } else if (response.topScoringIntent.intent === '天气查询') {
                        if (response.entities.length > 0 && response.entities[0].type === '城市') {
                            findWheInfomtn(response.entities[0], res);
                        } else {
                            queryStateMap.set(userId, ENTER_STATE_CITY);
                            res.reply(queryWher(response.entities));
                        }
                    } else if (response.topScoringIntent.intent === 'None') {
                        if (response.entities.length > 0 && response.entities[0].type === '地点') {
                            findBusStation(response.entities, res)
                        } else if (response.entities.length > 0 && response.entities[0].type === '城市') {
                            res.reply(findWheInfomtn(response.entities[0]));
                        } else {
                            res.reply(HELP_MSG);
                        }
                    } else if (response.topScoringIntent.intent === 'Help') {
                        res.reply(HELP_MSG);
                    } else {
                        res.reply(HELP_MSG);
                    }
                },
                //On failure of prediction
                onFailure: function (err) {
                    console.error(err);
                }
            });

        }
    }
});
var queryPath = function () {
    return '请告诉我地址的完整名称.';
};

var queryWher = function () {
    return '请告诉你想查询的城市名称';
};

var findBusStation = function (entities, res) {
    amap.searchInAmap(entities).then(function (dests) {
        var options = [];
        dests.forEach(function (dest, index) {
            options.push(dest.name + ' [' + dest.adname + ']');
        });
        amap.getAmapCard(dests, options[0]).then(function (result) {
            if (result) {
                res.reply(result);
            }
        });
    });
};

var findWheInfomtn = function (entity, res) {
    return res.reply('findWheInfomtn ' + entity.entity);
};
module.exports = textHandler;