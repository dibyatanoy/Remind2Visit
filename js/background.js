
const notifPeriodMins = 4*60*60;
const alarmName = "visit-checker";
const period_lengths = {"item-day": 1, "item-week": 7, "item-month": 30};
var remindedThisSession = false;
var lastNotification;

function createAlarm(){
  chrome.alarms.create(alarmName, {
    delayInMinutes: 0.1, periodInMinutes: 0.1});
}

Date.prototype.addDays = function(days) {
  var dat = new Date(this.valueOf());
  dat.setDate(dat.getDate() + days);
  return dat;
}

function changeLastNotifications(lastNotif){
  remindedThisSession = true;
  lastNotification = lastNotif;
}

var loadTodaysReminders = function(){
  var $ = jQuery;
  $("#today-reminder-list table tbody").empty();

  chrome.storage.sync.get(null, function(items){
    var numRemindersToday = 0;
    $.each(items, function(key, value){
      if(typeof value  === 'object' && !(value instanceof Array)){
        var next_reminder_date = new Date(value["next_reminder"]).getDate();
        var curr_date = new Date();
        var tmp_cdate = new Date();
        curr_date = curr_date.getDate();

        if(next_reminder_date === curr_date){
          numRemindersToday++;
        }else if(next_reminder_date < curr_date){

          var new_reminder = new Date(value["next_reminder"]);
          while(new_reminder.getDate() < curr_date){
            new_reminder = new_reminder.addDays(
              parseInt(value["freq_val"]) * period_lengths[value["freq_type"]]);
          }
          
          value["next_reminder"] = new_reminder.toString();
          var options = {};
          options[key] = value;

          chrome.storage.sync.set(options, function() {});
        }

      }
    });

    if(numRemindersToday > 0){
      chrome.browserAction.setBadgeText({'text': numRemindersToday.toString()});
      if(!remindedThisSession || Math.abs(new Date() - lastNotification) >= notifPeriodMins * 1000){
        // lastNotification = new Date();
        // remindedThisSession = true;
        var plural = '';
        if(numRemindersToday > 1){plural='s';}

        chrome.notifications.create('site-reminder'+Date().toString(), {
          type: 'basic',
          iconUrl: 'images/notification.ico',
          title: 'Don\'t forget!',
          message: 'You have '+numRemindersToday+' site'+plural+' to visit today. Happy browsing!'},
          function(notificationId) {}
        );

        changeLastNotifications(new Date());
      }
    }else{
      chrome.browserAction.setBadgeText({'text': ''});
    }
  });
};

chrome.alarms.onAlarm.addListener(function(alarm) {
  console.log("Got an alarm!", alarm);
  loadTodaysReminders();
});


createAlarm();
