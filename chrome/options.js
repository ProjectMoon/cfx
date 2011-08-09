var options = {};

var defaults = {
	notificationRate: 1,
	modhat: '',
	superIgnore: true
};

function parseBoolean(text) {
	return (/^true$/i).test(text);
}

function saveOptions() {
	$.jStorage.set('options', options);
}

function loadOptions() {
	options = $.jStorage.get('options', defaults);
	
	//load default values for missing options.
	for (var setting in defaults) {
		if (!(setting in options)) {
			options[setting] = defaults[setting];
		}
	}
}

function showStatusMessage(text) {
	$('#statusMessage').hide();
	$('#statusMessage').html(text);
	$('#statusMessage').show();
	
	setTimeout(function() {
		$('#statusMessage').fadeOut(1000);
	}, 2000);
}

function showPermanentMessage(text) {
	$('#statusMessage').hide();
	$('#statusMessage').html(text);
	$('#statusMessage').show();
}

function displayOptions() {
	$('#modhat').val(options.modhat);
	$('#notificationRate').val(options.notificationRate);
	$('#superIgnore').attr('checked', options.superIgnore);
}

$(function() {
	$('#tabs').tabs();
	loadOptions();
	displayOptions();
	bindEvents();
	
	User.ifIsModerator(function() {
		$('#notStaff').hide();
		$('#isStaff').show();
		
		bindStaffEvents();
	});
});

function bindEvents() {
	
	$('input, textarea').focus(function() {
		showPermanentMessage('Changes not yet saved.');
	});
	
	$('input, textarea').change(function() {
		var key = $(this).attr('data-option');
		var dataType = $(this).attr('data-type');
		
		//must be sure to convert everything properly.
		//they come in as strings.
		if (dataType === 'int') {
			options[key] = +$(this).val();
		}
		else if (dataType === 'boolean') {
			if ($(this).is(':checkbox')) {
				options[key] = parseBoolean($(this).is(':checked'));
			}
			else {
				options[key] = $(this).val();
			}
		}
		else if (dataType === 'string') {
			options[key] = $(this).val();
		}
		else {
			options[key] = $(this).val();
		}
		
		saveOptions();
		showStatusMessage('Changes saved.');
	});
}

function bindStaffEvents() {

}
