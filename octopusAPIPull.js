//declare variables
var apiKey = "[API-KEY]";
var octopusURL = "[Octopus-URL]";
var myHeader = new Headers({
  "X-Octopus-ApiKey": apiKey
});
var selectedProjects = [];

//DOM items
var creationButton = document.getElementById("creationBtn");
var confirmBtn = document.getElementById("confirmBtn");
var cancelBtn = document.getElementById("cancelBtn");
var closeBtn = document.getElementById("closeBtn");
var versionModal = document.getElementById("versionModal");
var projects = document.getElementById("projectGrid");
var instructions = document.getElementById("instructions");
var channelField = document.getElementById("channelField");
var versionField = document.getElementById("versionField");
var projectGrid = document.getElementById("projectGrid");
var filterBox = document.getElementById("filterBox");
var projectCount = document.getElementById("projectCount");
var topBar = document.getElementById("topBar");
var statusMessage = document.getElementById("statusMessage");
var environmentForm = document.getElementById("environmentForm");
var environmentField = document.getElementById("environmentField");
var deployBtn = document.getElementById("deployBtn");
var deployMessage = document.getElementById("deployMessage");

//the variables for each payload that we are going to be passing to the creation route:
var channelId = "";
var packageName = "";
var packageVersion = "";
var projectID = "";
var deployProjects = [];

var payload = {
  ReleaseNotes: "",
  ProjectId: "",
  ChannelId: "",
  SelectedPackages: [
    {
      StepName: "Deploy Package",
      ActionName: "Deploy Package",
      Version: "",
      PackageReferenceName: ""
    }
  ],
  Version: ""
};

function generateGrid(filterParameter) {
  var results;

  fetch(octopusURL + "/api/projects/all", {
    method: "GET",
    mode: "cors",
    headers: myHeader
  })
    .then(function(response) {
      while (projectGrid.firstElementChild) {
        projectGrid.removeChild(projectGrid.firstElementChild);
      }
      return response.json();
    })
    .then(function(myJson) {
      if (!filterParameter) {
        results = myJson;
      } else {
        let filteredJson = myJson.filter(function(r) {
          return r.Name.toUpperCase().includes(filterParameter.toUpperCase());
        });
        results = filteredJson;
      }
      for (i = 0; i < Object.keys(results).length; i++) {
        //generate the project grid
        var projectDiv = document.createElement("div");
        if (selectedProjects.includes(results[i].Id)) {
          projectDiv.innerHTML =
            '<span class="fas fa-check-square check fa-2x gray"></span>' +
            '<p style="display: inline">' +
            results[i].Name +
            "</p>";
          projectDiv.setAttribute("projectId", results[i].Id);
          projectDiv.setAttribute("clickState", 3);
          projectDiv.classList.add("projectBox");
          projectDiv.style.background = "#2f93e0";
        } else {
          projectDiv.innerHTML =
            '<span class="fas fa-square check fa-2x gray"></span>' +
            '<p style="display: inline">' +
            results[i].Name +
            "</p>";
          projectDiv.setAttribute("projectId", results[i].Id);
          projectDiv.setAttribute("clickState", 2);
          projectDiv.classList.add("projectBox");
        }
        projectDiv.onclick = selectProject;
        if (selectedProjects.includes(results[i].Id)) {
        }
        projectGrid.appendChild(projectDiv);
      }
    });
}

document.addEventListener("DOMContentLoaded", function(event) {
  generateGrid();
});

function selectProject() {
  var clickState = this.attributes[1].value;

  if (clickState % 2 === 0) {
    this.style.background = "#2f93e0";
    selectedProjects.push(this.attributes[0].value);
    this.firstChild.classList.remove("fa-square");
    this.firstChild.classList.add("fa-check-square");
  }

  if (clickState % 2 !== 0) {
    this.style.background = "#ffffff";
    this.firstChild.classList.add("fa-square");
    this.firstChild.classList.remove("fa-check-square");

    var index = selectedProjects.indexOf(this.attributes[0].value); // <-- Not supported in <IE9
    if (index !== -1) {
      selectedProjects.splice(index, 1);
    }
  }

  var newclickState = parseInt(clickState) + 1;
  this.setAttribute("clickState", newclickState);

  //dynamically enable big green button

  if (selectedProjects.length > 0) {
    creationButton.removeAttribute("disabled");
  }
  if (selectedProjects.length === 0) {
    creationButton.setAttribute("disabled", "");
  }

  console.log(selectedProjects);
  projectCount.innerText = selectedProjects.length + " Selected Projects";
}

function clearSelections() {
  selectedProjects = [];
  generateGrid();
  projectCount.innerText = "0 Selected Projects";
  creationButton.setAttribute("disabled", "");
  filterBox.value = "";
}

//after first create button is clicked

function showModal() {
  creationButton.style.display = "none";
  projects.style.display = "none";
  versionModal.style.display = "block";
  instructions.innerHTML =
    "<strong>Select your version and channel. The version rule is: Year.Month (ex. 2019.4)</strong>";
  topBar.style.display = "none";
}

function closeCreate() {
  versionModal.style.display = "none";
  projects.style.display = "grid";
  topBar.style.display = "grid";
  creationButton.style.display = "block";
  versionField.value = "";
  channelField.value = "";
  deployMessage.style.display = "none";
  confirmBtn.classList.remove("confirmBtn");
  confirmBtn.style.display = "inline-block";
  cancelBtn.style.display = "inline-block";
  closeBtn.style.display = "none";
  confirmBtn.disabled = true;
  statusMessage.innerHTML = "";
  environmentForm.style.display = "none";
  environmentField.innerText = "";
  instructions.innerHTML =
    "<strong>Select the components you would like to create releases for.</strong>";
  filterBox.value = "";
  generateGrid();
}

//after final create button is clicked

function getProjectData(projectList) {
  var apiCalls = 0;
  var responseMessage = "";
  var responseList = [];
  var successCount = 0;

  projectList.forEach(async project => {
    //get the channel
    let channelApiRoute =
      "/api/projects/" + project + "/channels?skip=0&take=2147483647";
    let channelResponse = await fetch(octopusURL + channelApiRoute, {
      method: "GET",
      mode: "cors",
      headers: myHeader
    });
    let channelObject = await channelResponse.json();
    let filteredChannel = channelObject.Items.filter(function(c) {
      return c.Name == channelField.value;
    });
    console.log(filteredChannel);
    let channel = filteredChannel[0].Id;

    //get the last package ID
    let packageLastIDApiRoute =
      "/api/deploymentprocesses/deploymentprocess-" +
      project +
      "/template?channel=" +
      channel;
    let lastPackageIDResponse = await fetch(
      octopusURL + packageLastIDApiRoute,
      { method: "GET", mode: "cors", headers: myHeader }
    );
    let lastPackageIDObject = await lastPackageIDResponse.json();
    console.log(lastPackageIDObject.Packages[0].VersionSelectedLastRelease);
    let packageVersion =
      lastPackageIDObject.Packages[0].VersionSelectedLastRelease;

    //create the release

    //check for MS
    let projectNameApiRoute = "/api/projects/" + project;
    let projectNameResponse = await fetch(octopusURL + projectNameApiRoute, {
      method: "GET",
      mode: "cors",
      headers: myHeader
    });
    let projectNameObject = await projectNameResponse.json();

    payload = {
      ReleaseNotes: "",
      ProjectId: "",
      ChannelId: "",
      SelectedPackages: [
        {
          StepName: "Deploy Package",
          ActionName: "Deploy Package",
          Version: "",
          PackageReferenceName: ""
        }
      ],
      Version: ""
    };

    payload.ProjectId = project;
    payload.ChannelId = channel;
    payload.SelectedPackages[0].Version = packageVersion;
    payload.Version = document.getElementById("versionField").value;

    console.log(payload);

    await fetch(octopusURL + "/api/releases", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "X-Octopus-ApiKey": apiKey
      }
    })
      .then(res => res.json())
      .then(response => {
        console.log("Response:", JSON.stringify(response));
        responseMessage = response;
      });

    if (responseMessage.Errors) {
      responseList.push(
        '<span class="badge badge-danger">Error</span> ' +
          projectNameObject.Name +
          ": " +
          responseMessage.Errors +
          "<br/><hr>"
      );
    } else {
      responseList.push(
        '<span class="badge badge-success">Success</span> ' +
          projectNameObject.Name +
          ": Release created successfully" +
          "<br/><hr>"
      );
      deployProjects.push(responseMessage.Id);
      successCount++;
    }

    apiCalls++;

    if (apiCalls === projectList.length) {
      console.log(deployProjects);

      statusMessage.innerHTML = responseList.join("");
      // confirmBtn.style.display = "none";
      cancelBtn.style.display = "none";
      closeBtn.style.display = "inline-block";
      if (successCount > 0) {
        environmentForm.style.display = "block";
      }
    }
  });
}

function enableCreate() {
  if (versionField.value.length > 0 && channelField.value.length > 0) {
    confirmBtn.classList.add("confirmBtn");
    confirmBtn.removeAttribute("disabled");
  } else {
    confirmBtn.classList.remove("confirmBtn");
    confirmBtn.setAttribute("disabled", "");
  }
}

//filter functionality

function filterProjects() {
  if (filterBox.value.length >= 0) {
    generateGrid(filterBox.value);
  } else {
    generateGrid();
  }
}

async function deployReleases() {
  var apiCalls = 0;

  let allEnvironmentsApiRoute = "/api/environments/all";
  let allEnvsResponse = await fetch(octopusURL + allEnvironmentsApiRoute, {
    method: "GET",
    mode: "cors",
    headers: myHeader
  });
  let allEnvsObject = await allEnvsResponse.json();
  console.log(allEnvsObject);

  let environmentForRelease = allEnvsObject.filter(function(e) {
    return e.Name == environmentField.value;
  });
  console.log(environmentForRelease);

  let environmentId = environmentForRelease[0].Id;
  console.log(environmentId);

  var deploymentPayload = {
    ReleaseId: "",
    EnvironmentId: environmentId
  };
  deployProjects.forEach(async release => {
    deploymentPayload.ReleaseId = release;
    let deploymentAPIRoute = "/api/deployments";
    let deploymentResponse = await fetch(octopusURL + deploymentAPIRoute, {
      method: "POST",
      body: JSON.stringify(deploymentPayload),
      headers: {
        "Content-Type": "application/json",
        "X-Octopus-ApiKey": apiKey
      }
    });
    let deploymentObject = await deploymentResponse.json();
    console.log(deploymentObject);
    apiCalls++;

    if (apiCalls === deployProjects.length) {
      environmentForm.style.display = "none";
      deployMessage.style.display = "block";
    }
  });
}

function enableDeployment() {
  if (environmentField.value.length > 0) {
    deployBtn.removeAttribute("disabled");
  } else {
    deployBtn.setAttribute("disabled", "");
  }
}
