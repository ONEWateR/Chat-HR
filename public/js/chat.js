var SaveUtils = (function (){
    var checkLocalStorage = function(){
        if(!window.localStorage){
            alert('你使用的浏览器不支持localStorage， 请使用高级点的浏览器(喂');
        }
    }
    var STATIC = {
        get : function(key, defaultValue) {
            if (localStorage[key])
                return JSON.parse(localStorage[key])
            else
                return defaultValue
        },
        save : function(key, value){
            localStorage[key] = JSON.stringify(value);
        },
        clear: function(key){
            localStorage[key].removeItem(key)
        }
    }
    return STATIC;
})();



/**
 * 全局变量声明
 */

var ID = parseInt($.cookie("user"))
  , HISTORY = {}
  , HISTORYKEY = []
  , USERS = []
  , CurrentID = 0
  , NOREAD = {}
  , socket = io('http://172.16.103.36:3000')
var reg = /[a-z]/

/**
 * 提醒模块
 */
var notify = {  
    time: 0,  
    title: document.title,  
    timer: null,  
    // 显示新消息提示  
    show: function () {  
        var title = notify.title.replace("【　　　】", "").replace("【新消息】", "");  
        // 定时器，设置消息切换频率闪烁效果就此产生  
        notify.timer = setTimeout(function () {  
            notify.time++;  
            notify.show();  
            if (notify.time % 2 == 0) {  
                document.title = "【新消息】" + title  
            }  
            else {  
                document.title = "【　　　】" + title  
            };  
        }, 600);  
        return [notify.timer, notify.title];  
    },  
    // 取消新消息提示  
    clear: function () {  
        clearTimeout(notify.timer);  
        document.title = notify.title;  
    }  
};  



emojify.setConfig({

    only_crawl_id    : null,            // Use to restrict where emojify.js applies
    img_dir          : 'img/emoji',     // Directory for emoji images
    ignored_tags     : {                // Ignore the following tags
        'SCRIPT'  : 1,
        'TEXTAREA': 1,
        'A'       : 1,
        'PRE'     : 1,
        'CODE'    : 1
    }
});

emojify.run();

Init();



/**
 * 初始化操作
 */
function Init(){
    // 发送用户上线信号
    socket.emit('online', {user: ID});
    // 获取好友以及班群信息
    $.ajax({
        type: "GET",
        url: "/get/friends",
        success: function(data){
            data.forEach(function(elem){
                USERS.push(elem)
            })
        }
    })
    $.ajax({
        type: "GET",
        url: "/get/groups",
        success: function(data){
            data.forEach(function(elem){
                USERS.push(elem)
            })
            refreshList(3)
        }
    })
    // 获取历史对话信息
    HISTORY = SaveUtils.get("historyData", {})
    
    // 处理提醒模块
    handleNotify()
}


/**
 * 创建历史对话内容
 *
 * @param {Array} 信息对象数组
 */

function createChatContent(contents){
    if (typeof(contents) == "undefined") contents = []
    // 清空内容
    $(".chat-content").html("")
    for (var i = 0; i < contents.length; i++){
        appendChat(contents[i], false)
    }
    $(".chat-content")[0].scrollTop = $(".chat-content")[0].scrollHeight
    $("#chat-content li").animate({opacity:'1'}, 800)
}


/**
 * 添加对话
 *
 * @param {Object} 信息对象
 * @param {Bool} 历史对话创建的标记
 */

function appendChat(con, single){
    if (typeof(single) == "undefined") single = true;

    // TODO:有点烦琐，将就用着
    var c = $("#chat-content")
      , type = ["left-chat", "right-chat", "fr"]
      , from = con.from.uid
      , style = [
            from == ID ? type[1] : type[0],
            from == ID ? type[2] : "",
            from == ID ? ID : from,
            from == ID ? "" : con.from.name
        ]

    // 添加对话框
    c.append( 
        "<li class='{0}' style='opacity:0;'>\
            <p style='font-size: 8px;color: #9C9C9C'>{4}</p>\
            <img class='avatar' src='img/upload/{3}' />\
            <div class='demo {1}'>\
                <div class='article'><span class='triangle'></span>{2}</div>\
            </div>\
        </li>\
        <div class='clearfix'></div>".format(style[0], style[1], con.con, con.from.avatar, style[3]))

    // 如果不是创建历史对话的情况下，即单条添加时
    if (single){
        // 更新滚动条位置
        c[0].scrollTop = c[0].scrollHeight
        // 渐变出现消息
        $("#chat-content li:last").animate({opacity:'1'}, 800)
    }

    emojify.run();
}

/**
 * 发送消息
 */

function sendMessage(){
    // 未选择聊天对象直接返回
    if (CurrentID == 0) return;

    // 预处理发送信息
    var box = $("#enter-text")
      , msg = box.val()
      , content;
    if (msg.length == 0) return
    msg = msg.replace(/\s/gi, "&nbsp;")
             .replace(/</gi, "&lt;")
             .replace(/>/gi, "&gt;")
    
    // 整理信息
    content = {
        from: getUserInfo(ID),
        to: CurrentID,
        con: msg,
        date: new Date()
    }

    // 发送
    socket.emit('say', content);

    // 页面表现
    box.val("")
    appendChat(content)

    // 将信息添加至HISTROY
    saveChatInfo(content)
}

/**
 * 监听收到新消息
 * @param {Object} 收到的数据
 */

socket.on('say', function (data) {
    // 群聊信息的话
    if (data.to.match(reg)){
        if (CurrentID == data.to){
            appendChat(data);
        }else{
            setNORead(data.to, -1) // 设置未读标记
        }
    }else{
        // 如果信息发送对象包括你，并且当前的聊天窗口属于发送来源
        if (data.to == ID){
            if (data.from.uid == CurrentID){
                appendChat(data)
            }else{
                setNORead(data.from.uid, -1) // 设置未读标记
            }
        }
    }

    // 如果当前页面属于激活状态
    if (document[state] == "hidden")
        notify.show()

    // 保存信息
    saveChatInfo(data)
});


/**
 * 处理提醒模块
 */
var state; 

function handleNotify(){
    var visibilityChange; 
    // 多浏览器处理
    if (typeof document.hidden !== "undefined") {
        visibilityChange = "visibilitychange";
        state = "visibilityState";
    } else if (typeof document.mozHidden !== "undefined") {
        visibilityChange = "mozvisibilitychange";
        state = "mozVisibilityState";
    } else if (typeof document.msHidden !== "undefined") {
        visibilityChange = "msvisibilitychange";
        state = "msVisibilityState";
    } else if (typeof document.webkitHidden !== "undefined") {
        visibilityChange = "webkitvisibilitychange";
        state = "webkitVisibilityState";
    }

    // 当前窗口重新激活，取消新消息提醒
    document.addEventListener(visibilityChange, function() {
        if (document[state] == "visible")
            notify.clear()
    }, false);

}

/**
 * 保存历史对话
 * @param {Object} 收到的数据
 */

function saveChatInfo(data){
    // 获取ID
    var id = data.from.uid
    if (id == ID || data.to.toString().match(reg)) id = data.to
    if (typeof(HISTORY[id]) == "undefined") {
        HISTORY[id] = []
        HISTORYKEY.push(id)
    }
    HISTORY[id].push(data)
    
    // 当前为最近tab则刷新左侧列表数据
    // TODO: 避免频繁刷新
    if ($(".list-type li[id=1]").hasClass("active"))
        refreshList(1)

    SaveUtils.save("historyData", HISTORY);
}


/**
 * TODO:禁止发送按钮（保留）
 */

function disableSendButton(){
    $("#sumbit").addClass("disabled");
    $("#enter-text").attr("disabled", "");
}

/**
 * 刷新左侧列表
 * @param {Number} 类型[1, 2, 3] TODO:想用枚举的
 */

function refreshList(type){
    // 获取左侧列表数据
    var data = getListData(type)
      , friendList = $(".friend-list")

    // 动态显示 
    // TODO: 效果并不是十分良好，保留
    friendList.animate({opacity:'0'}, 0, "linear", function(){
        // 清空列表
        friendList.html("");
        // 解析数据，生成列表
        for (var i = 0; i < data.length; i++){
            var info = data[i];
            friendList.append(
                "<li id='{4}'>\
                    <img class='avatar' src='img/upload/{3}' />\
                    <div class='list-item-info'>\
                        <p class='user-name'>{0}</p>\
                        <p class='last-info'>{1}</p>\
                    </div>\
                    <span class='badge pull-right'>{2}</span>\
                    <div class='clearfix'></div>\
                </li>".format(info.user.name, info.last, info.noread, info.user.avatar, info.user.id)
            )
        }

        // 页面表现
        $(".friend-list li[id='"+ CurrentID +"']").addClass("active")
        friendList.animate({opacity:'1'}, 0)

        // 重新注册点击事件
        registerClickEvent()
    })
}


/**
 * 获取左侧列表数据
 * @param {Number} 类型[1, 2, 3] TODO:想用枚举的
 */

function getListData(type) {
    var result = []
    switch(type){
        case 1: // 最近，读取cookie获取
            for(var id in HISTORY){
                var user = getUserInfo(id)
                  , lastMessage = HISTORY[user.uid][HISTORY[user.uid].length - 1]
                result.push({
                    user: {
                        id: user.uid,
                        name: user.name,
                        avatar: user.avatar
                    },
                    last: lastMessage.con,
                    noread: getNORead(user.uid),
                    date: lastMessage.date
                })
            }
            result = result.sort(function(a, b){
                return a.date > b.date ? -1 : 1;
            })
            break;
        case 2: // 好友列表
            USERS.forEach(function (user) {
                if (typeof(user.uid) != "string" && user.uid != ID)
                result.push({
                    user: {
                        id: user.uid,
                        name: user.name,
                        avatar: user.avatar
                    },
                    last: "",
                    noread: getNORead(user.uid)
                })
            })
            break;
        case 3: // ONLY TEST
            USERS.forEach(function (user) {
                if (user.uid.toString().match(reg))
                result.push({
                    user: {
                        id: user.uid,
                        name: user.name,
                        avatar: user.avatar
                    },
                    last: "",
                    noread: getNORead(user.uid)
                })
            })
            break;
    }
    return result;
}

/**
 * 获取用户信息
 * @param {Number} uid
 */

function getUserInfo(uid){
    for (var i = 0; i < USERS.length; i++){
        if (USERS[i].uid == uid)
            return USERS[i]
    }
    if (uid == 10086) {
        return {
            id: 10086,
            name: "萌萌哒☆管理员",
            avatar: "admin.png"
        }
    }
    return  {
                id: 0,
                name: "unkonw",
                avatar: "unkonw.jpg"
            }
}


/**
 * 注册列表的点击事件
 */

function registerClickEvent(){
    $(".friend-list li").click(function(){
        if (!$(this).hasClass("active")){
            $(".friend-list li").removeClass("active")
            $(this).addClass("active")
            var id = $(this).attr("id")
            CurrentID = id
            createChatContent(HISTORY[id])
            setNORead(CurrentID, 0)
        }
    })
}

/**
 * TODO: 设置未读数据
 * @param {Number} id
 * @param {Number} -1: 原数据+1, 
                   other: 正常设置
 */


function setNORead(id, num){
    if (typeof(NOREAD[id]) == "undefined") 
        NOREAD[id] = 0
    if (num == -1){
        NOREAD[id]++
    }else{
        NOREAD[id] = num
    }


    $(".friend-list li[id="+ id +"] .pull-right").html(getNORead(id));
}

/**
 * TODO: 获取未读数据
 * @param {Number} id
 */

function getNORead(id){
    if (typeof(NOREAD[id]) == "undefined") 
        NOREAD[id] = 0
    if (NOREAD[id] == 0){
        return ""
    }else{
        return NOREAD[id]
    }
}

/**
 * 格式化输入字符串。
 * 延续C#的字符串格式化风格
 * By Unkonw (www)
 */
String.prototype.format= function(){
    var args = arguments;
        return this.replace(/\{(\d+)\}/g,function(s,i){
        return args[i];
    });
}

/**
 * 添加TABHOST点击事件
 */
 
$(".list-type li").click(function(){
    if (!$(this).hasClass("active")){
        $(".list-type li").removeClass("active")
        $(this).addClass("active")
        refreshList(parseInt($(this).attr("id")))
    }
})

/**
 * 为表情添加点击事件
 */

$("#emoji img").click(function(){
    var box = $("#enter-text")
    box.val($("#enter-text").val() + $(this).attr("title"))
    $("#emoji").css("display", "none")
    box.focus()

})

function showEmoji(){
    
    if ($("#emoji").css("display") == "none")
        $("#emoji").css("display", "block")
    else
        $("#emoji").css("display", "none")
    $("html, body").animate({ scrollTop: document.body.scrollHeight }, 860);
}

document.onkeydown = function(){
    if (event.ctrlKey && window.event.keyCode == 81){
        showEmoji();
    }
};

$(".list-type li").removeClass("active")
$(".list-type li[id=3]").addClass("active")
refreshList(3)
CurrentID = "c4ca4238a0b923820dcc509a6f75849b"
createChatContent(HISTORY["c4ca4238a0b923820dcc509a6f75849b"])
$("#enter-text").focus()



