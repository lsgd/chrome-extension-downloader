var ced = {};
ced.tabs = {};
ced.tabId = -1;
ced.extensionRegExp = new RegExp("[a-z]{32}", "ig");

ced.initOpenTabs = function() {
	chrome.tabs.query({}, function(tabs) {
		for(var i = 0; i < tabs.length; i++) {
			ced.tabs[tabs[i].id] = {
				"title": "",
				"extension": ""
			};
		}
	});
};

ced.scanTab = function(tab, invoker) {
	if(invoker === "onActivated" && ced.tabId === tab.id) {
		return;
	}

	ced.tabId = tab.id;

	if(!ced.isValidExtensionUrl(tab.url)) {
		ced.tabs[tab.id].extension = null;
		ced.tabs[tab.id].title = null;
		chrome.pageAction.hide(tab.id);
		return;
	}

	ced.tabs[tab.id].extension = ced.getExtensionId(tab.url);
	ced.tabs[tab.id].title = ced.getExtensionTitle(tab.title);

	chrome.pageAction.show(tab.id);
};

ced.onContextMenuPageClick = function(clickedData) {
	if(ced.isValidExtensionUrl(clickedData.pageUrl)) {
		var extension = ced.getExtensionId(clickedData.pageUrl);
		ced.downloadExtension(extension);
		return;
	}

	chrome.tabs.sendMessage(ced.tabId, {
		action: "alert",
		message: "This page does not show a valid Chrome Extension!"
	});
};

ced.onContextMenuLinkClick = function(clickedData) {
	if(ced.isValidExtensionUrl(clickedData.linkUrl)) {
		var extension = ced.getExtensionId(clickedData.linkUrl);
		ced.downloadExtension(extension);
		return;
	}

	chrome.tabs.sendMessage(ced.tabId, {
		action: "alert",
		message: "This link does not contain a valid Chrome Extension ID!"
	});
};

ced.isValidExtensionUrl = function(url) {
	ced.extensionRegExp.exec("");
	return url.indexOf("https://chrome.google.com/") === 0 && ced.extensionRegExp.test(url);
};

ced.getExtensionId = function(url) {
	ced.extensionRegExp.exec("");
	var result = ced.extensionRegExp.exec(url);
	return result[0];
};

ced.getExtensionTitle = function(title) {
	return title.substr(19);
};

ced.isValidExtensionForTab = function(tabId) {
	return ced.tabs[tabId].extension !== undefined;
};

ced.downloadExtension = function(extension) {
	chrome.tabs.create({
		url:'http://www.chrome-extension-downloader.com/landing.php?source=chrome-extension&extension='+extension
	});
};




/**
 * Generate information structure for created tab and invoke all needed
 * functions if tab is created in foreground
 * @param {object} tab
 */
chrome.tabs.onCreated.addListener(function(tab) {
	if(tab.id > 0) {
		ced.tabs[tab.id] = {
			"title": "",
			"extension": ""
		};

		if(tab.selected) {
			ced.scanTab(tab, "onCreated");
		}
	}
});

/**
 * Remove information structure of closed tab for freeing memory
 * @param {integer} tabId
 * @param {object} removeInfo
 */
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
	delete ced.tabs[tabId];
	if(ced.tabId === tabId) {
		ced.tabId = -1;
	}
});

/**
 * Remove stored credentials on switching tabs.
 * Invoke functions to retrieve credentials for focused tab
 * @param {object} activeInfo
 */
chrome.tabs.onActivated.addListener(function(activeInfo) {
	chrome.tabs.get(activeInfo.tabId, function(tab) {
		if(tab && tab.id) {
			if(tab.status === "complete") {
				ced.scanTab(tab, "onActivated");
			}
		}
	});
});

/**
 * Update browserAction on every update of the page
 * @param {integer} tabId
 * @param {object} changeInfo
 * @param {object} tab
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if(changeInfo.status === "complete") {
		ced.scanTab(tab, "onUpdated");
	}
});

/**
 * Interaction between background-script, front-script and popup-script
 */
chrome.extension.onMessage.addListener(ced.onMessage);

/**
 * Fired action when clicking on the pageAction
 * @param {object} tab
 */
chrome.pageAction.onClicked.addListener(function(tab) {
	if(ced.isValidExtensionForTab(tab.id)) {
		ced.downloadExtension(ced.tabs[tab.id].extension);
	}
});

chrome.contextMenus.create({
	"title": "Download Chrome Extension",
	"contexts":["page"],
	"onclick": ced.onContextMenuPageClick
});

chrome.contextMenus.create({
	"title": "Download Chrome Extension",
	"contexts":["link"],
	"onclick": ced.onContextMenuLinkClick
});


document.addEventListener('DOMContentLoaded',function(){
	ced.initOpenTabs();
});