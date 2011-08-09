var PREFIX = 'thermetics.fx.cfx.';

function save(options) {
	for (var option in options) {
		localStorage[prefix + option] = options[option];
	}
}

function load() {
	var options = {};
	for (var setting in localStorage) {
		if (setting.indexOf(PREFIX) === 0) {
			options[setting.substring(PREFIX.length)] = localStorage[setting];
		}
	}
	
	return options;
}

$(function() {
	
});
