
var mongodb = require('mongodb');
var dburl = 'mongodb://127.0.0.1:27017/chat'

exports.connect = function(callback){
	mongodb.connect(dburl, callback)
}

// 连接出错处理
exports.error = function(err){
	throw err
}