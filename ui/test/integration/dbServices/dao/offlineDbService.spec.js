'use strict';

describe('OfflineDbService ', function () {
    var offlineDbService, $q = Q;
    var patientDbService, patientIdentifierDbService, patientAddressDbService, patientAttributeDbService, offlineMarkerDbService, offlineAddressHierarchyDbService,
        offlineConfigDbService, initializeOfflineSchema, referenceDataDbService, locationDbService, offlineSearchDbService, encounterDbService, visitDbService, observationDbService, conceptDbService, errorLogDbService, eventLogService;

    beforeEach(function () {
        module('bahmni.common.offline');
        module(function ($provide) {
            patientDbService = jasmine.createSpyObj('patientDbService', ['getPatientByUuid', 'insertPatientData']);
            patientIdentifierDbService = jasmine.createSpyObj('patientIdentifierDbService', ['insertPatientIdentifiers']);
            patientAddressDbService = jasmine.createSpyObj('patientAddressDbService', ['insertAddress']);
            patientAttributeDbService = jasmine.createSpyObj('patientAttributeDbService', ['insertAttributes', 'getAttributeTypes']);
            offlineMarkerDbService = jasmine.createSpyObj('offlineMarkerDbService', ['init', 'getMarker', 'insertMarker']);
            offlineAddressHierarchyDbService = jasmine.createSpyObj('offlineAddressHierarchyDbService', ['init', 'insertAddressHierarchy', 'search']);
            offlineConfigDbService = jasmine.createSpyObj('offlineConfigDbService', ['init', 'getConfig', 'insertConfig']);
            initializeOfflineSchema = jasmine.createSpyObj('initializeOfflineSchema', ['initSchema', 'reinitSchema']);
            referenceDataDbService = jasmine.createSpyObj('referenceDataDbService', ['init', 'getReferenceData', 'insertReferenceData']);
            locationDbService = jasmine.createSpyObj('locationDbService', ['getLocationByUuid']);
            offlineSearchDbService = jasmine.createSpyObj('offlineSearchDbService', ['init']);
            encounterDbService = jasmine.createSpyObj('encounterDbService', ['insertEncounterData', 'getEncountersByPatientUuid', 'findActiveEncounter', 'getEncountersByVisits', 'getEncounterByEncounterUuid']);
            visitDbService = jasmine.createSpyObj('visitDbService', ['insertVisitData', 'getVisitByUuid', 'getVisitsByPatientUuid']);
            observationDbService = jasmine.createSpyObj('observationDbService', ['insertObservationsData', 'getObservationsFor']);
            conceptDbService = jasmine.createSpyObj('conceptDbService', ['init', 'getReferenceData', 'getConceptByName', 'insertConceptAndUpdateHierarchy', 'updateChildren', 'updateParentJson', 'getAllParentsInHierarchy']);
            errorLogDbService = jasmine.createSpyObj('errorLogDbService', ['insertLog', 'getErrorLogByUuid', 'deleteByUuid']);
            eventLogService = jasmine.createSpyObj('eventLogService', ['getDataForUrl']);

            $provide.value('patientDbService', patientDbService);
            $provide.value('patientIdentifierDbService', patientIdentifierDbService);
            $provide.value('patientAddressDbService', patientAddressDbService);
            $provide.value('patientAttributeDbService', patientAttributeDbService);
            $provide.value('offlineMarkerDbService', offlineMarkerDbService);
            $provide.value('offlineAddressHierarchyDbService', offlineAddressHierarchyDbService);
            $provide.value('offlineConfigDbService', offlineConfigDbService);
            $provide.value('initializeOfflineSchema', initializeOfflineSchema);
            $provide.value('referenceDataDbService', referenceDataDbService);
            $provide.value('locationDbService', locationDbService);
            $provide.value('offlineSearchDbService', offlineSearchDbService);
            $provide.value('encounterDbService', encounterDbService);
            $provide.value('visitDbService', visitDbService);
            $provide.value('observationDbService', observationDbService);
            $provide.value('conceptDbService', conceptDbService);
            $provide.value('errorLogDbService', errorLogDbService);
            $provide.value('eventLogService', eventLogService);
            $provide.value('$q', $q);
        });
    });

    
    beforeEach(inject(['offlineDbService', function (offlineDbServiceInjected) {
        offlineDbService = offlineDbServiceInjected;
    }]));

    it("should init offlineDbService with db reference", function (done) {
        var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
        schemaBuilder.connect().then(function (db) {
            offlineDbService.init(db);

            expect(offlineMarkerDbService.init).toHaveBeenCalledWith(db);
            expect(offlineAddressHierarchyDbService.init).toHaveBeenCalledWith(db);
            expect(offlineConfigDbService.init).toHaveBeenCalledWith(db);
            expect(referenceDataDbService.init).toHaveBeenCalledWith(db);
            expect(offlineSearchDbService.init).toHaveBeenCalledWith(db);
            expect(conceptDbService.init).toHaveBeenCalledWith(db);
            done();
        });
    });


    describe("encounterDbService ", function () {
        it("should getActiveEncounter with given params", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var encounterSessionDuration = 60;
                var defaultEncounterType = "FIELD";
                referenceDataDbService.getReferenceData.and.callFake(function (referenceData) {
                    if (referenceData == "encounterSessionDuration") {
                        return specUtil.respondWithPromise($q, {data: encounterSessionDuration});
                    }
                    if (referenceData == "DefaultEncounterType") {
                        return specUtil.respondWithPromise($q, {data: defaultEncounterType});
                    }
                    return null;
                });

                encounterDbService.findActiveEncounter.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve(["Active Encounter1", "Active Encounter2"]);
                    return deferred1.promise;
                });

                var params = {patientUuid: "patientUuid", providerUuids: ["providerUuid"]}

                offlineDbService.getActiveEncounter(params).then(function (activeEncounters) {
                    expect(activeEncounters).not.toBeUndefined();
                    expect(activeEncounters.length).toBe(2);
                    expect(activeEncounters[0]).toBe("Active Encounter1");
                    expect(activeEncounters[1]).toBe("Active Encounter2");

                    expect(referenceDataDbService.getReferenceData).toHaveBeenCalledWith('encounterSessionDuration');
                    expect(referenceDataDbService.getReferenceData).toHaveBeenCalledWith('DefaultEncounterType');
                    expect(encounterDbService.findActiveEncounter).toHaveBeenCalledWith(db, {
                        patientUuid: params.patientUuid,
                        providerUuid: params.providerUuids[0],
                        encounterType: defaultEncounterType
                    }, encounterSessionDuration);
                    done();
                });
            });
        });

        it("should insertEncounterData with given encounterData and should not save observations in observationDb, if observations are not present in the encounterData", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var encounterData = {patientUuid: "patientUuid", visitUuid: "visitUuid"};
                encounterDbService.insertEncounterData.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve(encounterData);
                    return deferred1.promise;
                });

                offlineDbService.insertEncounterData(encounterData).then(function (encounterDataResponse) {
                    expect(encounterDataResponse).not.toBeUndefined();
                    expect(encounterDataResponse).toBe(encounterData);
                    expect(encounterDbService.insertEncounterData).toHaveBeenCalledWith(db, encounterData);
                    expect(observationDbService.insertObservationsData.calls.count()).toBe(0);
                    done();
                });
            });
        });

        it("should insertEncounterData with given encounterData", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var encounterData = {
                    patientUuid: "patientUuid",
                    visitUuid: "visitUuid",
                    observations: ["obs1", "obs2"]
                };
                encounterDbService.insertEncounterData.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve(encounterData);
                    return deferred1.promise;
                });

                observationDbService.insertObservationsData.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve(encounterData);
                    return deferred1.promise;
                });

                offlineDbService.insertEncounterData(encounterData).then(function (encounterDataResponse) {
                    expect(encounterDataResponse).not.toBeUndefined();
                    expect(encounterDataResponse).toBe(encounterData);
                    expect(encounterDbService.insertEncounterData).toHaveBeenCalledWith(db, encounterData);
                    expect(observationDbService.insertObservationsData).toHaveBeenCalledWith(db, encounterData.patientUuid, encounterData.visitUuid, encounterData.observations);
                    done();
                });
            });
        });

        it("should createEncounter with given encounterData having visitUuid", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var encounterData = {
                    patientUuid: "patientUuid",
                    visitUuid: "visitUuid",
                    observations: ["obs1", "obs2"]
                };
                encounterDbService.insertEncounterData.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve(encounterData);
                    return deferred1.promise;
                });

                observationDbService.insertObservationsData.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve(encounterData);
                    return deferred1.promise;
                });

                eventLogService.getDataForUrl.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve({data: "visitData"});
                    return deferred1.promise;
                });

                visitDbService.insertVisitData.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve({});
                    return deferred1.promise;
                });

                offlineDbService.createEncounter(encounterData).then(function (encounterDataResponse) {
                    expect(encounterDataResponse).not.toBeUndefined();
                    expect(encounterDataResponse.data).toBe(encounterData);
                    expect(encounterDbService.insertEncounterData).toHaveBeenCalledWith(db, encounterData);
                    expect(observationDbService.insertObservationsData).toHaveBeenCalledWith(db, encounterData.patientUuid, encounterData.visitUuid, encounterData.observations);
                    expect(eventLogService.getDataForUrl).toHaveBeenCalledWith(Bahmni.Common.Constants.visitUrl + "/visitUuid");
                    expect(visitDbService.insertVisitData).toHaveBeenCalledWith(db, "visitData");
                    done();
                });
            });
        });

        it("should createEncounter with given encounterData having invalid visitUuid i.e. its not associated with any data on server side", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var encounterData = {
                    patientUuid: "patientUuid",
                    visitUuid: "visitUuid",
                    observations: ["obs1", "obs2"]
                };
                encounterDbService.insertEncounterData.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve(encounterData);
                    return deferred1.promise;
                });

                observationDbService.insertObservationsData.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve(encounterData);
                    return deferred1.promise;
                });

                eventLogService.getDataForUrl.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.reject({data: "visitData"});
                    return deferred1.promise;
                });

                visitDbService.insertVisitData.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve({});
                    return deferred1.promise;
                });

                offlineDbService.createEncounter(encounterData).then(function (encounterDataResponse) {
                    expect(encounterDataResponse).not.toBeUndefined();
                    expect(encounterDataResponse.data).toBe(encounterData);
                    expect(encounterDbService.insertEncounterData).toHaveBeenCalledWith(db, encounterData);
                    expect(observationDbService.insertObservationsData).toHaveBeenCalledWith(db, encounterData.patientUuid, encounterData.visitUuid, encounterData.observations);
                    expect(eventLogService.getDataForUrl).toHaveBeenCalledWith(Bahmni.Common.Constants.visitUrl + "/visitUuid");
                    expect(visitDbService.insertVisitData.calls.count()).toBe(0);
                    done();
                });
            });
        });

        it("should createEncounter with given encounterData having no visitUuid", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var encounterData = {patientUuid: "patientUuid", observations: ["obs1", "obs2"]};
                encounterDbService.insertEncounterData.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve(encounterData);
                    return deferred1.promise;
                });

                observationDbService.insertObservationsData.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve(encounterData);
                    return deferred1.promise;
                });

                offlineDbService.createEncounter(encounterData).then(function (encounterDataResponse) {
                    expect(encounterDataResponse).not.toBeUndefined();
                    expect(encounterDataResponse.data).toBe(encounterData);
                    expect(encounterDbService.insertEncounterData).toHaveBeenCalledWith(db, encounterData);
                    expect(observationDbService.insertObservationsData).toHaveBeenCalledWith(db, encounterData.patientUuid, encounterData.visitUuid, encounterData.observations);
                    expect(eventLogService.getDataForUrl.calls.count()).toBe(0);
                    expect(visitDbService.insertVisitData.calls.count()).toBe(0);
                    done();
                });
            });
        });
    });


    describe("patientDbService ", function () {
        it("should call getPatientByUuid with given uuid", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.getPatientByUuid("patientUuid");
                expect(patientDbService.getPatientByUuid).toHaveBeenCalledWith(db, "patientUuid");
                done();
            });
        });

        it("should call getPatientByUuid with given uuid and then map the patient data for post request", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);

            patientDbService.getPatientByUuid.and.callFake(function () {
                var deferred1 = $q.defer();
                var patientData = {
                    patient: {
                        uuid: "patientUuid",
                        identifiers: [{
                            "location": null,
                            "resourceVersion": "1.8",
                            "voided": false,
                            "uuid": "ed2e9b46-dc64-4859-aa5d-dc6ebef2621a",
                            "preferred": true,
                            "identifierType": {
                                "display": "Patient Identifier",
                                "uuid": "7676e94e-796e-11e5-a6d0-005056b07f03",
                                "identifierSources": [{"prefix": "BDH", "uuid": "sourceUuid"}]
                            },
                            "identifier": "BDH201934"
                        }]
                    }
                };
                deferred1.resolve(patientData);
                return deferred1.promise;
            });

            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.getPatientByUuidForPost("patientUuid").then(function (mappedPatientDataForPostRequest) {
                    expect(mappedPatientDataForPostRequest.patient.identifiers[0].identifier).toBe("BDH201934");
                    expect(mappedPatientDataForPostRequest.patient.identifiers[0].identifierType).toBe("7676e94e-796e-11e5-a6d0-005056b07f03");
                    expect(mappedPatientDataForPostRequest.patient.identifiers[0].identifierPrefix).toBe("BDH");
                    expect(mappedPatientDataForPostRequest.patient.identifiers[0].identifierSourceUuid).toBe("sourceUuid");
                    expect(patientDbService.getPatientByUuid).toHaveBeenCalledWith(db, "patientUuid");
                    done();
                });
            });
        });

        it("should call createPatient with given patientData", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var patientData = {
                    name: "patient",
                    patient: {
                        uuid: "personUuid",
                        person: {attributes: "attributes", addresses: ["addresses1", "addresses2"]}
                    }
                };

                patientDbService.insertPatientData.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve("patientUuid");
                    return deferred1.promise;
                });

                patientDbService.getPatientByUuid.and.callFake(function () {
                    var deferred1 = $q.defer();
                    deferred1.resolve({patient: "patientInfo"});
                    return deferred1.promise;
                });

                offlineDbService.createPatient(patientData).then(function (patientInfoResponse) {
                    expect(patientInfoResponse).not.toBeUndefined();
                    expect(patientInfoResponse).toEqual({data: {patient: "patientInfo"}});
                    expect(patientAttributeDbService.insertAttributes).toHaveBeenCalledWith(db, "patientUuid", "attributes");
                    expect(patientAddressDbService.insertAddress).toHaveBeenCalledWith(db, "patientUuid", "addresses1");
                    done();
                });
            });
        });
    });


    describe("errorLogDbService ", function () {

        beforeEach( function(){

            errorLogDbService.insertLog.and.callFake(function () {
                var deferred1 = $q.defer();
                deferred1.resolve("errorUuid");
                return deferred1.promise;
            });
        });

        it("should call insertLog with providers, if providers available", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var requestPayload = {providers: [{display: 'armanvuiyan', uuid: 'providerUuid'}]};
                offlineDbService.insertLog('someUuid','failedRequestUrl', 500, 'stackTrace', requestPayload);
                expect(errorLogDbService.insertLog.calls.count()).toBe(1);
                expect(errorLogDbService.insertLog).toHaveBeenCalledWith(db,'someUuid', 'failedRequestUrl', 500, 'stackTrace', requestPayload, requestPayload.providers[0]);
                done();
            });
        });

        it("should call insertLog with creator, if auditInfo.creator available", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var auditInfo = {creator: {display: 'armanvuiyan', uuid: 'providerUuid'}};
                var requestPayload = {patient: "patientPostData", auditInfo: auditInfo};
                offlineDbService.insertLog('someUuid','failedRequestUrl', 500, 'stackTrace', requestPayload);
                expect(errorLogDbService.insertLog.calls.count()).toBe(1);
                expect(errorLogDbService.insertLog).toHaveBeenCalledWith(db, 'someUuid','failedRequestUrl', 500, 'stackTrace', requestPayload, auditInfo.creator);
                done()
            });
        });

        it("should call insertLog with empty string for provider, if either of auditInfo.creator, providers is not available", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var requestPayload = {patient: "patientPostData"};
                offlineDbService.insertLog('someUuid','failedRequestUrl', 500, 'stackTrace', requestPayload);
                expect(errorLogDbService.insertLog.calls.count()).toBe(1);
                expect(errorLogDbService.insertLog).toHaveBeenCalledWith(db, 'someUuid', 'failedRequestUrl', 500, 'stackTrace', requestPayload, "");
                done()
            });
        });

        it("should call insertLog with empty string for requestPayload, if requestPayload is not available", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.insertLog('someUuid', 'failedRequestUrl', 500, 'stackTrace');
                expect(errorLogDbService.insertLog.calls.count()).toBe(1);
                expect(errorLogDbService.insertLog).toHaveBeenCalledWith(db, 'someUuid', 'failedRequestUrl', 500, 'stackTrace', "", "");
                done()
            });
        });

        it("should call getErrorLogByUuid with given db and uuid and give the log accordingly", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var providers = [{display: 'armanvuiyan', uuid: 'providerUuid'}];
                var requestPayload = {patient: "patientPostData", providers: providers};
                offlineDbService.insertLog('someUuid', 'failedRequestUrl', 500, 'stackTrace', requestPayload);
                expect(errorLogDbService.insertLog).toHaveBeenCalledWith(db, 'someUuid', 'failedRequestUrl', 500, 'stackTrace', requestPayload, providers[0]);
                offlineDbService.getErrorLogByUuid("someUuid");
                expect(errorLogDbService.getErrorLogByUuid.calls.count()).toBe(1);
                expect(errorLogDbService.getErrorLogByUuid).toHaveBeenCalledWith(db,"someUuid");
                done();
            });
        });

        it("should call deleteErrorFromErrorLog with given db and uuid to delete log from errorLog table", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var providers = [{display: 'armanvuiyan', uuid: 'providerUuid'}];
                var requestPayload = {patient: "patientPostData", providers: providers};
                offlineDbService.insertLog('someUuid', 'failedRequestUrl', 500, 'stackTrace', requestPayload);
                expect(errorLogDbService.insertLog).toHaveBeenCalledWith(db, 'someUuid', 'failedRequestUrl', 500, 'stackTrace', requestPayload, providers[0]);
                offlineDbService.deleteErrorFromErrorLog("someUuid");
                expect(errorLogDbService.deleteByUuid.calls.count()).toBe(1);
                expect(errorLogDbService.deleteByUuid).toHaveBeenCalledWith(db, "someUuid");
                done();
            });
        });

    });


    describe("conceptDbService", function () {
        it("should call getConcept with given conceptUuid", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.getConcept("conceptUuid");
                expect(conceptDbService.getReferenceData.calls.count()).toBe(1);
                expect(conceptDbService.getReferenceData).toHaveBeenCalledWith("conceptUuid");
                done();
            });
        });

        it("should call getConceptByName with given conceptName", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.getConceptByName("paracetamol");
                expect(conceptDbService.getConceptByName.calls.count()).toBe(1);
                expect(conceptDbService.getConceptByName).toHaveBeenCalledWith("paracetamol");
                done();
            });
        });

        it("should call insertConceptAndUpdateHierarchy with given concept data and parentConcept", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.insertConceptAndUpdateHierarchy("data", "parent");
                expect(conceptDbService.insertConceptAndUpdateHierarchy.calls.count()).toBe(1);
                expect(conceptDbService.insertConceptAndUpdateHierarchy).toHaveBeenCalledWith("data", "parent");
                done();
            });
        });

        it("should call updateChildren with given concept", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.updateChildren("concept");
                expect(conceptDbService.updateChildren.calls.count()).toBe(1);
                expect(conceptDbService.updateChildren).toHaveBeenCalledWith("concept");
                done();
            });
        });

        it("should call updateParentJson with given childConcept", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.updateParentJson("childConcept");
                expect(conceptDbService.updateParentJson.calls.count()).toBe(1);
                expect(conceptDbService.updateParentJson).toHaveBeenCalledWith("childConcept");
                done();
            });
        });

        it("should call getAllParentsInHierarchy with given concept name and empty array", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.getAllParentsInHierarchy("conceptName");
                expect(conceptDbService.getAllParentsInHierarchy.calls.count()).toBe(1);
                expect(conceptDbService.getAllParentsInHierarchy).toHaveBeenCalledWith("conceptName", []);
                done();
            });
        });
    });


    describe("visitDbService", function () {
        it("should call insertVisitData with given visitData", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.insertVisitData("visitData");
                expect(visitDbService.insertVisitData.calls.count()).toBe(1);
                expect(visitDbService.insertVisitData).toHaveBeenCalledWith(db, "visitData");
                done();
            });
        });

        it("should call getVisitByUuid with given visitUuid", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.getVisitByUuid("visitUuid");
                expect(visitDbService.getVisitByUuid.calls.count()).toBe(1);
                expect(visitDbService.getVisitByUuid).toHaveBeenCalledWith(db, "visitUuid");
                done();
            });
        });

        it("should call getVisitsByPatientUuid with given patientUuid and numberOfVisits", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                var numberOfVisits = 4;
                offlineDbService.getVisitsByPatientUuid("patientUuid", numberOfVisits);
                expect(visitDbService.getVisitsByPatientUuid.calls.count()).toBe(1);
                expect(visitDbService.getVisitsByPatientUuid).toHaveBeenCalledWith(db, "patientUuid", numberOfVisits);
                done();
            });
        });
    });


    describe("locationDbService", function () {
        it("should call getLocationByUuid with given locationUuid", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.getLocationByUuid("locationUuid");
                expect(locationDbService.getLocationByUuid.calls.count()).toBe(1);
                expect(locationDbService.getLocationByUuid).toHaveBeenCalledWith(db, "locationUuid");
                done();
            });
        });
    });


    describe("referenceDataDbService", function () {
        it("should call getReferenceData with given referenceDataKey", function () {
            offlineDbService.getReferenceData("referenceDataKey");
            expect(referenceDataDbService.getReferenceData.calls.count()).toBe(1);
            expect(referenceDataDbService.getReferenceData).toHaveBeenCalledWith("referenceDataKey");
        });

        it("should call insertReferenceData with given parameters", function () {
            offlineDbService.insertReferenceData("referenceDataKey", "data", "eTag");
            expect(referenceDataDbService.insertReferenceData.calls.count()).toBe(1);
            expect(referenceDataDbService.insertReferenceData).toHaveBeenCalledWith("referenceDataKey", "data", "eTag");

        });
    });


    describe("offlineConfigDbService", function () {
        it("should call insertConfig with given parameters", function () {
            offlineDbService.insertConfig("module", "data", "eTag");
            expect(offlineConfigDbService.insertConfig.calls.count()).toBe(1);
            expect(offlineConfigDbService.insertConfig).toHaveBeenCalledWith("module", "data", "eTag");
        });

        it("should call getConfig with given module", function () {
            offlineDbService.getConfig("module");
            expect(offlineConfigDbService.getConfig.calls.count()).toBe(1);
            expect(offlineConfigDbService.getConfig).toHaveBeenCalledWith("module");
        });
    });


    describe("offlineAddressHierarchyDbService", function () {
        it("should call insertAddressHierarchy with given data", function () {
            offlineDbService.insertAddressHierarchy("data");
            expect(offlineAddressHierarchyDbService.insertAddressHierarchy.calls.count()).toBe(1);
            expect(offlineAddressHierarchyDbService.insertAddressHierarchy).toHaveBeenCalledWith("data");
        });

        it("should call searchAddress with given paramas", function () {
            offlineDbService.searchAddress("paramas");
            expect(offlineAddressHierarchyDbService.search.calls.count()).toBe(1);
            expect(offlineAddressHierarchyDbService.search).toHaveBeenCalledWith("paramas");
        });
    });


    describe("offlineMarkerDbService", function () {
        it("should call getMarker with given markerName", function () {
            offlineDbService.getMarker("markerName");
            expect(offlineMarkerDbService.getMarker.calls.count()).toBe(1);
            expect(offlineMarkerDbService.getMarker).toHaveBeenCalledWith("markerName");
        });

        it("should call insertMarker with given markerName", function () {
            var catchmentNumber = 202020;
            offlineDbService.insertMarker("markerName", "eventUuid", catchmentNumber);
            expect(offlineMarkerDbService.insertMarker.calls.count()).toBe(1);
            expect(offlineMarkerDbService.insertMarker).toHaveBeenCalledWith("markerName", "eventUuid", catchmentNumber);
        });
    });


    describe("initializeOfflineSchema", function () {
        it("should call initSchema", function () {
            offlineDbService.initSchema();
            expect(initializeOfflineSchema.initSchema.calls.count()).toBe(1);
            expect(initializeOfflineSchema.initSchema).toHaveBeenCalled();
        });

        it("should call reinitSchema", function () {
            offlineDbService.reinitSchema();
            expect(initializeOfflineSchema.reinitSchema.calls.count()).toBe(1);
            expect(initializeOfflineSchema.reinitSchema).toHaveBeenCalled();
        });
    });


    describe("encounterDbService", function () {
        it("should call getEncounterByEncounterUuid with given encounterUuid", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.getEncounterByEncounterUuid("encounterUuid");
                expect(encounterDbService.getEncounterByEncounterUuid.calls.count()).toBe(1);
                expect(encounterDbService.getEncounterByEncounterUuid).toHaveBeenCalledWith(db, "encounterUuid");
                done();
            });
        });

        it("should call getEncountersByVisits with given params", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.getPrescribedAndActiveDrugOrders("params");
                expect(encounterDbService.getEncountersByVisits.calls.count()).toBe(1);
                expect(encounterDbService.getEncountersByVisits).toHaveBeenCalledWith(db, "params");
                done();
            });
        });

        it("should call getEncountersByPatientUuid with given patientUuid", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.getEncountersByPatientUuid("patientUuid");
                expect(encounterDbService.getEncountersByPatientUuid.calls.count()).toBe(1);
                expect(encounterDbService.getEncountersByPatientUuid).toHaveBeenCalledWith(db, "patientUuid");
                done();
            });
        });
    });


    describe("observationDbService", function () {
        it("should call getObservationsFor with given params", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.getObservationsFor("params");
                expect(observationDbService.getObservationsFor.calls.count()).toBe(1);
                expect(observationDbService.getObservationsFor).toHaveBeenCalledWith(db, "params");
                done();
            });
        });
    });


    describe("patientAttributeDbService", function () {
        it("should call getAttributeTypes with db reference", function (done) {
            var schemaBuilder = lf.schema.create('BahmniOfflineDb', 1);
            schemaBuilder.connect().then(function (db) {
                offlineDbService.init(db);

                offlineDbService.getAttributeTypes();
                expect(patientAttributeDbService.getAttributeTypes.calls.count()).toBe(1);
                expect(patientAttributeDbService.getAttributeTypes).toHaveBeenCalledWith(db);
                done();
            });
        });
    });

});