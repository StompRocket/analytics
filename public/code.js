let s=function(){let e=[window.location.href,new Date().toISOString(),document.referrer,navigator.language,navigator.platform,window.screen.width,window.screen.height],n=new XMLHttpRequest;console.log("send",e)};s(),window.onpopstate=function(){s()};
