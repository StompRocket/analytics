 function getURLComponents(url, removeParams) {
        var pattern = /(.+:\/\/)?([^\/]+)(\/.*)*/i;
        var arr = pattern.exec(url);
        var cleanURL = arr[0].replace(/\/+$/, '')
        var page = arr[3]
        if(removeParams) {
         var split = cleanURL.split('?')
         // console.log(split, "cleaning url")
         cleanURL = split[0]
         page = page.split('?')[0]
        }
        return {
            url: cleanURL,
            protocal: arr[1],
            hostname: arr[2],
            page: page

        }
 }
 function getQueryStringParams(params, url) {
  // first decode URL to get readable data
  var href = decodeURIComponent(url || window.location.href);
  // regular expression to get value
  var regEx = new RegExp('[?&]' + params + '=([^&#]*)', 'i');
  var value = regEx.exec(href);
  // return the value if exist
  return value ? value[1] : null;
};
module.exports = {getURLComponents, getQueryStringParams}
