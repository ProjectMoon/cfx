function isOpen() {
	return Page.containsBreadcrumb('Finished Reports') === false;
}

$(function() {
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
