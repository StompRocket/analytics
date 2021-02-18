!function(w){
let s = function (r) {
let d = [w.location.href, new Date().toISOString(), r || document.referrer, navigator["language"], navigator["platform"], w.screen.width, w.screen.height], x = new XMLHttpRequest();
x.open('POST', "https://a.stomprocket.io/api/v1/view");
//x.open('POST', "/api/v1/view");
x.setRequestHeader('Content-Type', 'text/plain');
x.send(d);
}

s()


  var h = history.pushState;
  history.pushState = function() {
      var n = w.location.href.replace(/#.+$/, "");
      h.apply(history, arguments),
      s(n)
  };
  w.onpopstate = function(t) {
      s(null)
  };

}(window)
