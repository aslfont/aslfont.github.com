$(document).ready(function(){
  var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = window.location.search.substring(1);

  urlParams = {};
  while (match = search.exec(query))
     urlParams[decode(match[1])] = decode(match[2]);

  var f = function(){
    if($(this).attr('data-answer') == $(this).val()){
      $(this).addClass('correct');
    } else {
      $(this).removeClass('correct');
    }
  };
  $('input.quiz').keyup(f).change(f).change();

  if ($('#dictionary_frame').length) {
    var url = $('#dictionary_frame').attr('src');
    if (urlParams.asl) {
      url += '?asl=' + encodeURIComponent(urlParams.asl);
    } else if (urlParams.english){
      url += '?english=' + encodeURIComponent(urlParams.english);
    }
    $('#dictionary_frame').attr('src', url);
  }
  
  if ($('#asl-location-nav').length) {
    $('.location-img').hide();
    $('#symbol-font-for-asl-locations').show();
    $('#asl-location-nav a[href=#symbol-font-for-asl-locations]').addClass('selected');
    $('#asl-location-nav a').each(function(){
      var f = function(){
        $('.location-img').hide();
        var id = $(this).attr('href');
        $(id).show();
        $('#asl-location-nav a').removeClass('selected');
        $(this).addClass('selected');
      };
      $(this).hover(f).focus(f).click(function(e){e.preventDefault();$(this).focus();});
    });
  }
  
  

});

