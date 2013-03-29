$(document).ready(function(){
  var rand = function () {
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var s = '';
    for(var i=0; i < 32; i++)
        s += possible.charAt(Math.floor(Math.random() * possible.length));
    return s;
  }
  
  if(!$.cookie('aslfont-session')) {
    $.cookie('aslfont-session', rand());
  }
  
  $('#done').click(function(e){
    e.preventDefault();
    $('#done').html('Saving...');

    var url = 'http://aslfont.herokuapp.com/messages/create';


    $.ajax(url + '?session=' + $.cookie('aslfont-session'), {
      type:'POST',
      data: {
        data : JSON.stringify({
          title : $('#title_input').val(),
          author : $('#author_input').val(),
          message : $('#message').val()
        })
      },
      success : function (data, textStatus) {
        window.location.href = 'http://aslfont.github.com/Symbol-Font-For-ASL/read.html?id=' + data;
      },
      error : function (jqXHR, textStatus, errorThrown) {
        $('#error_message').text('Error saving: ' + textStatus + ': ' + errorThrown);
      }
    })
    //*/
  });  
  

  $('[data-tab-for]').click(function(e){
    e.preventDefault();
    $('[data-content-for]').hide();
    $('[data-tab-for]').removeClass('selected');
    $('[data-content-for=' + $(this).data('tab-for') + ']').show();
    $(this).addClass('selected');
  });
  $('[data-tab-for]').first().click();

});
