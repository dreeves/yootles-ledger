$(document).ready(function() {
  var pathname = window.location.pathname;

  connectToServer("wait", pathname);

  $('#btnSubmit').click(function() {
    $('#btnSubmit').disabled = true;
    $('#response').addClass('loading'); 
    connectToServer("return", pathname);
    $('#btnSubmit').disabled = false;
    return false;
  });

});

function connectToServer(poll, url) {
  $.get("longpolling.php",
        { p: poll, u: url },
        function(resp) {
           $('#response').removeClass('loading').html(resp);
           connectToServer("wait", url);
        });
}

