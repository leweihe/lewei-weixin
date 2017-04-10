# Nodejs Wechat

  [![NPM version](https://badge.fury.io/js/nodejs-wechat.png)](http://badge.fury.io/js/nodejs-wechat) [![Build Status](https://travis-ci.org/idy/nodejs-wechat.svg?branch=master)](https://travis-ci.org/idy/nodejs-wechat)

Nodejs wrapper of wechat api

### __Usage__
#### Work with native http server
```javascript
var http = require('http');
var xmlBodyParser = require('express-xml-parser');
var Wechat = require('nodejs-wechat');

var opt = {
  token: 'TOKEN',
  url: '/'
};
var parse = xmlBodyParser({
  type: 'text/xml'
});
var wechat = new Wechat(opt);
wechat.on('event.subscribe', function(session) {
  session.replyTextMsg('欢迎您关注我们的订阅号');
});
var server = http.createServer(function(req, res) {
  if (req.method === 'GET') {
    wechat.verifyRequest(req, res);
  } else {
    parse(req, res, function(err) {
      if (err) {
        res.end();
        return;
      }
      wechat.handleRequest(req, res);
    });
  }
});
server.listen(80);
```

#### Work with express
```javascript
var express = require('express');
var app = express();
var middlewares = require('express-middlewares-js');
app.use('/weixin', middlewares.xmlBodyParser({
  type: 'text/xml'
}));

/*
  Alternative way

var xmlBodyParser = require('express-xml-parser');
app.use('/weixin', xmlBodyParser({
  type: 'text/xml',
  limit: '1mb'
}));

*/

var Wechat = require('nodejs-wechat');
var opt = {
  token: token,
  url: '/weixin'
};
var wechat = new Wechat(opt);

app.get('/weixin', wechat.verifyRequest.bind(wechat));
app.post('/weixin', wechat.handleRequest.bind(wechat));

// you can also work with other restful routes
app.use('/api', middlewares.bodyParser());

wechat.on('text', function(session) {
  session.replyTextMsg('Hello World');
});
wechat.on('image', function(session) {
  session.replyNewsMsg([{
    Title: '新鲜事',
    Description: '点击查看今天的新鲜事',
    PicUrl: 'http://..',
    Url: 'http://..'
  }]);
});
wechat.on('voice', function(session) {
  session.replyMsg({
    Title: 'This is Music',
    MsgType: 'music',
    Description: 'Listen to this music and guess ths singer',
    MusicUrl: 'http://..',
    HQMusicUrl: 'http://..',
    ThumbMediaId: '..'
  });
});

app.listen(80);
```

> __NOTE__: We apply `{ type: 'text/xml' }` to `xmlBodyParser` as weixin server 
send us a `text/xml` content type instead of `application/xml`.

### __API__
#### Wechat
- `#verifyRequest(req, res)`
  > This is a express/connect middleware, which verify the signature of
  request from weixin server

- `#handleRequest(req, res)`
  > This is a express/connect middleware, which handle the request post from 
  weixin server

- `#on(msgType, handler)`
  > Wechat is an inheritance from event.EventEmitter. Wechat will emit an event
  in incoming message's `MsgType`, with a `Session` as parameter. Valid events: 
  >
  > `text`, `image`, `voice`, `video`, `location`, `link`, `event.subscribe`, 
  `event.unsubscribe`, `event.SCAN`, `event.LOCATION`, `event.CLICK`, `event.VIEW`,
  `error`
  >
  > __References__: [接收普通消息](http://mp.weixin.qq.com/wiki/index.php?title=%E6%8E%A5%E6%94%B6%E6%99%AE%E9%80%9A%E6%B6%88%E6%81%AF "接收普通消息"), 
  [接收事件推送](http://mp.weixin.qq.com/wiki/index.php?title=%E6%8E%A5%E6%94%B6%E4%BA%8B%E4%BB%B6%E6%8E%A8%E9%80%81 "接收事件推送")

#### Session
- `incomingMessage`
  > This is a direct parse of weixin server request

```xml
<xml>
<ToUserName><![CDATA[toUser]]></ToUserName>
<FromUserName><![CDATA[FromUser]]></FromUserName>
<CreateTime>123456789</CreateTime>
<MsgType><![CDATA[event]]></MsgType>
<Event><![CDATA[subscribe]]></Event>
</xml>
```
Becomes
```json
{
  "ToUserName": "toUser",
  "FromUserName": "FromUser",
  "CreateTime": "123456789",
  "MsgType": "event",
  "Event": "subscribe"
}
```

- `req` 
  > This is the request from weixin server

- `res`
  > This is the response to weixin server

- `#replyMsg(msgObject)`
  > Reply a message via `this.res`

- `#replyTextMessage(content)`
  > Reply a text message

- `#replyNewsMessage(articles)`
  > Reply a news messages.

### TODO
- Advanced interfaces
  > Will finish advanced interfaces before July/2014, welcome send pull requests :)
