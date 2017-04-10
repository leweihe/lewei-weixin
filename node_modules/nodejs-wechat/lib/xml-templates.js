var util = require('util');

function Template(templ) {
  this._template = templ;
  this.init();
}
Template.prototype.init = function() {
  var fnSrc = 'return this._template';
  var placeholderReg = /\{(\w+)\}/g;
  var match;
  while (match = placeholderReg.exec(this._template)) {
    fnSrc += '.replace(/' + match[0] + '/g, t.' + match[1] + ' || "")';
  }
  fnSrc += ';';
  this.apply = new Function('t', fnSrc);
}

function NewsTemplate(templ) {
  this._news = new Template(templ.news);
  this._item = new Template(templ.item);
}
util.inherits(NewsTemplate, Template);
NewsTemplate.prototype.apply = function(msg) {
  var _this = this;
  msg.ArticlesXML = msg.Articles.reduce(function(xml, item) {
    return xml += _this._item.apply(item);
  }, '');
  return this._news.apply(msg);
}

var xmls = require('require-all')(__dirname + '/xml-templates');
var templates = {
  text: new Template(xmls.text),
  image: new Template(xmls.image),
  voice: new Template(xmls.voice),
  video: new Template(xmls.video),
  music: new Template(xmls.music),
  news: new NewsTemplate(xmls.news),
};

var exports = module.exports;
function get(templateName) {
  return templates[templateName];
}
exports.get = get;



