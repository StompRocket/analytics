let s = function () {
let d = [window.location.href, new Date().toISOString(), document.referrer, navigator["language"], navigator["platform"], window.screen.width, window.screen.height], x = new XMLHttpRequest();
x.open('POST', "https://a.stomprocket.io/api/view");
x.setRequestHeader('Content-Type', 'text/plain');
x.send(d);
console.log("send", d)
}
s()
window.onpopstate = history.onpushstate = function() {s()}
