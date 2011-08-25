function getExtensionID() {
	var url = chrome.extension.getURL('/');
	var id = url.substring(url.indexOf('//') + 2, url.length - 1);
	return id;
}

$(function() {
	//Set information for update check.
	chrome.management.get(getExtensionID(), function(ext) {
		var currVersion = State.getState('version');
		
		if (currVersion !== ext.version) {
			State.setState('version', ext.version);		
			State.setState('updated', true);
		}
	});
	
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
	
	//Listener to send info to content script
	chrome.extension.onRequest.addListener(function(req, sender, sendResponse) {
		if (req.method === 'options') {
			sendResponse(Options.user);
		}
		else if (req.method === 'checkForUpdate') {
			var info = {
				updated: State.getState('updated'),
				version: State.getState('version')
			};
			sendResponse(info);
		}
		else if (req.method === 'notifyUpdated') {
			State.setState('updated', false);
		}
		else {
			sendResponse({});
		}
	});
});
