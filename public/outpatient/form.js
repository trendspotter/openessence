'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientForm', function ($http, gettextCatalog, OutpatientVisit) {
  return {
    restrict: 'E',
    template: require('./form.html'),
    transclude: true,
    scope: {
      onSubmit: '&',
      record: '=?' // to populate fields
    },
    compile: function (element, attrs) {
      var showLegend = angular.isDefined(attrs.showLegend) && attrs.showLegend !== 'false';
      return {
        pre: function (scope) {
          scope.showLegend = showLegend;
          scope.record = scope.record || {};
          // we copy b/c don't want to update the workbench before we hit save!
          scope.visit = angular.copy(scope.record._source) || {};

          scope.agePlaceholder = gettextCatalog.getString('Patient\'s age');
          scope.weightPlaceholder = gettextCatalog.getString('Patient\'s weight');
          scope.yellAtUser = false;

          // TODO get this from codex
          scope.districts = ['District 1', 'District 2', 'District 3', 'District 4', 'District 5'];
          scope.symptoms = ['Abdominal Pain', 'Cold', 'Coryza', 'Cough', 'Dehydration'].map(function (s) {
            return [{name: s, val: s}];
          });
          scope.diagnoses = ['Asthma', 'Bronchitis', 'Cholera', 'Cough', 'Dengue'].map(function (d) {
            return [{name: d, val: d}];
          });

          scope.isInvalid = function (field) {
            if (scope.yellAtUser) {
              // if the user has already tried to submit, show them all the fields they're required to submit
              return field.$invalid;
            } else {
              // only show a field's error message if the user has already interacted with it, this prevents a ton of red
              // before the user has even interacted with the form
              return field.$invalid && !field.$pristine;
            }
          };

          scope.openReportDate = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
            scope.reportDateOpened = true;
          };

          scope.warnSystolic = function (bpSystolic) {
            // 180 is "hypertensive emergency" and 90 is hypotension according to Wikipedia
            return !!bpSystolic && (bpSystolic >= 180 || bpSystolic < 90);
          };

          scope.warnDiastolic = function (bpDiastolic) {
            return !!bpDiastolic && (bpDiastolic >= 110 || bpDiastolic < 60);
          };

          scope.submit = function (visitForm) {
            if (visitForm.$invalid) {
              scope.yellAtUser = true;
              return;
            }

            var cleanup = function () {
              scope.yellAtUser = false;
              scope.success = true;
              scope.onSubmit(scope.visitForm);
            };

            if (scope.record._id || scope.record._id === 0) { // TODO move this logic to OutpatientVisit
              OutpatientVisit.update(angular.extend({_id: scope.record._id}, scope.visit), function () {
                cleanup();
              });
            } else {
              OutpatientVisit.save(scope.visit, function () {
                cleanup();
              });
            }
          };

          scope.$on('outpatientSave', function () {
            scope.submit(scope.visitForm);
          });
        }
      };
    }
  };
});
