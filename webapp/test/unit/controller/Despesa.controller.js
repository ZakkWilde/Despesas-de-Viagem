/*global QUnit*/

sap.ui.define([
	"zfiori_despesa/controller/Despesa.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Despesa Controller");

	QUnit.test("I should test the Despesa controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
