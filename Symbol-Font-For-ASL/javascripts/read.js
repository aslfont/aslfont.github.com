$(document).ready(function(){
  var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = window.location.search.substring(1);

      console.log('hi');
  urlParams = {};
  while (match = search.exec(query))
     urlParams[decode(match[1])] = decode(match[2]);
  
  
  var handleError = function(jqXHR, textStatus, errorThrown) {
    $('#message_title').text('Error');
    $('#message').text('Unable to load message: ' + textStatus + ': ' + errorThrown).removeClass('asl');
  };
  
  var url = '/w/k/' + urlParams.id;
  $.ajax(url, {
    success : function (data, textStatus) {
      url = '/' + data;
      $.ajax(url, {
        dataType : 'json',
        success : function (data) {
          if (data.title && data.message && data.author) {
            $('#link_label').show();
            $('#link')
              .val('http://aslfont.github.com/Symbol-Font-For-ASL/read.html?id=' + urlParams.id)
              .attr('data-url', 'http://aslfont.github.com/Symbol-Font-For-ASL/read.html?id=' + urlParams.id);
            $('#message_title').text(data.title);
            $('#author').text('A Message in ASL by ' + data.author);
            $('#message').text(data.message);
          } else {
            handleError(null, 'error', 'Could not load message.');
          }
        },
        error : handleError
      });
    },
    error : handleError
  })
  
});
