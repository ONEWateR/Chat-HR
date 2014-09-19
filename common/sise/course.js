var sise = require("./login"),
	http = require("http"),
	cheerio = require('cheerio'),
    iconv = require('iconv-lite');

// 解析课程页面，获取课程信息
function parsers(html){
	var   result = []
			, i = 0
			, reg = /(.*?(?:\(.*?\))*)\((.*?)\s(.*?)\s(\d.*?)周\s\[(.*?)\]\)/
			, nameReg = /姓名\:\s(.*?)\s/
	    , $ = cheerio.load(html);
	   // 获取姓名的正则表达式 ： 
	var username = html.match(nameReg)[1]
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
	//console.log(result)
	return [username, result]
}

// 返回课程信息 [array]
exports.get = function (cookie, handle) {

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

}


