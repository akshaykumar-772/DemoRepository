var app = angular.module('traceabilityApp', ['TraceabilityService']);
app.controller('traceabilityController', ['$scope', '$http', 'traceabilityService', 
	function($scope, $http, traceabilityService) {

	$scope.resetView = function() {
		$scope.isOverall = false;
		$scope.isWorkItem = false;
		$scope.isCommit = false;
		$scope.isBuild = false;
		$scope.isRelease = false;
		$scope.isTest = false;
		$scope.isArtifact = false;
	};

	$scope.reset = function() {
		$scope.linkedWorkItemIds = [];
		$scope.commitDetails = [];
		$scope.finalCommitDetails = [];
		$scope.linkedBuildIds = [];
		$scope.linkedReleaseIds = []
		$scope.finalWorkItemCount = 0;
		$scope.finalWorkItemData = [];
		$scope.finalCommitCount = 0;
		$scope.finalCommitData = [];
		$scope.finalBuildCount = 0;
		$scope.finalBuildData = [];
		$scope.finalReleaseCount = 0;
		$scope.finalReleaseData = [];
		$scope.finalTestCount = 0;
		$scope.finalTestData = [];
		$scope.finalArtifactCount = 0;
		$scope.finalArtifactData = [];
		$scope.isDataAvailable = '';
		$scope.resetView();
	}

	$scope.reset();

	$scope.toolsList = [
        {
            toolName: "Azure Board",
            fields: ["WorkItemId"]
        },
        {
            toolName: "Azure Repo",
            fields: ["CommitId", "Author Name"]
        },
        {
            toolName: "Azure Pipeline Build",
            fields: ["BuildId", "Pipeline Name"]
        },
        {
            toolName: "Azure Pipeline Release",
            fields: ["ReleaseId"]
        },
        {
            toolName: "Azure Tests",
            fields: []
        },
        {
            toolName: "Azure Artifacts",
            fields: []
        }
    ];

	$scope.findTraceability = function() {
        $scope.reset();
		$scope.toolName =  $scope.toolsList[$scope.toolIndex].toolName;
		$scope.isOverall = true;
		$scope.isDataAvailable = 'A';

        // if selected toolname is Azure Board.
        if($scope.toolName == "Azure Board") {
			if($scope.fieldName == "WorkItemId") {
				var workItemIds = [(parseInt($scope.fieldValue))];
				traceabilityService.getWorkItems($scope.url, $scope.authHeader, workItemIds).then(function(response) {
					$scope.workItems = response.data.value;

					for (var item = 0; item < $scope.workItems.length; item++) {
						$scope.finalWorkItemCount++;
						$scope.finalWorkItemData.push($scope.workItems[item]);
						
						angular.forEach($scope.workItems[item].relations, function(relation, key){
							var url = relation.url;
							
							//Checking linked work items
							if (relation.rel.includes("System.LinkTypes")) {
								var lastIndex = url.lastIndexOf("/") + 1;
								var workItemId = parseInt(url.substring(lastIndex, url.length));
								$scope.linkedWorkItemIds.push(workItemId);
							}
							// Checking linked commits 
							else if (url.includes("vstfs:///Git/Commit")) {
								var lowerCaseUrl = url.toLowerCase();
								var startIndex 	 = lowerCaseUrl.indexOf("%2f") + 3;
								var lastIndex 	 = lowerCaseUrl.lastIndexOf("%2f");
								var repositoryId = url.substring(startIndex, lastIndex);
								var commitId 	 = url.substring(lastIndex + 3, url.length);
								$scope.commitDetails.push(
									{"repositoryId" : repositoryId,"commitId":commitId}
								);
							}
							// Checking linked builds
							else if(url.includes("vstfs:///Build/Build")) {
								var lastIndex = url.lastIndexOf("/") + 1;
								var buildId = parseInt(url.substring(lastIndex, url.length));
								$scope.linkedBuildIds.push(buildId);
							}
							// Checking linked releases
							else if(url.includes("vstfs:///ReleaseManagement")) {
								var index = url.split(':', 2).join(':').length + 1;
								var lastIndex = url.lastIndexOf(":");
								var releaseId = parseInt(url.substring(index, lastIndex));
								$scope.linkedReleaseIds.push(releaseId);
							}
						})
					}

					// Creating map of repository and their commmit ids to optimise rest call.
					angular.forEach($scope.commitDetails, function(c, key) {
						var count = 0;
						for(var i = 0; i < $scope.finalCommitDetails.length; i++) {
							if(c.repositoryId == $scope.finalCommitDetails[i].repositoryId) {
								$scope.finalCommitDetails[i].commitIds.push(c.commitId);
								count = 1;
								break;
							}
						}
						if(count == 0) {
							$scope.finalCommitDetails.push(
								{"repositoryId": c.repositoryId,"commitIds": [c.commitId]});
						}
					});
					
					$scope.fetchData();
				},function(error){
					console.log(error);
				});
			}
		}
	};

	// fetch the final data.
	$scope.fetchData = function() {
		var count = 0;
		angular.forEach($scope.finalCommitDetails, function(detail, key) {
			traceabilityService.getRepo($scope.url, $scope.authHeader, detail.repositoryId).then(function(response) {
				$scope.finalCommitDetails[count].repositoryName = response.data.name;
				if(count == ($scope.finalCommitDetails.length-1)) {
					$scope.findInterlinkedWorkItems($scope.linkedWorkItemIds);
					$scope.getCommitsUsingRepoAndCommitId($scope.finalCommitDetails);
					$scope.getBuildsUsingBuildIds($scope.linkedBuildIds);
					$scope.getReleasesUsingReleaseIds($scope.linkedReleaseIds);
				}
				count++;
			}, function(error) {
				console.log(error);
			});

		})

	}

	/**
	 * This function will fetch linked work items.
	 * 
	 *	linkedWorkItemsIds		list of work item ids
	 */
	$scope.findInterlinkedWorkItems = function(linkedWorkItemIds) {
		traceabilityService.getWorkItems($scope.url, $scope.authHeader, linkedWorkItemIds)
			.then(function(wiResponse) {
				angular.forEach(wiResponse.data.value, function(wi, key) {
					$scope.finalWorkItemCount++;
					$scope.finalWorkItemData.push(wi);
				});
		}, function(error) {
			console.log(error);
		});
	};

	/**
	 * This function will fetch commits 
	 * 
	 *	commitDetails		list of commit and repo ids
	 */
	$scope.getCommitsUsingRepoAndCommitId = function(commitDetails) {
		var count = 0;
		for(var c = 0; c < commitDetails.length; c++) {
			traceabilityService.getCommits($scope.url, $scope.authHeader,commitDetails[c])
			.then(function(response) {
				$scope.finalCommitCount = $scope.finalCommitCount + response.data.count;
				angular.forEach(response.data.value, function(commit, key) {
					commit.repositoryName = commitDetails[count].repositoryName;
					$scope.finalCommitData.push(commit);
				});
				count++;
			},function(error){
				console.log(error);
			});
		}
		console.log($scope.finalCommitData);
	}

	/**
	 * This function will fetch builds 
	 * 
	 *	buildIds		list of build ids
	 */
	$scope.getBuildsUsingBuildIds = function(buildIds) {
		traceabilityService.getBuilds($scope.url, $scope.authHeader, buildIds).then(function(response) {
			$scope.finalBuildCount = response.data.count;
			$scope.finalBuildData = response.data.value;
		},function(error){
			console.log(error);
		});
	}

	/**
	 * This function will fetch releases 
	 * 
	 *	releaseIds		list of release ids
	 */
	$scope.getReleasesUsingReleaseIds = function(releaseIds) {
		traceabilityService.getReleasesUsingReleaseIds($scope.vsrmUrl, $scope.accessToken, releaseIds)
		.then(function(response) {
			$scope.finalReleaseCount = response.data.count;
			angular.forEach(response.data.value, function(rel, key) {
				angular.forEach(rel.artifacts, function(artifact, key2) {
					if(artifact.type == 'Build')
						rel.buildId = artifact.definitionReference.version.id;
				})
				$scope.finalReleaseData.push(rel);
			})
		}, function(error) {
			console.log(error);
		});
	}

	// This function will change the view.
	$scope.changeView = function(view) {
		$scope.resetView();
		switch(view) {
			case 0:
				$scope.isOverall = true;
				break;
			case 1:
				$scope.isWorkItem = true;
				break;
			case 2:
				$scope.isCommit = true;
				break;
			case 3:
				$scope.isBuild = true;
				break;
			case 4:
				$scope.isRelease = true;
				break;
			case 5:
				$scope.isTest = false;
				break;
			case 6:
				$scope.isArtifact = false;
				break;
		}
	}

	VSS.init({                        
		explicitNotifyLoaded: true,
		usePlatformStyles: true
	});

	VSS.require(["TFS/Dashboards/WidgetHelpers", "VSS/Authentication/Services"],
	function (WidgetHelpers, VSS_Auth_Service) {
		WidgetHelpers.IncludeWidgetStyles();
        
        var getResult = function(widgetSettings) {
			VSS.getAccessToken().then(function(token) {
				$scope.accessToken = token.token;
				$scope.authHeader = VSS_Auth_Service.authTokenManager.getAuthorizationHeader(token);
			});

			$scope.projectId = VSS.getWebContext().project.id;
            $scope.orgName = VSS.getWebContext().collection.name;
            $scope.url = "https://dev.azure.com/" + $scope.orgName + "/" + $scope.projectId + "/_apis/";
			$scope.vsrmUrl = "https://vsrm.dev.azure.com/" + $scope.orgName + "/" + $scope.projectId + "/_apis/";
			return WidgetHelpers.WidgetStatusHelper.Success();
		}

		VSS.register("TraceabilityView", function(){
			return {
				load: function (widgetSettings) {
					return getResult(widgetSettings);
				}
			}
		});
		VSS.notifyLoadSucceeded();
	});
}]);