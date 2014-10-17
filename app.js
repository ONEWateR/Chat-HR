
/**
 * 模块依赖
 */

var express = require('express')
  , routes = require('./routes')
  , action = require('./routes/action')
  , http = require('http')
  , path = require('path')
  , ejs = require('ejs');

var app = express();

// 环境变量
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.engine('.html', ejs.__express);
app.set('view engine', 'html');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser({uploadDir:'./public/img/upload'}));
app.use(express.methodOverride());
app.use(express.cookieParser("4d4afc247a9ad602c33550a644a8ae6e")); 
app.use(express.session({
	cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));


// 开发模式
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
	
// 路径解析
app.get('/', routes.index);
app.get('/feedback', routes.feedback);
app.get('/about', routes.about);
app.get('/login', routes.login);
app.get('/setting', routes.setting);
app.get('/admin', routes.admin);

// POST操作
app.post('/do/feedback', action.doFeedback);
app.post('/do/login', action.doLogin);
app.post('/do/upload', action.doUpdateInfo);
app.post('/do/addfriend', action.doAddFriend);
app.post('/do/mass', action.doMassByAdmin);

// 信息返回
app.get('/get/friends', action.getFriends);
app.get('/get/groups', action.getGroups);


// 启动及端口
var server = http.createServer(app)
server.listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});

// 启动聊天相关操作
require("./common/chat").init(server)