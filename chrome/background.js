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
		
		setTimeout(updateBadge, Options.user.notificationRate * 60 * 1000);
	}
	
	//Initial update, and then once per X minutes, as specified by
	//options.notificationRate.
	updateBadge();
	
	//Listener to send options to content script
	chrome.extension.onRequest.addListener(function(req, sender, sendResponse) {
		//$.jStorage.reInit(); //in case options changed.
		if (req.method === 'options') {
			sendResponse(Options.user);
		}
		else {
			sendResponse({});
		}
	});
});
