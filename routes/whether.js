/**
 * Created by cn40580 at 2017-03-16 1:18 PM.
 */
var Q = require('q');
var qs = require('querystring');
var http = require('http');

exports.searchWhether = function (cityName) {
    var deferred = Q.defer();
    var apiData = {
        city: cityName
    };
    var content = qs.stringify(apiData);
    var options = {
        hostname: 'jisutqybmf.market.alicloudapi.com',
        path: '/weather/query?' + content,
        method: 'GET',
        headers: {
            'Authorization': 'APPCODE edc93444b3a14538a199035b9d9ec785'
        }
    };
    var req = http.request(options, function (res) {
        var responseText = '';
        res.on('data', function (data) {
            responseText += data;
        });
        res.on('end', function () {
            var response = JSON.parse(responseText);
            if (response.result) {
                deferred.resolve(response.result);
            }
        });

    });
    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });
    req.end();

    return deferred.promise;
};
