// #1 循环POST请求
for (var i = 0; i < 100; i++) {
	$.ajax({
        url: 'do/feedback',
        type: 'POST',
        timeout: 10000,
        data: {con: "test"},
        dataType: 'html'
    })
};