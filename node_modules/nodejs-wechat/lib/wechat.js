var events = require('events');

var util = require('./util.js');
var xmlTemplates = require('./xml-templates.js');
var Session = require('./session.js');
var nodeutil = require('util');
var events = require('events');

function Wechat(opt) {
  this.token = opt.token;
  this.url = opt.url;
}
nodeutil.inherits(Wechat, events.EventEmitter);

/**
 * Receive Messages
 * @{@link http://mp.weixin.qq.com/wiki/index.php?title=接收普通消息}
 * @{@link http://mp.weixin.qq.com/wiki/index.php?title=接收事件推送}
 * @{@link http://mp.weixin.qq.com/wiki/index.php?title=接收语音识别结果}
 * @param  {Request} req
 *         req.body should be set to xml-json
 * @param  {Response} res
 *         dependence on res.type, res.send
 */
Wechat.prototype.handleRequest = function(req, res) {
  if (!this.verifyRequest(req)) {
    res.statusCode = 400;
    res.end();
    return;
  }
  var session = new Session(req, res, this);
  var err = session.err;
  if (err) {
    res.statusCode = err.statusCode;
    res.end();
    this.emit('error', err);
    return;
  }
  var eventStr = session.incomingMessage.MsgType;
  if (eventStr == 'event') {
    eventStr += '.' + session.incomingMessage.Event;
  }
  this.emit(eventStr, session);
};

/**
 * Reply Messages
 * @{@link http://mp.weixin.qq.com/wiki/index.php?title=发送被动响应消息}
 * @param  {Session} session
 * @param  {Message} outgoingMessage 
 */
Wechat.prototype.replyMessage = function(session, outgoingMessage) {
  var msgType = outgoingMessage.MsgType;
  var template = xmlTemplates.get(msgType);
  var xml = template.apply(outgoingMessage);
  session.res.setHeader('Content-Type', 'application/xml');
  session.res.write(xml);
  session.res.end();
}

/**
 * Verify incoming request is legal
 * @{@link http://mp.weixin.qq.com/wiki/index.php?title=验证消息真实性}
 * @param  {Request} req
 * @return {Boolean}
 */
Wechat.prototype.verifyRequest = function (req, res) {
  var timestamp = req.query.timestamp;
  var nonce = req.query.nonce;
  var signature = util.signature(this.token, timestamp, nonce);
  if (signature == req.query.signature) {
    if (res) {
      res.write(req.query.echostr);
      res.end();
    }
    return true;
  } else {
    if (res) res.end();
    return false;
  }
};

module.exports = Wechat;


