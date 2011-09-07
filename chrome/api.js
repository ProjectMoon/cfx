Options = {
	defaults: {
		notificationRate: 1,
		modhat: '',
		superIgnore: true,
		universalChatbox: true,
		subscriptionNotifications: true,
		bibleVersion: 'nab'
	},
	
	get user() {
		$.jStorage.reInit(); //in case options changed.
		return $.jStorage.get('options', Options.defaults)
	},
	
	getOptions: function(callback) {
		chrome.extension.sendRequest({ method: 'options' }, function(options) {
			callback(options);
		});
	}
};

Updates = {
	checkForUpdate: function(callback) {
		chrome.extension.sendRequest({ method: 'checkForUpdate' }, function(info) {
			callback(info);
		});
	},
	
	notifyUpdated: function() {
		chrome.extension.sendRequest({
			method: 'notifyUpdated'
		});
	}
}

Background = {
	execute: function(fn, params, callback) {
		throw 'Not yet implemented';
	}
};

Bible = {
	publicDomain: function(version, passage, callback) {
		var url = 'http://api.preachingcentral.com/bible.php?passage=' + passage + '&version=' + version;
		
		$.get(url, function(xml) {
			if ($(xml).find('error').length > 0) {
				var text = $(xml).find('error').text();
			}
			else {
				passage = passage.substring(0, 1).toUpperCase() + passage.substring(1);
				var text = '[b]' + passage + ' (' + version.toUpperCase() + ')[/b]\n[indent]';
				
				$(xml).find('item').each(function(i, item) {
					text += $(item).children('chapter').text();
					text += ':' + $(item).children('verse').text();
					text += ' ' + $(item).children('text').text();
					text += '\n';
				});
				
				text += '[/indent]';
			}
			
			callback(text);
		});
	},
	
	esv: function(passage, callback) {
		var esvURL = 'http://www.esvapi.org/v2/rest/passageQuery?key=IP&passage=';
		$.get(esvURL + passage, function(html) {
			passage = passage.substring(0, 1).toUpperCase() + passage.substring(1);
			var text = '[b]' + passage + ' (ESV)[/b]\n[indent]';
			text += $(html).text();
			text += '[/indent]';
			callback(text);
		});		
	},
	
	nab: function(passage, callback) {
		//when given a verse range (e.g. genesis 1:1-2), adds extra verses
		//in genesis case, it adds verses 10 to 31.
		var split = passage.split(' ');
		var book = split[0];
		var chapterAndVerse = split[1]; 
	
		//could be # (whole chapter), #:# (chapter:verse), or #:#-# (chapter:verse range)
		if (chapterAndVerse.indexOf(':') !== -1) {
			var chapter = chapterAndVerse.substring(0, chapterAndVerse.indexOf(':'));
			//verse range?
			var verses = chapterAndVerse.substring(chapterAndVerse.indexOf(':') + 1);
			if (verses.indexOf('-') !== -1) {
				verses = [ verses.substring(0, verses.indexOf('-')), verses.substring(verses.indexOf('-') + 1) ];
			}
			else {
				verses = [ verses ];
			}
		}
		else {
			var chapter = chapterAndVerse;
			var verses = [];
		}
		
		var url = 'http://www.usccb.org/bible/scripture.cfm?bk=' + book + '&ch=' + chapter;
		
		var filter = [];
		if (verses.length > 0) {
			//produce a range.
			var start = +verses[0];
			var end = +verses[verses.length - 1];
			for (var c = start; c <= end; c++) {
				filter.push(c);
			}
		}
		else {
			filter = null;
		}
		
		$.get(url, function(dom) {
			var text = '';
			
			function filterVerses() {
				if (filter != null) {
					for (var c = 0; c < filter.length; c++) {
						if ($(this).text() == filter[c]) {
							return true;
						}
					}
					
					return false;
				}
				else {
					return true;
				}
			}
			
			$(dom).find('span.bcv').filter(filterVerses).each(function(i, el) {
				text += el.innerText + ' ';
				var node = el.nextSibling;
				
				while (node != null && $(node).hasClass('bcv') === false) {
					if ($(node).hasClass('enref') === false && $(node).hasClass('fnref') === false) {
						text += $(node).text();
					}
					
					node = node.nextSibling;
				}
			});
			
			//display it nicely.
			book = book.substring(0, 1).toUpperCase() + book.substring(1);
			text = '[b]' + book + ' ' + chapterAndVerse + ' (NAB)[/b]\n[indent]' + text + '[/indent]';
			callback(text);
		});
	}
};

BBCode = {
	bibleTag: function(text, callback) {
		var regex = /\[bible(=.*)?\](.+?)\[\/bible\]/gi;
		var tags = text.match(regex);
		var verses = [];
		var tasks = {};
		
		//Meant to be executed from content script, so uses async option get.
		if (tags != null && tags.length > 0) {
			Options.getOptions(function(opts) {
				for (var c = 0; c < tags.length; c++) {
					(function(c) {
						tasks[tags[c]] = function(cb) {
							var parsed = tags[c].match(/\[bible(=.*?)?\](.*)\[\/bible\]/);
							
							//use specific version?
							var version = opts.bibleVersion.toLowerCase();
							if (typeof parsed[1] !== 'undefined') {
								//first character is =.
								version = parsed[1].substring(1).toLowerCase().trim();
							}
							
							//what to look up.
							var passage = parsed[2].trim();
							
							//if no specific method found, assume public domain
							//translation.
							if (typeof Bible[version] === 'undefined') {
								Bible.publicDomain(version, passage, function(text) {
									cb(null, text);
								});
							}
							else {
								Bible[version](passage, function(text) {
									cb(null, text);
								});
							}
							
						};
					})(c);
				}
				
				async.parallel(tasks, function(err, bibleQuotes) {
					callback(bibleQuotes);
				});
			});
		}
		else {
			//setTimeout forces it to be asynchronous.
			//otherwise really weird stuff happens.
			setTimeout(function() { callback(null); }, 0);
		}
	}
};

Posts = {
	getContainer: function(el) {
		return $(el).closest('div[id^="edit"]');
	},
	
	getID: function(el) {
		return Posts.getContainer(el).attr('id').substring(4); //gets rid of edit
	},
	
	getUsername: function(el) {
		return Posts.getContainer(el).find('a.bigusername').text().trim();
	},
	
	getMessage: function(el) {
		return Posts.getContainer(el).find('div[id^=post_message]').text().trim();
	}
};

Security = {
	getSecurityToken: function(callback) {
		//set up security grabber if not present.
		if ($('#securityGrabber').length == 0) {
			var securityGrabber = $('<div id="securityGrabber"></div>');
			$('body').append(securityGrabber);
	
			var script = $('<script></script>');
			script.attr('src', chrome.extension.getURL('security_grabber.js'));
			$('body').append(script);
		}
		
		$('#securityGrabber').one('security', function() {
			var securityToken = $(this).html().trim();
			callback(securityToken);
		});
		
		//fire event
		//force call to be async... this is a bit ghetto, but oh well.
		//we must wait until fireSecurityEvent exists.
		location.href = 'javascript:function fire(){if(typeof fireSecurityEvent !== "undefined"){fireSecurityEvent();}else{setTimeout(fire, 0);}}fire();';
	}
};

State = {
	setState: function(state, value) {
		$.jStorage.set('state.' + state, value);
	},
	
	getState: function(state) {
		return $.jStorage.get('state.' + state);
	}
}

Chatbox = {
	getChats: function(callback) {
		Security.getSecurityToken(function(token) {
			var url = 'mgc_cb_evo_ajax.php';
			var data = {
				do: 'ajax_refresh_chat',
				status: 'open',
				channel_id: '0',
				location: 'full',
				first_load: '0',
				securitytoken: token,
				s: ''
			};
			
			$.post(url, data, function(chatDOM) {
				var html = $('chatbox_content', chatDOM).text();
				//2 = timestamp
				//3 = username
				//4 = message
				var column = 0;
				var currChatEntry = {};
				var entries = [];
				$(html).find('tr.alt2').children('td').each(function(i, td) {
					if (column == 2) {
						currChatEntry.timestamp = $(td).text().trim();
					}
					else if (column == 3) {
						currChatEntry.user = $(td).text().trim();
						//remove <>s, leaving "user".
						currChatEntry.user = currChatEntry.user.substring(1, currChatEntry.user.length - 1);
					}
					else if (column == 4) {
						currChatEntry.message = $(td).text().trim();
						entries.push(currChatEntry);
						currChatEntry = {};
						column = 0;
						return;
					}
					
					column++;
				});
				
				callback(entries);
			});
		});
	},
	
	sendChat: function(chat, callback) {
		Security.getSecurityToken(function(token) {
			var url = 'mgc_cb_evo_ajax.php';
			var data = {
				do: 'ajax_chat',
				channel_id: '0',
				chat: chat,
				securitytoken: token,
				s: ''
			};
			
			$.post(url, data, function(chatDOM) {
				callback();
			});
		});
	}
};

PrivateMessages = {
	send: function(users, subject, text, callback) {
		//they could have sent a single string as a username.
		if (users instanceof Array === false) {
			users = [ users ];
		}
		
		var proxyFrame = $('#proxyFrame');
		if (proxyFrame.length == 0) {
			proxyFrame = $('<iframe name="proxyFrame" id="proxyFrame"></iframe>');
			proxyFrame.css('display', 'none');
			proxyFrame.css('height', '0px');
			proxyFrame.css('width', '0px');
			$('body').append(proxyFrame);
		}
		
		proxyFrame.attr('src', 'http://www.christianforums.com/pm/new/');
		
		proxyFrame.load(function() {
			var proxyForm = proxyFrame.contents().find('form[name="vbform"]');
			$('#pmrecips_txt', proxyForm).val(users.toString().replace(',', ';'));
			$('input[name="title"]', proxyForm).val(subject);
			$('textarea[name="message"]', proxyForm).val(text);
			proxyForm.ajaxSubmit(callback);
		});
	}
};

Thread = {
	_toolsMenu: null,
    
    bindQuickReplyEvent: function(fn) {
		$('#qrform').submit(fn);
	},
	
    getQuickReplyText: function() {
		//whether to use rich text editor iframe or the textarea.
		if ($('#vB_Editor_QR_iframe').is(':visible')) {
			//may not work; but chrome doesn't use the rich text editor anyway...
			return $('#vB_Editor_QR_iframe')[0].contentWindow.document.body.innerHTML;
		}
		else {
			return $('#vB_Editor_QR_textarea').val();
		}		
	},
	
	quickReply: function(message) {
		//whether to use rich text editor iframe or the textarea.
		if ($('#vB_Editor_QR_iframe').is(':visible')) {
			message = message.replace('\n', '<br>');
			$('#vB_Editor_QR_iframe')[0].contentWindow.document.execCommand('insertHTML', null, message);
		}
		else {
			$('#vB_Editor_QR_textarea').val();
		}
                
		$('#qr_submit').click();
	},
	
	fillReply: function(message) {
		//whether to use rich text editor iframe or the textarea.
		if ($('#vB_Editor_QR_iframe').is(':visible')) {
			message = message.replace('\n', '<br>');
			$('#vB_Editor_QR_iframe')[0].contentWindow.document.execCommand('insertHTML', null, message);
		}
		else {
			$('#vB_Editor_QR_textarea').val(message);
		}
	},
        
	getID: function() {
		var href = location.href;
		var end = href.lastIndexOf('/');
		
		//Handle pages (ex: t12345-2, for page 2 of id t12345)
		var pageSplit = href.lastIndexOf('-', end);
		if (pageSplit != -1) {
			end = pageSplit;
		}
                
		var begin = href.lastIndexOf('/', end - 1) + 1;
		var threadID = href.substring(begin, end);
		return threadID;
	},
	
	setPrefix: function(prefix, callback) {
		if (!callback) callback = function() {};
		
		if (Thread._toolsMenu == null) {
			Thread._toolsMenu = $('#threadtools_menu form[name="threadadminform"]');
		}
                
		//Load/create proxy iframe for opening the edit thread interface.
		var proxyFrame = $('#proxyFrame');
		if (proxyFrame.length == 0) {
			proxyFrame = $('<iframe name="proxyFrame" id="proxyFrame"></iframe>');
			proxyFrame.css('display', 'none');
			proxyFrame.css('height', '0px');
			proxyFrame.css('width', '0px');
			$('body').append(proxyFrame);
		}
                
		//Hijacks (then de-hijacks) the thread tools menu
		//in order to load the iframe.
		with ({ menu : Thread._toolsMenu }) {
			menu.attr('target', 'proxyFrame');
			menu.find(':radio[value="editthread"]').click();
			menu.submit();
			menu.removeAttr('target');
		}
                
		//Set the prefix.
		proxyFrame.load(function() {
		var proxyForm = $(this).contents().find('form[name="vbform"]');
			$('select[name="prefixid"]', proxyForm).val(prefix);
			proxyForm.ajaxSubmit(callback);                         
		});
	},
	
	move: function(toForum, leaveRedirect, callback) {
		if (!callback) callback = function() {};
		if (Thread._toolsMenu == null) {
			Thread._toolsMenu = $('#threadtools_menu form[name="threadadminform"]');
		}
                
		//Load/create proxy iframe for opening the edit thread interface.
		var proxyFrame = $('#proxyFrame');
		if (proxyFrame.length == 0) {
			proxyFrame = $('<iframe name="proxyFrame" id="proxyFrame"></iframe>');
			proxyFrame.css('display', 'none');
			proxyFrame.css('height', '0px');
			proxyFrame.css('width', '0px');
			$('body').append(proxyFrame);
		}
                
		//Hijacks (then de-hijacks) the thread tools menu
		//in order to load the iframe.
		with ({ menu : Thread._toolsMenu }) {
			menu.attr('target', 'proxyFrame');
			menu.find(':radio[value="movethread"]').click();
			menu.submit();
			menu.removeAttr('target');
		}
                
		//Move the thread.
		proxyFrame.load(function() {
			var proxyForm = $(this).contents().find('form[name="vbform"]');
			$('select[name="destforumid"]', proxyForm).find('option:contains(' + toForum + ')').attr('selected', 'selected');
			
			if (!leaveRedirect) {
				$('#rb_redirect_none', proxyForm).click();
			}
			
			proxyForm.ajaxSubmit(callback);                         
		});
	}
};

Page = {
	isThread: function() {
		if (location.href.match(/www\.christianforums\.com\/t+/)) {
			return true;
		}
		else {
			return false;
		}
	},
        
	isReport: function() {
		if (Page.isThread()) {
			var found = false;
			$('span[class="navbar"]').children('a').each(function() {
				if ($(this).html() == 'Main Report Forum' || $(this).html() == 'Recovery Category Reports') {
					found = true;
					return false; //breaks out of the foreach.
				}
			});
                        
			return found;
		}
		else {
			return false;
		}
	},
	
	isDeletePage: function() {
		if ($('td.tcat').length === 1) {
			return $('td.tcat').text() === 'Delete Posts';
		}
		else {
			return false;
		}
	},
	
	isReplyPage: function() {
		if (location.href.match(/www\.christianforums\.com\/newreply\.php/)) {
			return true;
		}
		else {
			return false;
		}
	},
	
	containsBreadcrumb: function(text) {
		var found = false;
		
		$('span[class="navbar"]').children('a').each(function() {
			if ($(this).html() === text) {
				found = true;
				return false; //breaks out of the foreach.
			}
		});
		
		return found;
	}
};

User = {
	getUserID: function(callback) {
		$.get('http://www.christianforums.com/faq.php?faq=gospel', function(dom) {
			var href = $('#usercptools_menu', dom).find('a:contains(Your Profile)').attr('href');
			var start = href.indexOf('/') + 1;
			var end = href.indexOf('/', start);
			var id = href.substring(start , end);
			callback(id);
		});
	},
	
	getUserGroups: function(callback) {
		User.getUserID(function(id) {
			$.get('http://www.christianforums.com/users/' + id + '/', function(dom) {
				var groups = [];
				
				$('#priv_usergroup_list', dom).children('li').each(function(i, li) {
					var group = $(li).text().trim();
					groups.push(group);
				});
				
				callback(groups);
			});
		});
	},
	
	ifIsModerator: function(callback) {
		var modGroups = [ 'Trainee Moderator', 'Moderators', 'Senior Moderators', 
							'Supervisors', 'CF Staff Trainer', 'Cahplaincy', 
							'Administrators', 'CEO\'s Advisors', 'Superadministrators' ];
							
		User.getUserGroups(function(groups) {
			for (var c = 0; c < groups.length; c++) {
				if (modGroups.indexOf(groups[c]) !== -1) {
					callback();
					break;
				}
			}
		});
	},
	
	getIgnoreList: function(callback) {
		$.get('http://www.christianforums.com/profile/foes/', function(dom) {
			var ignoredUsers = [];
			$('#ignorelist', dom).find('a').each(function() {
				ignoredUsers.push($(this).text());
			});
			
			callback(ignoredUsers);
		});
	},
	
	getNotifications: function(callback) {
		$.get('http://www.christianforums.com/pm/', function(dom) {
			var mapping = {
				'Unread Private Messages': 'privateMessages',
				'Incoming Friend Requests': 'friendRequests',
				'Requests to Join Your Social Groups': 'socialGroupRequests',
				'Invitations to Join Social Groups': 'socialGroupInvites',
				'Unread Picture Comments': 'newPictureComments',
				'Picture Comments Awaiting Approval': 'unapprovedPictureComments',
				'Group Messages Awaiting Approval': 'unapprovedGroupMessages',
				'Unread Profile Visitor Messages': 'visitorMessages'
			};
			
			var notifications = {};
			$(dom).find('#notifications_menu').find('tr:has(.vbmenu_option)')
				.each(function() {
					var children = $(this).children();
					var notificationType = $(children[0]).text();
					var notificationNumber = $(children[1]).text();
					notifications[mapping[notificationType]] = + notificationNumber;
				});
			
			//if there are no notifications, the layout will not exist.
			//but we still must return something.
			if (Object.keys(notifications).length === 0) {
				for (notificationType in mapping) {
					notifications[mapping[notificationType]] = 0;
				}
			}
			
			//now get subscription notifications
			User.getSubscriptionReplyCount(function(unreadReplyCount) {
				notifications.subscriptionReplies = unreadReplyCount;
				callback(notifications);
			});
		});
	},
	
	getSubscriptionReplyCount: function(callback) {
		//this is a simpler algorithm that assumes CF will make unread
		//threads bold in the subscription table. it is known that sometimes
		//weird issues unread threads happen in the regular forums...
		$.get('http://www.christianforums.com/myaccount/', function(dom) {
			var unreadCount = 0;
			var currSubscriptions = State.getState('subscriptions') || {};
			var newSubscriptions = {};
			
			var root = $(dom).find('td.tcat:contains("Subscribed Threads")').closest('table');
			
			//find all table rows that have thread info. the not() call filters out
			//extra worthless table rows.
			root.find('tr[class!="thead"]').not(':has(.tfoot, .tcat)').each(function(i, row) {
				//bold titles are unread threads.
				var title = $(row).find('a[id^="thread_title"]');
				if (title.css('font-weight') === 'bold') {
					unreadCount++;
				}
			});
			
			callback(unreadCount);
		});
	}
};
