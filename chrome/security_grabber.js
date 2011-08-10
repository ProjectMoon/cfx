/*
 * Grabs security token for use with the chat AJAX.
 * Runs in DOM context, so we must send a custom event
 * back to the extension...
 */

var event = document.createEvent('Event');
event.initEvent('security', true, true);

function fireSecurityEvent() {
	var div = document.getElementById('securityGrabber');
	div.innerText = SECURITYTOKEN;
	div.dispatchEvent(event);
}
