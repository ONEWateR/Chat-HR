/* 

mysise登录以及获取课程信息的功能模块。

*/

var http = require("http")
  , querystring = require("querystring")
  , cheerio = require('cheerio')
  , iconv = require('iconv-lite')

exports.login = function (id, pwd, callback) {

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
	    	callback(status, cookies[0]);
	    })
	});

	req.write(contents);
	req.end();
}

exports.getCourseInfo = function (cookie, callback) {

	var options = {
		hostname: 'class.sise.com.cn',
		port: 7001,
	 	path: '/sise/module/student_schedular/student_schedular.jsp',
		method: 'GET',
		headers: {
			"cookie": cookie
		}
	}

	var content = "";

	var req = http.request(options, function(res) {
		res.setEncoding('binary');
		res.on('data', function (chunk) {
			content += chunk
		});
		res.on('end', function () {
			var html = iconv.decode(content, "GB2312");
			callback(parsers(html))
		});
	});

	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});

	req.end();

}

/**
 * 解析课程页面，获取课程信息
 */
function parsers(html){
	var result = []
	  , i = 0
	  , reg = /(.*?(?:\(.*?\))*)\((.*?)\s(.*?)\s(\d.*?)周\s\[(.*?)\]\)/
	  , $ = cheerio.load(html);
	// 获取姓名的正则表达式 ： 
	var username = html.match(/姓名\:\s(.*?)\s/)[1]
    // 遍历所有<td align='left' ...>元素
	$("td[align='left']").each(function(index, element){
		i++
		var match = $(element).text().trim().match(reg) // 正则解析
		if (match) {
			result.push({
				name: match[1],
				class: match[2],
				teacher: match[3],
				weeks: match[4].split(' ').map(function (i) { return +i }),
				place: match[5],
				time: [i % 7, parseInt(i / 7)]
			})
		}
	})
	return [username, result]
}


