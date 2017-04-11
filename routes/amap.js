// This loads the environment variables from the .env file
require('dotenv-extended').load({
    errorOnMissing: true
});

var http = require('http');
var qs = require('querystring');
var Q = require('q');
var mongod = require('./mongod.js');

var HELP_MSG = '[若这不是您查询的地点,可以输入\'查询路线\'或者直接发送定位信息.]';

var AMAP_WEB_API_KEY = '06268f43b75ea67cbe6faa132acc4d19';
exports.getAmapCard = function (queryPoint, destDesc) {
    var result = '';
    var deferred = Q.defer();
    mongod.findAllBusRoute().then(function (busRoutes) {
        // var queryPoint = session.userData.possiblePoints[dest.index];
        calcBusRoute(queryPoint, busRoutes).then(function (nearestStation) {
            if (nearestStation) {
                var chosenOne = {};
                busRoutes.forEach(function (route) {
                    route.stations.forEach(function (station) {
                        if (station === nearestStation) {
                            chosenOne = route;
                        }
                    });
                });
                if (nearestStation.keyword.indexOf('林德') >= 0) {
                    result = '您距离终点较近,可以选择直接步行至' + nearestStation.keyword;
                } else {
                    result = '去' + destDesc + '的最佳路线为[' + chosenOne.routeName + ']路班车 \n'
                        + '建议乘车站点为[' + nearestStation.keyword + ']\n'
                        + process.env.LINDE_BUS_URL + 'lng=' + queryPoint.location.split(',')[0] + '&lat=' + queryPoint.location.split(',')[1] + '\n'
                        + HELP_MSG;
                }
            } else {
                result = destDesc + '附近没有合适的站点,不建议搭乘班车.\n' + HELP_MSG;
            }
            deferred.resolve(result);
        });
    });
    return deferred.promise;
};
var calcBusRoute = function (queryPoint, busRoutes) {
    var deferred = Q.defer();
    var nearestStation = {};
    var stations = [];
    busRoutes.forEach(function (route, index) {
        route.stations.forEach(function (station) {
            stations.push(station);
        });
    });
    getAllDistance(queryPoint, stations).then(function (distResults) {
        var shortestInd = 0;
        var shortestDist = 0;
        var tmpDist = 0;
        distResults.forEach(function (dist, index) {
            if (index === 0) {
                shortestDist = parseFloat(dist.distance);
            }
            tmpDist = parseFloat(dist.distance);
            if (tmpDist < shortestDist) {
                shortestDist = tmpDist;
                shortestInd = index;
            }
        });

        if (shortestDist > 3000) {
            nearestStation = null;
            console.log('the path to the nearest station ' + stations[shortestInd].keyword + ' is more than 3000m suggest not to take linde bus');
        } else {
            nearestStation = stations[shortestInd];
            console.log('the shortest one is ' + shortestDist + ' and the index is ' + shortestInd);
        }
        deferred.resolve(nearestStation);
    });
    return deferred.promise;
};

var getAllDistance = function (queryPoint, stations) {
    var deferred = Q.defer();
    var destination = queryPoint.location;
    var originsArr = [];

    var result = [];

    if (stations.length > 100) {

    }
    var origins = '';
    stations.forEach(function (station, index) {
        if (index / 100 === 1) {
            originsArr.push(origins);
            origins = '';
        }
        origins += station.lng;
        origins += ',';
        origins += station.lat;
        origins += '|';
    });
    originsArr.push(origins);
    originsArr.forEach(function (ori) {
        var apiData = {
            key: AMAP_WEB_API_KEY,
            origins: ori,
            destination: destination,
            output: 'json'
        };
        var content = qs.stringify(apiData);
        var options = {
            hostname: 'restapi.amap.com',
            path: '/v3/distance?' + content,
            method: 'GET'
        };
        var req = http.request(options, function (res) {
            var responseText = '';
            res.on('data', function (data) {
                responseText += data;
            });
            res.on('end', function () {
                var response = JSON.parse(responseText);
                if (response.results) {
                    response.results.forEach(function (point) {
                        result.push(point)
                    });
                }
                deferred.resolve(result);
            });

        });
        req.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
        req.end();

    });
    return deferred.promise;
};

exports.searchInAmap = function (dests) {
    var deferred = Q.defer();
    //读取文件
    var keywords = '';
    dests.forEach(function (dest) {
        keywords += dest.entity + '|';
    });
    var apiData = {
        key: AMAP_WEB_API_KEY,
        city: '厦门',
        extensions: 'base',
        keywords: keywords,
        offset: 3, //选五个
        page: 1
    };
    var content = qs.stringify(apiData);
    var options = {
        hostname: 'restapi.amap.com',
        path: '/v3/place/text?' + content,
        method: 'GET'
    };
    var result = [];
    var req = http.request(options, function (res) {
        var responseText = '';
        res.on('data', function (data) {
            responseText += data;
        });
        res.on('end', function () {
            JSON.parse(responseText).pois.forEach(function (point) {
                result.push(point)
            });
            deferred.resolve(result);
        });

    });
    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });
    req.end();

    return deferred.promise;
};