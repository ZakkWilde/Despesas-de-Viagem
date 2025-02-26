sap.ui.define(["sap/ui/model/odata/type/Time"], function(Time) {
    "use strict";

    return {
        /**
         * Rounds the currency value to 2 digits
         *
         * @public
         * @param {string} sValue value to be formatted
         * @returns {string} formatted currency value with 2 digits
         */
        formatStatus: function(sValue){

            var sI18nText = this.getView().getModel("i18n").getResourceBundle();

            switch (sValue) {
                case "1":
                    return sI18nText.getText('status1'); //'Aguarda Validação'                    
                case "2":
                    return sI18nText.getText('status2'); //'Inválido para pagamento'                    
                case "3":
                    return sI18nText.getText('status3'); //'Aguardando Aprovação'                    
                case "4":
                    return sI18nText.getText('status4'); //'Rejeitado nível 2'                    
                case "5":
                    return sI18nText.getText('status5'); //'Aprovado nível 2'                    
                case "6":
                    return sI18nText.getText('status6'); //'Pago'                    
                case "7":
                    return sI18nText.getText('status7'); //'Cancelado'                    
                default:
                    break;
            } 

        },

        formatState: function (sValue) {

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
            
        },

        currencyValue: function(sValue) {
            if (!sValue) {
                return "";
            }

            return parseFloat(sValue).toFixed(2);
        },

        formatUrl: function(sCtr, sFName) {
            //Example: Anexos(ContratoFactoring='File3',Filename='teste2.pdf')/$value
            let sUrl = this.getView().getModel().sServiceUrl;
            //sUrl += "/" + "EditAnexoSet(ContratoFactoring='" + sCtr + "',Filename='" + sFName + "')" + "/$value";
            return sUrl;
        },

        formatTime: function(oTime) {

            var sTime = new Time(oTime).formatValue({
                __edmType: "Edm.Time",
                ms: oTime.ms
            }, "string");

            return sTime;

        },

        formatDate: function(sDate){

            // Verifica se a data existe
            if (!sDate) {
                return "";
            }

            sDate = sDate.toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            return sDate;

        },

        addSpace: function(sValue) {
            if (sValue) {
                var sSpace = sValue.replaceAll('_', ' ');
                return sSpace;
            }
        }
    };

});