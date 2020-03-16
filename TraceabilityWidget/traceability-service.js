var app = angular.module('TraceabilityService', []);
app.factory('traceabilityService', ['$http', function($http) {
    return {
        getRepo: function(url, authHeader, repositoryId) {
            return $http({
                method: "GET",
                url: url + "git/repositories/" + repositoryId + "?api-version=5.1",
                headers: {'Authorization': authHeader, 'Accept': 'application/json'}
            });
        },
        getWorkItems: function(url, authHeader, ids) {
            return $http({
                method: "POST",
                url: url + "wit/workitemsbatch?&api-version=5.1",
                headers: {'Authorization': authHeader, 'Accept': 'application/json','content-type': 'application/json'},
                data: { "ids": ids, "$expand": "all"}
            });
        },
        getCommits: function(url, authHeader, detail) {
            return $http({
                method: "POST",
				url: url + "git/repositories/" + detail.repositoryId + "/commitsbatch?api-version=5.1",
				headers: {'Authorization': authHeader, 'Accept': 'application/json','content-type': 'application/json'},
				data: { "ids": detail.commitIds, "includeWorkItems": true}
            });
        },
        getBuilds: function(url, authHeader, buildIds) {
            return $http({
                method: "GET",
			    url: url + "build/builds?buildIds=" + buildIds.toString() + "&api-version=5.1",
			    headers: {'Authorization': authHeader, 'Accept': 'application/json'}
            });
        },
        getReleasesUsingReleaseIds: function(vsrmUrl, authToken, releaseIds) {
            return $http({
                method: "GET",
				url: vsrmUrl + "release/releases?releaseIdFilter=" + releaseIds.toString() + "&$expand=artifacts&api-version=5.1",
				headers: {'Authorization': 'Bearer ' + authToken, 'Accept': 'application/json'}
            });
        }

    }
}]);