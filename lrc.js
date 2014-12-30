/**
 * lrc parser and player
 * @version 0.1.0
 */

var LrcMap,startLine,$lrcInput,$out,$audio,lrc;

var parse = function (txt){
	return new Lrc(txt, function(text, extra){
		var pre = $("<pre>").text(LrcMap[extra.lineNum].txt).hide();
		$out.empty().append(pre.fadeIn('slow'))
	});
};

var loadLrc = function($lrcInput){
	lrc = parse($lrcInput);
	lrc.listener();
}

var Lrc = (function(){
  Date.now = Date.now || (new Date).getTime;
  var timeExp = /\[(\d{2,})\:(\d{2})(?:\.(\d{2,3}))?\]/g
    , tagsRegMap = {
        title: 'ti'
      , artist: 'ar'
      , album: 'al'
      , offset: 'offset'
      , by: 'by'
    }
    ;
  
  /**
   * lrc parser
   * @param {string} lrc lrc 歌词字符串
   * @param {function} [handler] 
   * @constructor
   */
  var Parser = function(lrc, handler){
    lrc = Parser.trim(lrc);
    this.lrc = lrc;//lrc 歌词
    this.handler = handler || function(){}
    this.tags = {};//ID tags. 标题, 歌手, 专辑
    this.lines = [];//详细的歌词信息
    this.txts = [];
    this.isLrc = Parser.isLrc(lrc);
    
    this.curLine = 0;//
    this.state = 0;// 0: stop, 1: playing
        
    var res, line, time, lines = lrc.split(/\n/)
      , _last;
    
    for(var tag in tagsRegMap){
      res = lrc.match(new RegExp('\\[' + tagsRegMap[tag] + ':([^\\]]*)\\]', 'i'));
      this.tags[tag] = res && res[1] || '';
    }
    
    timeExp.lastIndex = 0;
    for(var i = 0, l = lines.length; i < l; i++){
      while(time = timeExp.exec(lines[i])){
        _last = timeExp.lastIndex;
        line = Parser.trim(lines[i].replace(timeExp, ''));
        timeExp.lastIndex = _last;
        if(time[3].length==2)
        this.lines.push({
            time: time[1] * 60 * 1000 + time[2] * 1000 + (time[3] || 0) * 10
          , originLineNum: i
          , txt: line
        });
    	else this.lines.push({
            time: time[1] * 60 * 1000 + time[2] * 1000 + (time[3] || 0) * 1
          , originLineNum: i
          , txt: line
        });
        this.txts.push(line);
      }
    }
    
    this.lines.sort(function(a, b){
    	return a.time - b.time;
    });
    for (var i = 0; i <= this.lines.length; i++) {
    	if(this.lines[i+1])
    	if(this.lines[i].time==this.lines[i+1].time){
    		this.lines[i+1].txt=this.lines[i].txt+'\n'+this.lines[i+1].txt;
    		this.lines.splice(i,1);
    		i--;
    	}
    };
    LrcMap=this.lines;
    startLine=LrcMap[0].originLineNum;
  };
  
  //按照时间点确定歌词行数
  function findCurLine(time){
    for(var i = 0, l = this.lines.length; i < l; i++){
      if(time <= this.lines[i].time){
        break;
      }
    }
    return i;
  }
  
  function focusLine(i){
    this.handler.call(this, this.lines[i].txt, {
        originLineNum: this.lines[i].originLineNum
      , lineNum: i
    })
  }
  
  //lrc stream control and output
  Parser.prototype = {
      //time: 播放起点, skipLast: 是否忽略即将播放歌词的前一条(可能是正在唱的)
      play: function(time, skipLast){
        var that = this;
        
        time = time || 0;
        //that._startStamp = Date.now() - time;//相对开始时间戳
        that.state = 1;
        
        if(that.isLrc){
          that.curLine = findCurLine.call(that, time);
          
          if(!skipLast){
            that.curLine && focusLine.call(that, that.curLine - 1);
          }
          
          if(that.curLine < that.lines.length){
          
            clearTimeout(that._timer);
            that._timer = setTimeout(function loopy(){
              focusLine.call(that, that.curLine++);
              
              if(that.lines[that.curLine]){
                that._timer = setTimeout(function(){
                  loopy();
                }, that.lines[that.curLine].time - $audio.currentTime * 1000);
                //}, that.lines[that.curLine].time - that.lines[that.curLine--].time);//一些情况可能用得上
              }else{
                //end
              }
            }, that.lines[that.curLine].time - time)
          }
        }
      }
    , pauseToggle: function(){
        if(this.state){
          this.stop();
        }
      }
    , seek: function(offset){
        //this._startStamp -= offset;
        this.state && this.play($audio.currentTime * 1000);//播放时让修改立即生效
      }
    , stop: function(){
        this.state = 0;
        clearTimeout(this._timer);
      }
    , listener: function(){
    	$audio.addEventListener('playing',function(){
     //console.log('2');
    	var s = $audio.currentTime * 1000 || 0;
    	lrc.play(s);
    })
    $audio.addEventListener('pause',function(){
    	lrc.pauseToggle();
    })
    $audio.addEventListener('waiting',function(){
    //console.log('1');
    	lrc.pauseToggle();
    })
    $audio.addEventListener('seek',function(){
    	var offset = $audio.currentTime * 1 || 0
    	lrc.seek(offset);
    })
    }
  };
    
  Parser.trim = function(lrc){
    return lrc.replace(/(^\s*|\s*$)/m, '')
  };
  Parser.isLrc = function(lrc){
    return timeExp.test(lrc);
  };
  return Parser;
})();




	

 
