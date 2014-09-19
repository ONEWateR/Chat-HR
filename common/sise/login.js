var http = require("http"), 
	querystring = require("querystring")

exports.login = function (id, pwd, handle) {

	// POST数据
	var contents = querystring.stringify({
		"e4cf57627196a1489c346f6e887160ac" : "f49d13daa3ff40c8243f414e28b09394",
		username: id,
		password: pwd
	})

	// 请求头伪造
	var options = {
		hostname: "class.sise.com.cn",  
		port: 7001,
	    path: "/sise/login_check_login.jsp",
		method: "post",
		headers : {
			"Host": "class.sise.com.cn:7001",  
			"Origin": "http://class.sise.com.cn:7001",
			"User-Agent": "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0; BOIE9;ZHCN)",
			"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",  
	        "Content-Length": contents.length,         
	        "Referer" : "http://class.sise.com.cn:7001/sise/login.jsp"
		}
	}

	var req = http.request(options, function(res){  
	    var cookies = res.headers["set-cookie"],
	    	content = ""
	    res.on("data", function (chunk){ 
	    	content += chunk
	    })

	    res.on("end", function () {
	    	var html = content;
	    		status = 1
	    	// 登录失败判断
	    	if (html.indexOf("error") != -1)
	    		status = 0
	    	handle(status, cookies[0]);
	    })
	});

	req.write(contents);
	req.end();
}