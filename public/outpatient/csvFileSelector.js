'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
//var moment = require('moment');
var $ = require('jquery');
var flat = require('flat');
require('jquery-csv');

/**
 * A reusable edit form. Currently only used in the modal edit, but could be used in other places.
 */
angular.module(directives.name).directive('outpatientCsvFileSelector', /*@ngInject*/ function () {
  return {
    restrict: 'E',
    template: require('./csv-file-selector.html'),
    transclude: true,
    scope: {
      tableData: '=?',
      fileParams: '=?'
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.fileParams = scope.fileParams || {};
          scope.fileParams.delimiter = scope.fileParams.delimiter || '"';
          scope.fileParams.separator = scope.fileParams.separator || ',';
          scope.fileParams.headerRow = scope.fileParams.headerRow ? scope.fileParams.headerRow : true;
          scope.fileParams.showPreview = scope.fileParams.showPreview ? scope.fileParams.showPreview : true;

          scope.tableData = [];

          scope.onFileSelect = function ($files) {
            if (!$files || $files.length !== 1) {
              return;
            }
            $('#upload-file-info').html($files[0].name);
            // Check if file is CSV type
            if ($files[0].type !== 'application/vnd.ms-excel' && $files[0].type !== 'text/csv') {
              scope.badFile = true;
              scope.$apply(function () {
                scope.tableData = [];
              });
              return;
            }
            scope.badFile = false;
            scope.fileParams.file = $files[0];
            parseCsvFile();
          };

          var parseCsvFile = function () {
            if (!scope.fileParams.file) {
              return;
            }
            var reader = new FileReader();
            reader.readAsText(scope.fileParams.file);
            reader.onload = function (event) {
              var csv = event.target.result;
              var tableData = [];
              var columnDefs = [];

              $.csv.toArrays(csv, scope.fileParams).forEach(function (row, ix) {
                // Assumed that first row is header row.
                // if not header row
                if (ix !== 0) {
                  var obj = {};
                  row.forEach(function (v, ix) {
                    obj[columnDefs[ix].field] = v;
                  });
                  tableData.push(flat.unflatten(obj));
                } else {
                  row.forEach(function (v) {
                    columnDefs.push({field: v, width: '100'});
                  });
                }
              });

              scope.$apply(function () {
                scope.columnDefs = columnDefs;
                scope.tableData = tableData;
              });
            };
          };

          scope.columnDefs = [];
          scope.gridOptions = {
            data: 'tableData',
            enableColumnResize: true,
            multiSelect: false,
            columnDefs: 'columnDefs',
            init: function (grid, $scope) {
              setTimeout(function () {
                // rebuild grid to avoid grid width over flow while resetting columnDefs
                $scope.gridOptions.$gridServices.DomUtilityService.RebuildGrid($scope.gridOptions.$gridScope, $scope.gridOptions.ngGrid);
              }, 1000);
            }
          };

          scope.$watchCollection('[fileParams.separator, fileParams.delimiter, fileParams.headerRow]', function () {
            parseCsvFile();
          });

        }
      };
    }
  };
});