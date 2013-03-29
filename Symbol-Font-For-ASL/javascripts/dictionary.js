(function () {

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.lastIndexOf(str, 0) === 0
  };
}

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
}

var Timeout = {
  create: function () {
    return $.extend({}, Timeout.prototype);
  },
  prototype: {
    id : null,
    cancel : function() {
      clearTimeout(this.id);
    },
    delay : function(f, delay){
      clearTimeout(this.id);
      this.id = setTimeout(f, delay);
      return true;
    }
  }
};

var RequestQueue = {
  requests : [],
  cancelAll : function(){
    var self = this;
    $.each(self.requests, function(i,request){
      request.abort();
    });
    $.requests = [];
  }
};

var EntryIndexGroup = {
  prototype: {
    fetchNext: function(cb) {
      var self = this;
      var done = true;
      $.each(self.indexes, function (i, index) {
        if (!index.fetchNext(cb)) {
          done = false;
          return false;
        }
      });
      return done;
    },
    indexLength: function () {
      var self = this;
      if (typeof self._length != 'undefined') {
        return self._length;
      }
      self._length = 0;
      $.each(self.indexes, function (i, index) {
        self._length += index.maxIndexLength();
      });
      return self._length;
    },
    contains: function (entry) {
      var self = this;
      var found = false;
      $.each(self.indexes, function (i, index) {
        if (index.hasEntry[entry]) {
          found = true;
          return false;
        }
      });
      return found;
    }
  }
}

var EntryIndex = {
  cache : {},
  
  getIndex : function (key, data) {
    var self = this;
    if (self.cache[key]) {
      return self.cache[key];
    }
    return self.cache[key] = self.create(key, data);
  },
  
  getGroup: function (keys) {
    var group = $.extend({
      indexes: []
    }, EntryIndexGroup.prototype);
    
    $.each(keys, function (k, v){
      group.indexes.push(EntryIndex.getIndex(k, v));
    });
    return group;
  },
  
  create : function (key, data) {
    var index = $.extend({
      key: key,
      data: data,
      hasEntry: {}
    }, EntryIndex.prototype);
    return index;
  },
  
  prototype: {
    filesLoaded : 0,
    _length : 0,
    
    indexLength : function(){
      return this._length;
    },

    maxIndexLength : function(){
      return this.data.files;
    },
    
    fetchNext : function(cb){
      var self = this;
      var done = self.filesLoaded >= parseInt(self.data.files);
      if(!done){
        var i = self.filesLoaded;
        RequestQueue.requests.push($.ajax('dictionary/index/' + self.key + '.entries.' + (i++) + '.txt', {
          success : function(data) {
            cb();
            var entries = data.split("\n");
            $.each(entries, function(k, v) {
              if(v!='' && !self.hasEntry[v]) {
                self.hasEntry[v] = true;
                self._length ++;
              }
            });
            self.filesLoaded = Math.max(self.filesLoaded, i);
          }
        }));
      }
      return done;
    }
  }
};

var Dictionary = {
  indexDepth: 3,
  
  buildIndex: function (data) {
    var self = this;
    self.index = {};
    self.hasKey = {};
    $.each(data, function(k, v) {
      self.hasKey[k] = true;
      var o = self.index;
      for (var i = 0; i < self.indexDepth; i++) {
        var p = (k[i] || '');
        o = (o[p] = o[p] || {});
      }
      o[k] = v;
    });
  },
  
  keysLike: function (str, first) {
    var self = this;
    var candidates = [self.index];
    for (var i = 0; i < self.indexDepth; i++) {
      var o = [];
      $.each(candidates, function (ii, candidate) {
        if (i < str.length) {
          if (candidate[str[i]]) {
            o.push(candidate[str[i]]);
          }
        } else {
          $.each(candidate, function(iii, v) {
            o.push(v);
          })
        }
      });
      candidates = o;
    }
    keysLike = {};
    var done = false;
    $.each(candidates, function (i, candidate) {
      $.each(candidate, function (k, v) {
        if (k.startsWith(str)) {
          keysLike[k] = v;
          if(first) {
            done = true;
            return false;
          }
        }
      });
      if (done) return false;
    });
    return keysLike;
  },
  
  getSearchKeys: function (search, asl) {
    var keys = search;
    if (asl) {
      keys = '_' + keys.encodeAll()
        .split('%').join('_')
        .split('_20').join(' _');
    }
  
    keys = keys.split(' ');
    keys = $.map(keys, function(n){
      if(n.match(/^_/)) return n.substr(0, 24).replace(/(.)_.?$/, '$1');
      return n.substr(0, 8);
    })
    return keys;
  },
  
  getIndexesForSearchKeys: function (search_keys) {
    
    var index_groups = [];
    $.each(search_keys, function(i, search_key) {
      var keys = Dictionary.keysLike(search_key, true);
      if (!keys[search_key]) {
        keys = Dictionary.keysLike(search_key);
      }
      index_groups.push(EntryIndex.getGroup(keys));
    });
    
    index_groups.sort(function(a, b){
      return a.indexLength() - b.indexLength();
    });
    
    return index_groups;
  },
  
  fetchNextIndexes: function (index_groups, cb) {
    var done = true;
    $.each(index_groups, function (k, index_group) {
      if (!index_group.fetchNext(cb)) {
        done = false;
        return false;
      }
    });
    return done;
  },
  
  search: function (str, asl) {
    var self = this;
    if(!self.index)
      return;
    
    var search_keys = self.getSearchKeys(str, asl);
    var index_groups = self.getIndexesForSearchKeys(search_keys);
    var results = [];

    firstIndexGroup = index_groups.shift();
    var done = false;
    $.each(firstIndexGroup.indexes, function (i, index) {
      $.each(index.hasEntry, function (entry) {
        var matches = true;
        $.each(index_groups, function (ii, index_group) {
          if (!index_group.contains(entry)) {
            matches = false;
            return false;
          }
        });
        if (matches) {
          results.push(entry);
        }
        if (results.length >= 10) {
          done = true;
          return false;
        }
      });
      if (done) return false;
    });
    
    done = false;
    if (results.length < 10) {
      index_groups.unshift(firstIndexGroup);
      done = self.fetchNextIndexes(index_groups, function(){
        self.search(str, asl);
      });
    }
    
    if (results.length >= 10 || done) {
      self.loadResults(results)
    }
    
  },
  
  loadResults: function (results) {
    var self = this;
    $('#status').html('Results');
    $('#results').html('');
    $.each(results, function(k, v){
      self.loadResult(v);
    });
  },
  
  loadResult: function (key) {
    var self = this;
    var li = $('<li>').addClass('boxshadow').text('Loading...');
    $('#results').append(li);
    RequestQueue.requests.push($.ajax('dictionary/entries/' + key + '.json', {
      dataType: 'json',
      success: function(data) {
        self.renderResult(li, data);
      }
    }));
  },
  
  renderResult: function (li, data) {
    var a, desc;
    li.html('');
    li.append($('<h3>').append(a = $('<a>').attr('href', '#')));
    if(data.title && data.title.length){
      a.append($('<span>').text(data.title));
    }
    if(data.asl_title && data.asl_title.length){
      a.append($('<span>').addClass('asl').text(data.asl_title));
    }
    li.append(desc = $('<div>').addClass('description').hide());
    if(data.description && data.description.length){
      desc.append($('<div>').text(data.description));
    }
    if(data.asl_description && data.asl_description.length){
      desc.append($('<div>').addClass('asl').text(data.asl_description));
    }
    a.click(function(e){
      e.preventDefault();
      $(this).parents('li').find('.description').toggle(100);
    });
  }
  
//   init : function () {
// 
//     update = function(){
// //      keys = ;
//     
//       var limit = 10;
//       var indexes = [];
//       $.each(keys, function(i, k){
//         if(!k.length) return;
//         var index = getIndex(k);
//         if(index)
//           indexes.push(index);
//         return index;
//       });
// 
//       if (indexes.length < keys.length){
//         if(!Timeout.delay()){
//           $('#status').html('No Results');
//         }
//         return;
//       }
//     
//       indexes.sort(function(a, b){
//         return a.indexLength() - b.indexLength();
//       });
//     
//       var results = [];
//       var firstIndex = indexes.shift();
//       $.each(firstIndex.hasEntry, function(k, v) {
//         for(var i=0; i<indexes.length; i++){
//           if(!indexes[i].hasEntry[k]){
//             return;
//           }
//         }
//         results.push(k);
//       });
//       indexes.unshift(firstIndex);
//       var done = true;
//       if (results.length < limit) {
//         $.each(indexes, function (k, v){
//           var d = v.fetchNext(cb);
//           done = done && d;
//         });
//       }
//       if(!done) {
//         if(!Timeout.delay()){
//           $('#status').html('No Results');
//         }
//       } else {
//       }
//     }
//   
//     var changeEvent = function(){
//       var search = search_input.val().replace(/ +/,' ').replace(/^ | $/g, '');
//       if(lastSearch == search || search.length == 0)
//         return;
//       lastSearch = search;
//       RequestQueue.cancelAll();
//       Timeout.fails = 0;
//       if(!Timeout.delay()){
//         $('#status').html('No Results');
//       }
//       $('#status').html('Searching...');
//     };
//   
//   }
};

$(document).ready(function(){
  
  var search_input, lastSearch = [];
  
  var timeout = Timeout.create();

  var changeEvent = function(){
    RequestQueue.cancelAll();
    timeout.delay(function (){
      var search = search_input.val().replace(/ +/,' ').replace(/^ | $/g, '');
      if(search.length == 0)
        return;
      if(lastSearch[0] == search && lastSearch[1] == search_input.attr('data-asl'))
        return;
      lastSearch = [search, search_input.attr('data-asl')];
      Dictionary.search(search, search_input.attr('data-asl'));
    }, 500);
  };
  
  $('#search_english').change(changeEvent);
  $('#search_english').keyup( changeEvent);
  $('#search_aslfont').change(changeEvent);
  $('#search_aslfont').keyup( changeEvent);

  $('#search_english').focus(function(){
    search_input = $(this);
    $('#search_english').animate({width: '82%'}, 200);
    $('#search_aslfont').animate({width: '10%'}, 200);
  });
  
  $('#search_aslfont').focus(function(){
    search_input = $(this);
    $('#search_english').animate({width: '10%'}, 200);
    $('#search_aslfont').animate({width: '82%'}, 200);
  });

  $.ajax('dictionary/index/index.json', {
    dataType: 'json',
    success: function(data) {
      Dictionary.buildIndex(data);
    }
  })
});

})();