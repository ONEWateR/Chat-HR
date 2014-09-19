var sise = require("./login"),
	http = require("http"),
	cheerio = require('cheerio'),
    iconv = require('iconv-lite');

// 解析课程页面，获取课程信息
function parsers(html){
	var   result = []
			, i = 0
			, reg = /(.*?(?:\(.*?\))*)\((.*?)\s(.*?)\s(\d.*?)周\s\[(.*?)\]\)/
	    , $ = cheerio.load(html);
	   // 获取姓名的正则表达式 ： 姓名\:\s(.*?)\s
  // 遍历所有<td align='left' ...>元素
	$("td[align='left']").each(function(index, element){
		i++
		var match = $(element).text().trim().match(reg) // 正则解析
		if (match) {
			result.push({
				Name: match[1],
				Class: match[2],
				Teacher: match[3],
				Weeks: match[4].split(' ').map(function (i) { return +i }),
				Place: match[5],
				Time: [i % 7, parseInt(i / 7)]
			})
		}
	})
	console.log(result)
	return result
}

sise.login(1240112215, "xx", function(status, cookie) {
	console.log(status)
})

// 返回课程信息 [array]
exports.get = function (id, pwd, handle) {

	sise.login(id, pwd, function(status, cookie) {

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
				handle(parsers(html))
			});
		});

		req.on('error', function(e) {
			console.log('problem with request: ' + e.message);
		});

		req.end();
	  
	})


}


