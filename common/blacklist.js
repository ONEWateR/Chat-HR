/*

 简易版黑名单

*/

var blacklist = {}

exports.check = function(req, time, min){
	var ip = req.ip
	if (!blacklist[ip]){
		blacklist[ip] = {
			time: 0,
			last: new Date()
		}
	}
	var timespan = new Date() - blacklist[ip].last
	if (timespan > 1000 * 60 * min) {
		blacklist[ip].time = 0;
	} 
	if (blacklist[ip].time > time){
		return false;
	}else{
		blacklist[ip].time++;
	}
	return true;
}
