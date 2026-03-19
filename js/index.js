'use strict';


window.addEventListener("load", onAppReady, false);

window.sessionStorage.startApp = "yes";
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('mobileJobTrack-sw.js').then(function(registration) {
    console.log('Service worker registered successfully.');
	
	window.sessionStorage.startApp = "yes";

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('mobileJobTrack-sw.js').then(function(registration) {
    console.log('Service worker registered successfully.');
  });
}

/* ===== GitHub demo mode ===== */
if (location.hostname.includes('github.io')) {
  window.addEventListener('load', function () {
    const fullView = document.getElementById('fullView');
    const appView = document.getElementById('appView');
    const userName = document.getElementById('appVUserName');
    const car = document.getElementById('appVCar');
    const jobDashBtn = document.getElementById('appViewBtnJobDash');
    const jobDashFrm = document.getElementById('frmJobDash');

    if (fullView) fullView.style.display = 'none';
    if (appView) appView.style.display = 'grid';
    if (userName) userName.textContent = 'Demo User';
    if (car) car.textContent = 'Demo Vehicle';

    document.querySelectorAll('#appViewMenuCon li').forEach(li => {
      li.classList.remove('selected', 'active');
    });

    if (jobDashBtn) jobDashBtn.classList.add('selected', 'active');

    document.querySelectorAll('.appViewBody .gFrm').forEach(frm => {
      frm.style.display = 'none';
    });

    if (jobDashFrm) jobDashFrm.style.display = 'flex';
  });
}
    
    // Listen for new service worker installations
    registration.addEventListener('updatefound', function() {
      window.sessionStorage.startApp = "no";
      
      var newWorker = registration.installing; 
      newWorker.addEventListener('statechange', function() { 
        console.log(`New service worker state changed to: ${newWorker.state}`); 
        switch (newWorker.state) {
          case "activated":
              window.sessionStorage.appUpdated = "yes";
            break;
        } 
      });      
      console.log('Update found.');
    });

  }).catch(function(error) {
    console.error('Service worker registration failed:', error);
  });
}

function onAppReady() {
  let gUtils = new GlobalUtils();
  gUtils.initForms();
  gUtils.showForm("frmAppUpdate");
  if (window.sessionStorage.appUpdated) {
      window.sessionStorage.startApp = "no";
      gUtils.showInfoBox("alert", {msg:"JobTrack just got better. Update completed"});
      delete window.sessionStorage.appUpdated;
      gUtils.preLoginCheck();
  }

  setTimeout(() => {
    if (window.sessionStorage.startApp == "yes") {
        if (window.sessionStorage.appUpdated) {
          gUtils.showInfoBox("alert", {msg:"JobTrack just got better. Update completed"});
          delete window.sessionStorage.appUpdated;
        }
        gUtils.preLoginCheck();
    }
  }, 2000);    
  
}

class SmartSearch extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.timer = null;
    this.data = []; // Temporary cache
  }

  get value() { return this.shadowRoot.querySelector('input').value; }
  set value(val) { 
    this.shadowRoot.querySelector('input').value = val;
    this.toggleClearBtn(val);
  }

clear() {
    this.value = '';
    this.hideDropdown();
    this.data = []; // Clean up memory on clear
    
    // Dispatch the custom event
    this.dispatchEvent(new CustomEvent('clear', {
      detail: { timestamp: Date.now() },
      bubbles: true,
      composed: true 
    }));
  }

  connectedCallback() {
    this.render();
    this.setupEvents();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; font-family: sans-serif; position: relative; width: 100%; }
        .input-container { position: relative; display: flex; align-items: center; }
        input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        #clear-btn { position: absolute; right: 10px; cursor: pointer; color: #999; display: none; }
        .dropdown { 
          position: absolute; 
          top: 100%; 
          left: 0;
          background: white; 
          border: 1px solid #ccc; 
          width: max-content;
          min-width: 100%;
          max-width: 95vw;
          max-height: 250px; 
          white-space: nowrap;
          overflow-y: auto; 
          display: none; 
          z-index: 100;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .item { padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; }
        .item:hover { background: #f0f7ff; }
      </style>
      <div class="input-container">
        <input type="text" placeholder="${this.getAttribute('placeholder') || 'Search...'}">
        <span id="clear-btn">&times;</span>
      </div>
      <div class="dropdown"></div>
    `;
  }

  setupEvents() {
    const input = this.shadowRoot.querySelector('input');
    const clearBtn = this.shadowRoot.querySelector('#clear-btn');

    // ON FOCUS: Load and Parse data from session storage
    input.addEventListener('focus', () => {
      const key = this.getAttribute('storage-key');
      const type = this.getAttribute('storage-type');
      
      try {
          let sourceData = null;

          if (type === 'localStorage.offlineData') {
            // 1. Get the string from localStorage
            const raw = window.localStorage.getItem('offlineData');
            // 2. Parse it into an object
            sourceData = raw ? JSON.parse(raw) : {};
          } 
          else if (type === 'localStorage') {
            const raw = window.localStorage.getItem(key);
            this.data = raw ? JSON.parse(raw) : [];
            return; 
          }
          else if (type === 'sessionStorage') {
            const raw = window.sessionStorage.getItem(key);
            this.data = raw ? JSON.parse(raw) : [];
            return;
          }

          // 3. Drill down: look for 'prods' inside 'offlineData'
          if (sourceData && sourceData.hasOwnProperty(key)) {
            this.data = sourceData[key];
          } else {
            this.data = [];
          }        
      } catch (e) {
        this.data = [];
      }
    });

    // ON INPUT: Filter the local this.data
    input.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      this.toggleClearBtn(query);
      
      clearTimeout(this.timer);
      const minChars = parseInt(this.getAttribute('min-chars')) || 1;

      if (query.length < minChars) {
        this.hideDropdown();
        return;
      }

      this.timer = setTimeout(() => this.performSearch(query), 300);
    });

    clearBtn.onclick = () => this.clear();

    // ON CLICK AWAY: Hide and Wipe local data cache
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) {
        this.hideDropdown();
        this.data = []; // Garbage collection helper
      }
    });
  }

  toggleClearBtn(query) {
    this.shadowRoot.querySelector('#clear-btn').style.display = query ? 'block' : 'none';
  }

  performSearch(query) {
    const searchFields = this.getAttribute('search-fields')?.split(',') || [];
    const displayFields = this.getAttribute('display-fields')?.split(',') || [];
    const mode = this.getAttribute('search-mode') || 'fuzzy';

    const matches = this.data.filter(row => {
      return searchFields.some(field => {
        const val = String(row[field] || '').toLowerCase();
        return mode === 'exact' ? val.startsWith(query) : val.includes(query);
      });
    });

    this.renderResults(matches, displayFields);
  }

  renderResults(matches, displayFields) {
    const dropdown = this.shadowRoot.querySelector('.dropdown');
    dropdown.innerHTML = '';
    
    if (matches.length === 0) {
      dropdown.innerHTML = `<div style="padding:10px;color:#999">No matches</div>`;
    } else {
      matches.forEach(row => {
        const div = document.createElement('div');
        div.className = 'item';
        div.textContent = displayFields.map(f => row[f]).join(' | ');
        div.onclick = () => {
          this.value = div.textContent;
          this.hideDropdown();
          this.dispatchEvent(new CustomEvent('selection', { detail: row }));
        };
        dropdown.appendChild(div);
      });
    }
    dropdown.style.display = 'block';
  }

  hideDropdown() {
    this.shadowRoot.querySelector('.dropdown').style.display = 'none';
  }
}
customElements.define('smart-search', SmartSearch);

function GlobalUtils() {
  var thisUtils = this;
  var toolTipTimer;
  var placeAPISession;

  this.initForm = function() {
    window.sessionStorage.removeItem("curFloatFrm");
    window.sessionStorage.removeItem("curFrmName");
    document.getElementById("dataListCon").style.display = "none";
    thisUtils.setListeners();
  };
  this.setListeners = function() {
    var elm;

    elm = document.querySelectorAll(".gjs_textareaCon");
    for (const con of elm) {
        let input = con.querySelector("textarea");
        let count = con.querySelector("span");
        input.value = "";
        count.innerText = `0/${input.dataset.maxlength}`;
        input.oninput = function () {
            input.style.height = 'auto';
            input.style.height = (input.scrollHeight) + 'px';
            let chr = input.value.length;
            let max = input.dataset.maxlength;
            if (chr <= max) {
                count.innerText = `${chr}/${max}`;
            }else{
                input.value = input.value.slice(0, -1);
            }
        };
    }
  };
  this.initForms = function() {
    let uKey = Object.keys(window);
    let fUtils;
    for (const key of uKey) {
        if (key.slice(-5) == "Utils") {
            fUtils = new window[key]();
            if (fUtils.hasOwnProperty("initForm")) {
                fUtils.initForm();
            }
        }
    }
  };

  this.setUser = function (res) {
      if (res.hasOwnProperty("deviceToken")) {
        let db =  new IndexDB("jobTrackDB");
        db.put({storeName:"tokens", data:{key:"deviceToken", token:res.deviceToken}}).then((res) => {
        }).catch((res) => {
            console.log(res);
        });
        const parts = res.deviceToken.split(/\./g);
        const data = atob(parts[0]);
        const user = JSON.parse(data);
        document.getElementById("appVUserName").innerText = user.empName;
        document.getElementById("appVCar").innerText = user.vehicleName;
        document.getElementById("appViewBtnJobDash").onclick();
      }            

  }

  this.showForm = function(frmName, param) {
    var runDisplay = true;
    var float = false;
    if (param) {
      if (param.hasOwnProperty("runDisplay")) {
        runDisplay = param.runDisplay;
      }
      if (param.hasOwnProperty("float")) {
        float = param.float;
      }
    }
    var open = false;
    if ((float) || (window.sessionStorage.curFloatFrm != undefined)) {
      open = true;
    } else {
      var oldForm = document.getElementById(window.sessionStorage.curFrmName);
      if ((oldForm != undefined) && (float == false)) {
        var oldFormUtils = new window[oldForm.getAttribute("data-utils")]();
        thisUtils.closeToolTip();
        if (oldForm.getAttribute("data-changed") == "true") {
          thisUtils.showInfoBox("confirm", {
            "msg": "Save Changes?",
            "btn1": function() {
              oldForm.setAttribute("data-displayAfterSave", "true");
              oldFormUtils.valData();
            },
            "btn2": function() {
              oldFormUtils.clearForm();
              thisUtils.displayForm(frmName);
            }
          });
        } else {
          open = true;
        }
      } else {
        open = true;
      }
    }
    if (open) {
      thisUtils.displayForm(frmName, runDisplay, float);
    }
  };
  this.displayForm = function(frmName, runDisplay, float) {
    var newForm = document.getElementById(frmName);
    if (newForm != null) {
      var newTab = document.getElementById(newForm.getAttribute("data-tab"));
    }
    var oldForm = document.getElementById(window.sessionStorage.curFrmName);

    if ((oldForm != null) && (float == false) && (window.sessionStorage.curFloatFrm == undefined)) {

      var oldTab = document.getElementById(oldForm.getAttribute("data-tab"));

      if (oldForm.getAttribute("data-parents")) {
        var pForms = JSON.parse(oldForm.getAttribute("data-parents"));
        for (var i = 0; i < pForms.length; i++) {
          var pForm = document.getElementById(pForms[i]);
          var pTab = document.getElementById(pForm.getAttribute("data-tab"));
          pForm.style.display = "none";
          if (pTab) {
            pTab.classList.remove("gTabSelected");
          }
        }
      }
    }
    console.log(newForm);
    if ((newForm != null) && (float == false) && (window.sessionStorage.curFloatFrm == undefined)) {
      if (newForm.getAttribute("data-parents")) {
        var pForms = JSON.parse(newForm.getAttribute("data-parents"));
        for (var i = 0; i < pForms.length; i++) {
          var pForm = document.getElementById(pForms[i]);
          var pTab = document.getElementById(pForms[i]).getAttribute("data-tab");
          if (pForm.getAttribute("data-utils") != undefined) {
            var pFormUtils = new window[pForm.getAttribute("data-utils")]();
            if (pFormUtils.hasOwnProperty("display")) {
              pFormUtils.display();
            }
          }
          if (pForm.hasAttribute("data-display")) {
              pForm.style.display = pForm.getAttribute("data-display");
          }else{
              pForm.style.display = "block";
          }

          if (pTab) {
            pTab.classList.add("gTabSelected");
          }
        }
      }

    } else {
      if (newForm == null) {
        var webView = document.getElementById("webView");
        webView.style.display = "flex";
        window.sessionStorage.removeItem("curFrmName");
      }
    }

    if ((oldForm) && (float == false)) {
      oldForm.style.display = "none";
      if (oldTab) {
        oldTab.classList.remove("gTabSelected");
      }
    }
    if (newTab) {
      newTab.classList.add("gTabSelected");
    }

    if (newForm != null) {
      var formUtils = new window[newForm.getAttribute("data-utils")]();
      if (formUtils.hasOwnProperty("preDisplay")) {
        formUtils.preDisplay();
      }
      if (runDisplay) {
        if (formUtils.hasOwnProperty("display")) {
          formUtils.display();
        }
      }

      if (float) {
        if (window.sessionStorage.curFloatFrm != undefined) {
          var oldFloatFrm = document.getElementById(window.sessionStorage.curFloatFrm);
          oldFloatFrm.style.display = "none";
          //  oldFloatFrm.style.zIndex = "0";
        } else {
          var floatMask = document.getElementById("floatViewMask")
          floatMask.style.display = "block";

        }
        newForm.classList.add("gFloatScreen");

        if (newForm.hasAttribute("data-display")) {
            newForm.style.display = newForm.getAttribute("data-display");
        }else{
            newForm.style.display = "block";
        }

        window.sessionStorage.curFloatFrm = frmName;
      } else {
        if (window.sessionStorage.curFloatFrm != undefined) {
          var oldFloatFrm = document.getElementById(window.sessionStorage.curFloatFrm);
          var floatMask = document.getElementById("floatViewMask")
          floatMask.style.display = "none";
          oldFloatFrm.style.display = "none";
          oldFloatFrm.classList.remove("gFloatScreen");
        }
        window.sessionStorage.removeItem("curFloatFrm");
        window.sessionStorage.curFrmName = frmName;
        newForm.classList.remove("gFloatScreen");
        if (newForm.hasAttribute("data-display")) {
            newForm.style.display = newForm.getAttribute("data-display");
        }else{
            newForm.style.display = "block";
        }
      }

      if (formUtils.hasOwnProperty("postDisplay")) {
        formUtils.postDisplay();
      }
    }
  };

  this.arrToObj = function(arr, keyName) {
    let newObj = {};
    for (var i = 0; i < arr.length; i++) {
      newObj[arr[i][keyName]] = arr[i];
    }
    return newObj;
  }

  this.formatDate = function(returnType, date) {
    if (typeof(date) == "string") {
      date = new Date(date);
    }
    switch (returnType) {
      case "dateDis":
          var d = ("0" + date.getDate()).slice(-2);
          var m = ("0" + (date.getMonth() + 1)).slice(-2);
          var y = date.getFullYear();
          return d + "-" + m + "-" + y;

        break;
      case "dateStr":
          var dateStr = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2);
          return dateStr;
        break;
      case "dateTimeStr":
          var dateStr = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2) + " " + date.getHours() + ":" + ("0" + date.getMinutes()).slice(-2)+":00";
          return dateStr;
        break;
    }
  };

  this.showToolTip = function(el, tipText) {
    clearTimeout(toolTipTimer);
    var toolTip = document.getElementById("toolTip");
    toolTip.innerHTML = tipText;
    if (el != "body") {
      el.focus();
      var rect = el.getBoundingClientRect();
      toolTip.style.top = (rect.bottom + window.pageYOffset) + "px";
      toolTip.style.left = rect.left + "px";
      toolTip.style.display = "block";

      toolTipTimer = setTimeout(function() {
        toolTip.style.opacity = 0;
        setTimeout(function() {
          toolTip.style.display = "none";
          toolTip.style.opacity = 1;
        }, 500);
      }, 3000);
    } else {}
  };
  this.closeToolTip = function() {
    var toolTip = document.getElementById("toolTip");
    toolTip.style.display = "none";

  };

  this.showInfoBox = function(type, param) {
  //type = alert or error or confirm or multiConfirm
  //param = {msg=Message to display, btn1= function to run if btn1 is selected, "btn2":function to run if btn2 is selected, "btn3":function to run if btn3 is selected}
  return new Promise(function(resolve, reject) {
      var mask = thisUtils.createMask();
      var msgBox = document.getElementById("infoBox");
      var text1 = msgBox.getElementsByTagName("p")[0];
      var text2 = msgBox.getElementsByTagName("p")[1];
      var text3 = msgBox.getElementsByTagName("p")[2];
      var msgBoxHeader = msgBox.getElementsByTagName("header")[0];
      var img = msgBox.getElementsByTagName("img")[0];
      var btn1 = document.getElementById("infoBoxBtn1");
      var btn2 = document.getElementById("infoBoxBtn2");
      var btn3 = document.getElementById("infoBoxBtn3");
      var gUtils = new GlobalUtils();

      msgBox.style.display = "block";
      msgBox.style.visibility = "hidden";

      msgBox.onclick = "";
      msgBoxHeader.innerHTML = "";
      text1.innerHTML = "";
      text2.innerHTML = "";
      text3.innerHTML = "";
      msgBoxHeader.removeAttribute('style');
      text1.removeAttribute('style');
      text2.removeAttribute('style');
      text3.removeAttribute('style');
      btn1.removeAttribute('style');
      btn2.removeAttribute('style');
      btn3.removeAttribute('style');

      msgBoxHeader.style.display = "none";
      text1.style.display = "none";
      text2.style.display = "none";
      text3.style.display = "none";
      img.style.display = "none";
      btn1.style.display = "none";
      btn2.style.display = "none";
      btn3.style.display = "none";
      btn1.onclick = function () {
          thisUtils.closeInfoBox(mask);
          resolve(this.id);
      };
      btn1.innerHTML = "";
      btn2.onclick = function () {
          thisUtils.closeInfoBox(mask);
          resolve(this.id);
      };
      btn3.onclick = function () {
          thisUtils.closeInfoBox(mask);
          resolve(this.id);
      };

      mask.style.display = "block";

      if (param) {
        if (param.boxColor != undefined) {
          msgBox.style.backgroundColor = param.boxColor;
        }
        if (param.text1 != undefined) {
          text1.innerHTML = param.text1;
        }
        if (param.text2 != undefined) {
          text2.innerHTML = param.text2;
        }
        if (param.text3 != undefined) {
          text3.innerHTML = param.text3;
        }
        if (param.btn1Text != undefined) {
          btn1.innerHTML = param.btn1Text;
        }
        if (param.btn2 != undefined) {
          btn2.onclick = function() {
            thisUtils.closeInfoBox(mask);
            param.btn2();
          }
        }
        if (param.btn3 != undefined) {
          btn3.onclick = function() {
            thisUtils.closeInfoBox(mask);
            param.btn3();
          }
        }
        if (param.maskClick != undefined) {
          mask.onclick = function() {
            thisUtils.closeInfoBox(this);
            param.maskClick();
          };
        } else {
          mask.onclick = function() {
            thisUtils.closeInfoBox(this);
          };
        }

      } else {
        mask.onclick = function() {
          thisUtils.closeInfoBox(this);
        };
      }
      switch (type) {
        case "alert":
          msgBox.onclick = function() {
            thisUtils.closeInfoBox(mask);
            resolve();
          };
          text1.innerHTML = param.msg;
          text1.style.display = "block";
          btn1.innerHTML = "OK";
          btn1.style.display = "block";
          btn1.style.width = "80%";
          btn1.style.margin = "0 auto";
          btn1.style.backgroundColor = "#0e8016";
          btn1.style.display = "block";
          btn1.style.float = "none";
          break;
        case "saved":
          msgBoxHeader.innerHTML = "Saved!";
          msgBoxHeader.style.display = "block";
          img.src = "./img/icoCheck.png";
          img.style.display = "inline";
          msgBox.onclick = function() {
            thisUtils.closeInfoBox(mask);
          };
          if (btn1.innerHTML == "") {
            btn1.innerHTML = "Return to list";
          }
          btn1.style.display = "block";
          btn1.style.width = "80%";
          btn1.style.margin = "0 auto";
          btn1.style.backgroundColor = "#438945";
          btn1.style.display = "block";
          btn1.style.float = "none";
          break;
        case "deleted":
          msgBoxHeader.innerHTML = "Deleted!";
          img.src = "./img/icoCheck.png";
          img.style.display = "inline";
          msgBox.onclick = function() {
            thisUtils.closeInfoBox(mask);
          };
          btn1.innerHTML = "Return to list";
          btn1.style.display = "block";
          btn1.style.width = "80%";
          btn1.style.margin = "0 auto";
          btn1.style.backgroundColor = "#438945";
          btn1.style.display = "block";
          btn1.style.float = "none";
          break;
        case "error":
          msgBox.onclick = function() {
            thisUtils.closeInfoBox(mask);
          };
          msgBoxHeader.innerHTML = "OOPS!";
          msgBoxHeader.style.color = "#E40C2B";
          msgBoxHeader.style.display = "block";

          text1.innerHTML = param.msg;
          text1.style.display = "block";

          btn1.innerHTML = "OK";
          btn1.style.display = "block";
          btn1.style.width = "80%";
          btn1.style.margin = "0 auto";
          btn1.style.backgroundColor = "#438945";
          btn1.style.display = "block";
          btn1.style.float = "none";
          break;
        case "confirm":
          text1.innerHTML = param.msg;
          text1.style.display = "block";

          btn1.innerHTML = "YES";
          btn1.style.backgroundColor = "#438945";
          btn1.style.width = "80px";
          btn1.style.display = "inline-block";
          btn1.style.float = "left";
          btn1.style.marginLeft = "10px";

          btn2.innerHTML = "NO";
          btn2.style.backgroundColor = "#E40C2B";
          btn2.style.width = "80px";
          btn2.style.display = "inline-block";
          btn2.style.float = "right";
          btn2.style.marginRight = "10px";

          break;
        case "restart":
          mask.onclick = "";
          msgBoxHeader.innerHTML = "Restart!";
          msgBoxHeader.style.display = "block";
          text1.innerHTML = "A restart is required for update to complete.";
          text1.style.display = "block";
          if (btn1.innerHTML == "") {
            btn1.innerHTML = "Restart App";
          }
          btn1.style.display = "block";
          btn1.style.width = "80%";
          btn1.style.margin = "0 auto";
          btn1.style.backgroundColor = "#438945";
          btn1.style.display = "block";
          btn1.style.float = "none";
          break;

      }

      var rect = msgBox.getBoundingClientRect();
      msgBox.style.left = ((window.innerWidth/2) - (rect.width / 2)) + "px";
      msgBox.style.top = ((window.innerHeight/2) - (rect.height / 2)) + "px";

      msgBox.style.visibility = "visible";
  });
};
  this.closeInfoBox = function(mask) {
  var msgBox = document.getElementById("infoBox");
  var text1 = msgBox.getElementsByTagName("p")[0];
  var text2 = msgBox.getElementsByTagName("p")[1];
  msgBox.style.display = 'none';
  thisUtils.deleteMask(mask);
  text1.innerHTML = "";
  text2.innerHTML = "";
  msgBox.onclick = "";
};
  this.setInfoBoxClick = function(func) {
  var msgBox = document.getElementById("infoBox");
  msgBox.onclick = function() {
    func();
  };
};

  this.createMask = function(type) {
    var body = document.getElementsByTagName("body")[0];
    var mask = document.createElement("div");
    mask.style.height = body.clientHeight + "px";
    mask.classList.add("gMask");
    if (type == "loader") {
      var loader = document.createElement("div");
      loader.classList.add("gLoader");
      mask.appendChild(loader);
    }
    body.appendChild(mask);
    return mask;
  };
  this.deleteMask = function(mask) {
      var body = document.getElementsByTagName("body")[0];
      body.removeChild(mask);
  };

  this.getDataList = function(param) {
    //  param = {elm:"Input", utils:"Utils to call on click", func:"func to call", display=fields in data array to display, data= array, maxH:maxHeight in px}
    return new Promise(function(resolve, reject) {
      var dataCon = document.getElementById("dataListCon");
      dataCon.querySelector(".googleLogo").style.display = "none";
      var dataTbl = document.getElementById("dataList")
      var tBody = dataTbl.getElementsByTagName("tbody")[0];
      dataCon.setAttribute("data-parent", param.elm.name);
      tBody.innerHTML = "";
      if (dataCon.style.display == "none") {
        var rect = param.elm.getBoundingClientRect();
        dataTbl.setAttribute("data-parent", JSON.stringify(param.parent));

        dataCon.style.top = rect.bottom + "px";
        if (param.hasOwnProperty("width")) {
          if (param.width == "parent") {
            dataCon.style.width = rect.width + "px";
          } else {
            dataCon.style.width = param.width + "px";
          }
        }

        if (param.hasOwnProperty("align")) {
            if (param.align == 'left') {
                dataCon.style.left = rect.left + "px";
            }else {
                dataCon.style.left = (rect.right - (dataCon.style.width.slice(0, -2))) + "px";
            }
        }else{
            dataCon.style.left = rect.left + "px";
        }

        if (param.hasOwnProperty("maxH")) {
          dataCon.style.maxHeight = param.maxH;
        }
        if (param.hasOwnProperty("maxW")) {
          dataCon.style.maxWidth = param.maxW;
        }
      }
      var result = param.data;
      if ((typeof(result) == "object") && (result.length > 0)) {

        var show = param.display;
        var row, cell;
        for (var i = 0; i < result.length; i++) {
          row = tBody.insertRow();
          row.setAttribute("data-rowInfo", JSON.stringify(result[i]));
          row.onmousedown = function() {
            resolve(JSON.parse(this.getAttribute("data-rowInfo")));
          };
          cell = row.insertCell();
          var disStr = "";
          if (param.hasOwnProperty("icoImg")) {
              disStr += "<img src='" + param.icoImg + "' style='border-radius:50%; margin-right:5px'>";
          }
          for (var y = 0; y < show.length; y++) {
            if (y != 0) {
              if (show[y] == "eMail") {
                disStr += " " + result[i][show[y]].split("@")[0] + "@...";
              } else {
                disStr += " " + result[i][show[y]];
              }
            } else {
              if (show[y] == "icoImg") {
                disStr += "<img src='" + result[i][show[y]] + "' style='border-radius:50%'>";
              } else {
                disStr += result[i][show[y]];
              }

            }
          }
          cell.innerHTML = disStr;
        }

      }else {
          var row, cell, elm;
          if (param.optAddText) {
              row = tBody.insertRow();
              row.setAttribute("data-rowInfo", JSON.stringify(result[i]));
              row.onmousedown = function () {
                  resolve("addNew");
              };
              cell = row.insertCell();
              elm = document.createElement("div");
              elm.classList.add("btnAdd");
              elm.innerText = param.optAddText;
              cell.appendChild(elm);
          }
      }
      dataCon.style.display = "block";
    });
  };
  this.closeDataList = function() {
    var dataListCon = document.getElementById("dataListCon");
    dataListCon.style.display = "none";
  };

  this.getPlaces = function(param) {
    //  param = {elm:"Input", utils:"Utils to call on click", func:"func to call", country: "must search only in this country", types: "Type of reply form google"}
    var placeBoxCon = document.getElementById("dataListCon");
    placeBoxCon.querySelector(".googleLogo").style.display = "block";
    var rect = param.elm.getBoundingClientRect();
    placeBoxCon.setAttribute("data-parent", JSON.stringify(param));

    if (placeAPISession == undefined) {
      placeAPISession = new google.maps.places.AutocompleteSessionToken();
    }
    var apiParam = {};
    apiParam.input = param.elm.value;
    apiParam.sessionToken = placeAPISession;
    if (param.hasOwnProperty("types")) {
      apiParam.types = param.types;
    } else {
      apiParam.types = ["geocode"];
    }

    if (param.hasOwnProperty("country")) {
      apiParam.componentRestrictions = {
        "country": param.country
      };
    }
    var places = new google.maps.places.AutocompleteService();
    places.getPlacePredictions(apiParam, this.buildPlaces);
    placeBoxCon.style.left = rect.left + "px";
    placeBoxCon.style.top = rect.bottom + "px";
    placeBoxCon.style.width = rect.width + "px";
  };
  this.buildPlaces = function(result) {
    var placeBoxCon = document.getElementById("dataListCon");
    var dataTbl = document.getElementById("dataList");
    var tBody = dataTbl.getElementsByTagName("tbody")[0];
    tBody.innerHTML = "";
    if ((typeof(result) == "object") && (result != null)) {
      var row, cell;
      for (var i = 0; i < result.length; i++) {
        row = tBody.insertRow();
        row.setAttribute("data-rowInfo", result[i].place_id);
        row.onmousedown = function() {
          thisUtils.placeSelected(this);
        };
        cell = row.insertCell();
        cell.innerHTML = result[i].description;
      }
      placeBoxCon.style.display = "block";
    }
  };
  this.placeSelected = function(row) {
    var placesService = new google.maps.places.PlacesService(document.createElement('div'));
    var param = {};
    param.placeId = row.getAttribute("data-rowInfo");
    param.fields = ["address_components"];
    param.sessionToken = placeAPISession;
    placesService.getDetails(param, thisUtils.placesSort);
  };
  this.placesSort = function(result) {
    var placeBoxCon = document.getElementById("dataListCon");
    var placeTbl = document.getElementById("dataList");
    var parentInfo = JSON.parse(placeBoxCon.getAttribute("data-parent"));
    var fUtils = new window[parentInfo.utils]();
    if ((typeof(result) == "object") && (result != null)) {
      var add = result.address_components;
      var data = {};
      var type;
      for (var i = 0; i < add.length; i++) {
        type = add[i].types;
        if (type.includes("street_number")) {
          data.streetNo = add[i].long_name;
        } else if (type.includes("route")) {
          data.street = add[i].long_name;
        } else if (type.includes("sublocality")) {
          data.suburb = add[i].long_name;
        } else if (type.includes("locality")) {
          data.cityTown = add[i].long_name;
        } else if (type.includes("administrative_area_level_1")) {
          data.province = add[i].long_name;
        } else if (type.includes("country")) {
          data.country = add[i].long_name;
        } else if (type.includes("postal_code")) {
          data.postalCode = add[i].long_name;
        }
      }
      fUtils[parentInfo.func](data);
    }
    thisUtils.closePlaces();
    placeAPISession = undefined;
  };
  this.closePlaces = function() {
    var placeBoxCon = document.getElementById("dataListCon");
    placeBoxCon.style.display = "none";
  };

  this.resizeImg = function (param) {
      return new Promise((resolve, reject) => {
          var canvas = document.createElement("canvas");
          if (param.photo.naturalWidth <= param.photo.naturalHeight) {
              var MAX_WIDTH = param.maxH;
              var MAX_HEIGHT = param.maxW;
          }else{
              var MAX_WIDTH = param.maxW;
              var MAX_HEIGHT = param.maxH;
          }
          var imgType = (param.hasOwnProperty("imgType")) ? param.imgType : "image/jpeg";
          var imgWidth = param.photo.naturalWidth;
          var imgHeight = param.photo.naturalHeight;
          var width = imgWidth;
          var height = imgHeight;
          var scale;

          if (width > height) {
            if (width >= MAX_WIDTH) {
              scale = MAX_WIDTH / width;
              height = Math.round(height * scale);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              scale = MAX_HEIGHT / height;
              width = Math.round(width * scale);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          var ctx = canvas.getContext("2d");
          ctx.drawImage(param.photo, 0, 0, width, height);
          resolve (canvas.toDataURL(imgType, 0.8));
      });
  };

  this.getInputs = function (frm) {
      let fields = {};
      let inputs = Array.from(frm.getElementsByTagName("input"));
      let selects = Array.from(frm.getElementsByTagName("select"));
      let textareas = Array.from(frm.getElementsByTagName("textarea"));
      let allInputs = inputs.concat(selects, textareas);
      for (const item of allInputs) {
          if(!item.checkValidity()){
              thisUtils.showToolTip(item, item.validationMessage);
              return false;
          }
          switch (item.type) {
            case "checkbox":
                fields[item.name] = item.checked;
              break;
            case "date":
                fields[item.name] = (item.value != "") ? item.value : null;
              break;
            default:
                if ((item.value == "") && (item.hasAttribute("data-noValue"))) {
                    let noValue = item.getAttribute("data-noValue");
                    fields[item.name] = (noValue == "null") ? null : noValue;
                }else{
                    if (item.hasAttribute("data-autoID")) {
                        fields[item.name] = item.getAttribute("data-autoID");
                    }else{
                        fields[item.name] = item.value;
                    }

                }
          }
      }
      return fields;
  };
  this.buildInputs = function (frm, data) {
    if (frm.tagName.toLowerCase() != "form") {
      let inputObj = {};
      let inputs = Array.from(frm.getElementsByTagName("input"));
      let selects = Array.from(frm.getElementsByTagName("select"));
      let textareas = Array.from(frm.getElementsByTagName("textarea"));
      let allInputs = inputs.concat(selects, textareas);
      for (const row of allInputs) {
          inputObj[row.name] = row;
      };
      frm = inputObj;

    }

    for(let [key, value] of Object.entries(data)) {
        
        if (frm.hasOwnProperty(key)) {
            value = (value != null) ? value : "";
            switch (frm[key].type) {
              case "checkbox":
                  frm[key].checked = ((value == true) || (value == 1)) ? true : false;
                break;
              default:
                frm[key].value = value;
            }
        }
    }

  };
  this.buildSelectOption = function (param) {
    let select = param.select;
    let optText = param.optText;
    let optValue = param.optValue;
    let opt = document.createElement("option");
    opt.text = optText;
    opt.value = optValue;
    if (param.hasOwnProperty("color")) {
        opt.style.backgroundColor = param.color;
    }
    if (param.hasOwnProperty("prePend")) {
        select.prepend(opt);
    }else{
        select.add(opt);
    }
    
}

  this.clearForm = function (frm) {
      let inputs = Array.from(frm.getElementsByTagName("input"));
      let selects = Array.from(frm.getElementsByTagName("select"));
      let textareas = Array.from(frm.getElementsByTagName("textarea"));
      let allInputs = inputs.concat(selects, textareas);
      for (const row of allInputs) {
          switch (row.type) {
            case "checkbox":
                row.checked = false;
              break;
            default:
                row.value = "";
          }
      }
  };
  this.createDataList = function (listParam) {
      return new Promise(function (resolve, reject) {
          let input = listParam.input;
          let dataStr = listParam.dataStr;
          let sFields = listParam.sFields;
          let dFields = listParam.dFields;
          let optAddText = (listParam.hasOwnProperty("optAddText")) ? listParam.optAddText : false;

          input.onkeyup = function () {
              let elm = this;
              if (elm.value == "") {
                  elm.removeAttribute("data-autoID");
                  //return;
              }
              let param = {};
              param.elm = elm;
              param.width = (listParam.hasOwnProperty("width")) ? listParam.width : "parent";
              param.maxH = "50vh";
              param.optAddText = optAddText;
              var data = JSON.parse(window.sessionStorage[dataStr]);
              param.display = dFields;
              var fArray = Object.values(data).filter(function (row) {
                  let re = new RegExp(elm.value, "i");
                  for(var i = 0; i < sFields.length; i ++){
                      if(row[sFields[i]].search(re) != -1){
                          return true;
                      }
                  }
                  return false;
              });
              param.data = fArray;

              thisUtils.getDataList(param).then((result) => {
                  listParam.callback(result);
              });
          };
          input.onblur = function () {
              var elm = this;
              setTimeout(() => {
                  if (elm.value == "") {
                      elm.removeAttribute("data-autoID");
                  }
                  thisUtils.closeDataList();

              }, 20);
          };
      });
  };

  this.preLoginCheck = function() {
      const db = new IndexDB("jobTrackDB");
      db.get({storeName:"tokens", key:"deviceToken"}).then((deviceToken) => {
          window.localStorage.deviceToken = deviceToken.token;
          let header = {}, fields = {}, param = {}, db = new DataManager();
          header.name = "preLogin";
          let formData = [
              ["formData", JSON.stringify({header:header, fields:fields})],
              ["action", "getData"]
          ];
          param.formData = formData;
          param.fileName = "public.php";
          db.fetchData(param).then((res) => {
              if (res != "No") {
                  thisUtils.setUser(res);
                  window.localStorage.deviceToken = res.deviceToken;
                  thisUtils.getOfflineData();
              }else {
                  delete window.localStorage.token;
                  thisUtils.showForm("frmRegDevice");
              }
          });
      }).catch((res) => {
          thisUtils.showForm("frmRegDevice");
      });
  };
  this.getOfflineData = function () {
      let header = {}, fields = {}, param = {}, db = new DataManager();
      header.fields = fields;
      header.name = "getOfflineData";
      let formData = [
          ["formData", JSON.stringify({header:header, fields:fields})], 
          ["action", "getData"]
      ];

      param.formData = formData;
      param.loader = false;
      db.fetchData(param).then((res) => {
          window.localStorage.offlineData = JSON.stringify(res);
      });
  }
  this.frmScrolling = function(elm) {
    let dataList = document.getElementById("dataListCon");
    if (dataList.style.display != "none") {
      let pInput = elm[dataList.getAttribute("data-parent")];
      var rect = pInput.getBoundingClientRect();
      dataList.style.top = rect.bottom + "px";
    }
  };

  this.frmSettings = function (type, frmName, array) {
    switch (type) {
      case "get":
        return (window.sessionStorage.hasOwnProperty(frmName + "Settings")) ? JSON.parse(window.sessionStorage[frmName + "Settings"]) : {};
        break;
      case 'set':
        window.sessionStorage[frmName + "Settings"] = JSON.stringify(array);
        break;
      case "del":
        delete window.sessionStorage[frmName + "Settings"];
        break;
    }
  };

  this.buildOfflineData = function () {
      let indexDB = new IndexDB("jobTrackDB");
      indexDB.getAll({storeName:"backSync"}).then((res) => {
          
          let offlineCon = document.getElementById("frmJobDashOfflineCon");
          let tBody = offlineCon.querySelector(".js_TblOfflineBody");
          tBody.innerHTML = "";
          let row, cell, elm;
          if (res.length > 0) {
            
              for(const item of res) {
                row = tBody.insertRow();
                cell = row.insertCell();
                cell.innerText = item.offlineDescr;
                cell = row.insertCell();
                cell.innerText = "Pending";
              }
              offlineCon.style.display = "block";
          }else{
              offlineCon.style.display = "none";
          }
      });
  }

  this.getGPS = function() {
      return new Promise((resolve, reject) => {

          var mask = thisUtils.createMask("loader");
          mask.style.display = "block";
          if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                  (position) => {
                      const latitude = position.coords.latitude;
                      const longitude = position.coords.longitude;
                      thisUtils.deleteMask(mask);
                      resolve({lat:latitude, lng:longitude });
                  },
                  (error) => {
                      thisUtils.deleteMask(mask);
                      reject(`Error getting geolocation: ${error.message}`);
                  },
                  {
                      enableHighAccuracy: true,
                      timeout: 5000,
                      maximumAge: 0
                  }
              );
          } else {
              thisUtils.deleteMask(mask);
              reject("Geolocation is not supported by this browser.");
          }
      });
  }  
  this.calcGPSDistance = function(pointA, pointB) {
      //pointA.lat pointA.lng pointB.lat pointB.lng
      const earthRadius = 6371; // Radius of the Earth in kilometers
        
      // Convert latitude and longitude from degrees to radians
      const toRadians = (angle) => angle * (Math.PI / 180);
      const latA = toRadians(pointA.lat);
      const lngA = toRadians(pointA.lng);
      const latB = toRadians(pointB.lat);
      const lngB = toRadians(pointB.lng);

      // Calculate the differences
      const dLat = latB - latA;
      const dLon = lngB - lngA;

      // Haversine formula
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      // Distance in kilometers
      const distance = earthRadius * c;

      return Math.round(distance*10)/10;

  }
}

let globalSyncBusy = false;
function DataManager() {
    const thisUtils = this;
    const gUtils = new GlobalUtils();

    this.fetchData = function (param) {
      // param{fileName: phpFile, formData:FormData Object, sendError: true send error back to promise, loader: false will not show loader}
        return new Promise(function(resolve, reject) {
            let fOptions = {};
            if (!param.fileName) {
                param.fileName = "private.php"
            }
            if (!param.method) {
                param.method = "POST";
            }
            if (!param.returnType) {
                param.returnType = "json";
            }

            if (param.loader == undefined) {
                param.loader = true;
            }
            let formData = new FormData();
            if (param.hasOwnProperty("formData")) {
                
                for(const row of param.formData){
                    formData.append(row[0], row[1]);
                }
                formData.append("deviceToken", window.localStorage.deviceToken);
            }
            
            fOptions.method = param.method;
            fOptions.body = formData;
            if (param.loader) {
                var mask = gUtils.createMask("loader");
                mask.style.display = "block";
            }
            fetch("php/"+param.fileName, fOptions)
            .then(res => {
                if(param.loader == true){
                    gUtils.deleteMask(mask);
                    param.loader = false;
                }
                if (res.ok) {
                    thisUtils.saveOfflineData();
                    switch (param.returnType) {
                      case "json":
                          return res.json();
                        break;
                      case "text":
                          return res.text();
                        break;
                      case "blob":
                          return res.blob();
                        break;
                    }
                }else{
                    throw res.status;
                }
            }).then(res => {
                switch (param.returnType) {
                  case "json":
                      if((res.hasOwnProperty("success"))){
                          resolve(res.success);
                      }else{
                          if(res.hasOwnProperty("error")){
                              reject(res.error);
                              if(param.sendError == true){
                                  
                                  if (res.error == "login") {
                                    delete window.localStorage.token;
                                    thisUtils.showForm("frmRegDevice");
                                  }

                              }else {
                                  if (res.error == "login") {
                                      delete window.localStorage.token;
                                      thisUtils.showForm("frmRegDevice");
                                  }else{
                                      gUtils.showInfoBox("error", {"msg": res.error});
                                  }
                                  
                              }
                          }
                          
                      }
                      
                    break;
                  default:
                      resolve(res);
                    break;
                    
                }

            }).catch(res => {
                //gUtils.showInfoBox("error", {"msg": res.message});
                console.log(res);
                if (!param.saveOffline) {
                    param.saveOffline = true;
                }

                if(param.loader == true){
                  gUtils.deleteMask(mask);
                }
                if (res.message.includes("Failed to fetch") && (param.hasOwnProperty("formData")) && (formData.get("action") == "saveData") && (param.saveOffline == true)) {
                    console.log("Add to offline data");
                    param.retryNo = 0;
                    const indexDB = new IndexDB("jobTrackDB");
                    indexDB.insert({storeName: 'backSync', data: param})
                      .then((key) => {
                          gUtils.buildOfflineData();
                          resolve("offLine");
                      })
                      .catch(function (err) {
                          erroMessage += 'Error inserting data into IndexedDB: ' + err;
                          if(param.sendError != true){
                              gUtils.showInfoBox("error", {"msg": res.message});
                          }
                          reject(errMessage);
                      });
                }else{
                      if(param.sendError != true){
                          gUtils.showInfoBox("error", {"msg": res.message});
                      }
                      reject(res.message);
                }
            });
        });
    }
    this.cacheManager = function(action, param) {
      return new Promise(function(resolve, reject) {
        window.caches.open('mobileJobTrack').then((cache) => {
          switch (action) {
            case "save":
              cache.put(param.cacheName, new Response(JSON.stringify(param.data)));
              resolve(true);
              break;
            case "get":
              cache.match(param.cacheName).then((response) => {
                if (response != undefined) {
                  response.json().then((data) => {
                    resolve(data);
                  });
                } else {
                  resolve({});
                }
              });
              break;
            case "delete":
              //Could not get Delete working.
              cache.delete(param.cacheName).then((result) => {
                console.log(result);
              });

              break;
          }
        });
      });
    };
    this.saveOfflineData = async function () {
      if (globalSyncBusy) return;                 // 2. same protection
      globalSyncBusy = true;

      const indexDB = new IndexDB('jobTrackDB');

      try {
        const dbData = await indexDB.getAll({storeName: 'backSync'});
        if (!dbData.length) return;

        for (const item of dbData) {
          item.loader      = false;
          item.saveOffline = false;
          item.retryNo    += 1;
          item.sendError   = true;
          try {
            await thisUtils.fetchData(item);
            await indexDB.delete({storeName: 'backSync', key: item.key});
          } catch (err) {
            console.log(err);
            await indexDB.put({storeName: 'backSync', data: item});
          }
        }
      } catch (err) {
        gUtils.showInfoBox('error', {msg: err.message});
      } finally {
        globalSyncBusy = false;
        gUtils.buildOfflineData();
      }
    }    

}

class IndexDB{
    constructor(databaseName) {
        this.databaseName = databaseName;
        this.db = null;
    }

    openDatabase() {
      return new Promise((resolve, reject) => {
        // REMEMBER CHANGE THE VERSION IN SERVICE WORKER ASWELL.
        const request = indexedDB.open(this.databaseName, 1);
  
        request.onerror = () => {
          reject(request.error);
        };
  
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };
  
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains("backSync")) {
            db.createObjectStore("backSync", { keyPath: 'key', autoIncrement: true });
          }
          if (!db.objectStoreNames.contains("tokens")) {
            db.createObjectStore("tokens", {keyPath: 'key', unique: true });
          }

        };
      });
    }

    insert(param) {
      return new Promise(async (resolve, reject) => {
        if (!this.db) {
            await this.openDatabase();
        }
        const transaction = this.db.transaction(param.storeName, 'readwrite');
        const store = transaction.objectStore(param.storeName);
        const request = store.add(param.data);
  
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
  
        request.onerror = (event) => {
          reject(`Failed to insert data: ${event.target.error}`);
        };
      });
    }
  
    get(param) {
      return new Promise(async (resolve, reject) => {
        if (!this.db) {
          await this.openDatabase();
        }
  
        const transaction = this.db.transaction(param.storeName, 'readonly');
        const store = transaction.objectStore(param.storeName);
  
        const request = store.get(param.key);
  
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
  
        request.onerror = (event) => {
          reject(`Failed to get data: ${event.target.error}`);
        };
      });
    }

    getAll(param) {
      return new Promise(async (resolve, reject) => {
        if (!this.db) {
          await this.openDatabase();
        }
  
        const transaction = this.db.transaction(param.storeName, 'readonly');
        const store = transaction.objectStore(param.storeName);
  
        const request = store.getAll();
  
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
  
        request.onerror = (event) => {
          reject(`Failed to get data: ${event.target.error}`);
        };
      });

    }
  
    delete(param) {
      return new Promise(async (resolve, reject) => {
        if (!this.db) {
          await this.openDatabase();
        }
  
        const transaction = this.db.transaction(param.storeName, 'readwrite');
        const store = transaction.objectStore(param.storeName);
  
        const request = store.delete(param.key);
  
        request.onsuccess = () => {
          resolve();
        };
  
        request.onerror = (event) => {
          reject(`Failed to delete data: ${event.target.error}`);
        };
      });
    }

    put(param) {
      return new Promise(async (resolve, reject) => {
        if (!this.db) {
          await this.openDatabase();
        }

        const transaction = this.db.transaction(param.storeName, 'readwrite');
        const store = transaction.objectStore(param.storeName);

        const request = store.put(param.data);

        request.onsuccess = (event) => {
          resolve(event.target.result);
        };

        request.onerror = (event) => {
          reject(`Failed to get data: ${event.target.error}`);
        };
      });

    }

    clear(param) {
      return new Promise(async (resolve, reject) => {
        if (!this.db) {
          await this.openDatabase();
        }
  
        const transaction = this.db.transaction(param.storeName, 'readwrite');
        const store = transaction.objectStore(param.storeName);
  
        const request = store.clear();
  
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
  
        request.onerror = (event) => {
          reject(`Failed to get data: ${event.target.error}`);
        };
      });
    }
}

function FrmAppUpdateUtils() {
  var thisUtils = this;
  var thisFormName = 'frmAppUpdate';
  var thisForm = document.getElementById(thisFormName);
  var gUtils = new GlobalUtils();

  this.initForm = function () {
    thisUtils.setListeners();
    thisForm.setAttribute('data-utils', thisUtils.constructor.name);
    thisForm.setAttribute('data-parents', JSON.stringify(['fullView']));
  };
  this.setListeners = function () {
    let elm;
  };
  this.preSet = function (param) {
    let sett = {};
    sett.autoID = param.autoID;
    gUtils.frmSettings('set', thisFormName, sett);
  };
  this.display = function () {
    thisUtils.clearForm();
  };
  this.clearForm = function () {
    thisForm.reset();
  };
}

function AppViewUtils() {
    var thisUtils = this;
    var thisFormName = "appView";
    var thisForm = document.getElementById(thisFormName);
    var gUtils = new GlobalUtils();

    this.initForm = function () {
      document.getElementById("appViewDropMenu").style.maxHeight = "0px";
      thisUtils.setListeners();
      thisForm.setAttribute("data-utils", thisUtils.constructor.name);
    };
    this.setListeners = function () {
        let elm;

        elm = document.getElementById("appViewMenuCon").children;
        for (const item of elm) {
            item.onclick = function () {
                thisUtils.menuSelected(this);
            };
        }

        thisForm.querySelector(".logo").onclick = function () {
            thisUtils.openCloseMenu("open");
        }

        elm = document.getElementById("appViewDropMenu");
        elm.onblur = function () {
          thisUtils.openCloseMenu("close");
        }
        for (const item of elm.children) {
            item.onclick = function () {
                thisUtils.dropMenuSelected(this);
            };
        }
    };
    this.display = function () {
    };
    this.menuSelected = function (btn) {
        let fUtils;
        let con = document.getElementById("appViewMenuCon");
        for (const item of con.children){
            item.classList.remove("selected");
        }
        btn.classList.add("selected");
        switch (btn.id) {
            case "appViewBtnJobDash":
                fUtils = new FrmJobDashUtils();
                fUtils.preSet({type:"job"});
                gUtils.showForm("frmJobDash");
              break;
            case "appViewBtnProjDash":
              fUtils = new FrmJobDashUtils();
              fUtils.preSet({type:"proj"});
              gUtils.showForm("frmJobDash");
            break;
            case "appViewBtnQuoteDash":
              fUtils = new FrmJobDashUtils();
              fUtils.preSet({type:"quote"});
              gUtils.showForm("frmJobDash");
            break;

        }
    };
    this.dropMenuSelected = function (btn) {
        let menu = document.getElementById("appViewDropMenu");
        let fUtils;
        let con = document.getElementById("appViewMenuCon");
        for (const item of con.children){
            item.classList.remove("selected");
        }

        switch (btn.id) {
            case "appViewDMenuVehicleExp":
                fUtils = new FrmVehicleExpUtils();
                fUtils.preSet({type:"vehicle"});
                gUtils.showForm("frmVehicleExp");
              break;
            case "appViewDMenuOfficeExp":
                fUtils = new FrmVehicleExpUtils();
                fUtils.preSet({type:"office"});
                gUtils.showForm("frmVehicleExp");
              break;
            case "appViewDMenuToolsExp":
                fUtils = new FrmVehicleExpUtils();
                fUtils.preSet({type:"tool"});
                gUtils.showForm("frmVehicleExp");
            
              break;

        }
        thisUtils.openCloseMenu("close");
    };
    this.openCloseMenu = function (action) {
        let menu = document.getElementById("appViewDropMenu");
        
        if ((menu.dataset.status == "open") && (action == "open")) {
            return;
        }
        
        if (action == "open") {
            menu.dataset.status = "open";
            menu.style.maxHeight = "200px";
            menu.focus();
        }else{
            setTimeout(() => {
                menu.dataset.status = "close";
            }, 10);
            
            menu.style.maxHeight = "0px";
        }
    }
}

function FrmJobDashUtils() {
    var thisUtils = this;
    var thisFormName = "frmJobDash";
    var thisForm = document.getElementById(thisFormName);
    var gUtils = new GlobalUtils();

    this.initForm = function () {
      thisUtils.setListeners();
      thisForm.setAttribute("data-utils", thisUtils.constructor.name);
      thisForm.setAttribute("data-parents", JSON.stringify(["appView"]));
    };
    this.setListeners = function () {
        let elm;

        thisForm.search.onkeyup = function () {
            thisUtils.buildJobs();
        }
    };
    this.preSet = function (param) {
        thisUtils.clearForm();
        let header = thisForm.querySelector(".gFrmHeader");
        let sett = {};
        sett.type = param.type;
        switch (sett.type) {
          case "job":
              header.innerText = "Jobcard dashboard";
            break;
          case "proj":
              header.innerText = "Projects dashboard";
          break;
          case "quote":
              header.innerText = "Quote dashboard";
          break;

        }
        gUtils.frmSettings("set", thisFormName, sett);
        gUtils.buildOfflineData();

    }
    this.display = function () {
        thisUtils.getData();
    };
    this.getData = function () {
        let sett = gUtils.frmSettings("get", thisFormName);
        let header = {}, param = {}, db = new DataManager();

        header.name = thisFormName;
        header.type = sett.type;
        let formData = [
            ["formData", JSON.stringify({header:header})], 
            ["action", "getData"]
        ];
        param.formData = formData;
        param.sendError = true;
        db.fetchData(param).then((res) => {
            gUtils.getGPS().then((gps) => {
                sett.gps = gps;
                gUtils.frmSettings("set", thisFormName, sett);
                window.sessionStorage.frmJobDashData = JSON.stringify(res.jobs);
                thisUtils.buildJobs();
            }).catch((gpsError) => {
                sett.gps = false;
                gUtils.frmSettings("set", thisFormName, sett);
                window.sessionStorage.frmJobDashData = JSON.stringify(res.jobs);
                thisUtils.buildJobs();
            });
        }).catch((res) => {
            let offlineData = JSON.parse(window.localStorage.offlineData);
            if (res == "Failed to fetch") {
                switch (sett.type) {
                  case "job":
                      window.sessionStorage.frmJobDashData = JSON.stringify(offlineData.dashJob.jobs);
                    break;
                  case "proj":
                    window.sessionStorage.frmJobDashData = JSON.stringify(offlineData.dashProj.jobs);
                    break;
                  case "quote":
                    window.sessionStorage.frmJobDashData = JSON.stringify(offlineData.dashQuote.jobs);
                    break;
                }
                gUtils.getGPS().then((gps) => {
                    sett.gps = gps;
                    gUtils.frmSettings("set", thisFormName, sett);
                    thisUtils.buildJobs();
  
                }).catch((gpsError) => {
                    sett.gps = false;
                    gUtils.frmSettings("set", thisFormName, sett);
                    thisUtils.buildJobs();
                });
            }
        });
    };
    this.buildJobs = function () {
        let res = JSON.parse(window.sessionStorage.frmJobDashData);
        let con = document.getElementById("frmJobDashJobsCon");
        let sett = gUtils.frmSettings("get", thisFormName);

        con.innerHTML = "";

        if (sett.gps) {
            for(let i = 0; i < res.length; i++){
              if (res[i].lat != null) {
                  res[i].distance = gUtils.calcGPSDistance(sett.gps, {lat:res[i].lat, lng:res[i].lng});
              }else{
                res[i].distance = 123456789;
              }
            }
          
        }

        let myJobs = res.filter((item) => item.yourJob == 1);
        let allJobs = res.filter((item) => item.yourJob != 1);

        if (sett.gps) {
            myJobs = myJobs.sort((a, b) => {
              if (b.yourJob == 1) {
                  return 1
              }else{
                  return a.distance - b.distance;
              }
            });

            allJobs = allJobs.sort((a, b) => {
              if (b.yourJob == 1) {
                  return 1
              }else{
                  return a.distance - b.distance;
              }
            });
          
        }


        res = myJobs.concat(allJobs);

        let sFilter;
        if (thisForm.search.value != "") {
          var re = new RegExp(thisForm.search.value, "i");
          sFilter = true;
        }else{
          sFilter = false;
        }

        let htmlStr = `
          <div class="headerRow">
            <div class="rowBar">
              <div class="jobNo"></div>
              <div class="distance"></div>
              <div class="priority"></div>
            </div>
          </div>
          <div class="rowBar">
              <span class="js_client"></span>
              <span class="js_status"></span>
          </div>
          <div class="rowBar">
              <span class="js_clientAdd"></span>
          </div>
          <div class="availTimeCon">
            <div class="d-flex flex-row flex-nowrap gap-1"><span class="apptDateLbl">Avail. From: </span><span class="js_availStart"></span></div>
            
            <div class="d-flex flex-row flex-nowrap gap-1"><span class="apptDateLbl">Avail. To: </span><span class="js_availEnd"></span></div>
          </div>          
          <div class="apptDateCon">
            <span class="apptDateLbl">Appt. Date: </span><span class="js_apptDate"></span>
          </div>`;

        let item, row, header, otherStarted = false, addRow = true;
        for (let i = 0; i < res.length; i++) {
            row = res[i];


            if (i == 0) {
                if (row.yourJob == 1) {
                    header = document.createElement("div");
                    header.classList.add("header");
                    header.innerText = "My Jobs";
                    con.appendChild(header);
                }
            }

            if (!otherStarted) {
              if (row.yourJob == 2) {
                header = document.createElement("div");
                header.classList.add("header", "otherHeader");
                header.innerText = "Other Jobs";
                con.appendChild(header);
                otherStarted = true;
              }
            }

            if (sFilter) {
              addRow = (((row.siteClient != null) && (row.siteClient.search(re) != -1)) || (row.autoID.search(re) != -1) || (row.clientAdd.search(re) != -1));
            }

            if (!addRow) {
              continue;
            }

            item = document.createElement("div");
            item.classList.add("jobItem");
            item.innerHTML = htmlStr;
            item.dataset.autoID = row.autoID;
            item.onclick = function () {
                thisUtils.jobSelected(this);
            }

            let jobNo = item.querySelector(".jobNo");
            jobNo.innerText = row.jobNo;
            jobNo.style.backgroundColor = row.jobColor;

            if (sett.gps) {
                item.querySelector(".distance").innerText = (row.distance != 123456789) ? `${row.distance}km` : 'NA';
            }
            item.querySelector(".priority").innerText = `Prio: ${row.disPriority}`;
            item.querySelector(".js_client").innerText = row.siteClient;
            item.querySelector(".js_clientAdd").innerText = row.clientAdd;
            
            item.querySelector(".js_status").innerText = row.disProcess;
            if (row.disAvailStart != "") {
                item.querySelector(".js_availStart").innerText = row.disAvailStart;
                item.querySelector(".js_availEnd").innerText = row.disAvailEnd;
            }else{
              item.querySelector(".availTimeCon").style.display = "none";
            }

            if (row.apptDate != "") {
                item.querySelector(".js_apptDate").innerText = row.apptDate;
            }else{
              item.querySelector(".apptDateCon").style.display = "none";
            }

            con.appendChild(item);
        }
    };
    this.jobSelected = function (item) {
        let sett = gUtils.frmSettings("get", thisFormName); 
        let fUtils;
        switch (sett.type) {
          case   "quote":
              fUtils = new FrmQuoteUtils();
              fUtils.preSet({autoID:item.dataset.autoID});
              gUtils.showForm("frmQuote");
            break;
          default:
              fUtils = new FrmJobUtils();
              fUtils.preSet({autoID:item.dataset.autoID});
              gUtils.showForm("frmJob");
            break;
        }
    };
    /*this.calcDistance = function () {
      gUtils.getGPS().then((res) => {
          let jobItems = thisForm.querySelectorAll(".jobsCon .jobItem");
          gUtils.getGPS().then((res) => {
              for(const item of jobItems){
                  let pointB = JSON.parse(item.dataset.gps);
                  if (pointB.lat != null) {
                      let distance = gUtils.calcGPSDistance(res, pointB);
                      item.querySelector(".distance").innerText = distance+ "km";
                      
                  }
              }
          });
  
      }).catch((res) => {
          console.log(res);
      });
    }*/
    this.clearForm = function () {
       // this.clearOldIndexDB();
        thisForm.reset();
        let con = document.getElementById("frmJobDashJobsCon");
        con.innerHTML = "";
    };
}

function FrmJobUtils() {
    var thisUtils = this;
    var thisFormName = "frmJob";
    var thisForm = document.getElementById(thisFormName);
    var gUtils = new GlobalUtils();

    this.initForm = function () {
      thisUtils.setListeners();
      thisForm.setAttribute("data-utils", thisUtils.constructor.name);
      thisForm.setAttribute("data-parents", JSON.stringify(["appView"]));
    };
    this.setListeners = function () {
        let elm;

        thisForm.querySelector(".js_BtnAcceptJob").onclick = function () {
            let thisBtn = this;
            let sett = gUtils.frmSettings("get", thisFormName);
            let header = {}, fields = {}, param = {}, db = new DataManager();

            header.name = thisFormName;
            header.frmAction = "acceptJob";
            fields.autoID = sett.autoID;
            let formData = [
                ["formData", JSON.stringify({header:header, fields:fields})], 
                ["action", "saveData"]
            ];
            param.formData = formData;
            param.offlineDescr = `Accept Job ${sett.autoID}`;
            db.fetchData(param).then((res) => {
                thisBtn.parentNode.style.display = "none";
            });            
        }


        elm = document.getElementById("frmJobBtnWhatsA1");
        elm.onclick = function () {
            let tel = thisForm.querySelector(".js_phone1").innerText;
            tel = '+27'+tel.slice(1);
            window.location.href = `whatsapp://send?phone=${tel}`;
        };
        elm = document.getElementById("frmJobBtnCall1");
        elm.onclick = function () {
            let tel = thisForm.querySelector(".js_phone1").innerText;
            window.location.href = `tel:${tel}`;
        };
        elm = document.getElementById("frmJobBtnMaps");
        elm.onclick = function () {
            let add = thisForm.querySelector(".js_clientAdd").innerText;
            let mapUrl = `https://www.google.com/maps/search/?api=1&query=${add}`;
            window.open(mapUrl, '_blank');  
        };

        thisForm.querySelector(".js_BtnGoToLocation").onclick = function () {
            let lat = thisForm.lat.value; // Example Latitude
            let lng = thisForm.lng.value;  // Example Longitude

            // Construct the URL
            let mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

            // Open it
            window.open(mapUrl, '_blank');         
        }

        thisForm.querySelector(".js_BtnGetGPS").onclick = function () {
            if (thisForm.locationName.value == "") {
                gUtils.showToolTip(thisForm.locationName, "Give the location a name first");
                return;
            }
            let sett = gUtils.frmSettings("get", thisFormName);
            let fUtils = new FrmGetGPSUtils();
            fUtils.preSet({frmBack:"frmJob", frmAct:"frmJob", actUtils:"FrmJobUtils", actFunc:"gpsLocationSelected"});
            gUtils.showForm("frmGetGPS",{float:true});
        }

        thisForm.querySelector(".js_BtnStartTime").onclick = function () {
            if (!this.classList.contains("disable")) {
              thisUtils.startStopTimer('start');
            }
            
        }
        thisForm.querySelector(".js_BtnEndTime").onclick = function () {
          if (!this.classList.contains("disable")) {
            thisUtils.startStopTimer('end');
          }  
        }

        thisForm.report.oninput = function () {
          let thisElm = this;
          thisElm.style.height = 'auto';
          thisElm.style.height = (thisElm.scrollHeight+3) + 'px';          
        }
        thisForm.report.onchange = function () {
            let sett = gUtils.frmSettings("get", thisFormName);
            let thisElm = this;
            let header = {}, fields = {}, param = {}, db = new DataManager();
            fields.jobID = sett.autoID;
            fields.report = thisElm.value;
            header.name = thisFormName;
            header.frmAction = "report";
            let formData = [
                ["formData", JSON.stringify({header:header, fields:fields})], 
                ["action", "saveData"]
            ];

            param.formData = formData;
            param.offlineDescr = `Job ${sett.jobNo} summary update`;
            db.fetchData(param).then((res) => {
                if (res == "offline") {
                    gUtils.showToolTip(thisElm, "Report saved offline");
                }
            });

        }


        thisForm.product.onchange = function (e) {
            let thisElm = this;
            thisElm.dataset.prodID = 0;
        }

        let prodCodeInput = thisForm.querySelector(".js_prodCode");
        prodCodeInput.addEventListener("selection", (row) => {
            thisUtils.productSelected(row.detail);
        });
        prodCodeInput.addEventListener("clear", (e) => {
            console.log('Product code cleared');
        });

        let prodTitleInput = thisForm.querySelector(".js_prodTitle");
        prodTitleInput.addEventListener("selection", (row) => {
            thisUtils.productSelected(row.detail);
        });
        prodTitleInput.addEventListener("clear", (e) => {
            console.log('Product title cleared');
        });

        elm = document.getElementById("frmJobBtnAddJobItem");
        elm.onclick = function () {
            let thisElm = this;
            if (thisForm.product.value == "") {
                gUtils.showToolTip(thisForm.product, "Give the product a title");
                return;
            }
            let sett = gUtils.frmSettings("get", thisFormName);
            let header = {}, fields = {}, param = {},  db = new DataManager();

            fields.prodID = thisForm.product.dataset.prodID;
            fields.jobCardID = sett.autoID;
            fields.title = thisForm.product.value;
            fields.descr = thisForm.prodDescr.value;
            fields.qty = thisForm.prodQty.value;
            header.name = thisFormName;
            header.frmAction = "jobItem";
            header.action = "insert";
            let formData = [
                ["formData", JSON.stringify({header:header, fields:fields})], 
                ["action", "saveData"]
            ];

            param.formData = formData;
            param.offlineDescr = `Add Job Item to ${sett.jobNo}`;
            db.fetchData(param).then((res) => {
                let prodItem;
                if (res != "offline") {
                  prodItem = thisUtils.addJobItem({addPos:"pre"});
                  prodItem.row.dataset.rowInfo = JSON.stringify({autoID:res, prodID:fields.prodID});
                  
                }else{
                  prodItem = thisUtils.addJobItem({newItem:true});
                  prodItem.row.dataset.rowInfo = JSON.stringify({autoID:"offline", prodID:fields.prodID});
                }
                prodItem.title.value = thisForm.product.value;
                prodItem.descr.value = thisForm.prodDescr.value;
                prodItem.qty.value = thisForm.prodQty.value;

                thisForm.product.dataset.prodID = 0;
                thisForm.product.value = "";
                thisForm.prodDescr.value = "";
                thisForm.prodDescr.oninput();
                thisForm.prodQty.value = "";
            });
        };


        thisForm.invCard.onclick = function () {
            let thisElm = this;
            if (thisElm.checked) {
                thisForm.suppID.value = "";
                thisForm.suppID.style.display = "none";
                thisForm.suppID.removeAttribute("required");
                thisForm.invNo.value = "";
                thisForm.invNo.style.display = "none";
                thisForm.invNo.removeAttribute("required");
                thisForm.descr.setAttribute("required", "");
            }else{
                thisForm.suppID.style.display = "block";
                thisForm.suppID.setAttribute("required", "");
                thisForm.invNo.style.display = "block";
                thisForm.invNo.setAttribute("required", "");
                thisForm.descr.removeAttribute("required");
            }
        }

        thisForm.querySelector(".js_BtnInvPhoto").onclick = function () {
            let sett = gUtils.frmSettings("get", thisFormName);
            let fUtils = new FrmPhotoUtils();
            fUtils.photoPromise({showForm:false}).then((res) => {
                gUtils.showForm("frmJob", {runDisplay:false});
                let photoImg = thisForm.querySelector(".js_invPhoto");
                sett.invPhoto = res;
                photoImg.src = res.fileContent;
                photoImg.style.display = "block";
                gUtils.frmSettings("set", thisFormName, sett);
            }).catch((res) =>{
                gUtils.showForm("frmJob", {runDisplay:false});
            });
        }


        elm = document.getElementById("frmJobBtnAddInv");
        elm.onclick = function () {
            let sett = gUtils.frmSettings("get", thisFormName);
            
            let header = {}, fields = {}, param = {}, db = new DataManager();

            fields = gUtils.getInputs(thisForm.querySelector(".invCon"));
            if (!fields) {
                return;
            }

            if ((!sett.hasOwnProperty("invPhoto")) || (!sett.invPhoto.hasOwnProperty("fileContent"))) {
              gUtils.showToolTip(thisForm.querySelector(".js_BtnInvPhoto"), "Please take a photo");
              return;
            }
            

            fields.jobCardID = sett.autoID;
            const suppOption = thisForm.suppID.options[thisForm.suppID.selectedIndex];
            fields.suppName = suppOption.text;
            fields.photo = sett.invPhoto;
            fields.payCard = (thisForm.invCard.checked) ? 1 : 0;
            header.name = thisFormName;
            header.frmAction = "jobInv";
            header.action = "insert";
            let formData = [
                ["formData", JSON.stringify({header:header, fields:fields})], 
                ["action", "saveData"]
            ];

            param.formData = formData;
            param.offlineDescr = `Job ${sett.jobNo} supplier invoice`;
            param.sendError = true;
            db.fetchData(param).then((res) => {
                let rowItem = thisUtils.addJobInv();
                rowItem.compName.innerText = (fields.invCard) ? fields.descr : fields.suppName;
                rowItem.invNo.innerText = fields.invNo;
                rowItem.amount.innerText = fields.invAmount;
                gUtils.clearForm(thisForm.querySelector(".invCon"));
                delete sett.invPhoto;
                gUtils.frmSettings("set", thisFormName, sett);
                thisForm.querySelector(".js_invPhoto").style.display = "none";
            }).catch((res) => {
                gUtils.showInfoBox("error", {msg:res});
            });
        };

        elm = document.getElementById("frmJobBtnAddNote");
        elm.onclick = function () {
            thisUtils.addNote();
        }

        elm = document.getElementById("frmJobBtnClientSign");
        elm.onclick = function () {
            let sett = gUtils.frmSettings("get", thisFormName);
            let fUtils = new FrmJobSignUtils();
            fUtils.preSet({autoID:sett.autoID});
            gUtils.showForm("frmJobSign");
        };
    };
    this.preSet = function (param) {
        thisUtils.clearForm();
        let sBtn = thisForm.querySelector(".js_BtnStartTime");
        let eBtn = thisForm.querySelector(".js_BtnEndTime");
        let sett = {};
        sett.autoID = param.autoID;
        gUtils.frmSettings("set", thisFormName, sett);

        if (window.localStorage.hasOwnProperty("jobTime")) {
            let savedTime = JSON.parse(window.localStorage.jobTime);
            if (savedTime.jobID == sett.autoID) {
                window.jobTimer = setInterval(function () {
                    let savedTime = JSON.parse(window.localStorage.jobTime);
                    if (savedTime.jobID == sett.autoID) {
                        let sTime = new Date(savedTime.start);
                        let curTime = new Date();
      
                        let mins = Math.round((curTime - sTime) / (1000 * 60));
                        let hours = Math.floor(mins/60);
                        let min = mins - (hours*60);
      
                        thisForm.querySelector(".js_timer").innerText = `${hours}:${min.toString().padStart(2, '0')}`;
                    }
                }, 60000);

                let sTime = new Date(savedTime.start);
                let curTime = new Date();

                let mins = Math.round((curTime - sTime) / (1000 * 60));
                let hours = Math.floor(mins/60);
                let min = mins - (hours*60);
                thisForm.querySelector(".js_timer").innerText = `${hours}:${min.toString().padStart(2, '0')}`;

                sBtn.classList.add('disable');
                eBtn.classList.remove('disable');
            }else{
                eBtn.classList.add('disable');
                sBtn.classList.remove('disable');
            }
        }else{
            eBtn.classList.add('disable');
            sBtn.classList.remove('disable');
        }
    };
    this.display = function () {
        thisUtils.getData()
    };
    this.getData = function () {
        let sett = gUtils.frmSettings("get", thisFormName);
        let header = {}, fields = {}, param = {}, db = new DataManager();
        fields.autoID = sett.autoID;
        header.name = thisFormName;
        let formData = [
            ["formData", JSON.stringify({header:header, fields:fields})],
            ["action", "getData"]
        ];
        param.formData = formData;
        param.sendError = true;
        db.fetchData(param).then((res) => {
            let offlineData = JSON.parse(window.localStorage.offlineData);
            offlineData.prods = res.prods;
            offlineData.suppliers = res.suppliers;
            window.localStorage.offlineData = JSON.stringify(offlineData);
            thisUtils.createSelectOptions();
            thisUtils.buildJobInfo(res.job);
            console.log("Calling JOb items");

            thisUtils.buildJobItems(res.jobItems);
            console.log("Called job items");

            thisUtils.buildJobTimes(res.jobTimes);
            thisUtils.buildJobInv(res.jobInv);
            thisUtils.buildJobNotes(res.notes);
            thisUtils.buildJobAttachements({type:"job", attachments: res.jobAttachments});
            thisUtils.buildJobAttachements({type:"client", attachments: res.clientAttachments});
        }).catch((res) => {
          if (res == "Failed to fetch") {
              let offlineData = JSON.parse(window.localStorage.offlineData);
              thisUtils.createSelectOptions();
              thisUtils.buildJobInfo(offlineData.jobs[sett.autoID]);
              let jobItems = offlineData.jobItems.filter((row) => {
                  return (row.jobID == sett.autoID);
              });
              thisUtils.buildJobItems(jobItems);
              let jobTimes = offlineData.jobTimes.filter((row) => {
                return (row.jobID == sett.autoID);
              });
              thisUtils.buildJobTimes(jobTimes);
              let jobInv = offlineData.jobInv.filter((row) => {
                return (row.jobID == sett.autoID);
              });
              thisUtils.buildJobInv(jobInv);
              let jobNotes = offlineData.jobNotes.filter((row) => {
                return (row.jobID == sett.autoID);
              });
              thisUtils.buildJobNotes(jobNotes);
          }
        });
    };
    this.createSelectOptions = function () {
        let offlineData = JSON.parse(window.localStorage.offlineData);
        let supps = offlineData.suppliers;
        let suppIn = thisForm.suppID;
        suppIn.innerHTML = "";
        let optStr = `<option value="">Select Supplier</option>`;
        for (const item of supps) {
          optStr += `<option value="${item.autoID}">${item.supplierName}</optioin>`;
        }
        suppIn.innerHTML = optStr;
    }
    this.addJobHours = function () {
        let tBody = document.getElementById("frmJobTblHours").querySelector('tbody');
        let htmlStr = `
          <td>
            <div class="timesCon">
                <div class="js_sTime">
                  
                </div>
                <img src="img/downArrow.png" class="downArrow">
                <div class="js_eTime">
                  
                </div>
            </div>
          </td>
          <td class="js_hours"></td>`;

        let rowInfo = {};
        let row = document.createElement("tr");
        row.innerHTML = htmlStr;
        row.dataset.rowInfo = JSON.stringify({autoID:"insert", action:"insert"})
        tBody.prepend(row);
        rowInfo.row = row;
        rowInfo.sTime = row.querySelector(".js_sTime");
        rowInfo.eTime = row.querySelector(".js_eTime");
        rowInfo.hours = row.querySelector(".js_hours");


        return rowInfo;
    };
    this.addJobItem = function (param) {
        const newItem = ((param) && (param.hasOwnProperty("newItem"))) ? param.newItem : false;
        const addPos = ((param) && (param.hasOwnProperty("addPos"))) ? param.addPos : "post"; 
        let tBody = document.getElementById("frmJobTblItems").querySelector('tbody');

        let htmlStr = `
                <td><input type="checkbox" class="js_chkBox"></td>
                <td>
                  <div>
                    <input type="text" list="frmJobProdDataList" maxlength="100" class="gFrmInput js_title" placeholder="Title">
                    <div class="gjs_textareaCon">
                      <span></span>
                      <textarea class="js_descr" rows="1" data-maxlength="300" placeholder="Description"></textarea>
                    </div>
                  </div>
                </td>
                <td><input type="number" class="gFrmInput js_qty" value=1 step=0.001 ></td>`;          

          let row = document.createElement("tr");
          row.innerHTML = htmlStr;


          let rowItem = {};
          rowItem.row = row;
          rowItem.chkBox = row.querySelector(".js_chkBox");
          rowItem.qty = row.querySelector(".js_qty");
          rowItem.title = row.querySelector(".js_title");
          rowItem.descr = row.querySelector(".js_descr");

          if (!newItem) {
              rowItem.chkBox.onclick = function () {
                  let con = this.closest("tr");
                  let rowInfo = JSON.parse(con.dataset.rowInfo);
                  if (this.checked == true) {
                      rowInfo.dateCompleted = gUtils.formatDate("dateTimeStr", new Date());

                  }else{
                      rowInfo.dateCompleted = null;
                  }

                  con.dataset.rowInfo = JSON.stringify(rowInfo);

                  saveItem(con);
              };

              rowItem.title.onkeyup = function (e) {
                  if (!e.key) {
                      let thisElm = this;
                      let thisRow = thisElm.closest("tr");
                      let rowInfo = JSON.parse(thisRow.dataset.rowInfo);
                      let textarea = thisRow.querySelector("textarea");
                      let offlineData = JSON.parse(window.localStorage.offlineData);
                      let prods = offlineData.prods;
                      if (prods.hasOwnProperty(thisElm.value)) {
                        let prod = prods[thisElm.value];
                        rowInfo.prodID = prod.autoID;
                        textarea.value = prod.descr;
                        thisUtils.textAreaHeight(textarea);
                        thisRow.dataset.rowInfo = JSON.stringify(rowInfo);
                      }else{
                        rowInfo.prodID = 0;
                        thisRow.dataset.rowInfo = JSON.stringify(rowInfo);
                      }
                  }
              }
    
              rowItem.title.onchange = function () {
                  let thisElm = this;
                  let row = thisElm.closest("tr");
                  let rowInfo = JSON.parse(row.dataset.rowInfo);
                  let textarea = row.querySelector("textarea");
                  let offlineData = JSON.parse(window.localStorage.offlineData);
                  let prods = offlineData.prods;
                  if (prods.hasOwnProperty(thisElm.value)) {
                    let prod = prods[thisElm.value];
                    rowInfo.prodID = prod.autoID;
                    textarea.value = prod.descr;
                    thisUtils.textAreaHeight(textarea);
                  }else{
                      rowInfo.prodID = 0;
                  }
                  row.dataset.rowInfo = JSON.stringify(rowInfo);
      
                  saveItem(this.closest("tr"));
              };
              rowItem.descr.oninput = function () {
                  thisUtils.textAreaHeight(this);
              };
              rowItem.descr.onchange = function () {
                  saveItem(this.closest("tr"));
              }
              rowItem.qty.onchange = function () {
                  saveItem(this.closest("tr"));
              };
              function saveItem(con) {
                  let sett = gUtils.frmSettings("get", thisFormName);
                  let header = {}, fields = {}, param = {}, db = new DataManager();
                  let offlineData = JSON.parse(window.localStorage.offlineData);
                  let inTitle = con.querySelector(".js_title");
                  let inDesc = con.querySelector(".js_descr");
        
                  con.classList.add("disable");
                  let inputs = con.querySelectorAll("input");
                  for (const input of inputs) {
                      input.disabled = true;
                  }
        
                  let rowInfo = JSON.parse(con.dataset.rowInfo);
        
                  fields.autoID = rowInfo.autoID;
                  fields.quoteID = sett.autoID;
                  fields.title = inTitle.value;
                  fields.descr = inDesc.value;
                  fields.qty = con.querySelector(".js_qty").value;
                  header.name = thisFormName;
                  header.frmAction = "jobItem";
                  header.action = "update";
                  console.log(fields);
                  let formData = [
                      ["formData", JSON.stringify({header:header, fields:fields})], 
                      ["action", "saveData"]
                  ];
                  param.offlineDescr = `Quote Item Change Job Item: ${sett.jobNo}`;
                  param.formData = formData;
                  db.fetchData(param).then((res) => {
                        if (rowInfo.autoID == "insert") {
                            rowInfo.autoID = res;
                            rowInfo.action = "update";
                            con.dataset.rowInfo = JSON.stringify(rowInfo);
                        }
        
                        if (rowInfo.action == "delete") {
                            con.closest("table").deleteRow(con.rowIndex);
                        }else {
                            for (const input of inputs) {
                                input.disabled = false;
                                con.classList.remove("disable");
                            }
                        }
                    });
              }
          }else{
              for(const input of rowItem.row.querySelectorAll("input")){
                  input.disabled = true;
              }
              rowItem.descr.disabled = true;
          }

          if (addPos == "pre") {
              tBody.prepend(row);
          }else{
              tBody.appendChild(row);
          }

          return rowItem;
    };
    this.addJobInv = function () {
        let tBody = document.getElementById("frmJobTblInv").querySelector('tbody');
        let htmlStr = `
          <td>
            <div>
              <span class="tblSuppName"></span>
              <span class="tblInvNo"></span>
            </div>
          </td>
          <td class="tblAmount"></td>`;

          let row = document.createElement("tr");
          row.dataset.photo = JSON.stringify({photoPath:null});
          row.innerHTML = htmlStr;
          tBody.prepend(row);

          let rowItem = {};
          rowItem.row = row;
          rowItem.compName = row.querySelector(".tblSuppName");
          rowItem.invNo = row.querySelector(".tblInvNo");
          rowItem.amount = row.querySelector(".tblAmount");
          rowItem.photo = row.querySelector(".btnPhoto");

          return rowItem;
    };
    this.addNote = function () {
      let noteCon = thisForm.querySelector(".notesCon");
      let htmlStr = `
          <div>
            <span class="userName"></span>
          </div>
          <div class="textPhotoCon">
            <textarea></textarea>
            <img class="photo" src="img/btnPhoto.png">
          </div>
          `;
      let div = document.createElement("div");
      div.innerHTML = htmlStr;
      div.classList.add("noteCon");
      div.dataset.autoID = "insert";
      div.dataset.photo = JSON.stringify({photoPath:null});
  
      
      let textarea = div.querySelector("textarea");
      textarea.oninput = function () {
          this.style.height = "auto";
          this.style.height = this.scrollHeight + "px";        
      }
      textarea.onchange = function () {
          saveNote(this.closest(".noteCon"));
      }
  
      let btnPhoto = div.querySelector(".photo");
      btnPhoto.onclick = function () {
        let con = this.closest(".noteCon");
        let fUtils = new FrmPhotoUtils();
        
        fUtils.photoPromise(JSON.parse(con.dataset.photo)).then((res) => {
            gUtils.showForm("frmJob", {runDisplay:false});
            let photo = JSON.parse(con.dataset.photo);
            photo.fileContent = res.fileContent;
            con.dataset.photo = JSON.stringify(photo);
            saveNote(con);
        }).catch((res) =>{
            gUtils.showForm("frmJob", {runDisplay:false});
        });
      };
  
      noteCon.prepend(div);
      return div;
      function saveNote(noteElm) {
          let sett = gUtils.frmSettings("get", thisFormName);
          let header = {}, fields = {}, param = {}, db = new DataManager();
  
          noteElm.classList.add("disabled");
  
          fields.autoID = noteElm.dataset.autoID;
          fields.photo = JSON.parse(noteElm.dataset.photo);
          fields.jobID = sett.autoID;
          fields.note = noteElm.querySelector("textarea").value;
          header.name = thisFormName;
          header.frmAction = "jobNote";
          let formData = [
              ["formData", JSON.stringify({header:header, fields:fields})], 
              ["action", "saveData"]
          ];
          param.offlineDescr = `Save Note on Job: ${sett.jobNo}`;
          param.sendError = true;
          param.formData = formData;
          db.fetchData(param).then((res) => {
              if (fields.autoID == "insert") {
                  noteElm.dataset.autoID = res.autoID;
              }
              fields.photo.photoPath = res.photoPath;
              delete fields.photo.fileContent;
              noteElm.dataset.photo = JSON.stringify(fields.photo);
              if (res.photoPath != null) {
                  noteElm.querySelector(".photo").src = "img/blueI.jpeg";
              }
              noteElm.classList.remove("disabled");
          }).catch((res) => {
            noteElm.classList.remove("disabled");
            gUtils.showInfoBox("error", {msg:res});
          });
      }
    }
    this.startStopTimer = async function (action) {
        let sett = gUtils.frmSettings("get", thisFormName);
        let disTime = thisForm.querySelector(".js_timer");
        let sBtn = thisForm.querySelector(".js_BtnStartTime");
        let eBtn = thisForm.querySelector(".js_BtnEndTime");
        switch (action) {
          case "start":
              if (window.localStorage.hasOwnProperty("jobTime")) {
                  let savedTime = JSON.parse(window.localStorage.jobTime);
                  let confirm = await gUtils.showInfoBox('confirm', {msg:`There is already timer on job ${savedTime.jobID} Would you like to stop it and start work ons this job?`});
                  if (confirm == "infoBoxBtn1") {
                      thisUtils.startStopTimer("end");
                      thisUtils.startStopTimer("start");
                  }else{
                      return;
                  }
              }
              var currentDate = new Date();
              var year = currentDate.getFullYear();
              var month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so add 1 and pad with '0'
              var day = String(currentDate.getDate()).padStart(2, '0');
              var hours = String(currentDate.getHours()).padStart(2, '0');
              var minutes = String(currentDate.getMinutes()).padStart(2, '0');
              var seconds = String(currentDate.getSeconds()).padStart(2, '0');
              var dateString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;


              window.localStorage.jobTime = JSON.stringify({jobID: sett.autoID, start: dateString});

              disTime.innerText = "0:00";
              sBtn.classList.add("disable");
              eBtn.classList.remove("disable");
              window.jobTimer = setInterval(function () {
                  let savedTime = JSON.parse(window.localStorage.jobTime);
                  if (savedTime.jobID == sett.autoID) {
                      let sTime = new Date(savedTime.start);
                      let curTime = new Date();
    
                      let mins = Math.round((curTime - sTime) / (1000 * 60));
                      let hours = Math.floor(mins/60);
                      let min = mins - (hours*60);
    
                      thisForm.querySelector(".js_timer").innerText = `${hours}:${min.toString().padStart(2, '0')}`;
                  }
              }, 60000);
            break;
          case "end":
              clearInterval(window.jobTimer);
              let savedTime = JSON.parse(window.localStorage.jobTime);
              let sTime = new Date(savedTime.start);
              let curTime = new Date();

              var year = curTime.getFullYear();
              var month = String(curTime.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so add 1 and pad with '0'
              var day = String(curTime.getDate()).padStart(2, '0');
              var hours = String(curTime.getHours()).padStart(2, '0');
              var minutes = String(curTime.getMinutes()).padStart(2, '0');
              var seconds = String(curTime.getSeconds()).padStart(2, '0');
              var eDateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

              

              let mins = Math.round((curTime - sTime) / (1000 * 60));
              var hours = Math.floor(mins/60);
              let min = mins - (hours*60);


              if (min > 0) {
                  /*let tBody = document.getElementById("frmJobTblHours");
                  let row = document.createElement("tr");
                  row.dataset.info = JSON.stringify({start:savedTime.start, end:new Date()});
                  let cell = row.insertCell();
                  tBody.prepend(row);*/

                  if (sett.autoID == savedTime.jobID) {
                      let item = thisUtils.addJobHours();
                      item.sTime.innerText = new Date(savedTime.start).toLocaleString();
                      item.eTime.innerText = new Date().toLocaleString();
                      item.hours.innerText = `${hours}:${min.toString().padStart(2, '0')}`; 
                  }


                  let header = {}, fields = {}, param = {}, db = new DataManager();
                  fields.sTime = savedTime.start;
                  fields.eTime = eDateStr;
                  fields.jobCardID = savedTime.jobID;
                  fields.mins = mins;
                  header.name = thisFormName;
                  header.frmAction = "time";
                  let formData = [
                      ["formData", JSON.stringify({header:header, fields:fields})], 
                      ["action", "saveData"]
                  ];

                  param.formData = formData;
                  param.offlineDescr = `Add time worked on Job: ${sett.jobNo}`; 
                  db.fetchData(param).then((res) => {
                  });
              }


              eBtn.classList.add("disable");
              sBtn.classList.remove("disable");
              disTime.innerText = "";

              delete window.localStorage.jobTime;
            break;
        }
    }
    this.buildJobInfo = function (res) {
        let btnAccept = thisForm.querySelector(".js_BtnAcceptJob");
        let clientName = thisForm.querySelector(".js_clientName");
        let phone1Con = thisForm.querySelector(".js_phone1Con");
        let phone2Con = thisForm.querySelector(".js_phone2Con");
        let addCon = thisForm.querySelector(".clientAddCon");
        let lblHours = thisForm.querySelector(".js_LblHoursHeader"); 

        btnAccept.parentNode.style.display = (res.assignID == null) ? "flex" : "none";
        for (const key of Object.keys(res)) {
            let field = thisForm.querySelector(`.js_${key}`);
            if (field != undefined) {
                field.innerText = res[key];
            }
        }

        gUtils.buildInputs(thisForm, res);

        thisForm.report.oninput();

        clientName.innerText = res.clientName;
        phone1Con.style.display = (res.phone1 == "") ? "none" : "flex";
        phone2Con.style.display = (res.phone2 == "") ? "none" : "flex";
        addCon.style.display = (res.clientAdd == "") ? "none" : "block";

       
        if (res.estMins != null) {
            let mins = res.estMins;
            let hours = Math.floor(mins/60);
            let min = mins - (hours*60);
            min = String(min).padStart(2, "0");
            lblHours.innerText = `Job hours *Est Time - ${hours}:${min}*`;
        }else{
            lblHours.innerText = "Job hours";
        }

    };
    this.buildJobTimes = function (res) {
        let rowItem;
        for(const item of res) {
          rowItem = thisUtils.addJobHours();
          rowItem.row.dataset.rowInfo = JSON.stringify({action:"update", autoID:item.autoID});
          if (item.disSTime != null) {
              rowItem.sTime.innerText = item.disSTime;
          }
          if (item.disETime != null) {
              rowItem.eTime.innerText = item.disETime;
          }

          if (item.mins != null) {
              let hours = Math.trunc(item.mins/60);
              let min = (item.mins - (hours*60));
              min = ("0"+min).slice(-2);
              rowItem.hours.innerText = `${hours}:${min}`;
          }
        }

    };
    this.gpsLocationSelected = function (params) {
        let sett = gUtils.frmSettings("get", thisFormName);
        let header = {}, fields = {}, param = {}, db = new DataManager();
        fields.locationName = thisForm.locationName.value;
        fields.lat = params.lat;
        fields.lng = params.lng;
        fields.gpsAccuracy = params.accuracy
        fields.autoID = sett.autoID;
        header.name = thisFormName;
        header.frmAction = "gps";
        let formData = [
            ["formData", JSON.stringify({header:header, fields:fields})], 
            ["action", "saveData"]
        ];

        param.formData = formData;
        param.offlineDescr = `GPS location for Job: ${sett.jobNo}`;
        param.sendError = true;
        db.fetchData(param).then((res) => {
            thisForm.lat.value = fields.lat;
            thisForm.lng.value = fields.lng;
        }).catch((res) => {
            gUtils.showInfoBox("error", {msg:res});
        });

    }
    this.productSelected = function (row) {
        console.log(row);
        thisForm.product.dataset.prodID = row.autoID;
        thisForm.product.value = `${row.prodCode} - ${row.title}`;
        thisForm.querySelector(".js_prodCode").clear();
        thisForm.querySelector(".js_prodTitle").clear();
        thisForm.prodDescr.value = row.descr;
        thisUtils.textAreaHeight(thisForm.prodDescr);
        
    }
    this.buildJobItems = function (res) {
        let rowItem;
        for(const item of res) {
          rowItem = thisUtils.addJobItem();
          rowItem.row.dataset.rowInfo = JSON.stringify({action:"update", autoID:item.autoID, title:item.title, descr:item.descr, dateCompleted:item.dateCompleted});
          rowItem.chkBox.checked = (item.dateCompleted != null) ? true : false;
          rowItem.title.value = item.title;
          rowItem.descr.value = item.descr;
          rowItem.qty.value = item.qty;

          thisUtils.textAreaHeight(rowItem.descr);
        }


    };
    this.buildJobInv = function (res) {
        let rowItem;
        for(const item of res) {
          rowItem = thisUtils.addJobInv();
          rowItem.row.dataset.rowInfo = JSON.stringify({action:"update", autoID:item.autoID});
          rowItem.row.dataset.photo = JSON.stringify({photoPath:item.photoPath});
          rowItem.compName.innerText = item.compName;
          rowItem.invNo.innerText = item.invNo;
          rowItem.amount.innerText = item.amount;
         // rowItem.photo.src = (item.photoPath != null) ? "img/blueI.jpeg" : "img/btnPhoto.png";
        }

    };
    this.buildJobNotes = function (res) {
      let note, textarea;
      for(const item of res){
          note = thisUtils.addNote();
          note.dataset.autoID = item.autoID;
          note.dataset.photo = JSON.stringify({photoPath:item.photoPath});

          textarea = note.querySelector("textarea");
          textarea.value = item.note;
          
          if (item.photoPath != null) {
              note.querySelector("img").src = "img/blueI.jpeg";
          }
      }
      let notesCon = thisForm.querySelector(".notesCon");
      for (const noteCon of notesCon.querySelectorAll(".noteCon")) {
          noteCon.querySelector("textarea").oninput();
      }


    }
    this.buildJobAttachements = function (params) {
        let attCon;
        let attData = params.attachments;
        if (params.type == "job") {
            attCon = thisForm.querySelector(".js_jobAttachsCon");
          
        }else{
            attCon = thisForm.querySelector(".js_clientAttachsCon");
        }
        let htmlStr = `
            <div>
              <span class="userName"></span>
            </div>
            <div class="textPhotoCon">
              <div class="title"></div>
              <img class="photo" src="">
            </div>
            `;
        for (const item of attData) {
            let div = document.createElement("div");
            div.innerHTML = htmlStr;
            div.classList.add("attachCon");
            div.dataset.autoID = item.autoID;
        
            div.querySelector(".title").innerText = item.title;
            let ext = item.filePath.split('.').pop().toLowerCase();
            let btnPhoto = div.querySelector(".photo");
            btnPhoto.src = (ext == "pdf") ? "img/pdfIcon.png" : "img/blueI.jpeg";
            btnPhoto.onclick = function () {
              let con = this.closest(".attachCon");
              let fUtils = new FrmFileViewerUtils();
              fUtils.preSet({table:"attatch", itemID: con.dataset.autoID, frmBack:"frmJob"});
              gUtils.showForm("frmFileViewer");
            };
        
            attCon.prepend(div);
        }    

    }

    this.textAreaHeight = function (textarea) {
      let con = textarea.closest(".gjs_textareaCon");
      let count = con.querySelector("span");    
      textarea.style.height = 'auto';
      textarea.style.height = (textarea.scrollHeight) + 'px';
      let chr = textarea.value.length;
      let max = parseInt(textarea.dataset.maxlength);
      if (chr <= max) {
          count.innerText = `${chr}/${max}`;
      }else{
        textarea.value = textarea.value.slice(0, -1);
      }
    }
    this.clearForm = function () {
        thisForm.reset();
        thisForm.querySelector(".js_timer").innerText = "";
        thisForm.querySelector(".js_prodCode").clear();
        thisForm.querySelector(".js_prodTitle").clear();

        let dbLbl = thisForm.querySelectorAll(".js_dbLbl");
        for (const lbl of dbLbl) {
            lbl.innerText = "";
        }
        let tBody = document.getElementById("frmJobTblItems").querySelector("tbody");
        tBody.innerHTML = "";
        tBody = document.getElementById("frmJobTblHours").querySelector("tbody");
        tBody.innerHTML = "";
        tBody = document.getElementById("frmJobTblInv").querySelector("tbody");
        tBody.innerHTML = "";
        thisForm.querySelector(".notesCon").innerHTML = "";
        thisForm.querySelector(".js_jobAttachsCon").innerHTML = "";
        thisForm.querySelector(".js_clientAttachsCon").innerHTML = "";
        thisForm.invCard.checked = false;
        thisForm.invCard.onclick();
        thisForm.querySelector(".js_invPhoto").style.display = "none";
        thisForm.querySelector(".js_BtnAcceptJob").parentNode.style.display = "none";
        gUtils.clearForm(thisForm.querySelector(".invCon"));

    };
}

function FrmQuoteUtils() {
  var thisUtils = this;
  var thisFormName = "frmQuote";
  var thisForm = document.getElementById(thisFormName);
  var gUtils = new GlobalUtils();

  this.initForm = function () {
    thisUtils.setListeners();
    thisForm.setAttribute("data-utils", thisUtils.constructor.name);
    thisForm.setAttribute("data-parents", JSON.stringify(["appView"]));
  };
  this.setListeners = function () {
      let elm;
      thisForm.querySelector(".js_BtnAcceptJob").onclick = function () {
          let thisBtn = this;
          let sett = gUtils.frmSettings("get", thisFormName);
          let header = {}, fields = {}, param = {}, db = new DataManager();

          header.name = thisFormName;
          header.frmAction = "acceptQuote";
          fields.autoID = sett.autoID;
          let formData = [
              ["formData", JSON.stringify({header:header, fields:fields})], 
              ["action", "saveData"]
          ];

          param.formData = formData;
          param.offlineDescr = `Accept Quote ${sett.quoteNo}`;
          db.fetchData(param).then((res) => {
              thisBtn.parentNode.style.display = "none";
          });

      }

      elm = document.getElementById("frmQuoteBtnWhatsA1");
      elm.onclick = function () {
          let tel = thisForm.querySelector(".js_phone1").innerText;
          tel = '+27'+tel.slice(1);
          window.location.href = `whatsapp://send?phone=${tel}`;
      };
      elm = document.getElementById("frmQuoteBtnCall1");
      elm.onclick = function () {
          let tel = thisForm.querySelector(".js_phone1").innerText;
          window.location.href = `tel:${tel}`;
      };
      elm = document.getElementById("frmQuoteBtnMaps");
      elm.onclick = function () {
          let add = thisForm.querySelector(".js_clientAdd").innerText;
          window.location.href = `https://www.google.com/maps/search/?api=1&query=${add}`;
      };

      thisForm.product.onchange = function (e) {
            let thisElm = this;
            thisElm.dataset.prodID = 0;
      }

      let prodCodeInput = thisForm.querySelector(".js_prodCode");
      prodCodeInput.addEventListener("selection", (row) => {
          thisUtils.productSelected(row.detail);
      });
      prodCodeInput.addEventListener("clear", (e) => {
          console.log('Product code cleared');
      });

      let prodTitleInput = thisForm.querySelector(".js_prodTitle");
      prodTitleInput.addEventListener("selection", (row) => {
          thisUtils.productSelected(row.detail);
      });
      prodTitleInput.addEventListener("clear", (e) => {
          console.log('Product title cleared');
      });


      elm = document.getElementById("frmQuoteBtnAddJobItem");
      elm.onclick = function () {
          if (thisForm.product.value == "") {
              gUtils.showToolTip(thisForm.product, "Give the product a title");
              return;
          }
          let sett = gUtils.frmSettings("get", thisFormName);
          let header = {}, fields = {}, param = {},  db = new DataManager();

          fields.prodID = thisForm.product.dataset.prodID;
          fields.quoteID = sett.autoID;
          fields.title = thisForm.product.value;
          fields.descr = thisForm.prodDescr.value;
          fields.qty = thisForm.prodQty.value;
          header.name = thisFormName;
          header.frmAction = "jobItem";
          header.action = "insert";
          let formData = [
              ["formData", JSON.stringify({header:header, fields:fields})], 
              ["action", "saveData"]
          ];

          param.formData = formData;
          param.offlineDescr = `Add Quote Item to ${sett.quoteNo}`;
          db.fetchData(param).then((res) => {
              let prodItem;
              if (res != "offline") {
                prodItem = thisUtils.addJobItem({addPos:"pre"});
                prodItem.row.dataset.rowInfo = JSON.stringify({autoID:res, prodID:fields.prodID});
                
              }else{
                prodItem = thisUtils.addJobItem({newItem:true});
                prodItem.row.dataset.rowInfo = JSON.stringify({autoID:"offline", prodID:fields.prodID});
              }
              prodItem.title.value = thisForm.product.value;
              prodItem.descr.value = thisForm.prodDescr.value;
              prodItem.qty.value = thisForm.prodQty.value;

              thisForm.product.dataset.prodID = 0;
              thisForm.product.value = "";
              thisForm.prodDescr.value = "";
              thisForm.prodDescr.oninput();
              thisForm.prodQty.value = "";
          });

      };

      /*thisForm.querySelector(".js_BtnAddInv").onclick = function () {
          thisUtils.addJobInv();
      };*/
      thisForm.querySelector(".js_BtnInvPhoto").onclick = function () {
        let sett = gUtils.frmSettings("get", thisFormName);
        let fUtils = new FrmPhotoUtils();
        fUtils.photoPromise({showForm:false}).then((res) => {
            gUtils.showForm("frmQuote", {runDisplay:false});
            let photoImg = thisForm.querySelector(".js_invPhoto");
            sett.invPhoto = res;
            photoImg.src = res.fileContent;
            photoImg.style.display = "block";
            gUtils.frmSettings("set", thisFormName, sett);
        }).catch((res) =>{
            gUtils.showForm("frmQuote", {runDisplay:false});
        });
      }

      elm = document.querySelector(".js_BtnAddInv");
      elm.onclick = function () {
          let sett = gUtils.frmSettings("get", thisFormName);
          
          let header = {}, fields = {}, param = {}, db = new DataManager();

          if (thisForm.suppName.value == "") {
              gUtils.showToolTip(thisForm.suppName, "Please enter supplier name");
              return;
          }
          if (thisForm.suppAmount.value == "") {
            gUtils.showToolTip(suppAmount, "Please enter amount");
            return;
          }
          if ((!sett.hasOwnProperty("invPhoto")) || (!sett.invPhoto.hasOwnProperty("fileContent"))) {
            gUtils.showToolTip(thisForm.querySelector(".js_BtnInvPhoto"), "Please take a photo");
            return;
          }
          

          fields.quoteID = sett.autoID;
          fields.suppName = thisForm.suppName.value;
          fields.amount = thisForm.suppAmount.value;
          fields.photo = sett.invPhoto;
          header.name = thisFormName;
          header.frmAction = "quoteInv";
          header.action = "insert";
          let formData = [
              ["formData", JSON.stringify({header:header, fields:fields})], 
              ["action", "saveData"]
          ];

          param.formData = formData;
          param.offlineDescr = `Add Supplier Quote to Quote ${sett.quoteNo}`;
          db.fetchData(param).then((res) => {
              let rowItem = thisUtils.addSuppQuote();
              rowItem.compName.innerText = fields.suppName;
              rowItem.amount.innerText = fields.amount;
              gUtils.clearForm(thisForm.querySelector(".invCon"));
              delete sett.invPhoto;
              gUtils.frmSettings("set", thisFormName, sett);
              thisForm.querySelector(".js_invPhoto").style.display = "none";

          });

      };




      thisForm.estHours.onkeyup = function () {
          let con = this.closest(".js_estHoursCon");
          let dis = con.querySelector(".js_disEstHours");
          let thisInput = this;
          let numArr, hours, min, totalMin;
          numArr = thisInput.value.split(/[,.]/);
          
          min = (numArr.length > 1) ? parseInt(numArr[1]) : 0;
          dis.innerText = `${numArr[0]} HOURS ${min} MIN`;
          totalMin = ((parseInt(numArr[0])*60)+min);
          con.dataset.min = totalMin;
        
      }
      thisForm.estHours.onchange = function () {
          let sett = gUtils.frmSettings("get", thisFormName);
          let header = {}, fields = {}, param = {}, db = new DataManager();

          fields.autoID = sett.autoID;
          fields.estMins = thisForm.querySelector(".js_estHoursCon").dataset.min;
          header.name = thisFormName;
          header.frmAction = "estHours";
          let formData = [
              ["formData", JSON.stringify({header:header, fields:fields})], 
              ["action", "saveData"]
          ];
          param.offlineDescr = `Change Est Hours Job ${sett.jobNo}`;
          param.sendError = true;
          param.formData = formData;
          db.fetchData(param).then((res) => {
              
          }).catch((res) => {
            gUtils.showInfoBox("error", {msg:res});
          });
      }

      document.getElementById("frmQuoteBtnAddNote").onclick = function () {
          thisUtils.addNote();
      } 


      elm = document.getElementById("frmQuoteBtnComplete");
      elm.onclick = function () {
          let sett = gUtils.frmSettings("get", thisFormName);
          let header = {}, fields = {}, param = {}, db = new DataManager();
          fields.autoID = sett.autoID;
          header.frmAction = "complete";
          header.name = thisFormName;
          let formData = [
              ["formData", JSON.stringify({header:header, fields:fields})], 
              ["action", "saveData"]
          ];
          param.offlineDescr = `Quote Complete QT: ${sett.quoteNo}`;
          param.formData = formData;
          db.fetchData(param).then((res) => {
              let fUtils = new FrmJobDashUtils();
              fUtils.preSet({type:"quote"});
              gUtils.showForm("frmJobDash");
        });
      };
  };
  this.preSet = function (param) {
      thisUtils.clearForm();
      let sett = {};
      sett.autoID = param.autoID;
      gUtils.frmSettings("set", thisFormName, sett);
  };
  this.display = function () {
      thisUtils.clearForm();
      thisUtils.getData()
  };
  this.getData = function () {
      let sett = gUtils.frmSettings("get", thisFormName);
      let header = {}, fields = {}, param = {}, db = new DataManager();

      fields.autoID = sett.autoID;
      header.name = thisFormName;
      let formData = [
          ["formData", JSON.stringify({header:header, fields:fields})], 
          ["action", "getData"]
      ];

      param.formData = formData;
      db.fetchData(param).then((res) => {
          let offlineData = JSON.parse(window.localStorage.offlineData);
          offlineData.prods = res.prods;
          window.localStorage.offlineData = JSON.stringify(offlineData);
          
          thisUtils.buildJobInfo(res.job);
          thisUtils.buildJobItems(res.jobItems);
          thisUtils.buildQuoteNotes(res.notes);
          thisUtils.buildSuppQuotes(res.suppQuotes);
      });
  };

  this.addJobItem = function (param) {
      const newItem = ((param) && (param.hasOwnProperty("newItem"))) ? param.newItem : false;
      const addPos = ((param) && (param.hasOwnProperty("addPos"))) ? param.addPos : "post"; 

      let tBody = document.getElementById("frmQuoteTblItems").querySelector('tbody');

      let htmlStr = `
              <td>
                <div>
                  <input type="text" list="frmQuoteProdDataList" maxlength="100" class="gFrmInput js_title" placeholder="Title">
                  <div class="gjs_textareaCon">
                    <span></span>
                    <textarea class="js_descr" rows="1" data-maxlength="300" placeholder="Description"></textarea>
                  </div>
                </div>
              </td>
              <td><input type="number" class="gFrmInput js_qty" value=1 step=0.001></td>`;          

        let row = document.createElement("tr");
        row.innerHTML = htmlStr;


        let rowItem = {};
        rowItem.row = row;
        rowItem.qty = row.querySelector(".js_qty");
        rowItem.title = row.querySelector(".js_title");
        rowItem.descr = row.querySelector(".js_descr");

        if (!newItem) {
            rowItem.title.onkeyup = function (e) {
                if (!e.key) {
                    let thisElm = this;
                    let thisRow = thisElm.closest("tr");
                    let rowInfo = JSON.parse(thisRow.dataset.rowInfo);
                    let textarea = thisRow.querySelector("textarea");
                    let offlineData = JSON.parse(window.localStorage.offlineData);
                    let prods = offlineData.prods;
                    if (prods.hasOwnProperty(thisElm.value)) {
                      let prod = prods[thisElm.value];
                      rowInfo.prodID = prod.autoID;
                      textarea.value = prod.descr;
                      thisUtils.textAreaHeight(textarea);
                      thisRow.dataset.rowInfo = JSON.stringify(rowInfo);
                    }else{
                      rowInfo.prodID = 0;
                      thisRow.dataset.rowInfo = JSON.stringify(rowInfo);
                    }
                }
            }
  
            rowItem.title.onchange = function () {
                let thisElm = this;
                let row = thisElm.closest("tr");
                let rowInfo = JSON.parse(row.dataset.rowInfo);
                let textarea = row.querySelector("textarea");
                let offlineData = JSON.parse(window.localStorage.offlineData);
                let prods = offlineData.prods;
                if (prods.hasOwnProperty(thisElm.value)) {
                  let prod = prods[thisElm.value];
                  rowInfo.prodID = prod.autoID;
                  textarea.value = prod.descr;
                  thisUtils.textAreaHeight(textarea);
                }else{
                    rowInfo.prodID = 0;
                }
                row.dataset.rowInfo = JSON.stringify(rowInfo);
    
                saveItem(this.closest("tr"));
            };
            rowItem.descr.oninput = function () {
                thisUtils.textAreaHeight(this);
            };
            rowItem.descr.onchange = function () {
                saveItem(this.closest("tr"));
            }
            rowItem.qty.onchange = function () {
                saveItem(this.closest("tr"));
            };
            function saveItem(con) {
                let sett = gUtils.frmSettings("get", thisFormName);
                let header = {}, fields = {}, param = {}, db = new DataManager();
                let offlineData = JSON.parse(window.localStorage.offlineData);
                let inTitle = con.querySelector(".js_title");
                let inDesc = con.querySelector(".js_descr");
      
                con.classList.add("disable");
                let inputs = con.querySelectorAll("input");
                for (const input of inputs) {
                    input.disabled = true;
                }
      
                let rowInfo = JSON.parse(con.dataset.rowInfo);
      
                fields.autoID = rowInfo.autoID;
                fields.quoteID = sett.autoID;
                fields.prodID = rowInfo.prodID;
                fields.title = inTitle.value;
                fields.descr = inDesc.value;
                fields.qty = con.querySelector(".js_qty").value;
                header.name = thisFormName;
                header.frmAction = "jobItem";
                header.action = "update";
                let formData = [
                    ["formData", JSON.stringify({header:header, fields:fields})], 
                    ["action", "saveData"]
                ];
                param.offlineDescr = `Quote Item Change QT: ${sett.quoteNO}`;
                param.formData = formData;
                db.fetchData(param).then((res) => {
                      if (rowInfo.autoID == "insert") {
                          rowInfo.autoID = res;
                          rowInfo.action = "update";
                          con.dataset.rowInfo = JSON.stringify(rowInfo);
                      }
      
                      if (rowInfo.action == "delete") {
                          con.closest("table").deleteRow(con.rowIndex);
                      }else {
                          for (const input of inputs) {
                              input.disabled = false;
                              con.classList.remove("disable");
                          }
                      }
                  });
            }
        }else{
            for(const input of rowItem.row.querySelectorAll("input")){
                input.disabled = true;
            }
            rowItem.descr.disabled = true;
        }

        if (addPos == "pre"){ 
            tBody.prepend(row);
        }else{
            tBody.appendChild(row);
        }


        return rowItem;
  };
  this.addNote = function () {
    let noteCon = thisForm.querySelector(".notesCon");
    let htmlStr = `
        <div>
          <span class="userName"></span>
        </div>
        <div class="textPhotoCon">
          <textarea></textarea>
          <img class="photo" src="img/btnPhoto.png">
        </div>
        `;
    let div = document.createElement("div");
    div.innerHTML = htmlStr;
    div.classList.add("noteCon");
    div.dataset.autoID = "insert";
    div.dataset.photo = JSON.stringify({photoPath:null});

    
    let textarea = div.querySelector("textarea");
    textarea.oninput = function () {
        this.style.height = "auto";
        this.style.height = this.scrollHeight + "px";        
    }
    textarea.onchange = function () {
        saveNote(this.closest(".noteCon"));
    }

    let btnPhoto = div.querySelector(".photo");
    btnPhoto.onclick = function () {
      let con = this.closest(".noteCon");
      let fUtils = new FrmPhotoUtils();
      fUtils.photoPromise(JSON.parse(con.dataset.photo)).then((res) => {
          gUtils.showForm("frmQuote", {runDisplay:false});
          let photo = JSON.parse(con.dataset.photo);
          photo.fileContent = res.fileContent;
          con.dataset.photo = JSON.stringify(photo);
          saveNote(con);
      }).catch((res) =>{
          gUtils.showForm("frmQuote", {runDisplay:false});
      });
    };

    noteCon.prepend(div);
    return div;
    function saveNote(noteElm) {
        let sett = gUtils.frmSettings("get", thisFormName);
        let header = {}, fields = {}, param = {}, db = new DataManager();

        noteElm.classList.add("disabled");

        fields.autoID = noteElm.dataset.autoID;
        fields.photo = JSON.parse(noteElm.dataset.photo);
        fields.quoteID = sett.autoID;
        fields.note = noteElm.querySelector("textarea").value;
        header.name = thisFormName;
        header.frmAction = "quoteNote";
        let formData = [
            ["formData", JSON.stringify({header:header, fields:fields})], 
            ["action", "saveData"]
        ];
        param.offlineDescr = `Quote Note QT: ${sett.quoteNo}`;
        param.sendError = true;
        param.formData = formData;
        db.fetchData(param).then((res) => {
            if (fields.autoID == "insert") {
                noteElm.dataset.autoID = res.autoID;
            }
            fields.photo.photoPath = res.photoPath;
            delete fields.photo.fileContent;
            noteElm.dataset.photo = JSON.stringify(fields.photo);

            noteElm.classList.remove("disabled");
        }).catch((res) => {
          noteElm.classList.remove("disabled");
          gUtils.showInfoBox("error", {msg:res});
        });
    }
  }
  this.addSuppQuote = function () {
    let tBody = thisForm.querySelector(".js_tblSuppQuote");
    let htmlStr = `
      <td class="tblSuppName"></td>
      <td class="tblAmount"></td>`;

      let row = tBody.insertRow();
      row.dataset.photo = JSON.stringify({photoPath:null});
      row.innerHTML = htmlStr;

      let rowItem = {};
      rowItem.row = row;
      rowItem.compName = row.querySelector(".tblSuppName");
      rowItem.amount = row.querySelector(".tblAmount");

      return rowItem;
  };
  this.buildSuppQuotes = function (res) {
    let rowItem;
    for(const item of res) {
      rowItem = thisUtils.addSuppQuote();
      rowItem.compName.innerText = item.compName;
      rowItem.amount.innerText = item.amount;
    }

  };
  this.buildJobInfo = function (res) {
      let btnAccept = thisForm.querySelector(".js_BtnAcceptJob");
      let clientName = thisForm.querySelector(".js_clientName");
      let phone1Con = thisForm.querySelector(".js_phone1Con");
      let phone2Con = thisForm.querySelector(".js_phone2Con");
      let addCon = thisForm.querySelector(".clientAddCon");
      let note = thisForm.querySelector(".js_note");

      btnAccept.parentNode.style.display = (res.assignID == null) ? "flex" : "none";
      for (const key of Object.keys(res)) {
          let field = thisForm.querySelector(`.js_${key}`);
          if (field != undefined) {
              field.innerText = res[key];
          }
      }
      if (res.estMins != 0) {
          let mins = parseInt(res.timeFrame);
          let hours = Math.floor(mins / 60);
          let min = mins-(hours * 60);
          thisForm.estHours.value = `${hours}.${min}`;
      }else{
          thisForm.estHours.value = 0;
      }
      thisForm.estHours.onkeyup();
      clientName.innerText = res.clientName;
      clientName.style.display = "block";
      phone1Con.style.display = (res.phone1 == "") ? "none" : "flex";
      phone2Con.style.display = (res.phone2 == "") ? "none" : "flex";
      addCon.style.display = (res.clientAdd == "") ? "none" : "block";
      note.innerHTML = res.note;
      note.parentNode.style.display = (res.note == "") ? "none" : "block";
  };
  this.buildJobItems = function (res) {
      let rowItem;
      for(const item of res) {
        rowItem = thisUtils.addJobItem();
        rowItem.row.dataset.rowInfo = JSON.stringify({autoID:item.autoID, prodID:item.prodID});
        rowItem.title.value = item.title;
        rowItem.descr.value = item.descr;
        rowItem.qty.value = item.qty;
      }


  };
  this.buildQuoteNotes = function (res) {
      let note;
      for(const item of res){
          note = thisUtils.addNote();
          note.dataset.autoID = item.autoID;
          note.dataset.photo = JSON.stringify({photoPath:item.photoPath});

          note.querySelector("textarea").value = item.note;
          if (item.photoPath != null) {
              note.querySelector("img").src = "img/blueI.jpeg";
          }
          note.value = item.note;

      }

  }
  this.productSelected = function (row) {
      console.log(row);
      thisForm.product.dataset.prodID = row.autoID;
      thisForm.product.value = `${row.prodCode} - ${row.title}`;
      thisForm.querySelector(".js_prodCode").clear();
      thisForm.querySelector(".js_prodTitle").clear();
      thisForm.prodDescr.value = row.descr;
      thisUtils.textAreaHeight(thisForm.prodDescr);
      
  }

  this.textAreaHeight = function (textarea) {
    let con = textarea.closest(".gjs_textareaCon");
    let count = con.querySelector("span");    
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
    let chr = textarea.value.length;
    let max = parseInt(textarea.dataset.maxlength);
    if (chr <= max) {
        count.innerText = `${chr}/${max}`;
    }else{
      textarea.value = textarea.value.slice(0, -1);
    }
  }

  this.clearForm = function () {
      thisForm.reset();

      thisForm.querySelector(".js_clientName").style.display = "none";
      thisForm.querySelector(".js_phone1Con").style.display = "none";
      thisForm.querySelector(".js_phone2Con").style.display = "none";
      thisForm.querySelector(".clientAddCon").style.display = "none";
      thisForm.querySelector(".js_note").parentNode.style.display = "none";
      thisForm.querySelector(".js_disEstHours").innerText = "";

      thisForm.querySelector(".js_prodCode").clear();
      thisForm.querySelector(".js_prodTitle").clear();

      thisForm.product.dataset.prodID = 0;
      
      let dbLbl = thisForm.querySelectorAll(".js_dbLbl");
      for (const lbl of dbLbl) {
          lbl.innerText = "";
      }
      let tBody = document.getElementById("frmQuoteTblItems").querySelector("tbody");
      tBody.innerHTML = "";
      thisForm.querySelector(".notesCon").innerHTML = "";

  };
}

function FrmJobSignUtils() {
    var thisUtils = this;
    var thisFormName = "frmJobSign";
    var thisForm = document.getElementById(thisFormName);
    var gUtils = new GlobalUtils();

    this.initForm = function () {
      thisUtils.setListeners();
      thisForm.setAttribute("data-utils", thisUtils.constructor.name);
      thisForm.setAttribute("data-parents", JSON.stringify(["appView"]));
    };
    this.setListeners = function () {
        let elm;

        thisForm.querySelector(".js_btnBack").onclick = function () {
            gUtils.showForm("frmJob", {runDisplay:false});
        };

        elm = document.getElementById("frmJobSignBtnClientSig");
        elm.onclick = function () {
            let fUtils = new FrmSigUtils();
            fUtils.preSet({actUtils:"FrmJobSignUtils", actFunc:"jobSignedOff", frmBack:"frmJobSign"});
            gUtils.showForm("frmSig", {float:true});
        };
    };
    this.preSet = function (param) {
        thisUtils.clearForm();
        let sett = {};
        sett.autoID = param.autoID;
        gUtils.frmSettings("set", thisFormName, sett);
    };
    this.display = function () {
        thisUtils.getData();
    };
    this.getData = function () {
        let sett = gUtils.frmSettings("get", thisFormName);
        let header = {}, fields = {}, param = {},  db = new DataManager();

        fields.autoID = sett.autoID;
        header.name = thisFormName;
        let formData = [
            ["formData", JSON.stringify({header:header, fields:fields})], 
            ["action", "getData"]
        ];

        param.formData = formData;
        db.fetchData(param).then((res) => {
            thisUtils.buildJobList(res);
        });
    };
    this.buildJobList = function (res) {
        let tBody = document.getElementById("frmJobSignTblListBody");
        let row, cell, elmCon, elm;
        for (const item of res) {
            row = tBody.insertRow();
            cell = row.insertCell();
            elmCon = document.createElement("div");
            elmCon.classList.add("jobCon");
            elm = document.createElement("div");
            elm.innerText = item.title;
            elmCon.appendChild(elm);
            elm = document.createElement("div");
            elm.innerText = item.descr;
            elmCon.appendChild(elm);
            cell.appendChild(elmCon);
        }
    };
    this.jobSignedOff = function (res) {
        let sett = gUtils.frmSettings("get", thisFormName);
        let header = {}, fields = {}, param = {}, db = new DataManager();

        fields.fileContent = res.fileContent;
        fields.jobID = sett.autoID;
        header.name = thisFormName;
        let formData = [
            ["formData", JSON.stringify({header:header, fields:fields})], 
            ["action", "saveData"]
        ];

        param.formData = formData;
        param.offlineDescr = `Client Sign off Job ${sett.jobNo}`;
        db.fetchData(param).then((res) => {
            if (window.localStorage.hasOwnProperty("jobTime")) {
                let savedTime = JSON.parse(window.localStorage.jobTime);
                if (savedTime.jobID == sett.autoID) {
                    let fUtils = new FrmJobUtils();
                    fUtils.startStopTimer("end");
                }
            }

            let fUtils = new FrmJobDashUtils();
            fUtils.preSet({type:"job"});
            gUtils.showForm("frmJobDash");

        });

    };
    this.clearForm = function () {
        thisForm.reset();
        document.getElementById("frmJobSignTblListBody").innerHTML = "";
    };
}

function FrmSigUtils() {
    var thisUtils = this;
    var thisFormName = "frmSig";
    var thisForm = document.getElementById(thisFormName);
    var btnSave = document.getElementById("frmSigBtnSave");
    var gUtils = new GlobalUtils();
    var canvas = document.getElementById('frmSigCanvas');
    var context = canvas.getContext("2d");
    context.strokeStyle = "black";
    context.lineJoin = "round";
    context.lineWidth = 5;
    var clickX = [];
    var clickY = [];
    var clickDrag = [];
    var paint;

    this.initForm = function () {
        thisForm.onsubmit = function(evt){
            evt.preventDefault();
            return false;
        };
        thisUtils.setListeners();
        thisForm.setAttribute("data-utils","FrmSigUtils");
        thisForm.setAttribute("data-parents", JSON.stringify(["appView"]));
        thisUtils.sizeCanvas();
    };
    this.setListeners = function () {
        var elm;
        canvas.ontouchstart = thisUtils.touchstartEventHandler;
        canvas.ontouchmove = thisUtils.touchMoveEventHandler;
        canvas.ontouchend = thisUtils.mouseUpEventHandler;
        thisForm.onresize = thisUtils.sizeCanvas;
        btnSave.onclick = thisUtils.valData;

        elm = document.getElementById("frmSigBtnBack");
        elm.onclick = function () {
            let sett = gUtils.frmSettings("get", thisFormName);
            gUtils.showForm(sett.frmBack, {runDisplay:false});
        };
        elm = document.getElementById("frmSigBtnClear");
        elm.onclick = function () {
            thisUtils.clearForm();
        };

    };
    this.preSet = function (param) {
        let sett = {};
        sett.parentInfo = param.parentInfo;
        sett.frmAction = param.frmAction;
        sett.actUtils = param.actUtils;
        sett.actFunc = param.actFunc;
        sett.frmBack = param.frmBack;
        sett.openFile = (param.hasOwnProperty("openFile")) ? param.openFile : false;
        gUtils.frmSettings("set", thisFormName, sett);
    };

    this.display = function () {
        thisUtils.clearForm();
    };
    this.addClick = function (x, y, dragging) {
        clickX.push(x);
        clickY.push(y);
        clickDrag.push(dragging);
    };

    /**
     * Redraw the complete canvas.
     */
    this.redraw = function () {
        // Clears the canvas
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        for (var i = 0; i < clickX.length; i += 1) {
            if (!clickDrag[i] && i == 0) {
                context.beginPath();
                context.moveTo(clickX[i], clickY[i]);
                context.stroke();
            } else if (!clickDrag[i] && i > 0) {
                context.closePath();

                context.beginPath();
                context.moveTo(clickX[i], clickY[i]);
                context.stroke();
            } else {
                context.lineTo(clickX[i], clickY[i]);
                context.stroke();
            }
        }
    };

    /**
     * Draw the newly added point.
     * @return {void}
     */
    this.drawNew = function () {
        context.lineWidth = 5;
        var i = clickX.length - 1
        if (!clickDrag[i]) {
            if (clickX.length == 0) {
                context.beginPath();
                context.moveTo(clickX[i], clickY[i]);
                context.stroke();
            } else {
                context.closePath();

                context.beginPath();
                context.moveTo(clickX[i], clickY[i]);
                context.stroke();
            }
        } else {
            context.lineTo(clickX[i], clickY[i]);
            context.stroke();
        }
    };
    this.touchstartEventHandler = function (e) {
        paint = true;
        if (paint) {
            thisUtils.addClick(e.touches[0].pageX - canvas.offsetLeft, e.touches[0].pageY - 60, false);
            thisUtils.drawNew();
        }
    };
    this.touchMoveEventHandler = function (e) {
        if (paint) {
            thisUtils.addClick(e.touches[0].pageX - canvas.offsetLeft, e.touches[0].pageY - 60, true);
            thisUtils.drawNew();
        }
    };
    this.mouseUpEventHandler = function (e) {
        context.closePath();
        paint = false;
    };
    this.sizeCanvas = function () {
        if ((window.outerWidth - 20) / 1.777777 < (window.outerHeight - 100)) {
            canvas.width = window.outerWidth - 20;
            canvas.height = canvas.width / 1.77777777;
        }else{
            if ((window.outerHeight - 100) * 1.777777 < (window.outerWidth - 20)) {
                canvas.height = window.outerHeight - 100;
                canvas.width = canvas.height * 1.777777777;
            }
        }
    };
    this.valData = function () {
        let sett = gUtils.frmSettings("get", thisFormName);
        var newCanvas = document.createElement("canvas");
        newCanvas.style.backgroundColor = "transparent";
        var MAX_WIDTH = 100;
        var MAX_HEIGHT = 56;

        var imgWidth = canvas.width;
        var imgHeight = canvas.height;
        var width = imgWidth;
        var height = imgHeight;
        var scale;
        if (width > height) {
          if (width >= MAX_WIDTH) {
            scale = MAX_WIDTH / width;
            height = Math.round(height * scale);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            scale = MAX_HEIGHT / height;
            width = Math.round(width * scale);
            height = MAX_HEIGHT;
          }
        }

        newCanvas.width = width;
        newCanvas.height = height;
        var sigImg = new Image();
        var ctx = newCanvas.getContext("2d");
        sigImg.onload = function () {
            ctx.drawImage(sigImg, 0, 0, width, height);
            var fileContent = newCanvas.toDataURL("image/png");
            var utils = new window[sett.actUtils]();
            utils[sett.actFunc]({fileContent:fileContent});
        };
        sigImg.src = canvas.toDataURL("image/png");

    };
    this.clearForm = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
    };
}

function FrmPhotoUtils() {
    var thisUtils = this;
    var thisFormName = "frmPhoto";
    var thisForm = document.getElementById(thisFormName);
    var gUtils = new GlobalUtils();
    var activeBlobUrl = null; // Private variable to track memory

    this.initForm = function () {
      thisUtils.setListeners();
      thisForm.setAttribute("data-utils", thisUtils.constructor.name);
      thisForm.setAttribute("data-parents", JSON.stringify(["appView"]));
    };
    this.setListeners = function () {
        let elm;

        elm = document.querySelector(".js_btnPhoto");
        elm.onclick = function () {
            thisForm.file.click();
        };

        thisForm.file.onchange = thisUtils.photoSelected;

        thisForm.querySelector(".js_btnSave").onclick = function () {
            thisUtils.valData();
        };

        thisForm.querySelector(".js_btnBack").onclick = function () {
            let sett = gUtils.frmSettings("get", thisFormName);
            gUtils.showForm(sett.frmBack, {runDisplay:false});
        };

    };
    this.preSet = function (param) {
        let sett = {};
        sett.parentInfo = param.parentInfo;
        sett.frmAction = param.frmAction;
        sett.frmUtils = param.frmUtils;
        sett.frmFunc = param.frmFunc;
        sett.frmBack = param.frmBack;
       // sett.openFile = (param.hasOwnProperty("openFile")) ? param.openFile : false;
        gUtils.frmSettings("set", thisFormName, sett);
    };
    this.photoPromise = function (param) {
        if (param == undefined) {
            param = {};
        }
        thisUtils.clearForm();
        let sett = {};
        sett.maxH = (param.hasOwnProperty("maxH")) ? param.maxH : 800;
        sett.maxW = (param.hasOwnProperty("maxW")) ? param.maxW : 800;
        sett.showForm = (param.hasOwnProperty("showForm")) ? param.showForm : true;
        gUtils.frmSettings("set", thisFormName, sett);

        /*if (param.hasOwnProperty("table")) {
            let header = {}, fields = {}, param = {}, formData = new FormData(), db = new DataManager();
            fields.table = param.table;
            fields.itemID = param.itemID;
            header.name = "getFile";
            formData.append("formData", JSON.stringify({header:header, fields:fields}));
            formData.append("action", "getData");
            param.formData = formData;
            param.returnType = "blob";
            db.fetchData(param).then((blob) => {
                if (blob.size < 200) { 
                    blob.text().then(text => console.error("Server Error Message:", text));
                }      
                if (blob && blob.size > 0) {
                    let sett = gUtils.frmSettings("get", thisFormName);
                    let viewerBody = document.getElementById('viewerBody');
                    
                    // 1. REVOKE previous URL
                    if (activeBlobUrl) {
                        URL.revokeObjectURL(activeBlobUrl);
                    }

                    // 2. Identify file type
                    let ext = sett.itemID.split('.').pop().toLowerCase(); 
                    let imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
                    activeBlobUrl = URL.createObjectURL(blob);
                    
                    viewerBody.innerHTML = '';

                    // IMAGE LOGIC (Stays fast and simple)
                    if (imageTypes.includes(ext) || blob.type.startsWith('image/')) {
                        let img = document.getElementById("frmPhotoImg")
                        img.src = activeBlobUrl;
                    } 
                    // PDF LOGIC (New Canvas Renderer)
                    else if (ext === 'pdf' || blob.type === 'application/pdf') {
                        viewerBody.innerHTML = '<p style="color:white; text-align:center;">Initializing PDF Engine...</p>';

                        try {
                            // Dynamic Import from your cached JS files
                            const pdfjsLib = await import('./pdf.mjs');
                            pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';

                            const loadingTask = pdfjsLib.getDocument(activeBlobUrl);
                            const pdf = await loadingTask.promise;
                            
                            // Render first page
                            const page = await pdf.getPage(1);
                            
                            // Scale 1.5 is usually good for mobile clarity
                            const viewport = page.getViewport({ scale: 1.5 });
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            canvas.style.width = '100%'; // Responsive fit
                            canvas.style.height = 'auto';

                            viewerBody.innerHTML = ''; // Clear "Initializing" text
                            viewerBody.appendChild(canvas);

                            await page.render({
                                canvasContext: context,
                                viewport: viewport
                            }).promise;

                        } catch (err) {
                            console.error("PDF.js Error:", err);
                            viewerBody.innerHTML = `
                                <p style="color:red; text-align:center;">Preview Error.</p>
                                <a href="${activeBlobUrl}" target="_blank" download="document.pdf" 
                                  style="color:#3498db; display:block; text-align:center;">Download instead</a>`;
                        }
                    } 
                    else {
                        viewerBody.innerHTML = `<p style="color:white; text-align:center;">No preview for .${ext}</p>`;
                    }
                } else {
                    gUtils.showInfoBox("alert", {msg:"Could not get file"});
                }
            }).catch(err => {
                gUtils.showInfoBox("alert", {msg:"Could not get file"});
            });
        }*/

        if ((param.hasOwnProperty("photoPath")) && (param.photoPath != null)) {
            document.getElementById("frmPhotoImg").src = param.photoPath;
            document.getElementById("frmPhotoImgCon").style.display = "flex";
        }

        if (sett.showForm) {
          gUtils.showForm("frmPhoto", {float:true, runDisplay:false});
        }else{
            thisForm.file.click();
        }


        return new Promise((resolve, reject) => {
            thisForm.querySelector(".js_btnSave").onclick = function () {
                let sett = gUtils.frmSettings("get", thisFormName);
                resolve({fileContent:sett.fileContent, fileExtention:sett.fileExtention, fileType:sett.fileType});
            }
            thisForm.querySelector(".js_btnBack").onclick = function () {
                reject("closed");
            }
        });

    }
    this.display = function () {
        let sett = gUtils.frmSettings("get", thisFormName);
        thisUtils.clearForm();
       /* if (sett.openFile) {
            thisForm.querySelector()
        }*/
    };
    this.valData = function () {
        let sett = gUtils.frmSettings("get", thisFormName);
        if (!sett.hasOwnProperty("fileContent")) {
            gUtils.showToolTip(thisForm.querySelector(".js_btnPhoto"), "You have not selected a photo");
            return;
        }

        let fUtils = new window[sett.frmUtils]();
        fUtils[sett.frmFunc]({parentInfo:sett.parentInfo, fileContent:sett.fileContent});
        gUtils.showForm(sett.frmAction, {runDisplay:sett.runDisplay});
    };
    this.photoSelected = function () {
        let sett = gUtils.frmSettings("get", thisFormName);
        var photoCon = document.getElementById("frmPhotoImgCon");
        var fileInput = thisForm.file;
        var photo = document.getElementById("frmPhotoImg");
        var file = fileInput.files[0];
        
        if((!file.type.match(/image.*/) && (!file.type.match(/pdf.*/)))){
            gUtils.showInfoBox("alert", {"msg":"The file you selected does not seem to be a image or pdf file."});
            return;
        }

        sett.fileExtention = file.name.substring(file.name.lastIndexOf('.'));
        sett.fileType = file.type;
        if (file.type.match(/pdf.*/)) {
              let reader = new FileReader();
              reader.onloadend = async function (e) {
                  sett.fileContent = e.target.result;
                  gUtils.frmSettings("set", thisFormName, sett);
                  if (!sett.showForm) {
                    thisForm.querySelector(".js_btnSave").onclick();
                  }            
    
              };
              reader.readAsDataURL(file);
              photo.onload = "";
              photo.src = "img/report.gif";
        }else{
            photo.onload = function () {
              gUtils.resizeImg({photo:this, maxW:sett.maxW, maxH:sett.maxH}).then((img) =>{
                  sett.fileContent = img;
                  photo.onload = "";
                  photo.src = img;
                  gUtils.frmSettings("set", thisFormName, sett);
                  if (!sett.showForm) {
                    thisForm.querySelector(".js_btnSave").onclick();
                  }   
      
              });
            };
            photo.src = window.URL.createObjectURL(file);
        }

        photoCon.style.display = "flex";
    };

    this.clearForm = function () {
        thisForm.reset();
        let imgCon = document.getElementById("frmPhotoImgCon");
        imgCon.style.display = "none";

    };
}

function FrmVehicleExpUtils() {
  var thisUtils = this;
  var thisFormName = 'frmVehicleExp';
  var thisForm = document.getElementById(thisFormName);
  var gUtils = new GlobalUtils();

  this.initForm = function () {
    thisUtils.setListeners();
    thisForm.setAttribute('data-utils', thisUtils.constructor.name);
    thisForm.setAttribute('data-parents', JSON.stringify(['appView']));
  };
  this.setListeners = function () {
      let elm;

      thisForm.payCard.onclick = function () {
          let thisElm = this;
           
          if (thisElm.checked) {
              thisForm.suppID.style.display = "none";
              thisForm.suppID.value = "";
              thisForm.suppID.removeAttribute("required");
              thisForm.invNo.style.display = "none";
              thisForm.invNo.value = "";
              thisForm.invNo.removeAttribute("required");
          }else{
              thisForm.suppID.style.display = "block";
              thisForm.suppID.setAttribute("required", "");
              thisForm.invNo.style.display = "block";
              thisForm.invNo.setAttribute("required", "");
          }
      }

      thisForm.querySelector(".js_BtnSave").onclick = function () {
          thisUtils.valData();
      }

      thisForm.querySelector(".js_BtnPhoto").onclick = function () {
          let sett = gUtils.frmSettings("get", thisFormName);
          let fUtils = new FrmPhotoUtils();
          fUtils.photoPromise({showForm:false}).then((res) => {
              gUtils.showForm("frmVehicleExp", {runDisplay:false});
              let photoImg = thisForm.querySelector(".js_photo");
              sett.photo = res;
              photoImg.src = res.fileContent;
              photoImg.style.display = "block";
              gUtils.frmSettings("set", thisFormName, sett);
          }).catch((res) =>{
              gUtils.showForm("frmVehicleExp", {runDisplay:false});
          });

      }

      elm = thisForm.querySelector(".js_expTypeCon");
      for (const item of elm.children) {
          item.onclick = function () {
              thisUtils.expTypeSelected(this);
          }
      }
  };
  this.preSet = function (param) {
    thisUtils.clearForm();
    let sett = {};
    let header = thisForm.querySelector(".gFrmHeader");
    let tabCon = thisForm.querySelector(".js_expTypeCon");
    
    sett.frmType = param.type;
    sett.panel = ".js_stockPanel"; 

    switch (sett.frmType) {
      case "vehicle":
          header.innerText = "Vehicle Expenses";
          tabCon.style.display = "flex";
          sett.expType = "stock";
        break;
      case "office":
          header.innerText = "Office Expenses";
          tabCon.style.display = "none";
          sett.expType = "office";
        break;
      case "tool":
          header.innerText = "Tools/Equipment Expenses";
          tabCon.style.display = "none";
          sett.expType = "tool";
        break;

    }
    gUtils.frmSettings('set', thisFormName, sett);
  };
  this.display = function () {
      thisUtils.getData();
  };
  this.getData = function () {
      let sett = gUtils.frmSettings("get", thisFormName);
      let header = {},  param = {},  db = new DataManager();
      header.name = thisFormName;
      header.frmType = sett.frmType;
      let formData = [
          ["formData", JSON.stringify({header:header})], 
          ["action", "getData"]
      ];

      param.formData = formData;
      param.sendError = true;
      db.fetchData(param).then((res) => {
          thisUtils.buildLastUpdated(res.lastUploads);
          let selects = thisForm.querySelectorAll(".vehicleIDSelect");
          
          if (res.hasOwnProperty("vehicles")) {
              
              for(const select of selects){
                  select.innerHTML = "";
                  gUtils.buildSelectOption({select:select, optText:"Select vehicle", optValue:""});
                  for(const item of res.vehicles){
                    gUtils.buildSelectOption({select:select, optText:item.descr, optValue:item.autoID});
                  }
                  select.value = window.sessionStorage.vehicleID;
                  select.parentNode.style.display = "block";
              }
          }else{
              for(const select of selects){
                select.parentNode.style.display = "none";
              }
              
          }
      }).catch((res) =>{
          if (res == "Failed to fetch") {
              let offData = JSON.parse(window.localStorage.offlineData);
              thisUtils.buildLastUpdated("offline");
              if (sett.frmType == 'vehicle') {
                  let selects = thisForm.querySelectorAll(".vehicleIDSelect");
                  for(const select of selects){
                      gUtils.buildSelectOption({select:select, optText:"Select vehicle", optValue:""});
                      for(const item of offData.vehicles){
                        gUtils.buildSelectOption({select:select, optText:item.descr, optValue:item.autoID});
                        
                      }
                      
                      select.parentNode.style.display = "block";
                  }
              }

          }else{
              gUtils.showInfoBox("error", {msg:res});
          }
      });
  }
  this.expTypeSelected = function (tab) {
      let tabCon = thisForm.querySelector(".js_expTypeCon");
      let expPanelsCon = thisForm.querySelector(".js_panelsCon");
      let sett = gUtils.frmSettings("get", thisFormName);
      sett.panel = tab.dataset.panel;
      sett.expType = tab.dataset.exp_type;
      for (const item of tabCon.children) {
          item.classList.remove("selected");
      }
      for (const item of expPanelsCon.children) {
          item.style.display = "none";
      }
      thisForm.querySelector(tab.dataset.panel).style.display = "block";
      tab.classList.add("selected");
      gUtils.frmSettings("set", thisFormName, sett);
  }
  this.buildLastUpdated = function (param) {
      const tBody = thisForm.querySelector(".js_tblUpBody");
      const header = thisForm.querySelector(".js_lblUpHeader");
      tBody.innerHTML = "";
      header.innerText = (param == "offline") ? "--Offline-- Canot display uploads": "Your last uploads";

      if (param == "offline") {

        return;
      }

      let row, cell;
      for(const item of param){
          row = tBody.insertRow();
          cell = row.insertCell();
          cell.innerText = item.disDate;
          cell = row.insertCell();
          cell.innerText = (item.supplierName != null) ? item.supplierName : item.descr;
          cell = row.insertCell();
          cell.innerText = parseFloat(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2,
            maximumFractionDigits: 2, minimumIntegerDigits: 1});
      }
  }

  this.valData = function () {
      let sett = gUtils.frmSettings("get", thisFormName);
      let header = {}, fields = {}, param = {}, db = new DataManager();
      let descr;

      fields = gUtils.getInputs(thisForm.querySelector(sett.panel));
      if (!fields) {
          return;
      }

      if (!sett.hasOwnProperty("photo")) {
          gUtils.showToolTip(thisForm.querySelector(".js_BtnPhoto"), "You must add a photo");
          return;
      }
      switch (sett.expType) {
        case "stock":
            var vehicleID = thisForm.querySelector(".stockVehicleID");
            if (vehicleID.value == "") {
              gUtils.showToolTip(vehicleID, "Please select vehicle");
              return;
            }

            fields.payCard = (thisForm.payCard.checked) ? 1 : 0;
            descr = "Vehicle stock invoice";
          break;
        case "fuel":
            var vehicleID = thisForm.querySelector(".fuelVehicleID");
            if (vehicleID.value == "") {
              gUtils.showToolTip(vehicleID, "Please select vehicle");
              return;
            }
            descr = "Fuel expense";
          break;
        case "office":
            descr = "Office expense";
          break;
        case "tool":
          descr = "Tools/Equipment expense";
          break;

      }

      fields.photo = sett.photo;
      header.frmType = sett.frmType;
      header.expType = sett.expType;
      header.name = thisFormName;
      let formData = [
          ["formData", JSON.stringify({header:header, fields:fields})], 
          ["action", "saveData"]
      ];

      param.formData = formData;
      param.offlineDescr = descr;
      db.fetchData(param).then((res) => {
          gUtils.showForm("frmJobDash");
      });

  }
  this.buildSelectOpt = function () {
      let offlineData = JSON.parse(window.localStorage.offlineData);
      let supps = offlineData.suppliers;
      let suppIn = thisForm.suppID;
      suppIn.innerHTML = "";
      let optStr = `<option value="">Select Supplier</option>`;
      for (const item of supps) {
        optStr += `<option value="${item.autoID}">${item.supplierName}</optioin>`;
      }
      suppIn.innerHTML = optStr;
  }
  this.clearForm = function () {
    thisForm.reset();
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so we add 1
    const day = String(today.getDate()).padStart(2, '0');
    thisForm.transDate.value = `${year}-${month}-${day}`;  
    thisForm.invDate.value = `${year}-${month}-${day}`; 

    thisForm.payCard.checked = true;
    thisForm.payCard.onclick();
    thisForm.querySelector(".js_tabStock").onclick();
    thisForm.querySelector(".js_photo").style.display = "none";
    this.buildSelectOpt();

  };
}

function frmRegDeviceUtils() {
    var thisUtils = this;
    var thisFormName = "frmRegDevice";
    var thisForm = document.getElementById(thisFormName);
    var gUtils = new GlobalUtils();

    this.initForm = function () {
      thisUtils.setListeners();
      thisForm.setAttribute("data-utils", thisUtils.constructor.name);
      thisForm.setAttribute("data-parents", JSON.stringify(["fullView"]));
    };
    this.setListeners = function () {
        let elm;

        thisForm.querySelector(".js_btnSave").onclick = function () {
            thisUtils.valData();
        };
    };
    this.preSet = function (param) {
        let sett = {};
        sett.autoID = param.autoID;
        gUtils.frmSettings("set", thisFormName, sett);
    };
    this.display = function () {
        thisUtils.clearForm();
    };
    this.valData = function () {
        let header = {}, fields = {}, param = {}, db = new DataManager();
        if (thisForm.code.value == "") {
            gUtils.showToolTip(thisForm.code, "You must enter a code.");
            return;
        }
        fields.code = thisForm.code.value;
        header.name = thisFormName;
        let formData = [
            ["formData", JSON.stringify({header:header, fields:fields})], 
            ["action", "saveData"]
        ];
        param.saveOffline = false;
        param.formData = formData;
        param.fileName = "public.php";
        db.fetchData(param).then((res) => {
            if (res != "No") {
                gUtils.setUser(res);
            }else{
                gUtils.showInfoBox("alert", {msg:"There is no activation code that match your code."});
            }
        });
    };
    this.clearForm = function () {
        thisForm.reset();
    };
}

function FrmGetGPSUtils() {
  var thisUtils = this;
  var thisFormName = 'frmGetGPS';
  var thisForm = document.getElementById(thisFormName);
  var gUtils = new GlobalUtils();

  this.initForm = function () {
    thisUtils.setListeners();
    thisForm.setAttribute('data-utils', thisUtils.constructor.name);
    thisForm.setAttribute('data-parents', JSON.stringify(['appView']));
  };
  this.setListeners = function () {
      thisForm.querySelector(".js_BtnGetGPS").onclick = function () {
        // Check if the browser supports Geolocation
            if (navigator.geolocation) {
                const options = {
                    enableHighAccuracy: true, // Use GPS instead of just Wi-Fi/Cell towers
                    timeout: 5000,            // Wait 5 seconds max
                    maximumAge: 0             // Don't use a cached location
                };

                navigator.geolocation.getCurrentPosition(thisUtils.posision, thisUtils.gpsError, options);
            } else {
                gUtils.showInfoBox("error", {msg: "Geolocation is not supported by this browser."});
            }          
      };

      thisForm.querySelector(".js_BtnSave").onclick = function () {
          thisUtils.valData();
      };

      thisForm.querySelector(".js_BtnBack").onclick = function () { 
          let sett = gUtils.frmSettings("get", thisFormName);
          gUtils.showForm(sett.frmBack, {runDisplay:false});
      };
  };
  this.preSet = function (param) {
    thisUtils.clearForm();
    let sett = {};
    sett.actUtils = param.actUtils;
    sett.frmAct = param.frmAct;
    sett.actFunc = param.actFunc;
    sett.frmBack = param.frmBack;
    sett.type = param.type;
    gUtils.frmSettings('set', thisFormName, sett);
  };
  this.display = function () {

  };
  this.posision = function (position) {
      console.log(position);
      let sett = gUtils.frmSettings("get", thisFormName);
      sett.lat = position.coords.latitude;
      sett.lng = position.coords.longitude;
      sett.accuracy = position.coords.accuracy;
      gUtils.frmSettings("set", thisFormName, sett);
      thisForm.querySelector(".js_lat").innerText = `${position.coords.latitude}`;
      thisForm.querySelector(".js_lng").innerText = `${position.coords.longitude}`;
      thisForm.querySelector(".js_accuracy").innerText = `${position.coords.accuracy} meters`;
      thisForm.querySelector(".js_status").innerText = "Location retrieved";
  }
  this.gpsError = function (error) {
      switch(error.code) {
        case error.PERMISSION_DENIED:
          gUtils.showInfoBox("error", {msg: "User denied the request for Geolocation."});
          break;
        case error.POSITION_UNAVAILABLE:
          gUtils.showInfoBox("error", {msg: "Location information is unavailable."});
          break;
        case error.TIMEOUT:
          gUtils.showInfoBox("error", {msg: "The request to get user location timed out."});
          break;
        default:
          gUtils.showInfoBox("error", {msg: "An unknown error occurred."});
          break;
      }
  };
  this.valData = function () {

      let sett = gUtils.frmSettings("get", thisFormName);
      if (sett.lat == undefined || sett.lng == undefined) {
        gUtils.showInfoBox("error", {msg:"GPS location is not available."});
        return;
      }
      
      let fUtils = new window[sett.actUtils]();
      fUtils[sett.actFunc]({lat:sett.lat, lng:sett.lng, accuracy:sett.accuracy});
      console.log(sett.frmAct);
      gUtils.showForm(sett.frmAct, {runDisplay:false});
  }
  this.clearForm = function () {
    thisForm.reset();
  };
}

function FrmFileViewerUtils() {
  var thisUtils = this;
  var thisFormName = 'frmFileViewer';
  var thisForm = document.getElementById(thisFormName);
  var gUtils = new GlobalUtils();
  var activeBlobUrl = null; // Private variable to track memory

  this.initForm = function () {
    thisUtils.setListeners();
    thisForm.setAttribute('data-utils', thisUtils.constructor.name);
    thisForm.setAttribute('data-parents', JSON.stringify(['appView']));
  };

  this.setListeners = function () {
    thisForm.querySelector(".js_BtnBack").onclick = function () {
      let sett = gUtils.frmSettings("get", thisFormName);
      gUtils.showForm(sett.frmBack, {runDisplay:false});
    }
  };

  this.preSet = function (param) {
    let sett = {};
    sett.table = param.table;
    sett.itemID = param.itemID; // IMPORTANT: Ensure this is passed in
    sett.frmBack = param.frmBack;
    gUtils.frmSettings('set', thisFormName, sett);
  };

  this.display = function () {
    thisUtils.clearForm();
    thisUtils.getData();
  };

  this.getData = function () {
    let sett = gUtils.frmSettings("get", thisFormName);
    let viewerBody = document.getElementById('viewerBody');
    
    // Show a loader while fetching
    viewerBody.innerHTML = '<p style="color:white; text-align:center; padding-top:20px;">Fetching secure file...</p>';

    let header = {}, fields = {}, param = {}, formData = new FormData(), db = new DataManager();
    
    // We send the filePath to the server so it knows which file to stream back
    fields.itemID = sett.itemID; 
    header.name = thisFormName;
    header.table = sett.table;
    formData.append("formData", JSON.stringify({header:header, fields:fields}));
    formData.append("action", "getData"); // Use your specific backend action
    
    param.formData = formData;
    param.returnType = "blob"; 
    console.log(header);
    console.log(fields);
    db.fetchData(param).then((blob) => {
        if (blob.size < 200) { 
            blob.text().then(text => console.error("Server Error Message:", text));
        }      
        if (blob && blob.size > 0) {
            thisUtils.displayFile(blob);
        } else {
            viewerBody.innerHTML = '<p style="color:red; text-align:center;">Failed to load file data.</p>';
        }
    }).catch(err => {
        viewerBody.innerHTML = '<p style="color:red; text-align:center;">Error accessing file.</p>';
    });
  }

this.displayFile = async function (blob) {
    let sett = gUtils.frmSettings("get", thisFormName);
    let viewerBody = document.getElementById('viewerBody');
    
    // 1. REVOKE previous URL
    if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
    }

    // 2. Identify file type
    let ext = sett.itemID.split('.').pop().toLowerCase(); 
    let imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    activeBlobUrl = URL.createObjectURL(blob);
    
    viewerBody.innerHTML = '';

    // IMAGE LOGIC (Stays fast and simple)
    if (imageTypes.includes(ext) || blob.type.startsWith('image/')) {
        let img = document.createElement('img');
        img.src = activeBlobUrl;
        img.style.maxWidth = '100%';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        viewerBody.appendChild(img);
    } 
    // PDF LOGIC (New Canvas Renderer)
    else if (ext === 'pdf' || blob.type === 'application/pdf') {
        viewerBody.innerHTML = '<p style="color:white; text-align:center;">Initializing PDF Engine...</p>';

        try {
            // Dynamic Import from your cached JS files
            const pdfjsLib = await import('./pdf.mjs');
            pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';

            const loadingTask = pdfjsLib.getDocument(activeBlobUrl);
            const pdf = await loadingTask.promise;
            
            // Render first page
            const page = await pdf.getPage(1);
            
            // Scale 1.5 is usually good for mobile clarity
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.style.width = '100%'; // Responsive fit
            canvas.style.height = 'auto';

            viewerBody.innerHTML = ''; // Clear "Initializing" text
            viewerBody.appendChild(canvas);

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

        } catch (err) {
            console.error("PDF.js Error:", err);
            viewerBody.innerHTML = `
                <p style="color:red; text-align:center;">Preview Error.</p>
                <a href="${activeBlobUrl}" target="_blank" download="document.pdf" 
                   style="color:#3498db; display:block; text-align:center;">Download instead</a>`;
        }
    } 
    else {
        viewerBody.innerHTML = `<p style="color:white; text-align:center;">No preview for .${ext}</p>`;
    }
};
  this.clearForm = function () {
    // This is vital for PWAs to prevent memory leaks and crashes
    if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
        activeBlobUrl = null;
    }
    if(thisForm) thisForm.reset();
    document.getElementById('viewerBody').innerHTML = '';
  };
}
