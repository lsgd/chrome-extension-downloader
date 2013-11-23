chrome.runtime.onMessage.addListener(function (req) {
	if ('action' in req) {
		if (req.action === "alert") {
			alert(req.message);
		}
	}
});