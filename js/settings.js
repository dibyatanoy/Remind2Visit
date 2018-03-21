
const period_lengths = {"item-day": 1, "item-week": 7, "item-month": 30};

Date.prototype.addDays = function(days) {
  var dat = new Date(this.valueOf());
  dat.setDate(dat.getDate() + days);
  return dat;
}


/**
 * Settings Storage
 *
 * The user settings are stored in the chrome storage and are synced between browsers
 * where sync is enabled.
 *
 * When the save button is clicked, all current values are stored to the chrome storage.
 * When the cancel button is clicked, the current values are overwritten by the last
 * that were saved.
 *
 * Values from the storage can be passed to a callback via get(key, callback)
 */
var Settings = function(jQuery, form) {
  var $ = jQuery;
  var $settings = $(form);

  // Save and sync all settings
  var save = function(){

    var link_url = document.getElementById('site-url').value;
    var freq_val = document.getElementById('freq_val').value;
    var freq_type = document.getElementById('freq_type').value;

    if(!link_url || 0 === link_url.length){
      alert("Empty URL field");
      return;
    }else if(!freq_val || 0 === freq_val.length){
      alert("Reminder frequency not specified");
      return;
    }else if(!$.isNumeric(freq_val)){
      alert("Invalid reminder frequency");
      return;
    }

    freq_val = parseInt(freq_val);
    var curr_date = new Date();
    var next_reminder = curr_date.addDays(freq_val * period_lengths[freq_type]);

    console.log("Remind to visit " + link_url + " on " + next_reminder);

    var options = {};
    options[link_url] = {
      "link": link_url,
      "freq_val": freq_val,
      "freq_type": freq_type,
      "next_reminder": next_reminder.toString()
    };

    // // Processing all text and select inputs
    // $('input[type="text"], select', $settings).each(function(index, item) {
    //   options[$(item).attr('name')] = $(item).val();
    // });
    //
    // // Processing radio inputs
    // $('input[type="radio"]', $settings).each(function(index, item) {
    //   if($(item).is(":checked")){
    //     options[$(item).attr('name')] = $(item).val();
    //   }
    // });
    //
    // // Processing all checkboxes
    // $('input[type="checkbox"]', $settings).each(function(index, item) {
    //   options[$(item).attr('name')] = ($(item).is(":checked")) ? true : false;
    // });

    // Syncing the data with the storage
    chrome.storage.sync.set(options, function() {
      console.log('Saved the settings');
      clearAddLinkFields();
      $("#addlink-alert-holder").html('<div class="alert alert-success alert-dismissable fade in">'+
      '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'+"Reminder created!"+'</div>');
    });
  };

  // Initialize the settings
  var initialize = function() {
    chrome.storage.sync.get(null, function(items) {

      var period_labels = {"item-day": "day", "item-week": "week", "item-month": "month"};
      $("#reminder-list table tbody").empty();

      $.each(items, function(key, value){
        // console.log(key + ": " + value);
        if(typeof value  === 'object' && !(value instanceof Array)){
          // console.log(value["link"]);
          // console.log(value["freq_val"]);
          // console.log(value["freq_type"]);
          // console.log(value["next_reminder"]);

          var plural = "";
          if(value["freq_val"] > 1){
            plural = "s";
          }
          var tr =
            '<tr>'+
               '<td><div><a class=\"new-tab-open\" href=\"http://'+value["link"]+'\">' + value["link"] + '</a></div></td>'+
               '<td><div>'+ "Every " + value["freq_val"] + " " +
               period_labels[value["freq_type"]] + plural +'</div></td>'+
               '<td><span id="'+key+'" class="remove-row-btn glyphicon glyphicon-trash"></span></td>'
            '</tr>';
           $("#reminder-list table tbody").append(tr);
        }
      });

      var links = document.getElementsByClassName("new-tab-open");
      for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function(event){
          var targetElement = event.target;
          chrome.tabs.create({url: targetElement.href});
        }, false);
      }

      $('.remove-row-btn').click(function(e) {
        e.preventDefault();
        var object = $(this);
        console.log("span clicked");
        object.parent().parent().find('td').each(function(index, element){
          // Wrap each td inside the selected tr in a temporary div
    			$(this).wrapInner('<div class="td_wrapper"></div>');

          $(this).parent().find('.td_wrapper').each(function(index, element){
            // SlideUp the wrapper div
    				$(this).slideUp();
            $(this).animate({
    					'padding-top': '0px',
    					'padding-bottom': '0px',
              'border-top': '0px',
              'border-bottom': '0px',
    				}, function() {
              chrome.storage.sync.remove(object.attr('id'), function(){
                object.parentsUntil('tr').parent().remove();
                $("#viewlist-alert-holder").html('<div class="alert alert-danger alert-dismissable fade in">'+
                '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'+"Reminder deleted."+'</div>');
              });
    				});
          });
        });
      });

      // var $item = null;
      // $.each(e, function(key, value) {
      //   $item = $('[name="' + key + '"]', $settings);
      //   if($item.length > 0){
      //     if($item[0].type == 'text' || $item[0].type == 'select-one'){
      //       $item.val(value);
      //     }
      //
      //     else if($item[0].type == 'checkbox'){
      //       if(value){
      //         $item.prop('checked', true);
      //       }
      //     }
      //
      //     else {
      //       $('[name="' + key + '"][value="' + value + '"]', $settings).prop('checked', true);
      //     }
      //   }
      // });
    });
  };

  var loadTodaysReminders = function(){
    var hasReminders = false;
    $("#today-reminder-list table tbody").empty();

    chrome.storage.sync.get(null, function(items){
      var today_links = [];
      $.each(items, function(key, value){
        if(typeof value  === 'object' && !(value instanceof Array)){
          var next_reminder_date = new Date(value["next_reminder"]).getDate();
          var curr_date = new Date();
          curr_date = curr_date.getDate();

          if(next_reminder_date === curr_date){
            hasReminders = true;
            var tr =
              '<tr>'+
                 '<td><a class=\"new-tab-open-today\" href=\"http://'+value["link"]+'\">' + value["link"] + '</a></td>'+
              '</tr>';
             $("#today-reminder-list table tbody").append(tr);

             today_links.push(value["link"])
          }else if(next_reminder_date < curr_date){
            var new_reminder = new Date(value["next_reminder"]);
            while(new_reminder.getDate() < curr_date){
              new_reminder = new_reminder.addDays(
                parseInt(value["freq_val"]) * period_lengths[value["freq_type"]]);
            }
            value["next_reminder"] = new_reminder.toString();
            var options = {};
            options[key] = value;

            chrome.storage.sync.set(options, function() {
              console.log('Saved the new reminder date');
            });
          }

        }
      });

      var links = document.getElementsByClassName("new-tab-open-today");
      for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function(event){
          var targetElement = event.target;
          chrome.tabs.create({url: targetElement.href});
        }, false);
      }

      if(!hasReminders){
        var tr =
          '<tr>'+
             '<td>No reminders today!</td>'+
          '</tr>';
         $("#today-reminder-list table tbody").append(tr);
      }
    });
  };

  this.loadTodaysReminders =  function(){
    loadTodaysReminders();
  }

  // Pass a value by its key to a callback function
  this.get = function(key, callback) {
    var value = chrome.storage.sync.get(key, function(e) {
      callback(e[key]);
    });
  }

  var clearAddLinkFields = function(){
    $('#site-url').val('');
    $('#freq_val').val('');
    $('#freq_type').val("item-day");
  };

  // Action when the save button is clicked
  $('.save-settings').click(function(e) {
    e.preventDefault();
    save();
  });

  // Action when the cancel button is clicked
  $('.cancel-settings').click(function(e) {
    e.preventDefault();
    clearAddLinkFields();
  });

  // Action when the list tab is clicked
  $('#today-tab').click(function(e) {
    loadTodaysReminders();
  });

  // Action when the list tab is clicked
  $('#list-tab').click(function(e) {
    initialize();
  });

  $('#add-tab').click(function(e) {
    var query = { active: true, currentWindow: true };
    chrome.tabs.query(query, function(tabs){
      var curr_tab_url = tabs[0].url;
      var prefix_pos = curr_tab_url.indexOf("://");
      if(prefix_pos > -1){
        curr_tab_url = curr_tab_url.substring(prefix_pos+3);
      }
      $('#site-url').val(curr_tab_url);
    });
  });

};
