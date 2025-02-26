/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zfiori_despesa/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
