/**
 * Created by cn40580 at 2017-03-15 10:46 AM.
 */

var MongoClient = require('mongodb').MongoClient;
var Q = require('q');

exports.findAllBusRoute = function () {
    var deferred = Q.defer();
    console.log(process.env.DOCUMENT_DB_HOST);
    MongoClient.connect(process.env.DOCUMENT_DB_HOST, function (err, db) {
        if (err) throw err;
        console.log('mongo db connected.');
        var collection = db.collection('busRouteDTO');
        var whereStr = {tripFlag: 'GO'};//只查询单向结果
        var queryResult = [];
        collection.find(whereStr, function (error, cursor) {
            cursor.each(function (error, doc) {
                if (doc) {
                    queryResult.push(doc);
                }
                deferred.resolve(queryResult);
            });
        });
        db.close();
    });
    return deferred.promise;
};

exports.backdoorVarify = function () {
    var deferred = Q.defer();
    MongoClient.connect(process.env.DOCUMENT_DB_HOST + process.env.DATABASE, function (err, db) {
        var collection = db.collection('busRouteDTO');
        var whereStr = {};
        var queryResult = [];
        collection.find(whereStr, function (error, cursor) {
            cursor.each(function (error, doc) {
                if (doc) {
                    queryResult.push(doc);
                }
                deferred.resolve(queryResult);
            });
        });
        db.close();
    });
    return deferred.promise;
};
