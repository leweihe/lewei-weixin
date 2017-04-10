module.exports.news = 
'<xml>' +
  '<ToUserName><![CDATA[{ToUserName}]]></ToUserName>' +
  '<FromUserName><![CDATA[{FromUserName}]]></FromUserName>' +
  '<CreateTime>{CreateTime}</CreateTime>' +
  '<MsgType><![CDATA[news]]></MsgType>' +
  '<ArticleCount>{ArticleCount}</ArticleCount>' +
  '<Articles>' +
    '{ArticlesXML}' +
  '</Articles>' +
'</xml>';

module.exports.item =
'<item>' +
  '<Title><![CDATA[{Title}]]></Title>' +
  '<Description><![CDATA[{Description}]]></Description>' +
  '<PicUrl><![CDATA[{PicUrl}]]></PicUrl>' +
  '<Url><![CDATA[{Url}]]></Url>' +
'</item>';
