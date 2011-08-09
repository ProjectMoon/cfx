Thread = {
	_toolsMenu: null,
        
	quickReply: function(message) {
		//whether to use rich text editor iframe or the textarea.
		if ($('#vB_Editor_QR_iframe').is(':visible')) {
			message = message.replace('\n', '<br>');
			$('#vB_Editor_QR_iframe')[0].contentWindow.document.execCommand('insertHTML', null, message);
		}
		else {
			$('#vB_Editor_QR_textarea').val(message);
		}
                
		$('#qr_submit').click();
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
			if (JSON.stringify(notifications) === '{}') {
				for (notificationType in mapping) {
					notifications[mapping[notificationType]] = 0;
				}
			}
			callback(notifications);
		});
	}
};
