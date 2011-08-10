function isOpen() {
	return Page.containsBreadcrumb('Finished Reports') === false;
}

$(function() {	
	Options.getOptions(function(options) {
		//stuff for everyone.
		if (options.superIgnore) {
			if (Page.isThread() && !Page.isReport()) {
				$('div.smallfont').each(function() {
					if ($(this).text().indexOf('is on your ignore list') !== -1) {
						$(this).closest('div[id^="edit"]').hide();
					}
				});
			}
		}
		
		if (options.universalChatbox) {
			createUniversalChatbox();
		}
		
		//moderator functionality.
		User.ifIsModerator(function() {
			//modhat button
			if (Page.isThread()) {
				var imgURL = chrome.extension.getURL('cfx_19.png');
				var img = $('<img></img>');
				img.attr('src', imgURL);
				
				var controlDiv = $('<div class="imagebutton" id="cfx_modhat"></div>');
				controlDiv.attr('title', 'Post a mod hat');
				controlDiv.append(img);
				
				var td = $('<td></td>');
				td.append(controlDiv);
				$('#vB_Editor_QR_controls').find('tr:first').append(td);
				
				img.click(function() {
					if (options.modhat.length !== 0) {
						Thread.quickReply(options.modhat);
					}
					else {
						alert('You have no modhat template set up. Please visit the options page.');
					}
				});
			}
			
			//Report functionality.
			if (Page.isReport()) {
				var form = $('#threadtools_menu form[name="threadadminform"]');
				var url = form.attr('action');
				var formData = form.serialize() + '&do=editthread';
				
				//Load prefix menu and status area.
				$.post(url, formData , function(dom) {
					var menu = $('select[name="prefixid"]', dom);
					menu.attr('id', 'prefixMenu');
					menu.change(function() {
						var prefix = $(this).val();
						$('#statusUpdate').show();
						$('#statusUpdate').html('Changing Report Prefix...');
						Thread.setPrefix(prefix, function() {
							$('#statusUpdate').html('Prefix Changed!');
							$('#statusUpdate').fadeOut(3000);
						});
					});
						
					$('div[id^="post"]').first().prepend('<div id="reportBar">Report Status: </div>');
					$('#reportBar').append(menu);
					$('#reportBar').append('<span id="statusUpdate"></span>');
					$('#statusUpdate').hide();
					$('#statusUpdate').css('color', 'green');
					
					//Load close/open report button.
					if (isOpen()) {
						$('#reportBar').append('<button id="closeReport">Close Report</button>');
						$('#closeReport').click(function() {
							var self = this;
							$(self).attr('disabled', 'disabled');
							$(self).html('Closing...');
							Thread.move('Finished Reports', false, function() {
								$(self).html('Closed!');
							});
						});
					}
					else {
						$('#reportBar').append('<button id="openReport">Open Report</button>');
						$('#openReport').click(function() {
							var self = this;
							$(self).attr('disabled', 'disabled');
							$(self).html('Opening...');
							Thread.move('Main Report Forum', false, function() {
								$(self).html('Open!');
							});
						});				
					}
				});
			}
		});
	});	
});

function createUniversalChatbox() {
	var chatbox = $('<div id="chatbox"></div>');
	var cbTitle = $('<div id="chatboxTitle">Chatbox</div>');
	var textEntry = $('<div id="chatboxTextEntry"></div>');
	var cb = $('<div id="chatboxMessages"><div class="loading">Loading...</div></div>');
	
	//entry box
	var entryBox = $('<input id="chatboxText" type="text" />');
	textEntry.append(entryBox);
	
	entryBox.keydown(function(event) {
		if (event.keyCode == 13) {
			var text = $(this).val();
			$(this).val('');
			
			Chatbox.sendChat(text, function() {
				refresh();
			});
		}
	});
	
	//append everything else.
	chatbox.append(cbTitle);
	chatbox.append(textEntry);
	chatbox.append(cb);
	$('body').append(chatbox);
	
	//only submit ajax requests when the box is open.
	//otherwise, we do nothing.
	var timer = null;
	cbTitle.click(function() {
		cb.toggle();
		entryBox.toggle();
		
		if (cb.is(':visible')) {			
			//once for opening, then every 5 seconds after.
			refresh();
			timer = setInterval(refresh, 5000);
		}
		else {
			clearInterval(timer);
		}
	});
}

function refresh() {
	var cb = $('#chatboxMessages');
	
	var chatDivs = [];
	Chatbox.getChats(function(chats) {
		chats.forEach(function(chat) {
			var chatDiv = $('<div class="chat"></div>');
			var user = $('<div class="user"></div>').text(chat.user);
			var message = $('<div class="message"></div>').text(chat.message);
			
			chatDiv.append(user);
			chatDiv.append(message);
			chatDivs.push(chatDiv);
		});
		
		//doing it this way prevents content flickering.
		cb.empty();
		chatDivs.forEach(function(chatDiv) {
			cb.append(chatDiv);
		});
	});
}
