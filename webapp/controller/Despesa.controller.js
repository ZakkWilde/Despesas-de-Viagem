sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    "sap/m/library",
    "sap/m/UploadCollectionParameter",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/routing/History",
    'sap/ui/export/library',
	'sap/ui/export/Spreadsheet',
    "sap/ui/model/Sorter",
    "sap/ui/core/library",
    "sap/ui/core/format/DateFormat"
],
function (Controller, JSONModel, Fragment, Filter, FilterOperator, MobileLibrary, UploadCollectionParameter, MessageToast, MessageBox, formatter, BusyIndicator, History, library, Spreadsheet, Sorter, CoreLibrary, DateFormat ) {
    "use strict";

    var EdmType = library.EdmType;
    var sCont;
    const SortOrder = CoreLibrary.SortOrder;

    return Controller.extend("zfioridespesa.controller.Despesa", {

        formatter: formatter,
        
        onInit: function () {

            const oModel = this.getOwnerComponent().getModel();
            
            //Armazenar dados de empregado
            const oViewModel = new JSONModel(),
                  oWfModel   = new JSONModel();

            this.getView().setModel(oViewModel, "EmployeeView");
            this.getView().setModel(oWfModel, "WorkflowModel");

            var that = this;

            oModel.read("/EmployeeSet('00000000')", {
                success: function(oEmployeeData){
                    //console.log(oEmployeeData);
                    oViewModel.setData(oEmployeeData);
                    that._setURI(oEmployeeData.Pernr);
                    that._setFilterTable(oEmployeeData.Pernr);
                },
                error: function(oError){
                    console.log(oError);
                }
            });
            
            //Set Default date 
            this._onSetDefaultDate();
        },

        onSend: function (oEvent) {

            BusyIndicator.show();

            sCont = 0;
            
            var oView       = this.getView(),
                oUpload     = this.byId("UploadCollection"),
                cFiles      = oUpload.getItems().length,
                oViewBundle = oView.getModel("i18n").getResourceBundle(),
                sReinr      = oView.getModel("EmployeeView").getData().Despesa,
                sPernr      = oView.getModel("EmployeeView").getData().Pernr,
                sDate       = oView.byId("data").getDateValue(),
                sDespesa    = oView.byId("Despesa").getValue(),
                oPessConv   = oView.byId("pessConv"),
                oQtdPess    = oView.byId("qtdPess"),
                oDescr      = oView.byId("descr"),
                sValor      = oView.byId("valor").getValue(),
                sDataReg    = oView.byId("dataReg").getDateValue();

            //new fields
            var sLocal = oView.byId('local').getSelectedItem().getText(),
                sIsent = oView.byId("GroupA").getSelectedButton().getSelected(),
                sIsentIndex = oView.byId("GroupA").getSelectedIndex(),
                sMwskz = oView.byId('iva').getValue();

            //oView.setBusy(true);
            if(!sDespesa || !sValor){
                MessageBox.error(oViewBundle.getText('missingFields')); 
                BusyIndicator.hide();
                return;
            }
            if (sDate === ''){
                MessageBox.error(oViewBundle.getText('missingFields'));    
                BusyIndicator.hide();
                return;
            }
            if (oDescr.getRequired() && oDescr.getValue() === '' ){
                MessageBox.error(oViewBundle.getText('missingFields'));    
                BusyIndicator.hide();
                return;
            }
            if (oPessConv.getRequired() && oPessConv.getValue() === '' ){
                MessageBox.error(oViewBundle.getText('missingFields'));
                BusyIndicator.hide();
                return;
            }
            if (oQtdPess.getRequired() && oQtdPess.getValue() === '' ){
                MessageBox.error(oViewBundle.getText('missingFields'));
                BusyIndicator.hide();
                return;
            }
            if (!cFiles){
                MessageBox.error(oViewBundle.getText('missingAttach'));
                BusyIndicator.hide();
                return;
            }
            if ( oView.byId('iva').getRequired() && sMwskz === ''){
                MessageBox.error(oViewBundle.getText('missingFields'));
                BusyIndicator.hide();
                return;
            }     

            sValor.replace(',','.');

            if (sIsent === false && sIsentIndex === 0){
                sIsent = '';
            } else if (sIsent === true && sIsentIndex === 0){
                sIsent = 'X';
            } else {
                sIsent = '';
            }

            var oModel = this.getOwnerComponent().getModel();
            var formData = {
                "Guid"  : this._generateGUID(),
                "Reinr" : sReinr,
                "Pernr" : sPernr,
                "Datre" : sDate,
                "Tpdes" : sDespesa,
                "Descr" : oDescr.getValue(),
                "Entcov": oPessConv.getValue(),
                "Quacov": oQtdPess.getValue(),
                "Valor" : sValor,
                "LocalDesp" : sLocal, 
                "Isento" : sIsent,
                "Mwskz" : sMwskz,
                "Datum" : sDataReg,
            }

            var oWorkflowModel = this.getView().getModel("WorkflowModel");

            //Message
            var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            var successMessage = oResourceBundle.getText("createOK");
            var errorMessage = oResourceBundle.getText("createNOK");

            var that = this;
            
            oModel.create("/DespesaSet", formData, {
                success: function(oEnv, Response, jqXHR) {
                    if (oEnv !== "" || oEnv !== undefined) {
                        
                        //Fill Wf Parameters
                        var WfParameters = {
                            "Guid": oEnv.Guid,
                            "Reinr": oEnv.Reinr,
                            "Pernr": oEnv.Pernr,
                            "Belnr": oEnv.Belnr,
                        };

                        oWorkflowModel.setData(oEnv);

                        //Check if there is atachements
                        if (cFiles > 0) {
                            
                            oUpload.upload();

                        } else {

                            //Start Workflow
                            oModel.create("/StartWorkflowSet", WfParameters, {
                                success: function(oEnv, Response, jqXHR){
                                    console.log(oEnv);
                                    console.log(Response);

                                    // Captura as mensagens de sucesso do response
                                    if (Response.headers["sap-message"]) {
                                        var oMessage = JSON.parse(Response.headers["sap-message"]);
                                        MessageBox.success(oMessage.message);
                                    } else {
                                        MessageBox.success(successMessage);
                                    }

                                    that._refreshData(true);
                                },
                                error: function(oError){
                                    console.log(oError);
                                    var oMessage;

                                    // Verifica se o retorno é XML
                                    if (oError.responseText.startsWith("<?xml")) {
                                        // Faz o parsing do XML
                                        var parser = new DOMParser();
                                        var xmlDoc = parser.parseFromString(oError.responseText, "text/xml");

                                        // Captura o conteúdo da tag <message>
                                        var sMessage = xmlDoc.getElementsByTagName("message")[0].textContent;

                                        // Exibe a mensagem de erro extraída
                                        MessageBox.error(sMessage);
                                    } else {
                                        // Tenta capturar a mensagem de erro detalhada no cabeçalho "sap-message"
                                        var sSapMessage = oError.headers ? oError.headers["sap-message"] : null;
                                        if (sSapMessage) {
                                            oMessage = JSON.parse(sSapMessage);
                                            MessageBox.error(oMessage.message);
                                        } else {
                                            // Captura as mensagens de erro padrão do corpo da resposta
                                            oMessage = JSON.parse(oError.responseText);
                                            if (oMessage.error && oMessage.error.message) {
                                                MessageBox.error(oMessage.error.message.value);
                                            } else {
                                                MessageBox.error(errorMessage);
                                            }
                                        }
                                    }

                                    that._refreshData(false);
                                }
                            });
                        }

                        BusyIndicator.hide();
                        that.getView().setBusy(false);
                    }
                },
                error: function(oError, vv) {
                    console.log(oError);
                    var oMessage;
                
                    // Verifica se o retorno é XML
                    if (oError.responseText.startsWith("<?xml")) {
                        // Faz o parsing do XML
                        var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(oError.responseText, "text/xml");
                
                        // Captura o conteúdo da tag <message>
                        var sMessage = xmlDoc.getElementsByTagName("message")[0].textContent;
                
                        // Exibe a mensagem de erro extraída
                        MessageBox.error(sMessage);
                    } else {
                        // Tenta capturar a mensagem de erro detalhada no cabeçalho "sap-message"
                        var sSapMessage = oError.headers ? oError.headers["sap-message"] : null;
                        if (sSapMessage) {
                            oMessage = JSON.parse(sSapMessage);
                            MessageBox.error(oMessage.message);
                        } else {
                            // Captura as mensagens de erro padrão do corpo da resposta
                            oMessage = JSON.parse(oError.responseText);
                            if (oMessage.error && oMessage.error.message) {
                                MessageBox.error(oMessage.error.message.value);
                            } else {
                                MessageBox.error(errorMessage);
                            }
                        }
                    }
                
                    BusyIndicator.hide();
                    that._refreshData(false);
                }
            });

        },

        _generateGUID: function () {
            const array = new Uint8Array(16); // 8 bytes = 16 caracteres hexadecimais
            crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
        },

        onBeforeUploadStarts: function(oEvent){

            const newGUID = this._generateGUID();
            var oView = this.getView(); 

            oEvent.getSource().removeAllHeaderParameters();

            var oCustomerHeaderSlug = new UploadCollectionParameter({
                name: "slug",
                value: encodeURIComponent(oEvent.getParameter("fileName"))
            });
            oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);

            var oKey = new UploadCollectionParameter({
                name: "slug",
                value: newGUID
            });
            oEvent.getParameters().addHeaderParameter(oKey);

            var oKeyPernr = new UploadCollectionParameter({
                name: "slug",
                value: oView.getModel("EmployeeView").getData().Pernr
                //this.getView().getModel("EmployeeView").getParameter("Pernr")
            });
            oEvent.getParameters().addHeaderParameter(oKeyPernr);

            var oKeyDesp = new UploadCollectionParameter({
                name: "slug",
                value: oView.getModel("EmployeeView").getData().Despesa
                //this.getView().getModel("EmployeeView").getParameter("Despesa")
            });
            oEvent.getParameters().addHeaderParameter(oKeyDesp);

            //var oModel = this.getView().getModel();
            var oModel = oView.getModel();
            oModel.refreshSecurityToken();

            var oToken = new UploadCollectionParameter({
                name: "x-csrf-token",
                value: oModel.getSecurityToken()
            });
            oEvent.getParameters().addHeaderParameter(oToken);

            setTimeout(function() {
                //MessageToast.show("Event beforeUploadStarts triggered");
            }, 4000);
        },

        onUploadCompleted: function(oEvent){

            this.getView().getModel().refresh();

            sCont ++;

            var oUploadCollection = oEvent.getSource();
            var sEventUploaderID = oEvent.getParameters().getParameters().id;

            for (var i = 0; i < oUploadCollection._aFileUploadersForPendingUpload.length; i++) {

                var sPendingUploadederID = oUploadCollection._aFileUploadersForPendingUpload[i].oFileUpload.id;

                if (sPendingUploadederID.includes(sEventUploaderID)) {
                    oUploadCollection._aFileUploadersForPendingUpload[i].destroy();
                    oUploadCollection._aFileUploadersForPendingUpload.splice([i], 1);
                }
            }

            //const sStatus = oEvent.getParameter('files')[0].status; 
            const sStatus = oEvent.getParameter('files')[0]?.status;

            oUploadCollection.invalidate();

            oUploadCollection.destroyItems();

            if (sCont != oUploadCollection._iUploadStartCallCounter){
                return; 
            } 

            //Start Workflow 
            var oWorkflowModel = this.getView().getModel("WorkflowModel"); 
            var oWfData = oWorkflowModel.getData();
            
            //Message
            var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            var successMessage = oResourceBundle.getText("createOK");
            var errorMessage = oResourceBundle.getText("createNOK");

            //Fill Wf Parameters
            var WfParameters = {
                "Guid":  oWfData.Guid,
                "Reinr": oWfData.Reinr,
                "Pernr": oWfData.Pernr,
                "Belnr": oWfData.Belnr,
            };

            var oModel = this.getOwnerComponent().getModel();
            var that = this;
            //Start Workflow
            oModel.create("/StartWorkflowSet", WfParameters, {
                success: function(oEnv, Response, jqXHR){
                    console.log(oEnv);
                    console.log(Response);

                    // Captura as mensagens de sucesso do response
                    if (Response.headers["sap-message"]) {
                        var oMessage = JSON.parse(Response.headers["sap-message"]);
                        MessageBox.success(oMessage.message);
                    } else {
                        MessageBox.success(successMessage);
                    }
                    that._refreshData(true);
                },
                error: function(oError, vv) {
                    console.log(oError);
                    var oMessage;
                
                    // Verifica se o retorno é XML
                    if (oError.responseText.startsWith("<?xml")) {
                        // Faz o parsing do XML
                        var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(oError.responseText, "text/xml");
                
                        // Captura o conteúdo da tag <message>
                        var sMessage = xmlDoc.getElementsByTagName("message")[0].textContent;
                
                        // Exibe a mensagem de erro extraída
                        MessageBox.error(sMessage);
                    } else {
                        // Tenta capturar a mensagem de erro detalhada no cabeçalho "sap-message"
                        var sSapMessage = oError.headers ? oError.headers["sap-message"] : null;
                        if (sSapMessage) {
                            oMessage = JSON.parse(sSapMessage);
                            MessageBox.error(oMessage.message);
                        } else {
                            // Captura as mensagens de erro padrão do corpo da resposta
                            oMessage = JSON.parse(oError.responseText);
                            if (oMessage.error && oMessage.error.message) {
                                MessageBox.error(oMessage.error.message.value);
                            } else {
                                MessageBox.error(errorMessage);
                            }
                        }
                    }
                
                    BusyIndicator.hide();
                    that._refreshData(false);
                }
            });

            BusyIndicator.hide();
        },

        onDownloadSelectedButton: function () {
			var oUploadSet = this.byId("UploadSet");

			oUploadSet.getItems().forEach(function (oItem) {
				if (oItem.getListItem().getSelected()) {
					oItem.download(true);
				}
			});
		},

        onDownloadAttachments: function (oEvent) {

            var oButton = oEvent.getSource();
            var oModel  = this.getView().getModel();
            var oContext = oButton.getBindingContext();
            var sPath = oContext.getPath()

            var sProperty = oModel.getProperty(sPath);
            var sReinr = sProperty.Reinr;
            var sPernr = sProperty.Pernr;

            oModel.read('/AnexoSet', {
                urlParameters: {

                    "$filter": "Reinr eq '" + sReinr + "' and Pernr eq '" + sPernr + "'"

                },
                success: function(oData){

                    if(oData.results)

                    var aFiles = oData.results;

                    aFiles.forEach( function (oFile) {

                        var sFileName = oFile.FileName;
                        var sMimeType = oFile.FileType;
                        var sBase64   = oFile.Attach;

                        // Converte o Base64 para Blob
                        var byteCharacters = atob(sBase64);
                        var byteNumbers = new Array(byteCharacters.length);
                        for (var i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        var byteArray = new Uint8Array(byteNumbers);
                        var blob = new Blob([byteArray], { type: sMimeType });

                        // Cria um URL temporário para o Blob e inicia o download
                        var url = URL.createObjectURL(blob);
                        var a = document.createElement('a');
                        a.href = url;
                        a.download = sFileName;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);

                    });

                },
                error: function (oError){
                    MessageToast.show('Erro no download do Anexo');
                    console.log(oError);
                }
            })
            
        },

        onValueHelpRequest: function (oEvent) {
			var sInputValue = oEvent.getSource().getValue(),
				oView = this.getView();

			if (!this._pValueHelpDialog) {
				this._pValueHelpDialog = Fragment.load({
					id: oView.getId(),
					name: "zfioridespesa.view.DespesasInputList",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					return oDialog;
				});
			}
			this._pValueHelpDialog.then(function(oDialog) {

                //Build filter
                var oFilter = new Filter(
                                [new Filter("Hkont", FilterOperator.Contains, sInputValue), 
                                 new Filter("RubriDesc", FilterOperator.Contains, sInputValue)], false );

				// Create a filter for the binding
				oDialog.getBinding("items").filter(oFilter);
				// Open ValueHelpDialog filtered by the input's value
				oDialog.open(sInputValue);
			});
		},

		onValueHelpSearch: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter(
                          [ new Filter("Hkont", FilterOperator.Contains, sValue) ,
                            new Filter("RubriDesc", FilterOperator.Contains, sValue) ], false );

			oEvent.getSource().getBinding("items").filter([oFilter]);
		},

		onValueHelpClose: function (oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			oEvent.getSource().getBinding("items").filter([]);

			if (!oSelectedItem) {
				return;
			}

            this.byId("Despesa").setValue(oSelectedItem.getTitle());
            this.byId("Despesa").setDescription(oSelectedItem.getDescription());

            if( oSelectedItem.getTitle() === '62298088') {
                this.byId("descr").setRequired(true);
            } else { 
                this.byId("descr").setRequired(false); 
            }

            if( oSelectedItem.getTitle() === '62221001') {
                this.byId("pessConv").setRequired(true);
                this.byId("qtdPess").setRequired(true);
            } else { 
                this.byId("pessConv").setRequired(false);
                this.byId("qtdPess").setRequired(false);
            }

		},

        onChangeEmp: function(oEvent){

            var oView = this.getView();

			if (!this._pValueHelpEmployee) {
				this._pValueHelpEmployee = Fragment.load({
					id: oView.getId(),
					name: "zfioridespesa.view.ChangeEmployee",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					return oDialog;
				});
			}
			this._pValueHelpEmployee.then(function(oDialog) {
				oDialog.open(); 
			});

        },

        onVHSearch: function (oEvent) {

            var sValue = oEvent.getParameter("value");
			var oFilter = new Filter( [ new Filter("Pernr", FilterOperator.Contains, sValue) ,
                                        new Filter("Nome", FilterOperator.Contains, sValue) ], false );

			oEvent.getSource().getBinding("items").filter([oFilter]);
            
        },

        onVHClose: function (oEvent) {

            var oSelectedItem = oEvent.getParameter("selectedItem");
			oEvent.getSource().getBinding("items").filter([]);

			if (!oSelectedItem) {
				return;
			}

            var oViewModel = this.getView().getModel("EmployeeView");

            var that = this; 

            this.getView().getModel().read("/EmployeeSet('" + oSelectedItem.getTitle() + "')", {
                success: (oEmployeeData) => {
                    //console.log(oEmployeeData);
                    oEmployeeData.EmpSec = true;
                    oViewModel.setData(oEmployeeData);
                    that._setURI(oEmployeeData.Pernr);
                    that._setFilterTable(oEmployeeData.Pernr);
                    
                },
                error: (oError) => {
                    console.log(oError);
                }
            });
            
        },

        onChange: function(oEvent){

            var sValue = oEvent.getParameter('value');
            if (!sValue) {
                //this.byId('DespesaText').setText('');
            }

        },

        onHandleValueHelpIVA: function (oEvent){

		    var oView = this.getView();

            if (!oView.byId("data").getDateValue()){
                MessageBox.error(oView.getModel("i18n").getResourceBundle().getText('errorData'));
                return;
            }

            var sDespesa = this.getView().byId("Despesa").getValue(); 

			if (!this._pValueHelpIVADialog) {
				this._pValueHelpIVADialog = Fragment.load({
					id: oView.getId(),
					name: "zfioridespesa.view.IVA",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					return oDialog;
				});
			}
			this._pValueHelpIVADialog.then(function(oDialog) {
                //Build filter
                var oFilter = new Filter( "Name1", FilterOperator.Contains, sDespesa );
                // Create a filter for the binding
                oDialog.getBinding("items").filter(oFilter);
				oDialog.open();
			});

        },

        onValueHelpCloseIVA: function (oEvent) {

            var oSelectedItem = oEvent.getParameter("selectedItem");
			oEvent.getSource().getBinding("items").filter([]);

			if (!oSelectedItem) {
				return;
			}

            var sMwskz = oSelectedItem.getCells()[1].getText();
            var sName1 = oSelectedItem.getCells()[2].getText();

            var oDate1 = this.getView().byId("data").getDateValue();
            oDate1 = this._formatDateForOData(oDate1);

            this.byId("iva").setValue(sMwskz);
            this.byId("iva").setDescription(sName1);
            this.byId("local").setSelectedKey(sName1[0]);
            
        },

        handleSearch: function (oEvent) {
			var sValue = oEvent.getParameter("value");
            
			// Criando múltiplos filtros para Rubri, Mwskz e Name1
            var oFilter = new Filter({
                filters: [
                    new Filter("Name1", FilterOperator.Contains, sValue)
                ],
                and: false // 'false' significa que será usado o operador 'OR' entre os filtros
            });

			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([oFilter]);
		},

        onCanc: function(oEvt){

            var oResource = this.getView().getModel("i18n").getResourceBundle();

            var oTable   = this.getView().byId("despesas"); 
            var aIndices = oTable.getSelectedIndices();
			let sMsg;
			if (aIndices.length < 1) {
				sMsg = oResource.getText('erroCan1');
                MessageBox.warning(sMsg);
                return;
			} else if ( aIndices.length > 1 ){
                sMsg = oResource.getText('erroCan2');
                MessageBox.warning(sMsg);
                return;
            }

            var oSelectedContext = oTable.getContextByIndex(aIndices);
            var oSelectedData    = oSelectedContext.getObject();

            var sPernr = oSelectedData.Pernr,
                sReinr = oSelectedData.Reinr,
                sBelnr = oSelectedData.Belnr,
                sGjahr = oSelectedData.Gjahr;

            var oDelModel = this.getOwnerComponent().getModel();

            var sPath = "/CancelExpenseSet(Pernr='" + sPernr + "',Reinr='" + sReinr + "',Belnr='" + sBelnr + "',Gjahr='" + sGjahr + "')";

            oDelModel.remove( sPath, {
                success: function(oData) {
                    MessageBox.success(oResource.getText('delOk'));
                },
                error: function(oError) {
                    //MessageBox.error(oResource.getText('delNok'));
                    console.log(oError);
                    var oMessage;
                
                    if (oError.responseText.startsWith("<?xml")) {
                        var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(oError.responseText, "text/xml");
                        var sMessage = xmlDoc.getElementsByTagName("message")[0].textContent;
                        MessageBox.error(sMessage);
                    } else {
                        var sSapMessage = oError.headers ? oError.headers["sap-message"] : null;
                        if (sSapMessage) {
                            oMessage = JSON.parse(sSapMessage);
                            MessageBox.error(oMessage.message);
                        } else {
                            oMessage = JSON.parse(oError.responseText);
                            if (oMessage.error && oMessage.error.message) {
                                MessageBox.error(oMessage.error.message.value);
                            } else {
                                MessageBox.error(errorMessage);
                            }
                        }
                    }
                }
            });
        },

        onSearch: function(oEvent) {
            // Obtém o valor inserido no campo de pesquisa
            var sQuery = oEvent.getParameter("query");
            
            // Cria um array para armazenar os filtros
            var aFilters = [];

            var sQuery = sQuery.toUpperCase();
        
            // Verifica se há valor inserido no campo de pesquisa
            if (sQuery && sQuery.length > 0) {
                // Cria os filtros para as 5 primeiras colunas
                var oFilterReinr = new Filter("Reinr", FilterOperator.Contains, sQuery);
                var oFilterPernr = new Filter("Pernr", FilterOperator.Contains, sQuery);
                //var oFilterBukrs = new Filter("Bukrs", FilterOperator.Contains, sQuery);
                //var oFilterDatum = new Filter("Datum", FilterOperator.EQ, sQuery);
                //var oFilterDatre = new Filter("Datre", FilterOperator.EQ, sQuery);
        
                // Agrupa os filtros em um único filtro OR
                aFilters.push(new Filter({
                    filters: [oFilterReinr, oFilterPernr],// oFilterBukrs],//, oFilterDatum, oFilterDatre],
                    and: false
                }));
            }
        
            // Obtém a tabela
            var oTable = this.byId("despesas");
        
            // Obtém o binding de linhas da tabela
            var oBinding = oTable.getBinding("rows");
        
            // Aplica os filtros
            oBinding.filter(aFilters);
        },

        onExport: function() {
            // Obtém o modelo i18n para pegar as traduções
            var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
        
            // Obtém a tabela e o modelo associado
            var oTable = this.byId("despesas");
            var aContexts = oTable.getBinding("rows").getContexts();
            
            // Prepara os dados para exportação
            var aData = aContexts.map(function(oContext) {
                return oContext.getObject();
            });
        
            // Define as colunas, utilizando os textos do i18n para as labels
            var aColumns = [
                {
                    label: oResourceBundle.getText("tabReemb"),
                    property: 'Reinr',
                    type: EdmType.String
                },
                {
                    label: oResourceBundle.getText("tabNumPe"),
                    property: 'Pernr',
                    type: EdmType.String
                },
                {
                    label: oResourceBundle.getText("tabEmpre"),
                    property: 'Bukrs',
                    type: EdmType.String
                },
                {
                    label: oResourceBundle.getText("tabDtCri"),
                    property: 'Datum',
                    type: EdmType.Date,
                    format: 'dd/MM/yyyy'
                },
                {
                    label: oResourceBundle.getText("tabDtDes"),
                    property: 'Datre',
                    type: EdmType.Date,
                    format: 'dd/MM/yyyy'
                },
                {
                    label: oResourceBundle.getText("tabTpDes"),
                    property: 'Tpdes',
                    type: EdmType.String
                },
                {
                    label: oResourceBundle.getText("tabDescr"),
                    property: 'Descr',
                    type: EdmType.String
                },
                {
                    label: oResourceBundle.getText("tabValor"),
                    property: 'Valor',
                    type: EdmType.Number
                },
                {
                    label: oResourceBundle.getText("tabDtVal"),
                    property: 'Datva',
                    type: EdmType.Date,
                    format: 'dd/MM/yyyy'
                },
                {
                    label: oResourceBundle.getText("tabValid"),
                    property: 'Valid',
                    type: EdmType.String
                },
                {
                    label: oResourceBundle.getText("tabDtApr"),
                    property: 'Datap',
                    type: EdmType.Date,
                    format: 'dd/MM/yyyy'
                },
                {
                    label: oResourceBundle.getText("tabAprov"),
                    property: 'Aprov',
                    type: EdmType.String
                },
                {
                    label: oResourceBundle.getText("tabDtRej"),
                    property: 'Datrj',
                    type: EdmType.Date,
                    format: 'dd/MM/yyyy'
                },
                {
                    label: oResourceBundle.getText("tabRepro"),
                    property: 'Repro',
                    type: EdmType.String
                },
                {
                    label: oResourceBundle.getText("tabDtCan"),
                    property: 'Datca',
                    type: EdmType.Date,
                    format: 'dd/MM/yyyy'
                },
                {
                    label: oResourceBundle.getText("tabCance"),
                    property: 'Cance',
                    type: EdmType.String
                },
                {
                    label: oResourceBundle.getText("tabDtPag"),
                    property: 'Augdt',
                    type: EdmType.Date,
                    format: 'dd/MM/yyyy'
                },
                {
                    label: oResourceBundle.getText("tabStatu"),
                    property: 'Status',
                    type: EdmType.String,
                    // Formatter para a coluna Status
                    format: function(sValue) {
                        switch (sValue) {
                            case "2":
                            case "4":
                            case "7":
                                return 'Error';
                            case "6":
                                return 'Success';
                            default:
                                return 'Information';
                        }
                    }
                },
                {
                    label: oResourceBundle.getText("tabEntCo"),
                    property: 'Entcov',
                    type: EdmType.String
                },
                {
                    label: oResourceBundle.getText("tabQuant"),
                    property: 'Quacov',
                    type: EdmType.Number
                },
                {
                    label: oResourceBundle.getText("tabNbDoc"),
                    property: 'Belnr',
                    type: EdmType.String
                },
                {
                    label: oResourceBundle.getText("tabExerc"),
                    property: 'Gjahr',
                    type: EdmType.String
                }
            ];
        
            // Configuração do Spreadsheet
            var oSettings = {
                workbook: {
                    columns: aColumns
                },
                dataSource: aData,
                fileName: 'Tabela_Despesas_por_utilizador.xlsx',
                worker: false // Definir como true para exportação em segundo plano
            };
        
            // Cria o Spreadsheet e faz o download
            var oSpreadsheet = new sap.ui.export.Spreadsheet(oSettings);
            oSpreadsheet.build()
                .then(function() {
                    sap.m.MessageToast.show("Download do Excel concluído!");
                })
                .catch(function(oError) {
                    sap.m.MessageToast.show("Erro ao gerar o arquivo Excel: " + oError);
                });
        },     

        onNavBack: function(oEvt){

            const oHistory      = History.getInstance();
			const sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				const oRouter = this.getOwnerComponent().getRouter();
				oRouter.navTo("overview", {}, true);
			}

        },

        sortDeliveryDate : function(oEvent) {
			var oCurrentColumn = oEvent.getParameter("column");
			var oDeliveryDateColumn = this.byId("datum");
			if (oCurrentColumn != oDeliveryDateColumn) {
				oDeliveryDateColumn.setSorted(false); //No multi-column sorting
				return;
			}

			oEvent.preventDefault();

			var sOrder = oEvent.getParameter("sortOrder");
			var oDateFormat = DateFormat.getDateInstance({pattern: "dd/MM/yyyy"});

			this._resetSortingState(); //No multi-column sorting
			oDeliveryDateColumn.setSorted(true);
			oDeliveryDateColumn.setSortOrder(sOrder);

			var oSorter = new Sorter(oDeliveryDateColumn.getSortProperty(), sOrder === SortOrder.Descending);
			//The date data in the JSON model is string based. For a proper sorting the compare function needs to be customized.
			oSorter.fnCompare = function(a, b) {
				if (b == null) {
					return -1;
				}
				if (a == null) {
					return 1;
				}

				var aa = oDateFormat.parse(a).getTime();
				var bb = oDateFormat.parse(b).getTime();

				if (aa < bb) {
					return -1;
				}
				if (aa > bb) {
					return 1;
				}
				return 0;
			};

			this.byId("despesas").getBinding("rows").sort(oSorter);
		},

        onRadioSel: function (oEvent){

            var iSelectedIndex = oEvent.getSource().getSelectedIndex();
    
            var oIvaInput = this.getView().byId("iva");

            if (iSelectedIndex === 0) {
                oIvaInput.setEnabled(false);
                oIvaInput.setRequired(false);
            } else {
                oIvaInput.setEnabled(true);
                oIvaInput.setRequired(true);
            }

        },

		_resetSortingState : function() {
			var oTable = this.byId("despesas");
			var aColumns = oTable.getColumns();
			for (var i = 0; i < aColumns.length; i++) {
				aColumns[i].setSorted(false);
			}
		},

        _onSetDefaultDate: function () {

            var oDateModel = new JSONModel({
                oDefaultDate: new Date()
            });
            this.getView().setModel(oDateModel, "Date");
        },

        _setFilterTable: function (sPernr){

            var oTable = this.getView().byId('despesas');

            var oFilter = new Filter("Pernr", FilterOperator.EQ, sPernr );

            var oBindingFilter = oTable.getBinding("rows");
            if (oBindingFilter) {
                oBindingFilter.filter([]);
                oBindingFilter.filter(oFilter);
            }

        },

        _refreshData: function (sType) {

            var oView = this.getView();

            //var oEmployeeView = oView.getModel("EmployeeView"); 
                
            //oView.getModel("EmployeeView").refresh();
            
            oView.byId("Despesa").setValue("").setDescription("");
            oView.byId("iva").setValue("").setDescription("");
            oView.byId("pessConv").setValue("");
            oView.byId("qtdPess").setValue("");
            oView.byId("descr").setValue("");
            oView.byId("valor").setValue("");
            
            var oDateRef = new Date();
            oView.byId("data").setDateValue(oDateRef);
            oView.byId("dataReg").setDateValue(oDateRef);

            /* var oRefModel = this.getOwnerComponent().getModel(); 

            oRefModel.read("/EmployeeSet('00000000')", {
                success: function(oEmployeeData){
                    //console.log(oEmployeeData);
                    oEmployeeView.setData(oEmployeeData);
                },
                error: function(oError){
                    console.log(oError);
                }
            }); */
            var that = this;
            if (sType) {
                var oModel = this.getOwnerComponent().getModel();
                oModel.read("/GetDespNumberSet('0000000000')", {
                    success: function (oDespNumber){
                        var oEmployeeModel = that.getView().getModel("EmployeeView");
                        oEmployeeModel.setProperty("/Despesa", oDespNumber.Reinr);
                    },
                    error: function (oError){
                        console.log(oError);
                    }
                });
            }
            BusyIndicator.hide();
        },

        _setURI: function(sPernr) {

            var sImageURI = "/sap/opu/odata/sap/ZFIORI_DESPESAS_VIAGEM_SRV/EmployeeSet('" + sPernr + "')/$value";
            this.getView().byId("headerForTest").setObjectImageURI(sImageURI);

        },

        _formatDateForOData: function (oDate) {
            // Pegue os componentes da data
            var year = oDate.getFullYear();
            var month = ("0" + (oDate.getMonth() + 1)).slice(-2);  // Adiciona zero à esquerda se necessário
            var day = ("0" + oDate.getDate()).slice(-2);           // Adiciona zero à esquerda se necessário
            var hours = ("0" + oDate.getHours()).slice(-2);
            var minutes = ("0" + oDate.getMinutes()).slice(-2);
            var seconds = ("0" + oDate.getSeconds()).slice(-2);
        
            // Retorna no formato datetime'YYYY-MM-DDTHH:MM:SS'
            return `datetime'${year}-${month}-${day}T${hours}:${minutes}:${seconds}'`;
        }
    });
});
