//CFX content script.
var options = null; //set by call to Options.getOptions

$(function() {
	//Check for updates via background page.
	Updates.checkForUpdate(function(info) {
		if (info.updated) {
			createUpdateNotification(info.version);
		}
	});
	
	Options.getOptions(function(opts) {
		options = opts;
		
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
		
		bibleTag();
		
		//moderator functionality.
		User.ifIsModerator(function() {
			modhatButton();
			reportEnhancements();
			deletionPMs();
			
			if (options.automatedStaffContacts) {
				automatedStaffContacts();
			}
		});
	});	
});

function bibleTag() {
	if (Page.isThread()) {
		//for quick reply.
		$('#qr_preview').click(function() {
			$(this).data('clicked', true);
		});
		
		var oldhandler = $('#qrform')[0].onsubmit;
		$('#qrform')[0].onsubmit = null;
		$('#qrform').one('submit', function(e) {
			var text = Thread.getQuickReplyText();
			
			BBCode.bibleTag(text, function(bibleText) {
				if (bibleText != null) {
					//replaces bible tags with corresponding bible text.
					for (var bibleTag in bibleText) {
						//using split/join allows a global replace without using regexps.
						text = text.split(bibleTag).join(bibleText[bibleTag]);
					}
					
					Thread.fillReply(text);
				}
				
				//$('#qrform')[0].onsubmit = oldhandler;
				location.href = 'javascript:document.getElementById("qrform").onsubmit = ' + oldhandler.toString();
				if ($('#qr_preview').data('clicked')) {
					$('#qr_preview').click();
				}
				else {
					$('#qr_submit').click();
				}
			});
			
			return false;
		});
	}
	else if (Page.isReplyPage()) {
		$('input[name=preview]').click(function() {
			$(this).data('clicked', true);
		});
		
		var oldhandler = $('form[name=vbform]')[0].onsubmit;
		
		$('form[name=vbform]')[0].onsubmit = null;
		$('form[name=vbform]').one('submit', function(e) {
			var text = $('#vB_Editor_001_textarea').val();
			
			BBCode.bibleTag(text, function(bibleText) {
				if (bibleText != null) {
					//replaces bible tags with corresponding bible text.
					for (var bibleTag in bibleText) {
						//using split/join allows a global replace without using regexps.
						text = text.split(bibleTag).join(bibleText[bibleTag]);
					}
					
					$('#vB_Editor_001_textarea').val(text);
				}
				
				//$('form[name=vbform]')[0].onsubmit = oldhandler;
				location.href = 'javascript:document.forms["vbform"].onsubmit = ' + oldhandler.toString();
				if ($('input[name=preview]').data('clicked')) {
					$('input[name=preview]').click();
				}
				else {
					$('#vB_Editor_001_save').click();
				}
			});
		
			return false;
		});
	}
}

function deletionPMs() {
	//keep track of users we might want to send a PM to.
	//the list will be flattened on the send PM page.
	if (Page.isThread()) {
		$(':checkbox[name^="plist"]').click(function() {
			var username = Posts.getUsername(this);
			var postID = Posts.getID(this);
			var contents = Posts.getMessage(this);
				
			//add/remove user from list.
			if ($(this).is(':checked')) {
				var pms = State.getState('pms') || {};
				pms[postID] = {
					username: username,
					contents: contents,
					thread: 'http://www.christianforums.com/' + Thread.getID()
				};
				
				State.setState('pms', pms);
			}
			else {
				var pmUsers = State.getState('pms') || {};
				delete pmUsers[postID];
				State.setState('pms', pmUsers);
			}
		});
	}
	
	//on the delete page, add a new textarea for PMs.
	if (Page.isDeletePage()) {
		var html = 'Summary reason (will be recorded in thread):<br>';
		html += '<input type="text" name="deletereason" id="deletereason" maxlength="125" /><br />';
		html += 'Deletion PM (will be PMed to <b>all</b> posters; if not entered, <b>no PM</b> will be sent):<br />';
		html += '<textarea id="deletepm"></textarea>';
		$('input[name="deletereason"]').parent().html(html);
		
		//using a post ID -> pm info map ensures that even we have extra junk in the map,
		//we will always get the correct usernames to PM for this particular deletion.
		var pms = State.getState('pms') || {};
		var postIDs = $('input[name=postids]').val().split(',');
		var pmsToSend = [];
		
		for (var c = 0; c < postIDs.length; c++) {
			pmsToSend.push(pms[postIDs[c]]);
		}
				
		var pmUsers = {};
		for (var c = 0; c < postIDs.length; c++) {
			var username = pms[postIDs[c]].username;
			
			if (!pmUsers.hasOwnProperty(username)) {
				pmUsers[username] = [];
			}
			
			pmUsers[username].push(pms[postIDs[c]]);
		}
		
		//for display purposes only.
		var infoText = '';
		for (var username in pmUsers) {
			infoText += username + ' (deleting ';
			var totalPosts = pmUsers[username].length;
			var totalThreads = 0;
			
			//get thread count
			var countedThreads = [];
			for (var c = 0; c < pmUsers[username].length; c++) {
				if (countedThreads.indexOf(pmUsers[username].thread) === -1) {
					totalThreads++;
					countedThreads.push(pmUsers[username].thread);
				}
			}
			
			infoText += totalPosts + ' posts in ' + totalThreads + ' thread';
			if (totalThreads > 1) infoText += 's';
			infoText += ')';
			
			infoText += '\n';
		}
		
		infoText = infoText.substring(0, infoText.length - 1); //get rid of last \n
		
		if (Object.keys(pmUsers).length > 0) {			
			$('form[name="vbform"]').one('submit', function() {
				if ($('#deletepm').val().length > 0) {
					var message = 'The PM you entered will be sent to the following users:\n\n' + infoText;
					message += '\n\nEach person will receive a copy of the message, and all of their deleted posts ';
					message += 'will be quoted at the bottom of the PM.';
					message += '\n\nAre you SURE you want to do this? If not, clear the text area and submit again.';
					
					if (confirm(message)) {
						var total = Object.keys(pmUsers).length; //for counting total # of pms.
						
						var statusWindow = $('<div id="deleteStatusWindow" title="Deletion in Progress"></div>');
						statusWindow.appendTo('body');
						
						var status = $('<div id="deleteStatus">Sent PM 0/' + total + '</div>');
						var loader = $('<div id="loader"><img /></div>');
						
						loader.children('img').attr('src', chrome.extension.getURL('ajax-loader.gif'));
						
						statusWindow.append(loader).append(status);
						
						statusWindow.dialog({
							modal: true,
							resizable: false,
							draggable: false
						});
						
						//pm info
						var subject =  'A post of yours has been deleted';
						var multipostSubject = 'Some posts of yours have been deleted';
						var text = $('#deletepm').val();
						
						var tasks = [];
						var c = 0;
						for (var username in pmUsers) {
							(function(username) {
								var pmsToSend = pmUsers[username];	
								tasks.push(function(callback) {
									var pm = text + '\n\n------------';
									for (var c = 0; c < pmsToSend.length; c++) {
										pm += '\n\nIn thread: ' + pmsToSend[c].thread;
										pm += '\n[quote=' + username + ']' + pmsToSend[c].contents + '[/quote]\n';
									}
									
									var subj = (pmsToSend.length > 1) ? multipostSubject : subject;
									
									PrivateMessages.send(username, subj, pm, function() {
										c++;
										$('#deleteStatus').html('Sent PM ' + c + '/' + total + '</div>');
										callback(null);
									});
								});
							})(username);
						}
						
						async.series(tasks, function() {
							status.html('Deleting post(s)...');
							State.setState('pms', {}); //clear out for future deletes.
							$('#deletepm').remove(); //don't want to increase server req size.
							$('form[name="vbform"]').submit();
						});
						
						return false; //callback will submit form for us.
					}
					else {
						return false; //prevent submission.
					}
				}
			});
		}
	}
}

function modhatButton() {
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
				Thread.fillReply(options.modhat);
			}
			else {
				alert('You have no modhat template set up. Please visit the options page.');
			}
		});
	}
}

function reportEnhancements() {
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
			
			//Post contacts button.
			$('#reportBar').append('<button id="postContacts">Post Staff Contacts</button>');
			$('#postContacts').click(function() {
				postStaffContacts();
				return false;
			});

			//Load close/open report button.
			if (Page.containsBreadcrumb('Finished Reports') === false) {
				//report is currently open.
				$('#reportBar').append('<button id="closeReport">Archive Report</button>');
				$('#closeReport').click(function() {
					var self = this;
					$(self).attr('disabled', 'disabled');
					$(self).html('Archiving...');
					Thread.move('Finished Reports', false, function() {
						$(self).html('Archived!');
					});
				});
			}
			else {
				//report is currently archived.
				$('#reportBar').append('<button id="openReport">Unarchive Report</button>');
				$('#openReport').click(function() {
					var self = this;
					$(self).attr('disabled', 'disabled');
					$(self).html('Unarchiving...');
					Thread.move('Main Report Forum', false, function() {
						$(self).html('Unarchived!');
					});
				});				
			}
		});
	}
}

function automatedStaffContacts() {
	if (Page.isReport() && Thread.hasZeroReplies()) {
		if (confirm('This is a new report. Post staff contacts?')) {
			postStaffContacts();
		}
	}
}

function postStaffContacts() {
	var contactsPreview = $('<div id="contactsPreview" title="Preview"></div>');
			
	contactsPreview.html('Using Internet Superpowers...');
	
	contactsPreview.dialog({
		width: 650,
		height: 250
	});
	
	Reports.getReport(Thread.getID(), function(report) {
		contactsPreview.html('e-Stalking...');
		Reports.getStaffContacts(report.reportedUserID, function(contacts) {
			contactsPreview.html('Sumarizing...');
			var message = 'Staff Contacts for [b]' + report.reportedUsername + '[/b]:';
			var preview = 'Staff Contacts for <b>' + report.reportedUsername + '</b>';
			
			message += '\n[indent]';
			preview += '<ul>';
			
			if (contacts.length == 0) {
				message += 'No contacts.\n';
				preview += '<li>No contacts.</li>';
			}
			
			contacts.forEach(function(contact) {
				message += '[img]' + contact.image + '[/img] ';
				message += '[b]' + contact.type + '[/b] - ';
				message += '[url=' + contact.contactLink + ']';
				message += contact.thread + '[/url]';
				message += ' (Expires: ' + contact.expires + ')';
				message += '\n';
				
				preview += '<li>';
				preview += '<img src="' + contact.image + '" /> ';
				preview += '<b>' + contact.type + '</b> - ';
				preview += '<a target="_blank" href="' + contact.contactLink + '">';
				preview += contact.thread + '</a>';
				preview += ' (Expires: ' + contact.expires + ')';
				preview += '</li>';
			});
			
			message += '[/indent]';
			preview += '</ul>';
			preview += 'Does this look right? If not, hit No and post manually.<br/><br/>';
			
			contactsPreview.html(preview);
			
			$('<button>Yes</button>').appendTo(contactsPreview).click(function() {
				contactsPreview.dialog('destroy');
				Thread.quickReply(message);
			});
			
			$('<button>No</button>').appendTo(contactsPreview).click(function() {
				contactsPreview.dialog('destroy');
			});
		});
	});
}

function createUpdateNotification(version) {
	var panel = $('<div id="updateNotification"></div>');
	var text = $('<span>CFx has been updated to version <b>' + version + '</b>!&nbsp;</span>');
	
	var a = $('<a target="_blank"></a>');
	a.attr('href', 'https://chrome.google.com/webstore/detail/liccmoppgpommcnopmgcckionlnmamdm');
	a.html('Click here to see the latest changes...');
	
	var close = $('<span id="updatePanelClose">X</span>');
	
	a.click(function() {
		panel.fadeOut(800);
		Updates.notifyUpdated();
	});
	
	close.click(function() {
		panel.fadeOut(800);
		Updates.notifyUpdated();
	});
	
	panel.append(text).append(a).append(close);
	$('body').append(panel);
}

function createUniversalChatbox() {
	var chatbox = $('<div id="chatbox"></div>');
	var cbTitle = $('<div id="chatboxTitle">Chatbox</div>');
	var textEntry = $('<div id="chatboxTextEntry"></div>');
	var cb = $('<div id="chatboxMessages"><div class="loading">Loading...</div></div>');
	
	//entry box appending and event.
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
	
	//function to refresh the cb.
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
	
	//only submit ajax requests when the box is open.
	//otherwise, we do nothing.
	var timer = null;
	cbTitle.click(function() {
		cb.toggle();
		textEntry.toggle();
		
		if (cb.is(':visible')) {			
			//once for opening, then every 5 seconds after.
			refresh();
			timer = setInterval(refresh, 5000);
			State.setState('chatbox.open', true);
		}
		else {
			clearInterval(timer);
			State.setState('chatbox.open', false);
		}
	});
	
	//if the chatbox was open on the previous page, make it stay open.
	if (State.getState('chatbox.open')) {
		cbTitle.click(); //since it's closed by default, just "click" it.
	}
}
