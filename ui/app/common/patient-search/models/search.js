'use strict';

Bahmni.Common.PatientSearch.Search = function (searchTypes) {
    var self = this;
    self.searchTypes = searchTypes || [];
    self.searchType = this.searchTypes[0];
    self.searchParameter = '';
    self.noResultsMessage = null;
    self.searchResults = [];
    self.activePatients = [];
    self.navigated = false;
    angular.forEach(searchTypes, function (searchType) {
        searchType.patientCount = "..."
    });

    self.switchSearchType = function (searchType) {
        self.noResultsMessage = null;
        if (!self.isSelectedSearch(searchType)) {
            self.searchParameter = '';
            self.navigated = true;
            self.searchType = searchType;
            self.activePatients = [];
            self.searchResults = [];
        }
        self.markPatientEntry();
    };

    self.markPatientEntry = function () {
        self.startPatientSearch = true;
        window.setTimeout(function () {
            self.startPatientSearch = false;
        });
    };

    self.patientsCount = function () {
        return self.activePatients.length;
    };

    self.updatePatientList = function (patientList) {
        self.activePatients = patientList.map(mapPatient);
        self.searchResults = self.activePatients;
    };

    self.updateSearchResults = function (patientList) {
        self.updatePatientList(patientList);
        if (self.activePatients.length === 0 && self.searchParameter != '') {
            self.noResultsMessage = "No results found";
        } else {
            self.noResultsMessage = null;
        }
    };

    self.hasSingleActivePatient = function () {
        return self.activePatients.length === 1;
    };

    self.filterPatients = function (matchingCriteria) {
        matchingCriteria = matchingCriteria ? matchingCriteria : matchesNameOrId;
        self.searchResults = self.searchParameter ? self.activePatients.filter(matchingCriteria) : self.activePatients;
    };

    self.filterPatientsByIdentifier = function () {
        self.filterPatients(matchesId);
    };

    self.isSelectedSearch = function (searchType) {
        return self.searchType && self.searchType.id == searchType.id;
    };

    self.isCurrentSearchLookUp = function () {
        return self.searchType && self.searchType.handler;
    };

    self.isTileView = function () {
        return self.searchType && self.searchType.view === Bahmni.Common.PatientSearch.Constants.searchExtensionTileViewType;
    };

    self.isTabularView = function () {
        return self.searchType && self.searchType.view === Bahmni.Common.PatientSearch.Constants.searchExtensionTabularViewType;
    };

    self.showPatientCountOnSearchParameter = function (searchType) {
        return showPatientCount(searchType) && self.searchParameter;
    };

    function mapPatient(patient) {
        patient.name = patient.name || (patient.givenName + ' ' + patient.familyName);
        patient.display = patient.identifier + " - " + patient.name;
        patient.image = Bahmni.Common.Constants.patientImageUrlByPatientUuid + patient.uuid;
        return patient;
    }

    var matchesNameOrId = function (patient) {
        return patient.display.toLowerCase().indexOf(self.searchParameter.toLowerCase()) !== -1;
    };

    var matchesId = function (patient) {
        return patient.identifier.toLowerCase().indexOf(self.searchParameter.toLowerCase()) !== -1;
    };

    var showPatientCount = function (searchType) {
        return self.isSelectedSearch(searchType) && self.isCurrentSearchLookUp();
    };
};
