/*

  cp stylesheets/stylesheet.css s3/dictionary/stylesheets/
  cp javascripts/jquery.min.js s3/dictionary/javascripts/
  s3cmd put -r s3/* s3://aslfont/

*/

var sourceDir = __dirname + '/../s3/';
var destDir = __dirname + '/../s3/dictionary/';

var fs      = require('fs'),
    path    = require('path'),
    xml2js  = require('xml2js'),
    lazy    = require("lazy"),
    events  = require('events'),
    crypto = require('crypto');

String.prototype.encodeAll = function (){
  return encodeURIComponent(this)
        .replace(/!/g,  '%21')
        .replace(/'/g,  '%27')
        .replace(/\(/g,'%28')
        .replace(/\)/g,'%29')
        .replace(/\*/g, '%2A')
        .replace(/-/g,  '%2D')
        .replace(/\./g, '%2E')
        .replace(/_/g,  '%5F')
        .replace(/~/g,  '%7E');
};

Array.prototype.getUnique = function(){
   var u = {}, a = [];
   for(var i = 0, l = this.length; i < l; ++i){
      if(u.hasOwnProperty(this[i])) {
         continue;
      }
      a.push(this[i]);
      u[this[i]] = 1;
   }
   return a;
};

String.prototype.leftSubstrings = function(max, reg){
  var substrings = [];
  for(var i=1; i<=max; i++){
    var s = this.substr(0, i);
    if(!reg || s.match(reg)){
      substrings.push(s);
    }
  }
  return substrings;
}

var md5 = function (s) {
  return crypto.createHash('md5').update(s).digest("hex");
}

var write = function(k, v){
  var before = fs.existsSync(k) ? fs.readFileSync(k, 'utf8') : '';
  if(before != v) {
    append(destDir + 'changed_files.txt', path.basename(k)+'\n');
    fs.writeFileSync(k, v);
  }
};

var append = function(k, v){
  fs.appendFileSync(k, v);
};

var deleteIndex = function(reg) {
  var files = fs.readdirSync(destDir + 'index');
  files.forEach(function(item){
    if(item.match(reg)) {
      fs.unlinkSync(destDir + 'index/' + item, function (err) {
        if (err) throw err;
      });
    }
  });
};

var entryFileName = function(id) {
  return destDir + 'entries/' + id + '.json';
};

var makeEntry = function (item) {
  return {
    'title' : item.header[0].span[0],
    'asl_title' : item.header[0].span[1]['_'],
    'description' : item.div[0].div[0],
    'asl_description' : item.div[0].div[1]['_']
  }
};

var breakUpEntryList = function (file, dict){

  var entryChunkFilename = function (i) {
    return destDir + 'index/' + file.replace(/\.entries_all\.txt$/, '') + '.entries.' + i + '.txt';
  };
 
  var entriesPerChunk = 250;
  var lines = [];
  var i = 0;
  var o = new events.EventEmitter();
  var stream = fs.createReadStream(destDir + 'index/' + file);
    new lazy(stream)
      .lines
      .forEach(function(line){
        lines.push(line);
        if(lines.length >= entriesPerChunk){
          write(entryChunkFilename(i++), lines.join("\n"));
          lines = [];
        }
      });
  stream.on('end', function(){ 
    if(lines.length){
      write(entryChunkFilename(i++), lines.join("\n"));
    }
    dict[file.replace(/\.entries_all\.txt$/, '')] = {files: i};
    fs.unlink(destDir + 'index/' + file);
    o.emit('done');
  });
  return o;
};

var getWords = function (entry) {
  var words = [];

  var english_title = (entry.title || "");
  english_title = english_title.replace(/ +/,' ').replace(/^ | $/g, '').split(' ');
  english_title.forEach(function(word){
    if(word.length){
      words = words.concat(word.replace(/[^a-zA-Z0-9]/,'').toLowerCase());
    }
  });

  var english_desc = (typeof entry.description =='string' ? entry.description : "");
  english_desc = english_desc.replace(/ +/,' ').replace(/^ | $/g, '').split(' ');
  english_desc.forEach(function(word){
    if(word.length){
      words = words.concat(word.replace(/[^a-zA-Z0-9]/,'').toLowerCase());
    }
  });
  
  var asl_title = (entry.asl_title || "").encodeAll().split('%').join('_');
  asl_title = asl_title.replace(/(_20)+/,'_20').replace(/^_20|_20$/g, '').split('_20');
  asl_title.forEach(function(word){
    if(word.length){
      words = words.concat('_' + word);
    }
  });
  
  var asl_desc = (entry.asl_description || "").encodeAll().split('%').join('_');
  asl_desc = asl_desc.replace(/(_20)+/,'_20').replace(/^_20|_20$/g, '').split('_20');
  asl_desc.forEach(function(word){
    if(word.length){
      words = words.concat('_' + word);
    }
  });

  asl_title = (entry.asl_title || "");
  var regs = [ 
    /[\^_<>\/\\JZ@]/g,
    /[\^_<>\/\\JZ]?@/g,
    /[\^_<>\/\\JZ@]+/g,
    /[\^_<>\/\\JZ]+@/g,
    /[a-zA-IK-Y0-9]/g,
    /[a-zA-IK-Y0-9]+/g,
    /[!;#$&*+]/g,
    /[!;#$&*+]+/g,
    /\{[^\}\{\(\)\[\] ]*\}/g,
    /\[[^\}\{\(\)\[\] ]*\]/g,
    /\([^\}\{\(\)\[\] ]*\)/g,
    /(\}\{|\}\}|\}|\))( |$)/g,
    /\?[\?\{\}\(\)]*/g,
    /[\.`]["='\-~%]|["='\-~%][\.`]/g,
    /[a-zA-IK-Y0-9]([\.`]["='\-~%]|["='\-~%][\.`])/g,
    /([\.`]["='\-~%]|["='\-~%][\.`])[a-zA-IK-Y0-9]/g
  ];
  regs.forEach(function(reg){
    var match = reg.exec(asl_title);
    while (match) {
      var word = '_' + match[0].encodeAll().split('%').join('_');
      words = words.concat(word.leftSubstrings(24, /(_[A-F0-9]{2}[a-zA-Z0-9]*$)|^_[a-zA-Z0-9]+$/));
      match = reg.exec(asl_title);
    }
  });
  return words.getUnique();
};

var loadBlackList = function (f){
  var list = {};
  var words = fs.readFileSync(sourceDir + 'blacklist.txt', 'utf8').split('\n');
  words.forEach(function(line){
    list[line] = true;
  });
  return list;
}

var blacklist = loadBlackList();

data = fs.readFileSync(sourceDir + 'dictionary_offline.html');

(new xml2js.Parser()).parseString(data, function (err, result) {
  if(err)
    console.log(err);
  else {
    deleteIndex(/entries_all\.txt$/);
    // deleteIndex(/entries\.[0-9]+\.txt$/);
    
    result.html.body[0].section.forEach(function(item){
      var item_id = item['$'].id
      var entry = makeEntry(item);
      write(entryFileName(item_id), JSON.stringify(entry));
      
      var words = getWords(entry);
      words.forEach(function(word){
        if(!blacklist[word])
          // md5 for case insensitive file systems
          append(destDir + 'index/' + word + '.' + md5(word).substr(0, 6) + '.entries_all.txt', item_id + "\n");
      });
    });
    var entries = fs.readdirSync(destDir + 'index');
    var file;

    var dict = {};
    var g;
    var f = function(){
      if(!entries.length){
        g();
        return;
      }
        
      while(file = entries.shift()){
        if(file.match(/\.entries_all\.txt$/))
          break;
      }
      
      if(file) {
        var o = breakUpEntryList(file, dict);
        o.on('done', f);
      }
    };
    g = function(){
      var dictFilename = destDir + 'index.json';
      write(dictFilename, JSON.stringify(dict).replace(/,/g, ',\n'));
    }
    f();
  }
});
