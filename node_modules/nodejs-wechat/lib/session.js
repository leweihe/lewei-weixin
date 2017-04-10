var util = require('./util.js');
function Session(req, res, wechat) {
  this.req = req;
  this.res = res;
  this.wechat = wechat;
  this.init();
}
Session.prototype.init = function() {
  if (!this.req.body) {
    var err = new Error();
    err.statusCode = 500;
    err.message = 'req.body is not set.'
    this.err = err;
    return;
  }
  this.incomingMessage = util.stripXmlJson(this.req.body);
  if (!this.incomingMessage) {
    var err = new Error();
    err.statusCode = 500;
    err.message = 'req.body is not correctly parse to message object.';
    this.err = err;
  }
}
Session.prototype.replyMessage = function(outgoingMessage) {
  outgoingMessage.FromUserName = this.incomingMessage.ToUserName;
  outgoingMessage.ToUserName = this.incomingMessage.FromUserName;
  outgoingMessage.CreateTime = Date.now();
  this.wechat.replyMessage(this, outgoingMessage);
}
Session.prototype.replyTextMessage = function(content) {
  this.replyMessage({
    MsgType: 'text',
    Content: content
  });
}
Session.prototype.replyNewsMessage = function(articles) {
  this.replyMessage({
    MsgType: 'news',
    ArticleCount: articles.length,
    Articles: articles
  });
}
module.exports = Session;
