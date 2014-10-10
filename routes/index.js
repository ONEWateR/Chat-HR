var mongo = require('mongodb').MongoClient
  , dbConfig = { dbURL: 'mongodb://127.0.0.1:27017/chat' }
  

/**
 * 主页
 */
exports.index = function(req, res){
	if (!req.session.user || !req.session.data) {
		res.redirect('/login')
		return
	}
	
	var data = req.session.data
	res.render('index', JSON.parse(data));
};

/**
 * 反馈
 */
exports.feedback = function(req, res){
	res.render('feedback');
};

/**
 * 关于
 */
exports.about = function(req, res){
	res.render('about');
};

/**
 * 登录
 */
exports.login = function(req, res){
	res.render('login');
};

/**
 * 后台
 */
exports.admin = function(req, res){
	// 判断是否在服务器登录
	if (getClientIp(req) != "127.0.0.1"){
		res.send("404")
		return
	}
	// 获取反馈信息
	var fbdata = {};
	mongo.connect(dbConfig.dbURL, function(err, db) {
		if(err) throw err;
		var collection = db.collection('feedback');
		collection.find().toArray(function(err, results) {
			fbdata = eval(results)
			res.render('admin', {
				FBdata : eval(results) // 反馈信息
			});
			db.close();
		});
	})
};

/**
 * 设置页面
 */
exports.setting = function(req, res){
	if (!req.session.user) res.redirect("/")
	mongo.connect(dbConfig.dbURL, function(err, db) {
		if(err) throw err;
		var Users = db.collection('user')
		Users.findOne({uid: req.session.user}, function(err, doc){
			db.close()
			res.render('setting',{
				uid: doc.uid,
				name: doc.name,
				avatar: doc.avatar,
			});
		})
	})

};


