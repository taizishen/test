
function consoleAssert(express, loginfo) {
    if (window.console) {
        console.assert(express, loginfo);
    }
}

function consoleLog(loginfo) {
    if (window.console) {
        console.log(loginfo);
    }
}

////////////////界面逻辑相关////////////////////////

var sdk;

var g_localRender = null;
var g_renders = new Array();
var g_screenRender = null;
var g_bPotraintScreen = false;  // 横竖屏开播；false：横屏   true: 竖屏

//回调
function onForceOfflineCallback() {
    alert("你的账号在其他地方登陆.");
}

function onRoomDisconnect(errMsg) {
    g_localRender.freeRender();
    for (i in g_renders) {
        g_renders[i].freeRender();
    }
    alert("SDK已自动退出房间,原因: " + errMsg.code + " " + errMsg.desc);
}

function onRoomEvent(roomevent) {
    if (roomevent.eventid == E_iLiveRoomEventType.HAS_CAMERA_VIDEO)//打开摄像头
    {
        //为其分配渲染器
        for (i in g_renders) {
            if (g_renders[i].isFreeRender()) {
                g_renders[i].setIdentifer(roomevent.identifier);
                break;
            }
        }
    }
    else if (roomevent.eventid == E_iLiveRoomEventType.NO_CAMERA_VIDEO)//关闭摄像头
    {
        //释放其占用的渲染器
        for (i in g_renders) {
            if (g_renders[i].getIdentifer() == roomevent.identifier) {
                g_renders[i].freeRender();
                break;
            }
        }
    }
    else if (roomevent.eventid == E_iLiveRoomEventType.HAS_SCREEN_VIDEO)//打开屏幕分享
    {
        g_screenRender.setAuxRoadVideo(true);
    }
    else if (roomevent.eventid == E_iLiveRoomEventType.NO_SCREEN_VIDEO)//关闭屏幕分享
    {
        g_screenRender.freeRender();
    }
}

function onVoiceRecognizeErr(code) {
    alert("语音识别出错，错误码: " + code);
}

function onVoiceRecognizeResult(message) {
    alert("识别文字: " + message);
}

//界面事件
var g_serverUrl = "https://sxb.qcloud.com/sxb_new/index.php";

function ajaxPost(url, data, suc) {
    if (!window.XMLHttpRequest) {
        alert("你的浏览器不支持AJAX!");
        return;
    }
    var ajax = new XMLHttpRequest();
    ajax.open("post", url, true);
    ajax.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    ajax.onreadystatechange = function () {
        if (ajax.readyState == 4) {
            if (ajax.status == 200) {
                var rspJson = null;
                try {
                    rspJson = JSON.parse(ajax.responseText);
                }
                catch (e) {
                    alert("json解析出错,服务器返回内容:\n" + ajax.responseText);
                    return;
                }
                suc(rspJson);
            }
            else {
                alert("HTTP请求错误！错误码：" + ajax.status);
            }
        }
    }
    ajax.send(data);
}

function freeAllRender()
{
    g_localRender.freeRender();
    for (i in g_renders) {
        g_renders[i].freeRender();
    }
    g_screenRender.freeRender();
}

function OnInit() {
    consoleLog("OnInit");
    sdk = new ILiveSDK(1400027849, 11656, "iLiveSDKCom");

    sdk.init(function () {
        g_localRender = new ILiveRender("localRender");
        g_renders[0] = new ILiveRender("render1");
        g_renders[1] = new ILiveRender("render2");
        g_renders[2] = new ILiveRender("render3");
        g_renders[3] = new ILiveRender("render4");
        g_screenRender = new ILiveRender("screenRender");

        sdk.setForceOfflineListener(onForceOfflineCallback);

        sdk.setRoomDisconnectListener(onRoomDisconnect);
        sdk.setRoomEventListener(onRoomEvent);
        document.getElementById("version").innerHTML = sdk.version();
        sdk.setC2CListener(function (msg) {
            alert(msg.elems[0].content);
        });
        sdk.setGroupListener(function (msg) {
            alert(msg.elems[0].content);
        });

        document.getElementById("x1").value = window.screen.width;
        document.getElementById("y1").value = window.screen.height;  
    },
    function (errMsg) {
        alert("初始化失败! 错误码: " + errMsg.code + "描述: " + errMsg.desc);
    });
}

function OnUninit() {
    sdk.unInit();
    freeAllRender();
}

function OnBtnLogin() {
    //从业务侧服务器获取sig
    var id = document.getElementById("id").value;
    var pwd = document.getElementById("pwd").value;
    var jsonObj = { "id": id, "pwd": pwd };
    ajaxPost(g_serverUrl + "?svc=account&cmd=login", JSON.stringify(jsonObj),
    function OnServerLogin(rspJson) {
        var sig = rspJson.data.userSig;
        sdk.login(id, sig, function () {
            alert("login succ");
        }, function (errMsg) {
            alert("错误码:" + errMsg.code + " 错误信息:" + errMsg.desc);
        });
    }
    );
}

function OnBtnLogout() {
    sdk.logout(function () {
        freeAllRender();
        alert("logout succ");
    }, function (errMsg) {
        alert("错误码:" + errMsg.code + " 错误信息:" + errMsg.desc);
    });
}

function OnBtnCreatRoom() {
    var roomid = Number(document.getElementById("roomid").value);
    sdk.createRoom(roomid, "LiveMaster", function () {
        alert("create room succ");
    }, function (errMsg) {
        alert("错误码:" + errMsg.code + " 错误信息:" + errMsg.desc);
    }, g_bPotraintScreen);
}

function OnBtnJoinRoom() {
    var roomid = Number(document.getElementById("roomid").value);
    sdk.joinRoom(roomid, "Guest", function () {
        alert("join room succ");
    }, function (errMsg) {
        alert("错误码:" + errMsg.code + " 错误信息:" + errMsg.desc);
    });
}

function OnBtnQuitRoom() {
    sdk.quitRoom(function () {
        freeAllRender();
        alert("quit room succ");
    }, function (errMsg) {
        alert("错误码:" + errMsg.code + " 错误信息:" + errMsg.desc);
    });
}

function OnBtnOpenCamera() {
    var szRet = sdk.getCameraList();
    if (szRet.code != 0) {
        alert("获取摄像头列表出错; 错误码:" + szRet.code);
        return;
    }
    var nRet = sdk.openCamera(szRet.cameras[0].id);
    if (nRet != 0) {
        alert("打开摄像头失败; 错误码:" + nRet);
    }
    else {
        g_localRender.setIdentifer( document.getElementById("id").value );
    }
}

function OnBtnCloseCamera() {
    var nRet = sdk.closeCamera();
    if (nRet != 0) {
        alert("关闭摄像头失败; 错误码:" + nRet);
    }
    else {
        g_localRender.freeRender();
    }
    // 销毁美颜滤镜资源
    sdk.destroyFilter();
}

function OnBtnOpenMic() {
    var nRet = sdk.openMic();
    if (nRet != 0) {
        alert("打开麦克风失败; 错误码:" + nRet);
    }
    else {
        alert("打开麦克风成功.");
    }
}

function OnBtnCloseMic() {
    var nRet = sdk.closeMic();
    if (nRet != 0) {
        alert("关闭麦克风失败; 错误码:" + nRet);
    }
    else {
        alert("关闭麦克风成功.");
    }
}

function OnBtnOpenPlayer() {
    var nRet = sdk.openSpeaker();
    if (nRet != 0) {
        alert("打开扬声器失败; 错误码:" + nRet);
    }
    else {
        alert("打开扬声器成功.");
    }
}

function OnBtnClosePlayer() {
    var nRet = sdk.closeSpeaker();
    if (nRet != 0) {
        alert("关闭扬声器失败; 错误码:" + nRet);
    }
    else {
        alert("关闭扬声器成功.");
    }
}

function OnBtnSendGroupMessage() {
    var elem = new ILiveMessageElem(E_iLiveMessageElemType.CUSTOM, document.getElementById("msg").value);
    var elems = [];
    elems.push(elem);
    var message = new ILiveMessage(elems);
    sdk.sendGroupMessage(message, function () {
        alert("send message succ");
    }, function (errMsg) {
        alert("错误码:" + errMsg.code + " 错误信息:" + errMsg.desc);
    });
}

function OnBtnSendC2CMessage() {
    var elem = new ILiveMessageElem(E_iLiveMessageElemType.CUSTOM, document.getElementById("msgC2C").value);
    var elems = [];
    elems.push(elem);
    var message = new ILiveMessage(elems);
    sdk.sendC2CMessage(document.getElementById("to").value, message, function () {
        alert("send message succ");
    }, function (errMsg) {
        alert("错误码:" + errMsg.code + " 错误信息:" + errMsg.desc);
    });
}

function OnBtnStartRecognizeVoice() {
    var wxvoice = document.getElementById("WXVoiceSDKCom");
    wxvoice.startVoiceRecognize(onVoiceRecognizeErr, onVoiceRecognizeResult);
}

function OnBtnStopRecognizeVoice() {
    var wxvoice = document.getElementById("WXVoiceSDKCom");
    wxvoice.stopVoiceRecognize();
}

function OnBtnStartPushStream() {
    var op = new ILivePushStreamOption(E_iLivePushDataType.CAMERA, E_iLivePushEncode.HLS, E_iLivePushRecordFileType.MP4);
    sdk.startPushStream(op, function (msg) {
        alert(msg.channelID);
    }, function () {
        alert("错误码:" + errMsg.code + " 错误信息:" + errMsg.desc);
    });
}

function OnBtnStopPushStream(chanelId) {
    sdk.stopPushStream(chanelId, function () {
        alert("stop push succ");
    }, function (errMsg) {
        alert("错误码:" + errMsg.code + " 错误信息:" + errMsg.desc);
    });
}

function OnBtnLocalCameraSnapShot() {
    var img = document.getElementById("snapshotimg");
    var picData = g_localRender.snapShot();

    if (picData.length == 0) {
        alert("截图失败.");
        img.src = "./snapshot.png";
        return;
    }
    try{
        img.src = picData;
    }
    catch(e) {
		img.src = "./snapshot.png";
        alert(e);
    }
}

function OnBtnOpenScreenShareWnd() {
    var ret = sdk.getWndList();
    if (ret.code != 0) {
        alert("获取窗口列表出错; 错误码:" + ret.code);
        return;
    }
    if (ret.wnds.length == 0) {
        alert("没有可供分享的窗口");
        return;
    }
    var nRet = sdk.openScreenShareWnd(ret.wnds[0].id);  //这里直接写死为分享获取到的第一个窗口
    g_screenRender.setAuxRoadVideo(true);
}

function OnBtnOpenScreenShareArea() {
    var x0 = document.getElementById("x0").value;
    var y0 = document.getElementById("y0").value;
    var x1 = document.getElementById("x1").value;
    var y1 = document.getElementById("y1").value;
    var nRet = sdk.openScreenShareArea(x0, y0, x1, y1);
    if (nRet != 0) {
        alert("打开屏幕分享失败,错误码: "+nRet);
    }
    else {
        g_screenRender.setAuxRoadVideo(true);
    }
}

function OnBtnChangeScreenShareSize() {
    var x0 = document.getElementById("x0").value;
    var y0 = document.getElementById("y0").value;
    var x1 = document.getElementById("x1").value;
    var y1 = document.getElementById("y1").value;
    var nRet = sdk.changeScreenShareSize(x0, y0, x1, y1);
    if (nRet != 0) {
        alert("修改屏幕分享区域失败,错误码: " + nRet);
    }
}

function OnBtnCloseScreenShare() {
    var nRet = sdk.closeScreenShare();
    if (nRet != 0) {
        alert("关闭屏幕分享失败,错误码: " + nRet);
    }
    else
    {
       g_screenRender.freeRender();
    }
}

$(function () {
    $("#BeautySlider").slider({
        range: "min",
        max: 10,
        slide: OnSeekSetBeauty,
        change: OnSeekSetBeauty
    });
    $("#WhiteSlider").slider({
        range: "min",
        max: 10,
        slide: OnSeekSetWhite,
        change: OnSeekSetWhite
    });
    $("#SharpenSlider").slider({
        range: "min",
        max: 10,
        slide: OnSeekSetSharpen,
        change: OnSeekSetSharpen
    });
});

function OnSeekSetBeauty() {
    var value = $("#BeautySlider").slider("value");
    //alert("OnSeekSetBeauty " + value);

    $("#BeautyLevelText").text("美颜 " + value);


    sdk.setBeauty(value);
}

function OnSeekSetWhite() {
    var value = $("#WhiteSlider").slider("value");
    $("#WhiteLevelText").text("美白 " + value);
    //alert("OnSeekSetWhite " + value);

    sdk.setWhite(value);
}

function OnSeekSetSharpen() {
    var value = $("#SharpenSlider").slider("value");
    $("#SharpenLevelText").text("清晰度 " + value);

    sdk.setSharpen(value);
}

function onChangeScreenModel(obj) {
    if (obj.checked == false) {
        g_bPotraintScreen = false;
        alert("横屏开播");
    } else {
        g_bPotraintScreen = true;
        alert("竖屏开播");
    }
}
