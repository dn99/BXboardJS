WEB_SOCKET_SWF_LOCATION = '/socket.io/lib/vendor/web-socket-js/WebSocketMain.swf'; 

// 모듈을 추출합니다.
var socketio = require('socket.io');
var express = require('express');
var http = require('http');
var ejs = require('ejs');
//var fs = require('fs');
//var util = require('util');

//var pf = require('policyfile').createServer();
//pf.listen(); //flash socket 용 policy 서버 시작

// 웹 서버를 생성합니다.
var app = express();
app.use(app.router);
app.use(express.static(__dirname + '/public'));

// 웹 서버를 실행합니다.
var server = http.createServer(app);
server.listen(1677, function () {
    //console.log('server running at http://127.0.0.1:1677');
});

// 소켓 서버를 생성합니다.
var io = socketio.listen(server);
io.set('transports', ['websocket', 'flashsocket',/*BUG!!! 'htmlfile',*/ 'xhr-polling', 'jsonp-polling']);
//var io = socketio.listen(server, {transports:['flashsocket', 'websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']});
//io.set('transports',['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
io.set('log level', 2);

// 라우트를 수행합니다.
/*
app.get('/', function (request, response) {
    fs.readFile('lobby.html', function (error, data) {
        response.send(data.toString());
    });
});

app.get('/canvas/:room', function (request, response) {
    fs.readFile('canvas.html', 'utf8', function (error, data) {
        response.send(ejs.render(data, {
            room: request.param('room')
        }));
    });
});

app.get('/room', function (request, response) {
    response.send(io.sockets.manager.rooms);
});
*/

var WHITEBOARD = "whiteboard";
var DOCBOARD = "docboard";
var VIEWBOARD = "viewboard";

var id = 0;

/**
 * 룸아이디별 정보 roomInfo
 * 
roomInfo[room].userList = [];								// 유저리스트

roomInfo[room].multiDisplayInfo = {};						// 탭별 디스플레이 정보
roomInfo[room].multiDisplayInfo[multiID]['file'] = []		// 배경 이미지, 문서 파일 정보
roomInfo[room].multiDisplayInfo[multiID]['display'] = []	// 화이트보드모드 디스픍레이 정보
roomInfo[room].multiDisplayInfo[multiID][pageNum] = []		// 문서보드모드 페이지별 디스플레이 정보

roomInfo[room].multiVOList = [];							// multiVO 리스트

roomInfo[room].multiModeInfo = {};							// 보드모드 정보
roomInfo[room].multiModeInfo[multiID] = ""					// 멀티아이디별 화이트보드, 문서보드모드 정보

roomInfo[room].multiPageInfo = {};							// 페이지 정보
roomInfo[room].multiPageInfo[multiID] = {}					// 멀티아이디별 페이지 정보
roomInfo[room].multiPageInfo[multiID]['pageNum'] = 0		// 멀티아이디별 페이지 선택된 page num
roomInfo[room].multiPageInfo[multiID]['zoomRate'] = 0		// 멀티아이디별 페이지 zoom rate

roomInfo[room].selectedMutiID = "";							// 션택된 멀티아이디
roomInfo[room].selectedMultiIndex = 0;						// 선택된 멀티인덱스
*/
var roomInfo = {};

function initDataInfo()
{
	//console.log("----------- INIT DATA INFO -------------");
	
	roomInfo = {};
}

function initRoomInfo( room )
{
	//console.log("----------- INIT ROOM INFO : " + room + " ------------");
	roomInfo[room] = {};
	
	roomInfo[room].userList = [];

	roomInfo[room].multiDisplayInfo = {};
	roomInfo[room].multiVOList = [];
	roomInfo[room].multiModeInfo = {};
	roomInfo[room].multiPageInfo = {};
	
	roomInfo[room].selectedMutiID = "";
	roomInfo[room].selectedMultiIndex = 0;
}

function hasMultiFirst( room )
{
	var isMultiFirst = false;
	if ( roomInfo[room] == null )
	{
		initRoomInfo( room );
		isMultiFirst = true;
	}

	return isMultiFirst;
}

function deleteRoomInfo( room )
{
	//console.log("----------- DELETE ROOM INFO : " + room + " ------------");
	roomInfo[room] = null;
}

function removeItem(array, key, value)
{
	var len = array.length;
    for ( var i=0; i<len; i++ )
    {
    	if ( array[i][key] == value ) 
    	{	
    		array.splice(i,1);
    		break;
    	}
    }
}

function hasOwnItem( obj, key )
{
	return obj.hasOwnProperty(key);	
}

function deleteDataInfo( multiID, room )
{
	delete roomInfo[room].multiDisplayInfo[multiID];
//	delete roomInfo[room].multiVOInfo[multiID];
	removeItem( roomInfo[room].multiVOList, 'multiID', multiID );
	delete roomInfo[room].multiModeInfo[multiID];
	if ( hasOwnItem( roomInfo[room].multiPageInfo, multiID ) ) delete roomInfo[room].multiPageInfo[multiID];
}

function removeUserID( userList, userID )
{
	var len = userList.length;
	for ( var i=0; i<len; i++ )
	{
		if ( userList[i] == userID ) userList.splice( i, 1 );
	}
}

function removeValue(array, value)
{
    var index = null;
    while ((index = array.indexOf(value)) !== -1)
        array.splice(index, 1);

    return array;
}

function changeDisplayData( displayList, data )
{
	var action = data.infoVO.action;
	
//	//console.log(">>> changeDisplayData - action : " + action + "  |  id : " + data.id);
	
	var id = data.id;
	var isExist = false;
	var len = displayList.length;
	for ( var i=0; i<len; i++ )
	{
//		//console.log("-> displayList[i].infoVO.action : " + displayList[i].infoVO.action + "  |  displayList[i].id : " + displayList[i].id);
		if ( displayList[i].infoVO.action == action && displayList[i].id == id )
		{
//			//console.log("before displayList[i] : " + JSON.stringify(displayList[i].propVO,null,4));
			isExist = true;
			displayList[i] = data;
//			//console.log("after displayList[i] : " + JSON.stringify(displayList[i].propVO,null,4));
			break;
		}
	}
	if ( isExist == false ) displayList.push( data );
}

function checkChangeDisplayData( displayList, data )
{
	if ( data.id == "" || data.id == null ) return;
	
	if ( data.infoVO.action == 'penDraw' ) displayList.push( data );
	else								   changeDisplayData( displayList, data );
}


function setPageZoomRate( displayList, data, boardMode )
{
	if ( boardMode == DOCBOARD ) return;
	changeDisplayData( displayList, data ); 
}

function setDisplayList( displayList, data, boardMode )
{
	var action = data.infoVO.action;
	
	data.isInitSync = true;

	switch ( action )
	{
		case 'setMultiSelect' :
		case 'deselectAll' :
		case 'selectionEnable' :
		case 'selectionDisable' :
		case 'multiSelectOn' :
		case 'removeAll' :
		case 'selectHandle' :
		case 'removeHandle' :
		break;
		case 'movingHandle' :
		case 'setBgColor' :
		case 'setResize' :
		case 'setMove' :
		case 'textInput' :
		case 'updateProp' : changeDisplayData( displayList, data );
		break;
		case 'penDraw' :
		case 'shapeDraw' :
		case 'textDraw' : checkChangeDisplayData( displayList, data );
		break;
		case 'setZoom' : setPageZoomRate( displayList, data, boardMode );
		break;
		default : displayList.push( data );
	}
}

function removeDisplayData( displayList, selectedID )
{
//	//console.log("---- 1 displayList : " + JSON.stringify(displayList,null,4));
	
	var idLen = selectedID.length;
	//console.log(":::::::::::: displayList total : " + displayList.length);
	for ( var i=0; i<idLen; i++ )
	{
		for ( var j=displayList.length-1; j>=0; j-- )
		{
			try
			{
				//console.log("::: selectedID : " + selectedID[i] + " | id : " + displayList[j].id + " | action : " + displayList[j].infoVO.action);
				if ( displayList[j].id == selectedID[i] ) displayList.splice( j, 1 );
			}
			catch ( exception )
			{
				//console.log("::: remove history data exception : " + exception.message );
			}
			
		}
	}
		
//	//console.log("---- 2 displayList : " + JSON.stringify(displayList,null,4));
}

function printDataInfo( isDetail, room )
{
	if ( isDetail == true )
	{
		console.log("----------- DATA INFO : " + room + " ------------");
		console.log("multiDisplayInfo : " + JSON.stringify(roomInfo[room].multiDisplayInfo,null,4));
		console.log("multiVOList : " + JSON.stringify(roomInfo[room].multiVOList,null,4));
		console.log("multiModeInfo : " + JSON.stringify(roomInfo[room].multiModeInfo,null,4));
		console.log("multiPageInfo : " + JSON.stringify(roomInfo[room].multiPageInfo,null,4));
	}
	else
	{
		console.log("---------------------- multiDisplayInfo : " + room + " ------------");
		for ( var key in roomInfo[room].multiDisplayInfo ) {
			console.log("multiDisplayInfo : " + key);
		}
		console.log("--------------------- multiVOList : " + room + " ------------");
		for ( var i in roomInfo[room].multiVOList )  {
			console.log("multiVOList : " + roomInfo[room].multiVOList[i]['multiID']);
		}
		console.log("----------------------- multiModeInfo : " + room + " ------------");
		for ( var key in roomInfo[room].multiModeInfo ) {
			console.log("multiModeInfo : " + key);
		}
		console.log("----------------------- multiPageInfo : " + room + " ------------");
		for ( var key in roomInfo[room].multiPageInfo ) {
			console.log("multiPageInfo : " + key);
		}
	}
}

function printUserInfo( socket, room, isDisconnect )
{
	var len = roomInfo[room].userList.length;
	console.log("----------- USER LIST LENGTH : " + len + ",  room : " + room + " ------------");
	console.log(roomInfo[room].userList);
	var userState = isDisconnect ? "disconnect" : "connect";
	console.log("----------- " + userState + " User -------------");
	console.log(socket.userID);
}


function getToday()
{
	var date = new Date();
	return date.getFullYear()+'.'+(date.getMonth()+1)+'.'+
	date.getDate()+'.'+date.getHours()+'.'+date.getMinutes()+'.'+date.getSeconds();
}

function getISODate()
{
	return new Date().toISOString();
}

function setMultiName( multiID, fileName, room )
{
	var len = roomInfo[room].multiVOList.length;
	for ( var i=0; i<len; i++ )
	{
		if ( roomInfo[room].multiVOList[i].multiID == multiID )
		{
			roomInfo[room].multiVOList[i].multiName = fileName;
			continue;
		}
	}
}


function setSyncBoard( multiID, room, isNewUser, displayID )
{
	if ( roomInfo[room].multiDisplayInfo[multiID] == null ) return;

//	multiModeInfo[multiID] = data.multiVO.boardMode;
//  boardMode = data.multiVO.boardMode;

    var boardMode = roomInfo[room].multiModeInfo[multiID];
    
    //console.log("setSyncBoard :: BOARD SYNC boardMode : " + boardMode + " | displayID : " + displayID);
    
	if ( roomInfo[room].multiDisplayInfo[multiID]['file'] != null )
	{
		data = roomInfo[room].multiDisplayInfo[multiID]['file'][0];
		data.isInitSync = true;
		
		if ( data.infoVO.action == 'setDoc' ) boardMode = DOCBOARD;
		else						   		  boardMode = WHITEBOARD;
		
		data.multiVO.boardMode = boardMode;

		if ( boardMode == DOCBOARD ) 
		{	
			data.pageNum = roomInfo[room].multiPageInfo[multiID]['pageNum'];
			data.zoomRate = roomInfo[room].multiPageInfo[multiID]['zoomRate'];
			
			//console.log("setSyncBoard :::::::::::::: pageNum : " + roomInfo[room].multiPageInfo[multiID]['pageNum']);
        	//console.log("setSyncBoard :::::::::::::: zoomRate : " + roomInfo[room].multiPageInfo[multiID]['zoomRate']);
		}
			
		//console.log("BOARD SYNC BACK FILE : ["+multiID+"][file] => " + data.name);
		//console.log("== data.infoVO.action : " + data.infoVO.action + " | displayID : " + roomInfo[room].multiDisplayInfo[multiID]['file'][0].id);
		
		if ( isNewUser == true ) io.sockets.sockets[id].emit('responseDisplayEvent', data);	
		else					 io.sockets.in(room).emit('responseDisplayEvent', data);
	}

	//console.log("------- BOARD MODE : " + boardMode);

	var len = 0;
	if ( boardMode == DOCBOARD ) 
	{
		var pageNum = roomInfo[room].multiPageInfo[multiID]['pageNum'];
		var zoomRate = roomInfo[room].multiPageInfo[multiID]['zoomRate'];
//		var pageNum = docPageNum.toString();
	
		if ( roomInfo[room].multiDisplayInfo[multiID][pageNum] != null )
		{
			len = roomInfo[room].multiDisplayInfo[multiID][pageNum].length;
			//console.log("DOCBOARD SYNC VIEW : ["+multiID+"]["+pageNum+"] => " + len);
			for ( var i=0; i<len; i++ )
			{
				data = roomInfo[room].multiDisplayInfo[multiID][pageNum][i];
				//console.log("== action : " + data.infoVO.action + " | displayID : " + roomInfo[room].multiDisplayInfo[multiID][pageNum][i].id);
				
				data.multiVO.boardMode = boardMode;
				data.pageNum = pageNum;
				data.zoomRate = zoomRate;

				if ( isNewUser == true ) io.sockets.sockets[id].emit('responseDisplayEvent', data);	
				else					 io.sockets.in(room).emit('responseDisplayEvent', data);
		    } //end for
		} //end if
	}
	else
	{
		if ( roomInfo[room].multiDisplayInfo[multiID]['display'] != null )
		{
			len = roomInfo[room].multiDisplayInfo[multiID]['display'].length;
	        //console.log("== WHITEBOARD SYNC VIEW : ["+multiID+"][display] => " + len);
	        for (var i=0; i<len; i++)
	        {
	        	data = roomInfo[room].multiDisplayInfo[multiID]['display'][i];
	        	//console.log("== action : " + data.infoVO.action + " | displayID : " + roomInfo[room].multiDisplayInfo[multiID]['display'][i].id);
//	        	//console.log("multiDisplayInfo : " + JSON.stringify(roomInfo[room].multiDisplayInfo[multiID]['display'][i].propVO,null,4));
	        	
	        	data.multiVO.boardMode = boardMode;

	        	if ( isNewUser == true ) io.sockets.sockets[id].emit('responseDisplayEvent', data);	
	        	else					 io.sockets.in(room).emit('responseDisplayEvent', data);
	        } //end for
		} //end if
	} //end if
}


// 소켓 서버의 이벤트를 연결합니다.
io.sockets.on('connection', function (socket) {
	console.log(">>> connection");
	
	id = socket.id;
    console.log("SOCKET ID : " + id);

    // data : InfoVO
	socket.on('createRoom', function (data) {
    	console.log(">>> createRoom - USER ID : " + data.userID);
    	
    	socket.userID = data.userID;
//    	userInfo[data.userID] = socket.userID = data.userID;
//    	//console.log(userInfo);
//    	//console.log("----------- userInfo -------------> COUNT : " + Object.keys(userInfo).length);
    	
//        io.sockets.emit('createRoom', data.toString());
        io.sockets.emit('createRoom', data);
    });	

    // data : InfoVO
    socket.on('join', function (data) {
    	console.log(">>> join : " + JSON.stringify(data,null,4));
    	
        socket.join(data.roomID);
//        socket.set('room', data);

        var multiInfo = {};

        socket.set('room', data.roomID);
        // 최초 접속시 멀티정보를 내려준다.
        socket.get('room', function (error, room) {
        	console.log(">>> ROOM JOIN USER : " + room);
        	
        	multiInfo.multiFirst = hasMultiFirst( room );
        	multiInfo.multiVOList = roomInfo[room].multiVOList;
        	multiInfo.selectedMultiID = roomInfo[room].selectedMutiID;
        	multiInfo.selectedMultiIndex = roomInfo[room].selectedMultiIndex;
        	multiInfo.multiModeInfo = roomInfo[room].multiModeInfo;

        	roomInfo[room].userList.push( data.userID );
        	printUserInfo( socket, room, false );
        	
        	socket.broadcast.in(room).emit('joinUser');
        	io.sockets.in(room).emit('updateUserList', roomInfo[room].userlist);
//        	io.sockets.in(room).emit('updateUserList', userInfo);
        	
        	//TODO join하는 방 정보인지 확인하여 보내도록 처리
        	io.sockets.sockets[id].emit('joinMe', multiInfo);
        });
        
//        var len = multiInfo.multiList.length;
//        for (var i=0; i<len; i++)
//        {
//        	//console.log("MULTI INFO LIST : " + multiInfo.multiList[i].multiID);
//        }
        
//        for ( var key in roomInfo[room].multiDisplayInfo )
//        {
//        	//console.log("MULTI INFO LIST : " + key);
//        }
        
        //console.log("MULTI INFO SELECTED INDEX : " + multiInfo.selectedMultiIndex);
    });

    // data : MultiVO
    socket.on('creationComplete', function (data) {
    	socket.get('room', function (error, room) {
	    	//console.log(">>> BOARD UI creationComplete : " + data.multiID + "  room : " + room);
	    
	    	setSyncBoard( data.multiID, room, true, data.id );
	    });
    });
    
    // data : InfoVO
    socket.on('requestInfoEvent', function (data) {
//    	//console.log("request");
    	
        socket.get('room', function (error, room) {
        	
	    	if ( data.isBroadcast == false )
	    	{
	    		io.sockets.in(room).emit('responseInfoEvent', data);
	    	} 
	    	else 
	    	{
	    		socket.broadcast.in(room).emit('responseInfoEvent', data);
	    	}
        });
    });

    // data : DisplayObjectVO
    socket.on('requestDisplayEvent', function (data) {
//    	//console.log("request");
    	
//    	if (data.canvasDisplay.length != 0) setMultiInfo(data);
    	
        socket.get('room', function (error, room) {
        	
        	var action = data.infoVO.action;
        	var multiID = data.multiVO.multiID;
        	
//        	//console.log("1 [ multiModeInfo[multiID] : " + roomInfo[room].multiModeInfo[multiID]);
//        	//console.log("1 data.multiVO.boardMode : " + data.multiVO.boardMode);
        	
//        	if ( roomInfo[room].multiModeInfo[multiID] == null ) roomInfo[room].multiModeInfo[multiID] = data.multiVO.boardMode;
			roomInfo[room].multiModeInfo[multiID] = data.multiVO.boardMode;
			
//			//console.log("2 [ multiModeInfo[multiID] : " + roomInfo[room].multiModeInfo[multiID]);

        	var boardMode = roomInfo[room].multiModeInfo[multiID];
        	data.isoDate = getISODate();

        	if ( data.isInputHistory == true ) 
        	{
	        	//console.log("============= requestDisplayEvent :: BOARD SYNC ==============");
	        	//console.log("[ action : " + action + " | displayID : " + data.id + " | boardMode : " + boardMode);
//	        	//console.log("[ boardMode : " + boardMode + " | multiID : " + multiID);
	
//	        	for ( var key in roomInfo[room].multiModeInfo )
//	        	{
//	        		//console.log("- multiModeInfo multiID : " + key + " | boardMode : " + roomInfo[room].multiModeInfo[key]);
//	        	}
	        }

//	    	//console.log("room : " + room);
//	    	//console.log("isBroadcast : " + data.infoVO.isBroadcast);
//	    	//console.log("isoDate : " + data.isoDate);

	    	if ( data.infoVO.isBroadcast == false )
	    	{
	    		io.sockets.in(room).emit('responseDisplayEvent', data);
	    	} 
	    	else 
	    	{
	    		socket.broadcast.in(room).emit('responseDisplayEvent', data);
	    	}

	    	// 최초 드로잉 아이디 설정
        	if ( action == 'setPen' || action == 'setShape' || action == 'setText' )
        	{
        		data.id = data.isoDate;
        	}
        	
	    	if ( boardMode == DOCBOARD ) 
        	{
        		if ( roomInfo[room].multiPageInfo[multiID] == null )
        		{
	        		roomInfo[room].multiPageInfo[multiID] = {};
	        		roomInfo[room].multiPageInfo[multiID]['pageNum'] = 1;
	        		roomInfo[room].multiPageInfo[multiID]['zoomRate'] = 1;
	        	}
        		
        		roomInfo[room].multiPageInfo[multiID]['pageNum'] = data.pageNum;

        		if ( action == 'setZoom' )
    	    	{
    	    		roomInfo[room].multiPageInfo[multiID]['zoomRate'] = data.zoomRate;
    	    	}        		

//        		//console.log("requestDisplayEvent :::::::::::::: pageNum : " + roomInfo[room].multiPageInfo[multiID]['pageNum']);
//        		//console.log("requestDisplayEvent :::::::::::::: zoomRate : " + roomInfo[room].multiPageInfo[multiID]['zoomRate']);

	    		var pageNum = roomInfo[room].multiPageInfo[multiID]['pageNum'];

        		if ( action == 'setPage' )
    	    	{
    	    		//console.log("== DOC SET PAGE : " + pageNum + "   multiID : " + multiID);
    	    		//console.log("== roomInfo[room].multiDisplayInfo[multiID][pageNum] : " + roomInfo[room].multiDisplayInfo[multiID][pageNum]);
    	    		
    	    		if ( roomInfo[room].multiDisplayInfo[multiID][pageNum] != null )
    	    		{
    	    			var len = roomInfo[room].multiDisplayInfo[multiID][pageNum].length;
    	    			//console.log("TOTAL COUNT : ["+multiID+"]["+pageNum+"] => " + len);
    	    			for ( var i=0; i<len; i++ )
    	    			{
	    	    			data = roomInfo[room].multiDisplayInfo[multiID][pageNum][i];
	    	    			
	    	    			if ( action == 'setDoc' ) continue;
	    	    			
	    	    			//console.log("== action : " + action + "  |  isBroadcast : " + data.infoVO.isBroadcast);
		    				
	    	    			if ( data.infoVO.isBroadcast == false )
		    		    	{
		    		    		io.sockets.in(room).emit('responseDisplayEvent', data);
		    		    	} 
		    		    	else 
		    		    	{
		    		    		socket.broadcast.in(room).emit('responseDisplayEvent', data);
		    		    	} //end if
		    		    } //end for
    	    		} // end if
    	    		return;
    	    	} //end if
    	    	
        		if ( action == 'setDoc' )
    			{
    				setMultiName( data.multiVO.multiID, data.name, room );
//    				//console.log("== displayList SET DOC : " + action + " | boardMode : " + boardMode);
    				roomInfo[room].multiDisplayInfo[multiID] = {};
    				roomInfo[room].multiDisplayInfo[multiID]['file'] = [data];
    				return;
    			}    	    	

    			if ( roomInfo[room].multiDisplayInfo[multiID][pageNum] == null || action == 'removeAll' ) 
				{
//					//console.log("== displayList INIT PAGE : ["+multiID+"]["+pageNum+"]");
					roomInfo[room].multiDisplayInfo[multiID][pageNum] = [];
				}
				
    			if ( action == 'removeHandle' )
	        	{
	        		var selectedID = data.selectedID;
	        		var displayList = roomInfo[room].multiDisplayInfo[multiID][pageNum];
	        		removeDisplayData( displayList, selectedID );
	        	}

				if ( data.isInputHistory == true ) 
				{
//					//console.log("== SET DOC PAGE : " + action + " | boardMode : " + boardMode + " | count : " + roomInfo[room].multiDisplayInfo[multiID][pageNum].length);
					
					var displayList = roomInfo[room].multiDisplayInfo[multiID][pageNum];
					setDisplayList( displayList, data, boardMode );
				}
			}
        	else
        	{
        		if ( action == 'setFile' )
    			{
    				setMultiName( data.multiVO.multiID, data.name, room );
//    				//console.log("== displayList SET FILE : " + action + " | boardMode : " + boardMode);
    				roomInfo[room].multiDisplayInfo[multiID] = {};
    				roomInfo[room].multiDisplayInfo[multiID]['file'] = [data];
    				return;
    			}
        	
        		if ( roomInfo[room].multiDisplayInfo[multiID]['display'] == null || action == 'removeAll' ) 
        		{
//        			//console.log("== displayList INIT DISPLAY : ["+multiID+"][display]");
        			roomInfo[room].multiDisplayInfo[multiID]['display'] = [];
        		}
	        	
        		if ( action == 'removeHandle' )
	        	{
	        		var selectedID = data.selectedID;
	        		var displayList = roomInfo[room].multiDisplayInfo[multiID]['display'];
	        		removeDisplayData( displayList, selectedID );
	        	}

        		if ( data.isInputHistory == true ) 
				{
//	        		//console.log("== SET DISPLAY : " + action + " | boardMode : " + boardMode + " | count : " + roomInfo[room].multiDisplayInfo[multiID]['display'].length);
					
	        		var displayList = roomInfo[room].multiDisplayInfo[multiID]['display'];
	        		setDisplayList( displayList, data, boardMode );
				}
        	} // end if
        });
    });

    // data : MultiVO
    socket.on('requestMultiEvent', function (data) {
    	console.log("requestMultiEvent ----------------------------------------------------------------------------");
        socket.get('room', function (error, room) {
        	
        	var action = data.infoVO.action;
        	
        	console.log("----------------------------------------------------------------------------");
    		console.log("> multi action : " + action + "  selectedMultiIndex -------> " + data.selectedMultiIndex + "    multiID : " + data.multiID + "    borderMode : " + data.boardMode);
        	
        	if ( action == 'setNew' ) 
        	{
        		data.multiID = getISODate();
        		
        		var multiID = data.multiID;
	    		//console.log("== displayInfo INIT : ["+multiID+"]");
	    		
	    		roomInfo[room].multiDisplayInfo[multiID] = {};
//	    		roomInfo[room].multiVOInfo[multiID] = data;
	    		roomInfo[room].multiVOList.push(data);
	    		
	    		roomInfo[room].selectedMutiID = multiID;
	    		roomInfo[room].selectedMultiIndex = data.selectedMultiIndex;
        	} 
        	else if ( action == 'setIndex' ) 
        	{
        		
        		roomInfo[room].selectedMutiID = data.multiID;
        		roomInfo[room].selectedMultiIndex = data.selectedMultiIndex;
        		
//        		roomInfo[room].multiModeInfo[multiID] = data.boardMode;
//        		roomInfo[room].boardMode = data.boardMode;
        	}
        	else if ( action == 'setDelete' )
        	{
        		var deleteMultiIndex = data.selectedMultiIndex;
        		var deleteMultiID = data.selectedMultiID;
        		
        		//해당 멀티아이디 아이템 제거
				deleteDataInfo( deleteMultiID, room );
        	}
        	else if ( action == 'setDeleteAfter' )
        	{
				roomInfo[room].selectedMutiID = data.selectedMultiID;
				roomInfo[room].selectedMultiIndex = data.selectedMultiIndex;
				
				return;
        	}
        	
	    	io.sockets.in(room).emit('responseMultiEvent', data);
	    	
	    	if ( action == 'setIndex' ) 
	    	{
        		setSyncBoard( data.multiID, room, false, data.id );
	    	}
	    	
	    	printDataInfo( false, room );
        });
    });

    socket.on('callTest', function() {
    	console.log(">>> callTest");
    });
    
    socket.on('dis', function() {
    	//console.log(">>> disconnect");
    	
    	if (socket) socket.disconnect();
    });
    	

    socket.on('disconnect', function() {
    	console.log(">>> disconnect");
    	
    	socket.get('room', function (error, room) {
			// 사용자 목록을 관리하는 전역변수에서 해당 사용자를 삭제한다.
	    	removeUserID( roomInfo[room].userList, socket.userID );
	    	printUserInfo( socket, room, true );
	    	
//			delete userInfo[socket.userID];
//			//console.log("----------- userInfo -------------");
//    		//console.log(userInfo);
//    		//console.log("----------- disconnectUser -------------");
//    		//console.log(socket.userID);
	
			// 채팅을 사용하는 변경된 사용자 목록을 클라이언트에게 업데이트하도록 updateusers 함수를 실행하도록 알린다.
//    		io.sockets.emit('user', userInfo);
	
	    	var len = roomInfo[room].userList.length;
	    	if ( len == 0 ) deleteRoomInfo( room );
//    		var len = Object.keys(userInfo).length;
//    		if ( len == 0 ) initDataInfo();

        	if( roomInfo[room] == null ) return;
        	
        	io.sockets.in(room).emit('updateUserList', roomInfo[room].userList);
//        	io.sockets.in(room).emit('updateUserList', userInfo);
        	io.sockets.in(room).emit('disconnectUser', socket.userID);
        });
    	
//		// 사용자가 채팅 서버에서 나갔다는 메시지를 전역으로(모든 클라이언트에게) 알린다.
//		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
		socket.leave(socket.room);
	});
    
});

