$(function() {
	function updateBadge() {
		User.getNotifications(function(notifications) {
			var total = 0;
			for (type in notifications) {
				total += notifications[type];
			}
						
			chrome.browserAction.setBadgeText({ text: total.toString() });
			
			if (total > 0) {
				chrome.browserAction.setBadgeBackgroundColor({
					color: [ 255, 0, 0, 255 ]
				});
			}
			else {
				chrome.browserAction.setBadgeBackgroundColor({
					color: [ 163, 163, 163, 255 ]
				});	
			}
		});
	}
	
	//Initial update, and then once per minute.
	updateBadge();
	setInterval(updateBadge, 60000);
});
