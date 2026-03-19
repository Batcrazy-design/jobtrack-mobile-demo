<?php
include "global.php";
if(isset($_SESSION['empID'])){ 
  $logedIn = true;
}else if(isset($_POST["deviceToken"])){
      if ($deviceToken = chkJWT($_POST["deviceToken"])) {
          $userToken = $deviceToken['token'];
          $sql = "SELECT
            a.autoID,
            a.orgID,
            a.empID,
            a.vehicleID,
            CONCAT(b.firstName) AS empName,
            c.descr AS vehicleName
            FROM devices a
            LEFT JOIN emps b ON b.autoID = a.empID
            LEFT JOIN vehicles c ON c.autoID = a.vehicleID
            WHERE a.token = ?";
          $device = getSanitData($sql, ['s', [$userToken]]);
          if (is_array($device) && !empty($device)) {
              $device = $device[0];
              session_regenerate_id(true);
              $_SESSION['orgID'] = $device['orgID'];
              $_SESSION['empID'] = $device['empID'];
              $_SESSION['vehicleID'] = $device['vehicleID'];
              $logedIn = true;
          }else{
              $logedIn = false;
          }
      }else{
          $logedIn = false;
      }
}else{
    $logedIn = false;
}

if ($logedIn == true) {
    $action = $_REQUEST["action"];
    switch ($action){
        case "saveData":
            saveData();
            break;
        case "getData":
              $formData = json_decode($_POST['formData'], true);
              $header = $formData['header'];
              $fields = (isset($formData['fields'])) ? $formData['fields'] : false;
              if (isset($fields['autoID'])) {
                if ($fields['autoID'] != "insert") {
                    $fields['autoID'] = filter_var($fields['autoID'], FILTER_SANITIZE_NUMBER_INT);
                }
              }
    
              getThisData($header, $fields, true);
            break;
    }
    
}else{
  echo json_encode(array('error'=>"login"));
}

function saveData() {
    try {

        $formData = json_decode($_POST['formData'], true);
        $header = $formData['header'];
        $fields = (isset($formData['fields'])) ? $formData['fields'] : false;
        if (isset($fields['autoID'])) {
          if ($fields['autoID'] != "insert") {
              $fields['autoID'] = filter_var($fields['autoID'], FILTER_SANITIZE_NUMBER_INT);
          }
        }

        $conn = dBConn();
        switch ($header['name']) {
          case 'frmInv':
              $param = [];
              $param['action'] = "save";
              $param['type'] = "img";
              $param['fileContent'] = $fields['photo'];
              $param['prefix'] = "inv";
              $photoPath = fileManager($param);


              if (!$stmt = $conn->prepare("INSERT INTO job_inv (orgID, jobID, compName, amount, photoPath, empID)
                VALUE (?, ?, ?, ?, ?, ?)")) {
                  throw new Exception("Could not prepare insert", 1);
              }
              if (!$stmt->bind_param("iisssi", $_SESSION['orgID'], $fields['jobCardID'], $fields['compName'], $fields['amount'], $photoPath, $_SESSION['empID'])) {
                  throw new Exception("Could not bind insert", 1);
              }

              if (!$stmt->execute()) {
                  throw new Exception("Could not execute".$conn->error, 1);
              }
              $result = "OK";
            break;
            case 'delete':
                switch ($header['frmName']) {

                }
              break;
          case 'frmJob':
              switch ($header['frmAction']) {
                case 'jobItem':

                    switch ($header['action']) {
                      case 'insert':
                          if (isset($fields['prodID']) && $fields['prodID'] != "0") {
                              $sql = "SELECT 
                                * 
                                FROM products 
                                WHERE autoID = ?";
                              $prod = getSanitData($sql, ['i', [$fields['prodID']]])[0];
                              $cost = $prod['cost'];
                              $price = $prod['price'];  
                          }else{
                              $cost = 0.00;
                              $price = 0.00;  
                          }

                          if (!$stmt = $conn->prepare("INSERT INTO job_items
                            (orgID, jobID, prodID, title, descr, qty, dateCompleted, empID)
                            VALUES (?, ?, ?, ?, ?, ?, ?, {$_SESSION['empID']})")) {
                              throw new Exception("Could not prepare job insert".$conn->error, 1);
                          }
                          if (!$stmt->bind_param("iiissss", $_SESSION['orgID'], $fields['jobCardID'], $fields['prodID'], $fields['title'], $fields['descr'], $fields['qty'], $fields['dateCompleted'])) {
                              throw new Exception("Could not bind job insert", 1);
                          }

                          if (!$stmt->execute()) {
                              throw new Exception("Could not execute".$conn->error, 1);
                          }

                          $fields['autoID'] = $conn->insert_id;
                        break;
                      case 'update':
                          if (!$stmt = $conn->prepare("UPDATE job_items
                            SET title = ?,  descr = ?, qty = ?, dateCompleted = ?, empID = {$_SESSION['empID']}
                            WHERE orgID = ? 
                            AND autoID = ?")) {
                              throw new Exception("Could not prepare job update", 1);
                          }
                          if (!$stmt->bind_param("ssssii",  $fields['title'], $fields['descr'], $fields['qty'], $fields['dateCompleted'], $_SESSION['orgID'], $fields['autoID'])) {
                              throw new Exception("Could not bind job update", 1);
                          }
                          if (!$stmt->execute()) {
                              throw new Exception("Could not execute".$conn->error, 1);
                          }
                        break;
                      case 'delete':
                          if (!$stmt = $conn->prepare("DELETE FROM job_items
                            WHERE orgID = ? 
                            AND autoID = ?")) {
                              throw new Exception("Could not prepare job delete", 1);
                          }
                          if (!$stmt->bind_param("ii", $_SESSION['orgID'], $fields['autoID'])) {
                              throw new Exception("Could not bind", 1);
                          }
                          if (!$stmt->execute()) {
                              throw new Exception("Could not execute".$conn->error, 1);
                          }

                        break;
                    }
                    $result = $fields['autoID'];
                  break;
                case 'time':
                    $sql = "SELECT 
                      cost 
                      FROM products 
                      WHERE orgID = ? 
                      AND systemProd = 'Labour'";
                    $labour = getSanitData($sql, ['i', [$_SESSION['orgID']]])[0];
                    $cost = $labour['cost'];

                    $sTime = date_create($fields['sTime']);
                    $sTime = $sTime->format('Y-m-d H:i:00');
                    $eTime = date_create($fields['eTime']);
                    $eTime = $eTime->format('Y-m-d H:i:00');


                    if (!$stmt = $conn->prepare("INSERT INTO job_times
                      (orgID, jobID, sTime, eTime, mins, cost, empID, vehicleID)
                      VALUES (?, ?, ?, ?, ?, ?, {$_SESSION['empID']}, {$_SESSION['vehicleID']})")) {
                        throw new Exception("Could not prepare time insert", 1);
                    }
                    if (!$stmt->bind_param("iissis", $_SESSION['orgID'], $fields['jobCardID'], $sTime, $eTime, $fields['mins'], $cost)) {
                        throw new Exception("Could not bind time insert", 1);
                    }
                    if (!$stmt->execute()) {
                        throw new Exception("Could not execute time".$conn->error, 1);
                    }

                    $sql = "SELECT 
                      disProcess 
                      FROM jobs 
                      WHERE orgID = ?
                      AND autoID = ?";
                    $process = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['jobCardID']]])[0];;
                    if (!in_array($process['disProcess'], array("Started", "Completed", "Invoiced"))) {
                        getThisData(["name"=>"jobProcess"], ["jobID"=>$fields['jobCardID'], "process"=>"Started"], false);
                    }  
                    

                    $result = (isset($header['tmpID'])) ? $header['tmpID'] : "OK";
                    
                  break;
                case 'startJob':

                  
                  break;
                case 'jobInv':
                    if (isset($fields['photo']['fileContent'])) {
                        $param = [];
                        $param['action'] = "save";
                        $param['type'] = "img";
                        $param['fileExtention'] = $fields['photo']['fileExtention'];
                        $param['fileContent'] = $fields['photo']['fileContent'];
                        $param['prefix'] = "inv";
                        $photoPath = fileManager($param);
                      }else{
                        $photoPath = $fields['photo']['photoPath'];
                      }


                    switch ($header['action']) {
                      case 'insert':
                          if (!$stmt = $conn->prepare("INSERT INTO job_inv
                            (orgID, jobID, suppID, invNo, compName, amount, payCard, descr, photoPath, empID)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
                              throw new Exception("Could not prepare invoice insert".$conn->error, 1);
                          }
                          if (!$stmt->bind_param("iiisssissi", $_SESSION['orgID'], $fields['jobCardID'], $fields['suppID'], $fields['invNo'], $fields['suppName'], $fields['invAmount'], $fields['payCard'], $fields['descr'], $photoPath, $_SESSION['empID'])) {
                              throw new Exception("Could not bind time insert", 1);
                          }
                          if (!$stmt->execute()) {
                              throw new Exception("Could not execute insert".$conn->error, 1);
                          }

                          $fields['autoID'] = $conn->insert_id;
                        break;
                    }

                    $result = (isset($header['tmpID'])) ? $header['tmpID'] : "OK";                    
                  break;
                case 'jobNote':
                    if (isset($fields['photo']['fileContent'])) {
                        if ($fields['photo']['photoPath'] != NULL) {
                          fileManager(["action"=>"delete", "filePath"=>$fields['photo']['photoPath']]);
                        }

                        $param = [];
                        $param['action'] = "save";
                        $param['type'] = "img";
                        $param['fileContent'] = $fields['photo']['fileContent'];
                        $param['prefix'] = "jobNote";
                        $photoPath = fileManager($param);
                    }else{
                        $photoPath = $fields['photo']['photoPath'];
                    }

                    if ($fields['autoID'] == 'insert' ) {
                        if (!$stmt = $conn->prepare("INSERT INTO job_notes (orgID, jobID, noteType, note, dateCreated, empID, photoPath) 
                          VALUES(?, ?, 'Tech', ?, NOW(), {$_SESSION['empID']}, ?)")) {
                          throw new Exception("Could not prepare", 1);
                        }
                        if (!$stmt->bind_param("iiss", $_SESSION['orgID'], $fields['jobID'], $fields['note'], $photoPath)) {
                          throw new Exception("Could not bind", 1);
                        }
                            
                    }else{
                        if (!$stmt = $conn->prepare("UPDATE job_notes 
                          SET note = ?, photoPath = ? WHERE autoID = ?")) {
                          throw new Exception("Could not prepare", 1);
                        }
                        if (!$stmt->bind_param("ssi", $fields['note'], $photoPath, $fields['autoID'])) {
                          throw new Exception("Could not bind", 1);
                        }
      
                    }
                    if (!$stmt->execute()) {
                      throw new Exception("Could not execute", 1);
                    }
                    $result['autoID'] = ($fields['autoID'] == "insert") ? $conn->insert_id : $fields['autoID'];
                    $result['photoPath'] = $photoPath;
                    break;
                case 'report':
                      if (!$report = $conn->prepare("INSERT INTO job_reports (orgID, jobID, report) 
                          VALUES (?, ?, ?) 
                          ON DUPLICATE KEY UPDATE report = ?")) {
                          throw new Exception("Could not prepare report", 1);
                      }
                      if (!$report->bind_param("iiss", $_SESSION['orgID'], $fields['jobID'], $fields['report'], $fields['report'])) {
                        throw new Exception("Could not bind report", 1);
                      }
                      if (!$report->execute()) {
                        throw new Exception("Could not execute report", 1);
                      }
                      $result = "OK";
                  break;
                case 'acceptJob':
                    $sql = "SELECT 
                      assignID 
                      FROM jobs 
                      WHERE autoID = ?";
                    $job = getSanitData($sql, ['i', [$fields['autoID']]]);
                    if ($job[0]['assignID'] == null) {
                        if (!$stmt = $conn->prepare("UPDATE jobs 
                          SET assignID = {$_SESSION['empID']} 
                          WHERE orgID = ?
                          AND autoID = ?")) {
                          throw new Exception("Could not prepare", 1);
                        }
                        if (!$stmt->bind_param("ii", $_SESSION['orgID'], $fields['autoID'])) {
                          throw new Exception("Could not bind", 1);
                        }
                        if (!$stmt->execute()) {
                          throw new Exception("Could not execute", 1);
                        }
                    }  
                    $result = "OK";
                  break;
                case 'gps':
                    if (!$stmt = $conn->prepare("UPDATE jobs SET locationName = ?, lat = ?, lng = ?, gpsAccuracy = ? 
                      WHERE orgID = ? AND autoID = ?")) {
                      throw new Exception("Could not prepare", 1);
                    }
                    if (!$stmt->bind_param("ssssii", $fields['locationName'], $lat, $lng, $accuracy, $_SESSION['orgID'], $fields['autoID'])) {
                      throw new Exception("Could not bind", 1);
                    }
                    $lat = round($fields['lat'], 7);
                    $lng = round($fields['lng'], 7);
                    $accuracy = round($fields['gpsAccuracy'], 2);
                    if (!$stmt->execute()) {
                      throw new Exception("Could not execute", 1);
                    }
                    $result = "OK";
                  
                  
                  break;
              }

            break;
          case 'frmQuote':
              switch ($header['frmAction']) {
                case 'jobItem':
                    if ($fields['prodID'] != "0") {
                        $sql = "SELECT 
                          * 
                          FROM products 
                          WHERE autoID = ?";
                        $prod = getSanitData($sql, ['i', [$fields['prodID']]])[0];
                        $cost = $prod['cost'];
                        $price = $prod['price'];  
                    }else{
                        $cost = 0.00;
                        $price = 0.00;  
                    }

                    switch ($header['action']) {
                      case 'insert':
                          if (!$stmt = $conn->prepare("INSERT INTO quote_items
                            (orgID, quoteID, prodID, title, descr, qty, cost, price, empID)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
                              throw new Exception("Could not prepare job insert".$conn->error, 1);
                          }
                          if (!$stmt->bind_param("iiisssssi", $_SESSION['orgID'], $fields['quoteID'], $fields['prodID'], $fields['title'], $fields['descr'], $fields['qty'], $cost, $price, $_SESSION['empID'])) {
                              throw new Exception("Could not bind job insert", 1);
                          }

                          if (!$stmt->execute()) {
                              throw new Exception("Could not execute".$conn->error, 1);
                          }

                          $fields['autoID'] = $conn->insert_id;
                        break;
                      case 'update':

                          if (!$stmt = $conn->prepare("UPDATE quote_items
                            SET prodID = ?, title = ?, descr = ?, qty = ?, cost= ?, price = ?, empID = ?
                            WHERE orgID = ? 
                            AND autoID = ?")) {
                              throw new Exception("Could not prepare job update", 1);
                          }
                          if (!$stmt->bind_param("isssssiii", $fields['prodID'], $fields['title'], $fields['descr'], $fields['qty'], $cost, $price, $_SESSION['empID'], $_SESSION['orgID'], $fields['autoID'])) {
                              throw new Exception("Could not bind job update", 1);
                          }
                          if (!$stmt->execute()) {
                              throw new Exception("Could not execute".$conn->error, 1);
                          }
                        break;
                    }

                    if (!$stmt = $conn->prepare("UPDATE quotes 
                    SET cost = (SELECT SUM(cost) FROM quote_items WHERE quoteID = ?), 
                    price = (SELECT SUM(price) FROM quote_items WHERE quoteID = ?) 
                    WHERE autoID = ?")) {
                      throw new Exception("Could not prepare quote total update", 1);
                    }
                    if (!$stmt->bind_param("iii", $fields['quoteID'], $fields['quoteID'], $fields['quoteID'] )) {
                      throw new Exception("Could not bind quote total update", 1);
                    }
                    if (!$stmt->execute()) {
                      throw new Exception("Could not execute quote total update", 1);
                    }
                    $result = $fields['autoID'];
                  break;
                case 'complete':
                    $result = getThisData(["name"=>"quoteProcess"], ["autoID"=>$fields['autoID'], "process"=>"Site surveyed"], false);
                  break;  
                case 'estHours':
                    if (!$stmt = $conn->prepare("UPDATE quotes 
                      SET estMins = ?, 
                      timeFrame = ? 
                      WHERE orgID = ? 
                      AND autoID = ?")) {
                      throw new Exception("Could not prepare", 1);
                    }
                    if (!$stmt->bind_param("iiii", $fields['estMins'], $fields['estMins'], $_SESSION['orgID'], $fields['autoID'])) {
                      throw new Exception("Could not bind", 1);
                    }
                    if (!$stmt->execute()) {
                      throw new Exception("Could not execute", 1);
                    }
                    $result = "OK";
                  break;
                case 'quoteNote':
                    if (isset($fields['photo']['fileContent'])) {
                        if ($fields['photo']['photoPath'] != NULL) {
                          fileManager(["action"=>"delete", "filePath"=>$fields['photo']['photoPath']]);
                        }

                        $param = [];
                        $param['action'] = "save";
                        $param['type'] = "img";
                        $param['fileContent'] = $fields['photo']['fileContent'];
                        $param['prefix'] = "quoteNote";
                        $photoPath = fileManager($param);
                    }else{
                        $photoPath = $fields['photo']['photoPath'];
                    }

                    if ($fields['autoID'] == 'insert' ) {
                        if (!$stmt = $conn->prepare("INSERT INTO quote_notes (orgID, quoteID, noteType, note, dateCreated, empID, photoPath) 
                          VALUES(?, ?, 'Tech', ?, NOW(), {$_SESSION['empID']}, ?)")) {
                          throw new Exception("Could not prepare", 1);
                        }
                        if (!$stmt->bind_param("iiss", $_SESSION['orgID'], $fields['quoteID'], $fields['note'], $photoPath)) {
                          throw new Exception("Could not bind", 1);
                        }
                          
                    }else{
                        if (!$stmt = $conn->prepare("UPDATE quote_notes 
                          SET note = ?, photoPath = ? 
                          WHERE orgID = ?
                          AND autoID = ?")) {
                          throw new Exception("Could not prepare", 1);
                        }
                        if (!$stmt->bind_param("ssii", $fields['note'], $photoPath, $_SESSION['orgID'], $fields['autoID'])) {
                          throw new Exception("Could not bind", 1);
                        }
      
                    }
                    if (!$stmt->execute()) {
                      throw new Exception("Could not execute", 1);
                    }
                    $result['autoID'] = ($fields['autoID'] == "insert") ? $conn->insert_id : $fields['autoID'];
                    $result['photoPath'] = $photoPath;
                    break;
                case 'quoteInv':
                    if (isset($fields['photo']['fileContent'])) {
                      $param = [];
                      $param['action'] = "save";
                      $param['type'] = "img";
                      $param['fileExtention'] = $fields['photo']['fileExtention'];
                      $param['fileContent'] = $fields['photo']['fileContent'];
                      $param['prefix'] = "inv";
                      $photoPath = fileManager($param);
                    }else{
                      $photoPath = $fields['photo']['photoPath'];
                    }

                    switch ($header['action']) {
                      case 'insert':
                          if (!$stmt = $conn->prepare("INSERT INTO quote_inv
                            (orgID, quoteID, compName, amount, photoPath, empID)
                            VALUES (?, ?, ?, ?, ?, {$_SESSION['empID']})")) {
                              throw new Exception("Could not prepare invoice insert".$conn->error, 1);
                          }
                          if (!$stmt->bind_param("iisss", $_SESSION['orgID'], $fields['quoteID'],  $fields['suppName'], $fields['amount'], $photoPath)) {
                              throw new Exception("Could not bind time insert", 1);
                          }
                          if (!$stmt->execute()) {
                              throw new Exception("Could not execute insert".$conn->error, 1);
                          }

                          $fields['autoID'] = $conn->insert_id;
                        break;
                    }
                    $result = "OK"; 
                  break;
                case 'acceptQuote':
                    $sql = "SELECT 
                        assignID 
                        FROM quotes 
                        WHERE orgID = ? 
                        AND autoID = ?";
                    $quote = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']]]);
                    if ($quote[0]['assignID'] == null) {
                        if (!$stmt = $conn->prepare("UPDATE quotes 
                          SET assignID = {$_SESSION['empID']} 
                          WHERE orgID = ? 
                          AND autoID = ?")) {
                          throw new Exception("Could not prepare", 1);
                        }
                        if (!$stmt->bind_param("ii", $_SESSION['orgID'], $fields['autoID'])) {
                          throw new Exception("Could not bind", 1);
                        }
                        if (!$stmt->execute()) {
                          throw new Exception("Could not execute", 1);
                        }
                    }  
                    $result = "OK";
                    
                  break;
              }
            break;
          case 'frmJobSign':
              $param = [];
              $param['action'] = "save";
              $param['type'] = "sig";
              $param['fileContent'] = $fields['fileContent'];
              $param['prefix'] = "sig";
              $photoPath = fileManager($param);

              if (!$stmt = $conn->prepare("UPDATE jobs
                  SET sigPath = ?, 
                  dateCreated = dateCreated, 
                  dateCompleted = NOW()
                  WHERE orgID = ?
                  AND autoID = ?")) {
                  throw new Exception("Could not prepare job update", 1);
              }
              if (!$stmt->bind_param("sii", $photoPath, $_SESSION['orgID'], $fields['jobID'])) {
                  throw new Exception("Could not bind job update", 1);
              }
              if (!$stmt->execute()) {
                  throw new Exception("Could not execute job update", 1);
              }
              $result = getThisData(["name"=>"jobProcess"], ["jobID"=>$fields['jobID'], "process"=>"Completed"], false);
            break;
          case 'frmVehicleExp':
              if (isset($fields['photo']['fileContent'])) {
                $param = [];
                $param['action'] = "save";
                $param['type'] = "img";
                $param['fileExtention'] = $fields['photo']['fileExtention'];
                $param['fileContent'] = $fields['photo']['fileContent'];
                $param['prefix'] = "ldv_inv";
                $photoPath = fileManager($param);
              }
              switch ($header['frmType']) {
                case 'vehicle':
                    switch ($header['expType']) {
                        case 'stock':
                            if (!$stmt = $conn->prepare("INSERT INTO vehicle_inv (orgID, invType, vehicleID, suppID, invNo, amount, payCard, invDate, descr, photoPath, empID) 
                            VALUES (?, 'vstock', ?, ?, ?, ?, ?, ?, ?, ?, {$_SESSION['empID']})")) {
                              throw new Exception("Could not prepare".$conn->error, 1);
                            }
                            if (!$stmt->bind_param("iiississs", $_SESSION['orgID'], $fields['vehicleID'], $fields['suppID'], $fields['invNo'], $fields['invAmount'], $fields['payCard'], $fields['invDate'], $fields['descr'], $photoPath)) {
                              throw new Exception("Could not bind", 1);
                            }
                            if (!$stmt->execute()) {
                              throw new Exception("Could not execute".$conn->error, 1);
                            }
                            $result = "OK";
                          break;
                        
                        case 'fuel':
                            if (!$stmt = $conn->prepare("INSERT INTO vehicle_fuel (orgID, vehicleID, liters, amount, odo, transDate, photoPath, empID) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, {$_SESSION['empID']})")) {
                              throw new Exception("Could not prepare".$conn->error, 1);
                            }
                            if (!$stmt->bind_param("iississ", $_SESSION['orgID'], $fields['vehicleID'], $fields['liters'], $fields['amount'], $fields['odo'], $fields['transDate'], $photoPath)) {
                              throw new Exception("Could not bind", 1);
                            }
                            if (!$stmt->execute()) {
                              throw new Exception("Could not execute".$conn->error, 1);
                            }
                            $result = "OK";
                        break;
                    }
                  break;
                default:
                    if (!$stmt = $conn->prepare("INSERT INTO vehicle_inv (orgID, invType, suppID, invNo, amount, payCard, invDate, descr, photoPath, empID) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, {$_SESSION['empID']})")) {
                      throw new Exception("Could not prepare".$conn->error, 1);
                    }
                    if (!$stmt->bind_param("isississs", $_SESSION['orgID'], $header['expType'], $fields['suppID'], $fields['invNo'], $fields['invAmount'], $fields['payCard'], $fields['invDate'], $fields['descr'], $photoPath)) {
                      throw new Exception("Could not bind", 1);
                    }
                    if (!$stmt->execute()) {
                      throw new Exception("Could not execute".$conn->error, 1);
                    }
                    $result = "OK";
                  break;
  
              }
            break;
          case 'saveError':
              if (!$stmt = $conn->prepare("INSERT INTO mobile_save_error (orgID, error, formData, dateCreated, userID) 
                VALUES (?, ?, NOW(), {$_SESSION['empID']})")) {
                throw new Exception("Could not prepare", 1);
              }
              if (!$stmt->bind_param("iss", $_SESSION['orgID'], $fields['error'], $fields['data'])) {
                throw new Exception("Could not bind", 1);
              }
              if (!$stmt->execute()) {
                throw new Exception("Could not execute", 1);
              }
              $result = "OK";
            break;
          case 'frmJobDash':
              if (!$stmt = $conn->prepare("INSERT INTO mobile_save_error (orgID, error, formData, dateCreated, userID) 
              VALUES (?, ?, ?, NOW(), {$_SESSION['empID']})")) {
              throw new Exception("Could not prepare", 1);
              }
              if (!$stmt->bind_param("iss", $_SESSION['orgID'], $fields['error'], $fields['data'])) {
                throw new Exception("Could not bind", 1);
              }
              if (!$stmt->execute()) {
                throw new Exception("Could not execute", 1);
              }
              $result = "OK";

            break;
        }
        if(isset($result)){
            echo json_encode(array('success'=>$result));
        }

    } catch (Exception $e) {
        echo json_encode(array('error'=>$e->getMessage()));
        if($state = $conn->query("SELECT @@autocommit")){
            $row = mysqli_fetch_row($state);
            if ($row[0]) {
                $conn->rollback();
            }
        }
    }finally{
        if($conn){
            $conn->close();
        }
    }
}

function getThisData($header, $fields, $clientCall) {
    try {
        $conn = dBConn();
        switch ($header['name']) {
            case 'frmSearch':
                switch ($header['searchType']) {
                  case 'clients':
                      $sql = "SELECT
                        autoID,
                        CONCAT(firstName, ' ', lastName) AS clientName,
                        compName,
                        eMail,
                        phone1,
                        status
                        FROM clients 
                        WHERE orgID = ?";
                      $result['searchData'] = getSanitData($sql, ['i', [$_SESSION['orgID']]]);
                    break;
                  case 'jobcards':
                      $sql = "SELECT
                        a.autoID,
                        a.cost,
                        a.price,
                        a.status,
                        a.disProcess,
                        DATE_FORMAT(a.dateCreated, '%d-%m-%Y') AS disDate,
                        IF(b.compName <> '', b.compName, CONCAT(b.firstName, ' ', b.lastName)) AS siteClient,
                        IF(c.compName <> '', c.compName, CONCAT(c.firstName, ' ', c.lastName)) AS payClient
                        FROM jobs a
                        INNER JOIN clients b ON b.autoID = a.siteClientID
                        LEFT JOIN clients c ON c.autoID = a.payClientID 
                        WHERE a.orgID = ?";
                      $result['searchData'] = getSanitData($sql, ['i', [$_SESSION['orgID']]]);
                    break;
                }
              break;
            case 'frmJobDash':
                switch ($header['type']) {
                  case 'job':
                      $sql = "SELECT
                      a.autoID,
                      CONCAT('JC_', LPAD(a.jobNo, GREATEST(4, CHAR_LENGTH(a.jobNo)), '0')) AS jobNo,
                      a.cost,
                      a.price,
                      a.disProcess, 
                      a.priority, 
                      CASE a.priority 
                          WHEN '1' THEN 'High' 
                          WHEN '2' THEN 'Medium' 
                          WHEN '3' THEN 'Low' 
                          ELSE 'None' 
                      END AS disPriority,
                      a.lat, 
                      a.lng,
                      IF(a.assignID = {$_SESSION['empID']}, 1, 2) AS yourJob,
                      DATE_FORMAT(a.dateCreated, '%d-%m-%Y') AS disCreatedDate,
                      IF(a.compName <> '', a.compName, CONCAT(a.firstName, ' ', a.lastName)) AS siteClient,
                      CONCAT_WS(',', a.addLine1, a.addLine2, a.suburb, a.city) AS clientAdd, 
                      IF(a.availStart IS NOT NULL, DATE_FORMAT(a.availStart, '%d-%m-%y %H:%i'), '') AS disAvailStart,
                      IF(a.availEnd IS NOT NULL, DATE_FORMAT(a.availEnd, '%d-%m-%y %H:%i'), '') AS disAvailEnd,
                      IF(a.appointDate IS NOT NULL, DATE_FORMAT(a.appointDate, '%d-%m-%y %H:%i'), '') AS apptDate,
                      b.jobColor
                      FROM jobs a
                      INNER JOIN branches b ON b.autoID = a.branchID
                      WHERE a.orgID = ?
                      AND a.status = 'A' 
                      AND a.hasFloorPlan = 0
                      AND a.curProcess NOT IN ('Invoicing', 'Payment due') 
                      ORDER BY yourJob, priority, branchID";
                      $result['jobs'] = getSanitData($sql, ['i', [$_SESSION['orgID']]]); 
                    break;
                  case 'proj':
                      $sql = "SELECT
                      a.autoID,
                      CONCAT('JC_', LPAD(a.jobNo, GREATEST(4, CHAR_LENGTH(a.jobNo)), '0')) AS jobNo,
                      a.cost,
                      a.price,
                      a.disProcess,
                      a.priority,
                      CASE a.priority 
                          WHEN '1' THEN 'High' 
                          WHEN '2' THEN 'Medium' 
                          WHEN '3' THEN 'Low' 
                          ELSE 'None' 
                      END AS disPriority,
                      a.lat, 
                      a.lng,
                      IF(a.assignID = {$_SESSION['empID']}, 1, 2) AS yourJob,
                      DATE_FORMAT(a.dateCreated, '%d-%m-%Y') AS disCreatedDate,
                      IF(a.compName <> '', a.compName, CONCAT(a.firstName, ' ', a.lastName)) AS siteClient,
                      CONCAT_WS(',', a.addLine1, a.addLine2, a.suburb, a.city) AS clientAdd, 
                      IF(a.appointDate IS NOT NULL, DATE_FORMAT(a.appointDate, '%d-%m-%y %H:%i'), '') AS apptDate,
                      b.jobColor
                      FROM jobs a
                      INNER JOIN branches b ON b.autoID = a.branchID
                      WHERE a.orgID = ?
                      AND a.status = 'A'
                      AND a.hasFloorPlan = 1
                      AND a.curProcess NOT IN ('Invoicing', 'Payment due') 
                      ORDER BY yourJob, priority, branchID";
                      $result['jobs'] = getSanitData($sql, ['i', [$_SESSION['orgID']]]); 
                      break;
                  case 'quote':
                    $sql = "SELECT
                    a.autoID,
                    CONCAT('QT_', LPAD(a.quoteNo, GREATEST(4, CHAR_LENGTH(a.quoteNo)), '0')) AS jobNo,
                    a.cost,
                    a.price,
                    a.disProcess,
                    a.priority,
                    CASE a.priority 
                        WHEN '1' THEN 'High' 
                        WHEN '2' THEN 'Medium' 
                        WHEN '3' THEN 'Low' 
                        ELSE 'None' 
                    END AS disPriority,
                    a.lat, 
                    a.lng,
                    IF(a.assignID = {$_SESSION['empID']}, 1, 2) AS yourJob,
                    DATE_FORMAT(a.dateCreated, '%d-%m-%Y') AS disCreatedDate,
                    IF(a.compName <> '', a.compName, CONCAT(a.firstName, ' ', a.lastName)) AS siteClient,
                    CONCAT_WS(',', a.addLine1, a.addLine2, a.suburb, a.city) AS clientAdd, 
                    IF(a.appointDate IS NOT NULL, DATE_FORMAT(a.appointDate, '%d-%m-%y %H:%i'), '') AS apptDate,
                    b.jobColor
                    FROM quotes a
                    INNER JOIN branches b ON b.autoID = a.branchID
                    WHERE a.orgID = ? 
                    AND a.status = 'A'
                    AND a.curProcess NOT IN ('Completing', 'Sending') 
                    ORDER BY yourJob, priority, branchID";
                    $result['jobs'] = getSanitData($sql, ['i', [$_SESSION['orgID']]]); 
                    break;
  
                }
              break;
            case 'frmJob':
                $sql = "SELECT
                  a.autoID,
                  CONCAT('JC_', LPAD(a.jobNo, GREATEST(4, CHAR_LENGTH(a.jobNo)), '0')) AS jobNo,
                  a.assignID,
                  a.clientID,
                  CONCAT(a.firstName, ' ', a.lastName) AS clientName,
                  a.phone1,
                  a.phone1Desc,
                  a.phone2,
                  a.phone2Desc,
                  a.estMins,
                  CONCAT_WS(',', a.addLine1, a.addLine2, a.suburb, a.city) AS clientAdd, 
                  a.locationName,
                  a.lat,
                  a.lng,
                  a.gpsAccuracy,
                  a.note, 
                  b.report
                  FROM jobs a
                  LEFT JOIN job_reports b ON b.jobID = a.autoID
                  WHERE a.orgID = ? 
                  AND a.autoID = ?";
                $result['job'] = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']]])[0];

                $sql = "SELECT
                  autoID,
                  title,
                  descr,
                  dateCompleted,
                  qty
                  FROM job_items 
                  WHERE orgID = ? 
                  AND jobID = ?";
                $result['jobItems'] = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']]]);

                $sql = "SELECT
                  autoID,
                  DATE_FORMAT(sTime, '%d-%m-%Y : %H:%i') AS disSTime,
                  DATE_FORMAT(eTime, '%d-%m-%Y : %H:%i') AS disETime,
                  mins
                  FROM job_times
                  WHERE orgID = ? 
                  AND jobID = ? 
                  ORDER BY sTime";
                $result['jobTimes'] = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']]]);

                $sql = "SELECT
                  autoID,
                  invNo,
                  compName,
                  amount,
                  photoPath
                  FROM job_inv
                  WHERE orgID = ?
                  AND jobID = ?";
                $result['jobInv'] = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']]]);

                $sql = "SELECT 
                  *
                  FROM products 
                  WHERE orgID = ? 
                  AND status = 'A' 
                  ORDER BY prodCode";
                $result['prods'] = getSanitData($sql, ['i', [$_SESSION['orgID']]]);

                $sql = "SELECT 
                  a.autoID,
                  a.note, 
                  a.photoPath,
                  IF(b.firstName IS NOT NULL, b.firstName, ou.firstName) AS userName,
                  a.empID 
                  FROM job_notes a 
                  LEFT JOIN emps b ON b.autoID = a.empID
                  LEFT JOIN org_users ou ON ou.autoID = a.userID
                  WHERE a.orgID = ?
                  AND a.jobID = ?";
                $result['notes'] = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']]]);

                $sql = "SELECT 
                  autoID,
                  title,
                  filePath
                  FROM attachments
                  WHERE orgID = ?
                  AND itemID = ? 
                  AND attachType = 'job'";
                $result['jobAttachments'] = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']]]);

                $sql = "SELECT 
                  autoID,
                  title,
                  filePath
                  FROM attachments
                  WHERE orgID = ?
                  AND itemID = ? 
                  AND attachType = 'client'";
                $result['clientAttachments'] = getSanitData($sql, ['ii', [$_SESSION['orgID'], $result['job']['clientID']]]);



                $sql = "SELECT
                  autoID, 
                  supplierName 
                  FROM suppliers 
                  WHERE orgID = ? 
                  AND status = 'A' 
                  AND hasAccount = 1
                  ORDER by supplierName";
                $result['suppliers'] = getSanitData($sql, ['i', [$_SESSION['orgID']]]); 

              break;
            case 'frmQuote':
                $sql = "SELECT
                  a.autoID,
                   CONCAT('QT_', LPAD(a.quoteNo, GREATEST(4, CHAR_LENGTH(a.quoteNo)), '0')) AS quoteNo,
                  CONCAT(a.firstName, ' ', a.lastName) AS clientName,
                  a.phone1,
                  a.phone1Desc,
                  a.phone2,
                  a.phone2Desc,
                  CONCAT_WS(',', a.addLine1, a.addLine2, a.suburb, a.city) AS clientAdd, 
                  a.timeFrame,
                  a.assignID,
                  a.note
                  FROM quotes a
                  WHERE a.orgID = ? 
                  AND a.autoID = ?";
                $result['job'] = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']]])[0];

                $sql = "SELECT
                  autoID,
                  prodID,
                  title,
                  descr,
                  qty
                  FROM quote_items
                  WHERE orgID = ?
                  AND quoteID = ?";
                $result['jobItems'] = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']]]);

                $sql = "SELECT
                  autoID,
                  compName,
                  amount,
                  photoPath
                  FROM quote_inv
                  WHERE orgID = ?
                  AND quoteID = ?";
                $result['suppQuotes'] = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']]]);


                $sql = "SELECT 
                  *
                  FROM products 
                  WHERE orgID = ? 
                  AND status = 'A' 
                  ORDER BY prodCode";
                $result['prods'] = getSanitData($sql, ['i', [$_SESSION['orgID']]]);

                $sql = "SELECT 
                  a.autoID,
                  a.note, 
                  a.photoPath,
                  IF(b.firstName IS NOT NULL, b.firstName, ou.firstName) AS userName,
                  a.empID 
                  FROM quote_notes a 
                  LEFT JOIN emps b ON b.autoID = a.empID 
                  LEFT JOIN org_users ou ON ou.autoID = a.userID 
                  WHERE a.orgID = ?
                  AND a.quoteID = ?";
                $result['notes'] = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']]]);




              break;
            case 'frmJobSign':
                $sql = "SELECT
                  title, 
                  descr
                  FROM job_items a
                  WHERE orgID = ? 
                  AND jobID = ?";
                $result = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']]]);
              break;
            case "frmVehicleExp":
                if ($header['frmType'] == "vehicle") {
                    $sql = "SELECT 
                      autoID,
                      descr 
                      FROM vehicles 
                      WHERE orgID = ?
                      AND status = 'A'";
                    $result['vehicles'] = getSanitData($sql, ['i', [$_SESSION['orgID']]]);
                }
                $sql = "SELECT 
                  DATE_FORMAT(vi.invDate, '%d-%m-%y') AS disDate, 
                  s.supplierName, 
                  vi.descr, 
                  vi.amount 
                  FROM vehicle_inv vi 
                  LEFT JOIN suppliers s ON s.autoID = vi.suppID
                  WHERE vi.orgID = ?
                  AND vi.empID = ? 
                  ORDER BY vi.invDate DESC
                  LIMIT 10";
                $result['lastUploads'] = getSanitData($sql, ['ii', [$_SESSION['orgID'], $_SESSION['empID']]]);
              break;
            case 'jobProcess':
                $sql = "SELECT
                  *
                  FROM job_process
                  WHERE orgID = ?
                  AND jobID = ?";
                $curProcess = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['jobID']], "process"]);
                $processList = array("Created", "Assigning", "In que", "Started", "Invoicing");
                $disProcessList = array("Created", "Assigned", "Started", "Completed", "Invoiced");
                $indexNo = array_search($fields['process'], $disProcessList);

                if (!$iProcess = $conn->prepare("INSERT INTO job_process
                  (orgID, jobID, process, sDate, eDate)
                  VALUES (?, ?, ?, NOW(), IF(? = 'now', NOW(), ?))")) {
                  throw new Exception("Could not prepare", 1);
                }
                if (!$iProcess->bind_param("iisss", $_SESSION['orgID'], $fields['jobID'], $process, $eDate, $eDate)) {
                  throw new Exception("Could not bind", 1);
                }
                for ($i=0; $i < count($processList); $i++) {
                    $dbRow = (isset($curProcess[$processList[$i]])) ? $curProcess[$processList[$i]] : false;
                    if ($i <= $indexNo) {
                        if ($dbRow) {
                            if (($dbRow['sDate'] != NULL) && ($dbRow['eDate'] == NULL)) {
                                $sql = "UPDATE job_process
                                  SET days = (DATEDIFF(NOW(), sDate)) + days, eDate = NOW()
                                  WHERE autoID = {$dbRow['autoID']}";
                                  if (!$conn->query($sql)) {
                                      throw new \Exception("Could not 1 status".$conn->error, 1);
                                  };
                            }else if ($dbRow['sDate'] == NULL) {
                                $sql = "UPDATE job_process
                                  SET sDate = NOW(), eDate = NOW()
                                  WHERE autoID = {$dbRow['autoID']}";
                                  if (!$conn->query($sql)) {
                                      throw new \Exception("Could not 2 status".$conn->error, 1);
                                  };
                            }
                        }else{
                            $process = $processList[$i];
                            $eDate = 'now';
                            if (!$iProcess->execute()) {
                              throw new Exception("Could not execute", 1);
                            }
                        }
                    }else{
                        if ($dbRow) {
                            if (($dbRow['sDate'] != NULL) && ($dbRow['eDate'] == NULL)) {
                                if ($i != $indexNo+1) {
                                    $sql = "UPDATE job_process
                                      SET days = (DATEDIFF(NOW(), sDate)) + days, sDate = NULL, eDate = NULL
                                      WHERE autoID = {$dbRow['autoID']}";
                                      if (!$conn->query($sql)) {
                                          throw new \Exception("Could not 4 status".$conn->error, 1);
                                      };
                                }
                            }else if ($dbRow['sDate'] == NULL) {
                                if ($i == $indexNo+1) {
                                    $sql = "UPDATE job_process
                                      SET sDate = NOW(), eDate = NULL
                                      WHERE autoID = {$dbRow['autoID']}";
                                      if (!$conn->query($sql)) {
                                          throw new \Exception("Could not 5 status".$conn->error, 1);
                                      };
                                }
                            }else if (($dbRow['sDate'] != NULL) && ($dbRow['eDate'] != NULL)){
                                if ($i == $indexNo+1) {
                                    $sql = "UPDATE job_process
                                      SET sDate = NOW(), eDate = NULL
                                      WHERE autoID = {$dbRow['autoID']}";
                                      if (!$conn->query($sql)) {
                                          throw new \Exception("Could not 6 status".$conn->error, 1);
                                      };
                                }else {
                                    $sql = "UPDATE job_process
                                      SET days = (DATEDIFF(NOW(), sDate)) + days, sDate = NULL, eDate = NULL
                                      WHERE autoID = {$dbRow['autoID']}";
                                      if (!$conn->query($sql)) {
                                          throw new \Exception("Could not 7 status".$conn->error, 1);
                                      };
                                }

                            }
                        }else{
                            if ($i == $indexNo+1) {
                                $process = $processList[$indexNo+1];
                                $eDate = NULL;
                                if (!$iProcess->execute()) {
                                  throw new Exception("Could not execute", 1);
                                }
                            }
                        }
                    }
                }

                $curProcess = ($indexNo < count($processList)-1) ? $processList[$indexNo+1] : $processList[$indexNo];
                $disProcess = $disProcessList[$indexNo];
                if (!$stmt = $conn->prepare("UPDATE jobs
                    SET curProcess = ?, disProcess = ? 
                    WHERE orgID = ?
                    AND autoID = ?")) {
                    throw new Exception("Could not prepare", 1);
                }
                if (!$stmt->bind_param("ssii", $curProcess, $disProcess, $_SESSION['orgID'], $fields['jobID'])) {
                    throw new Exception("Could not bind", 1);
                }
                if (!$stmt->execute()) {
                    throw new Exception("Could not execute", 1);
                }

                $result = "OK";
              break;
            case 'quoteProcess':
                $sql = "SELECT
                  *
                  FROM quote_process
                  WHERE orgID = ? 
                  AND quoteID = ?";
                $curProcess = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['autoID']], "process"]);

                $processList = array("Created", "Assigning", "Surveying", "Completing", "Sending");
                $disProcessList = array("Created", "Assigned", "Site surveyed", "Quote completed", "Send");
                $indexNo = array_search($fields['process'], $disProcessList);

                if (!$iProcess = $conn->prepare("INSERT INTO quote_process
                  (orgID, quoteID, process, sDate, eDate)
                  VALUES (?, ?, ?, NOW(), IF(? = 'now', NOW(), ?))")) {
                  throw new Exception("Could not prepare", 1);
                }
                if (!$iProcess->bind_param("iisss", $_SESSION['orgID'], $fields['autoID'], $process, $eDate, $eDate)) {
                  throw new Exception("Could not bind", 1);
                }


                for ($i=0; $i < count($processList); $i++) {
                    $dbRow = (isset($curProcess[$processList[$i]])) ? $curProcess[$processList[$i]] : false;
                    if ($i <= $indexNo) {
                        if ($dbRow) {
                            if (($dbRow['sDate'] != NULL) && ($dbRow['eDate'] == NULL)) {
                                $sql = "UPDATE quote_process
                                  SET days = (DATEDIFF(NOW(), sDate)) + days, eDate = NOW()
                                  WHERE autoID = {$dbRow['autoID']}";
                                  if (!$conn->query($sql)) {
                                      throw new \Exception("Could not 1 status".$conn->error, 1);
                                  };
                            }else if ($dbRow['sDate'] == NULL) {
                                $sql = "UPDATE quote_process
                                  SET sDate = NOW(), eDate = NOW()
                                  WHERE autoID = {$dbRow['autoID']}";
                                  if (!$conn->query($sql)) {
                                      throw new \Exception("Could not 2 status".$conn->error, 1);
                                  };
                            }
                        }else{
                            $process = $processList[$i];
                            $eDate = 'now';
                            if (!$iProcess->execute()) {
                              throw new Exception("Could not execute", 1);
                            }
                        }
                    }else{
                        if ($dbRow) {
                            if (($dbRow['sDate'] != NULL) && ($dbRow['eDate'] == NULL)) {
                                if ($i != $indexNo+1) {
                                    $sql = "UPDATE quote_process
                                      SET days = (DATEDIFF(NOW(), sDate)) + days, sDate = NULL, eDate = NULL
                                      WHERE autoID = {$dbRow['autoID']}";
                                      if (!$conn->query($sql)) {
                                          throw new \Exception("Could not 4 status".$conn->error, 1);
                                      };
                                }
                            }else if ($dbRow['sDate'] == NULL) {
                                if ($i == $indexNo+1) {
                                    $sql = "UPDATE quote_process
                                      SET sDate = NOW(), eDate = NULL
                                      WHERE autoID = {$dbRow['autoID']}";
                                      if (!$conn->query($sql)) {
                                          throw new \Exception("Could not 5 status".$conn->error, 1);
                                      };
                                }
                            }else if (($dbRow['sDate'] != NULL) && ($dbRow['eDate'] != NULL)){
                                if ($i == $indexNo+1) {
                                    $sql = "UPDATE quote_process
                                      SET sDate = NOW(), eDate = NULL
                                      WHERE autoID = {$dbRow['autoID']}";
                                      if (!$conn->query($sql)) {
                                          throw new \Exception("Could not 6 status".$conn->error, 1);
                                      };
                                }else {
                                    $sql = "UPDATE quote_process
                                      SET days = (DATEDIFF(NOW(), sDate)) + days, sDate = NULL, eDate = NULL
                                      WHERE autoID = {$dbRow['autoID']}";
                                      if (!$conn->query($sql)) {
                                          throw new \Exception("Could not 7 status".$conn->error, 1);
                                      };
                                }

                            }
                        }else{
                            if ($i == $indexNo+1) {
                                $process = $processList[$indexNo+1];
                                $eDate = NULL;
                                if (!$iProcess->execute()) {
                                  throw new Exception("Could not execute", 1);
                                }

                            }
                        }
                    }
                }

                $curProcess = ($indexNo < count($processList)-1) ? $processList[$indexNo+1] : $processList[$indexNo];
                $disProcess = $disProcessList[$indexNo];
                if (!$stmt = $conn->prepare("UPDATE quotes
                    SET curProcess = ?, disProcess = ? 
                    WHERE orgID = ? 
                    AND autoID = ?")) {
                    throw new Exception("Could not prepare", 1);
                }
                if (!$stmt->bind_param("ssii", $curProcess, $disProcess, $_SESSION['orgID'], $fields['autoID'])) {
                    throw new Exception("Could not bind", 1);
                }
                if (!$stmt->execute()) {
                    throw new Exception("Could not execute".$conn->error, 1);
                }

                $result = "OK";
              break;
            case "getOfflineData":
                $result['dashJob'] = getThisData(["name"=>"frmJobDash", "type"=>"job"], [], false);
                $result['dashProj'] = getThisData(["name"=>"frmJobDash", "type"=>"proj"], [], false);
                $result['dashQuote'] = getThisData(["name"=>"frmJobDash", "type"=>"quote"], [], false);
                $sql = "SELECT
                  a.autoID,
                  CONCAT('JC_', LPAD(a.jobNo, GREATEST(4, CHAR_LENGTH(a.jobNo)), '0')) AS jobNo,
                  CONCAT(a.firstName, ' ', a.lastName) AS clientName,
                  a.phone1,
                  a.phone1Desc,
                  a.phone2,
                  a.phone2Desc,
                  a.estMins,
                  CONCAT_WS(',', a.addLine1, a.addLine2, a.suburb, a.city) AS clientAdd, 
                  a.locationName,
                  a.lat,
                  a.lng,
                  a.gpsAccuracy,
                  a.note, 
                  b.report
                  FROM jobs a 
                  LEFT JOIN job_reports b ON b.jobID = a.autoID
                  WHERE a.orgID = ?
                  AND a.curProcess NOT IN ('Invoicing', 'Payment due') 
                  AND a.status = 'A'";
                $result['jobs'] = getSanitData($sql, ['i', [$_SESSION['orgID']], "autoID"]);
                $jobIDs = array_keys($result['jobs'] ?? []);
                if (!$jobIDs) {
                    $result['jobItems'] = [];
                    $result['jobTimes'] = [];
                    $result['jobInv'] = [];
                    $result['jobNotes'] = [];
                }else{
                    $jobIDList = implode(',', $jobIDs);
                    $sql = "SELECT
                      autoID,
                      title,
                      descr,
                      dateCompleted,
                      qty, 
                      jobID
                      FROM job_items 
                      WHERE jobID IN ($jobIDList)";
                    $result['jobItems'] = getData($sql);
                    $sql = "SELECT
                      autoID,
                      sTime,
                      eTime,
                      mins, 
                      jobID
                      FROM job_times
                      WHERE jobID IN ($jobIDList)";
                    $result['jobTimes'] = getData($sql);
                    $sql = "SELECT
                      autoID,
                      invNo,
                      compName,
                      amount,
                      photoPath, 
                      jobID
                      FROM job_inv
                      WHERE jobID IN ($jobIDList)";
                    $result['jobInv'] = getData($sql);
                    $sql = "SELECT 
                      a.autoID,
                      a.note, 
                      a.userID,
                      a.photoPath,
                      a.jobID,
                      b.firstName AS userName 
                      FROM job_notes a 
                      INNER JOIN emps b ON b.autoID = a.empID
                      WHERE a.jobID IN ($jobIDList) 
                      AND a.noteType = 'Tech'";
                    $result['jobNotes'] = getData($sql);  

                }
                $sql = "SELECT 
                  *
                  FROM products 
                  WHERE orgID = ? 
                  AND status = 'A' 
                  ORDER BY prodCode";
                $result['prods'] = getSanitData($sql, ['i', [$_SESSION['orgID']]]);
                $sql = "SELECT
                  s.autoID, 
                  s.supplierName, 
                  (s.creditLimit - (s.reconAmount + invDt.amount - invCt.amount)) AS availCredit
                  FROM suppliers s
                  LEFT JOIN (SELECT 
                        suppID,
                        SUM(amount) AS amount, 
                        'dt' AS dtkt, 
                      DATE(dateCreated) AS dateCreated 
                      FROM job_inv 
                      WHERE orgID = ? 
                      AND suppID IS NOT NULL
                      GROUP BY suppID 
                      UNION ALL 
                      SELECT 
                        suppID,
                        SUM(amount) AS amount, 
                        'dt' AS dtkt, 
                        invDate AS dateCreated 
                      FROM vehicle_inv 
                      WHERE orgID = ? 
                      AND suppID IS NOT NULL 
                      GROUP BY suppID) invDt ON invDt.suppID = s.autoID 
                  AND invDt.dateCreated > (IF(s.reconDate IS NOT NULL, s.reconDate, '2000-01-01'))
                  LEFT JOIN (SELECT 
                    suppID,
                    SUM(amount) AS amount, 
                    payDate AS dateCreated 
                    FROM supplier_payments 
                    GROUP BY suppID) invCt ON invCt.suppID = s.autoID 
                  AND invCt.dateCreated > (IF(s.reconDate IS NOT NULL, s.reconDate, '2000-01-01')) 
                  WHERE s.orgID = ? 
                  AND s.status = 'A' 
                  AND s.hasAccount = 1 
                  GROUP BY s.autoID
                  ORDER by s.supplierName";
                $result['suppliers'] = getSanitData($sql, ['iii', [$_SESSION['orgID'], $_SESSION['orgID'], $_SESSION['orgID']]]);
                $sql = "SELECT 
                  autoID, 
                  descr 
                  FROM vehicles 
                  WHERE orgID = ? 
                  AND status = 'A'";
                $result['vehicles'] = getSanitData($sql, ['i', [$_SESSION['orgID']]]); 
              break;
            case "frmFileViewer":
                switch ($header['table']) {
                    case 'attatch':
                        $sql = "SELECT filePath FROM attachments WHERE orgID = ? AND autoID = ?";
                        $file = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['itemID']]]);

                        if ($file && count($file) > 0) {
                            // 1. Database path cleaning (already working)
                            $dbPath = $file[0]['filePath']; 

                            if ($_SESSION['status'] == "live") {
                                // 1. Clean the path (remove ./../ and normalize slashes)
                                $cleanPath = str_replace('\\', '/', $dbPath);
                                $cleanPath = preg_replace('/^(\.\.\/|\.\/)+/', '', $cleanPath);

                                // 2. Step BACK one level from the website's root to find the media folder
                                // dirname() on the Document Root moves you from 'm.test.co.za' to the parent folder
                                $parentFolder = dirname($_SERVER['DOCUMENT_ROOT']);
                                
                                // 3. Construct path. Note: If media is in the parent, you don't need 'CHIRP/JobTrack'
                                // but ensure the casing matches (e.g., 'media' vs 'Media')
                                $fullPath = $parentFolder . '/' . $cleanPath;                              
                            }else{
                                // 2. Build the path using ONLY forward slashes first (most reliable in PHP/Windows)
                                $cleanPath = str_replace('\\', '/', $dbPath);
                                $cleanPath = preg_replace('/^(\.\.\/|\.\/)+/', '', $cleanPath);

                                $fullPath = $_SERVER['DOCUMENT_ROOT'] . '/CHIRP/JobTrack/' . $cleanPath;

                            }
                            
                            // 3. NORMALIZE: Convert ALL slashes to backslashes for Windows
                            //$fullPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $rawPath);
                            error_log("FULL PATH: " . $fullPath);
                            // 4. Bypass realpath() and go straight to the file
                            if (file_exists($fullPath)) {
                                if (ob_get_length()) ob_clean(); 

                                // Detect MIME type
                                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                                $mimeType = finfo_file($finfo, $fullPath);
                                finfo_close($finfo);

                                header('Content-Type: ' . $mimeType);
                                header('Content-Length: ' . filesize($fullPath));
                                header('Content-Disposition: inline; filename="' . basename($fullPath) . '"');
                                
                                readfile($fullPath);
                                exit;
                            } else {
                                error_log("STILL NOT SEEING IT: " . $fullPath);
                                header("HTTP/1.1 404 Not Found");
                                echo "PHP cannot see the file, even though CMD can.";
                                exit;
                            }                    
                        }
                        break;                                    
                }
              break;
            case "getFile":
                switch ($header['table']) {
                    case 'jobNote':
                        $sql = "SELECT photoPath AS filePath FROM job_notes WHERE orgID = ? AND autoID = ?";
                        $file = getSanitData($sql, ['ii', [$_SESSION['orgID'], $fields['itemID']]]);

                        break;                                    
                }
                  if ($file && count($file) > 0) {
                      // 1. Database path cleaning (already working)
                      $dbPath = $file[0]['filePath']; 

                      if ($_SESSION['status'] == "live") {
                          // 1. Clean the path (remove ./../ and normalize slashes)
                          $cleanPath = str_replace('\\', '/', $dbPath);
                          $cleanPath = preg_replace('/^(\.\.\/|\.\/)+/', '', $cleanPath);

                          // 2. Step BACK one level from the website's root to find the media folder
                          // dirname() on the Document Root moves you from 'm.test.co.za' to the parent folder
                          $parentFolder = dirname($_SERVER['DOCUMENT_ROOT']);
                          
                          // 3. Construct path. Note: If media is in the parent, you don't need 'CHIRP/JobTrack'
                          // but ensure the casing matches (e.g., 'media' vs 'Media')
                          $fullPath = $parentFolder . '/' . $cleanPath;                              
                      }else{
                          // 2. Build the path using ONLY forward slashes first (most reliable in PHP/Windows)
                          $cleanPath = str_replace('\\', '/', $dbPath);
                          $cleanPath = preg_replace('/^(\.\.\/|\.\/)+/', '', $cleanPath);

                          $fullPath = $_SERVER['DOCUMENT_ROOT'] . '/CHIRP/JobTrack/' . $cleanPath;

                      }
                      
                      // 3. NORMALIZE: Convert ALL slashes to backslashes for Windows
                      //$fullPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $rawPath);
                      error_log("FULL PATH: " . $fullPath);
                      // 4. Bypass realpath() and go straight to the file
                      if (file_exists($fullPath)) {
                          if (ob_get_length()) ob_clean(); 

                          // Detect MIME type
                          $finfo = finfo_open(FILEINFO_MIME_TYPE);
                          $mimeType = finfo_file($finfo, $fullPath);
                          finfo_close($finfo);

                          header('Content-Type: ' . $mimeType);
                          header('Content-Length: ' . filesize($fullPath));
                          header('Content-Disposition: inline; filename="' . basename($fullPath) . '"');
                          
                          readfile($fullPath);
                          exit;
                      } else {
                          error_log("STILL NOT SEEING IT: " . $fullPath);
                          header("HTTP/1.1 404 Not Found");
                          echo "PHP cannot see the file, even though CMD can.";
                          exit;
                      }                    
                  }
                

              break;
        }
        if ($clientCall) {
            echo json_encode(array('success'=>$result));
        }else{
            return $result;
        }

    } catch (Exception $e) {
        echo json_encode(array('error'=>$e->getMessage()));
    }finally{
        if($conn){
            $conn->close();
        }
    }

}


?>

