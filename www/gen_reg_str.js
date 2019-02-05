function utf8_strlen(str)
{
    var cnt = 0;
    for( i=0; i<str.length; i++)
    {
        var value = str.charCodeAt(i);
        if( value < 0x080)
        {
            cnt += 1;
        }
        else if( value < 0x0800)
        {
            cnt += 2;
        }
        else
        {
            cnt += 3;
        }
    }
    
    return cnt;
}

$("#gen_button").on("click", function () {
    var username = $("#username").val();
    username = username.replace(/(^\s*)|(\s*$)/g, "");

    if(username.indexOf(" ") != -1) {
	alert("username can't contain any space characters");
	return;
    }

    var len = utf8_strlen(username);
    
    if(len == 0) {
	alert("username can't be empty");
	return;
    }
    
    if(len > 15) {
	alert("the length of username can't exceed 15 bytes");
	return;
    }

    var username_b64 = Base64.encode(username);

    $.get("/generate", {user:username_b64}, function(data) {
	$("textarea").text(data);
    });
});
