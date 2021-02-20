 function getURLComponents(url) {
        var pattern = /(.+:\/\/)?([^\/]+)(\/.*)*/i;
        var arr = pattern.exec(url);
        return {
            url: arr[0],
            protocal: arr[1],
            hostname: arr[2],
            page: arr[3]

        }
 }
module.exports = {getURLComponents}