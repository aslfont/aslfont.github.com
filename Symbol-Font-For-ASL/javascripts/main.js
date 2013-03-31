$(document).ready(function(){
  var f = function(){
    if($(this).attr('data-answer') == $(this).val()){
      $(this).addClass('correct');
    } else {
      $(this).removeClass('correct');
    }
  };
  $('input.quiz').keyup(f).change(f).change();
});