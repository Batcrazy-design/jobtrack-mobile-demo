<?php
include "global.php";
$action = $_POST["action"];
switch ($action) {
  case 'saveData':
      saveData();
    break;
  case 'getData':
      $formData = json_decode($_POST['formData'], true);
      $header = $formData['header'];
      if (isset($formData['fields'])) {
          $fields = $formData['fields'];
          getThisData($header, $fields);
      }else{
          getThisData($header, false);
      }
    break;
}

function setUser() {

}

function saveData() {
    try {
        $post = json_decode($_POST['formData'], true);
        $header = $post['header'];
        $fields = (isset($post['fields'])) ? $post['fields'] : false;
        $conn = dBConn();
        switch ($header['name']) {
            case 'frmRegDevice':
                [$orgID, $pin] = explode('_', $fields['code'], 2);
                $sql = "SELECT
                    a.autoID,
                    a.orgID,
                    a.empID,
                    a.vehicleID,
                    CONCAT(b.firstName) AS empName,
                    CONCAT(c.model, '-', c.regNo) AS vehicleName
                    FROM devices a
                    LEFT JOIN emps b ON b.autoID = a.empID
                    LEFT JOIN vehicles c ON c.autoID = a.vehicleID
                    WHERE a.orgID = ? 
                    AND a.regPin = ?";
                $device = getSanitData($sql, ['ii', [$orgID, $fields['code']]]);
                if (is_array($device) && !empty($device)) {
                    $device = $device[0];
                    session_regenerate_id(true);
                    $_SESSION['orgID'] = $device['orgID'];
                    $_SESSION['empID'] = $device['empID'];
                    $_SESSION['vehicleID'] = $device['vehicleID'];
                    $token = uniqid($device['orgID'], true);
                    if (!$stmt = $conn->prepare("UPDATE devices SET token = ?, regPin = NULL, pinDate = NULL WHERE autoID = ?")) {
                        throw new Exception("Could not prepare", 1);
                    }
                    if (!$stmt->bind_param("si", $token, $device['autoID'])) {
                        throw new Exception("Could not bind", 1);
                    }
                    if (!$stmt->execute()) {
                        throw new Exception("Could not execute", 1);
                    }
                    $deviceToken = [
                        "token"=>$token, 
                        "orgID"=>$device['orgID'],
                        "empName"=>$device['empName'], 
                        "vehicleName"=>$device['vehicleName']
                    ];
                    $result['deviceToken'] = createJWT(json_encode($deviceToken));

                }else {
                    $result = "No";
                }

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

function getThisData($header, $fields) {
    $conn = dbConn();
    try {
        switch ($header['name']) {
            case 'getStartData':
                $sql = "SELECT
                  autoID,
                  disName
                  FROM supp_cat
                  WHERE status = 'A'
                  ORDER BY disName";
                $result = getData($sql);


              break;
            case "preLogin":
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
                        $token = uniqid($device['orgID'], true);

                        if (!$stmt = $conn->prepare("UPDATE devices SET token = ?, regPin = NULL, pinDate = NULL WHERE autoID = ?")) {
                            throw new Exception("Could not prepare", 1);
                        }
                        if (!$stmt->bind_param("si", $token, $device['autoID'])) {
                            throw new Exception("Could not bind", 1);
                        }
                        if (!$stmt->execute()) {
                            throw new Exception("Could not execute", 1);
                        }

                        $deviceToken = [
                            "token"=>$token, 
                            "orgID"=>$device['orgID'],
                            "empName"=>$device['empName'], 
                            "vehicleName"=>$device['vehicleName']
                        ];
                        $result['deviceToken'] = createJWT(json_encode($deviceToken));
                    }else{
                        $result = "No";
                    }
                }else{
                    $result = "No";
                }
              break;
        }
        if(isset($result)){
            echo json_encode(array('success'=>$result));
        }
    } catch (Exception $e) {
        echo json_encode(array('error'=>$e->getMessage()));
    }

}

?>
