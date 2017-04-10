var util = require('util');
var crypto = require('crypto');
var exports = module.exports;

function sha1(str) {
  var shasum = crypto.createHash('sha1');
  shasum.update(str);
  return shasum.digest('hex');
}
exports.sha1 = sha1;

/**
 * Parse xml-json to json. xml-json is the return value of xml2js.parseString
 * @param  {xml-json} xmlJson
 * @return {json}
 */
function stripXmlJson(xmlJson) {
  return _strip(xmlJson.xml);
  function _strip(json) {
    var res = json;
    if (util.isArray(json)) {
      res = [];
      for(var i=0; i<json.length; ++i) {
        res.push(_strip(json[i]));
      }
    } else if (typeof json === 'object') {
      res = {};
      for (var field in json) {
        res[field] = _strip(json[field][0]);
      }
    }
    return res;
  }
}
exports.stripXmlJson = stripXmlJson;

function signature(toSignData) {
  if (!util.isArray(toSignData)) {
    toSignData = Array.prototype.slice.apply(arguments);
  }
  return sha1(toSignData.sort().join(''));
}
exports.signature = signature;
