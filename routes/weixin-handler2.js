// This loads the environment variables from the .env file
require('dotenv-extended').load();

var wechat = require('wechat-enterprise');
var HashMap = require('hashmap');
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

var HELP_MSG = 'Hi! 试着通过文字问问我有关班车或者天气的问题呗! \'火车站怎么走?\', \'明天天气如何?\n或者直接发送位置信息.';

var ENTER_STATE_PLACE = 'enterPlace';
var ENTER_STATE_CITY = 'enterCity';
var ENTER_STATE_PATH = 'enterPath';

var queryStateMap = new HashMap();

var textHandler = wechat(config, function (req, res, next) {
    var message = req.weixin;
    var userId = message.FromUserName;

    if (message.MsgType === 'location') {
        var lng = message.Location_Y;
        var lat = message.Location_X;
        findBusStationByLocation(lng, lat, res);
    } else if (message.MsgType === 'text') {
        if (queryStateMap.get(userId) === ENTER_STATE_PLACE) {
            findBusStation([{entity: message.Content}], res);
            queryStateMap.remove(userId);
        } else if (queryStateMap.get(userId) === ENTER_STATE_CITY) {
            findWeatherInfo({entity: message.Content}, res);
            queryStateMap.remove(userId);
        } else {
            LUISclient.predict(message.Content, {
                //On success of prediction
                onSuccess: function (response) {
                    if (response.topScoringIntent.intent === '路线查询') {
                        if (response.entities.length > 0 && response.entities[0].type === '地点') {
                            findBusStation(response.entities, res);
                        } else {
                            queryStateMap.set(userId, ENTER_STATE_PLACE);
                            res.reply(queryPath());
                        }
                    } else if (response.topScoringIntent.intent === '天气查询') {
                        if (response.entities.length > 0 && response.entities[0].type === '城市') {
                            findWeatherInfo(response.entities[0], res);
                        } else {
                            queryStateMap.set(userId, ENTER_STATE_CITY);
                            res.reply(queryWher(response.entities));
                        }
                    } else if (response.topScoringIntent.intent === 'None') {
                        if (response.entities.length > 0 && response.entities[0].type === '地点') {
                            findBusStation(response.entities, res)
                        } else if (response.entities.length > 0 && response.entities[0].type === '城市') {
                            findWeatherInfo(response.entities[0], res);
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
        var dest = dests[0];
        var destDesc = dest.name + ' [' + dest.adname + ']';
        amap.getAmapCard(dest, destDesc).then(function (result) {
            if (result) {
                res.reply(result);
            }
        });
    });
};

var findBusStationByLocation = function (lng, lat, res) {
    var destDesc = '地图标记';
    var dests = {location: lng + ',' + lat};
    amap.getAmapCard(dests, destDesc).then(function (result) {
        if (result) {
            res.reply(result);
        }
    });
};

var findWeatherInfo = function (entity, res) {
    whether.searchWhether(entity.entity).then(function (response) {
        res.reply(parseWeatherInfo(response));
    });
};

var parseWeatherInfo = function (obj) {
    var result = '' + obj.city + '今天\n';
    result += obj.weather + ' ' + obj.temphigh + '~' + obj.templow + '度 ' + obj.windpower + obj.winddirect + '\n';
    result += '-------未来三天-------\n';
    obj.daily.forEach(function (daily, index) {
        if (index !== 0 && index <= 3) {
            result += daily.week + ' 白天: ' + daily.day.weather + ', 夜间: ' + daily.night.weather;
            if (index !== 3) result += '\n';
        }
    });
    return result;
};

module.exports = textHandler;