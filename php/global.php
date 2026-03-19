<?php
$job_track_session = session_name("jobTrack");
//session_set_cookie_params(3600 * 3, "/", "m.jobtrack.co.za", true, true);
ini_set('session.gc_maxlifetime', 3600 * 3);
session_set_cookie_params(3600 * 8, "/", NULL);
session_start();
date_default_timezone_set("Africa/Johannesburg");
$_SESSION['status'] = "local";

function dBConn(){
    //local, live;

    switch ($_SESSION['status']){
      case 'live':
          $servername = "127.0.0.1";
          $username = "JbtAdm";
          $password = "JobAdm@2025?";
          $dbname = "job_track";
        break;
      case 'local':
          //$servername = "127.0.0.1:3307";
          $servername = "127.0.0.1:3306";

          $username = "root";
          $password = "";
          $dbname = "job_track";
        break;
    }
    // Create connection
    $conn = new mysqli($servername, $username, $password, $dbname);

    // Check connection
     if ($conn->connect_error) {
         die("Connection failed: " . $conn->connect_error);
    }
    $conn->set_charset("utf8");
    return $conn;
}

function createJWT($data) {
    $payLoad = base64_encode($data);

    $signed = hash_hmac('sha256', $payLoad, "f7c3bc1d809e04732adf679965csc34ca7ae3541f2f6c3e2b8f0f3e3c9d2b1a6");
    return $payLoad.".".$signed;
}
function chkJWT($JWT) {
    try {
        $parts = explode(".", $JWT);
        $payLoad = $parts[0];

        if(hash_hmac('sha256', $payLoad, "f7c3bc1d809e04732adf679965csc34ca7ae3541f2f6c3e2b8f0f3e3c9d2b1a6") === $parts[1]){
            return json_decode(base64_decode($payLoad), true);
        }else{
            throw new \Exception("false", 1);
        }
    } catch (\Exception $e) {
        return false;
    }

}

function getData($sqlStr){
    $conn = dBConn();

    $result_array = array();
    try{
        $result = $conn->query($sqlStr);
        if($result == false){
            throw new Exception($conn->error);
        }
        if ($result->num_rows > 0) {
            // output data of each row
            while($row = $result->fetch_assoc()) {
                array_push($result_array, $row);
            }
            return $result_array;
        } else {
            return array();
        }
    }catch (Exception $e){
        return $e->getMessage();
      //  return false;
    }finally{
        if($result != false){
            $result->close();
        }
        $conn->close();
    }

}
function getDataColName($sqlStr, $colName){

    $conn = dBConn();
    $result_array = array();
    try{
        $result = $conn->query($sqlStr);
        if($result == false){
            throw new Exception($conn->error);
        }
    }catch (Exception $e){
        echo 'Exception caught: ' . $e->getMessage() . "\n";
    }
    if ($result->num_rows > 0) {
        // output data of each row
        while($row = $result->fetch_assoc()) {

            $result_array[$row[$colName]] = $row;
        }
        return $result_array;
    } else {
        return array();
    }
    $result->close();
    $conn->close();
}
function getSanitData($sqlStr, $param){
    $conn = dBConn();

    $result_array = array();
    $result = false;
    try{
        if (!$stmt = $conn->prepare($sqlStr)) {
            throw new Exception("Could not prepare", 1);
        }
        if (!$stmt->bind_param($param[0], ...$param[1])) {
            throw new Exception("Could not bind", 1);
        }
        if (!$stmt->execute()) {
            throw new Exception("Could not execute", 1);
        }
        $result = $stmt->get_result();
        if($result == false){
            throw new Exception($conn->error);
        }
        if ($result->num_rows > 0) {
            // output data of each row
            if (isset($param[2])) {
                while($row = $result->fetch_assoc()) {
                    $result_array[$row[$param[2]]] = $row;
                }
            }else{
                while($row = $result->fetch_assoc()) {
                    array_push($result_array, $row);
                }
            }
            return $result_array;
        } else {
            return array();
        }
    }catch (Exception $e){
        //return false;
        return $conn->error;
    }finally{
        if($result != false){
            $result->close();
        }
        $conn->close();
    }

}


function sendMail($mailInfo) {
    try {
        $headers = 'From: <system@ltec.co.za>' . "\r\n";
        $headers .= "Reply-To: noReply@ltec.co.za\r\n";
        if($mailInfo["msgType"] == "html"){
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=utf-8\r\n";
        }

        if(!mail($mailInfo['to'], $mailInfo['subject'], $mailInfo['msg'], $headers, "-f system@ltec.co.za -F info")){
            throw new Exception("Could not send mail");
        };
        return true;

    } catch (Exception $e) {
        return false;
    }


}
function fileManager($param) {
    /*[action=save/delete, type=doc/img, fileContent=content, filePath=if set pathto save, prefix=prifix to file, fileType=optional ex.. .png ]*/
    try {
        if ($param['action'] == "save") {
            $fileParts = explode(';base64,', $param['fileContent']);
            $fileData = $fileParts[1];
            $fileData = str_replace(' ','+', $fileData);
            $fileData = base64_decode($fileData);
            $prefix = (isset($param['prefix'])) ? $param['prefix']."_" : "";
            $curYear = date('Y');
            switch ($param['type']) {
                case 'doc':
                    $mainFolder = "../../media/docs/".$curYear."/".$_SESSION['orgID'];
                    $fileExtension = ".pdf";
                    break;
                case 'img':
                    $mainFolder = "../../media/photos/".$curYear."/".$_SESSION['orgID'];
                    $fileExtension = (isset($param['fileExtension'])) ? $param['fileExtension'] : ".jpg";
                    break;
                case 'sig':
                    $mainFolder = "../../media/signature/".$curYear."/".$_SESSION['orgID'];
                    $fileExtension = (isset($param['fileExtension'])) ? $param['fileExtension'] : ".png";
                    break;
            }
            if(!file_exists($mainFolder)){
                if(!mkdir($mainFolder, 0777,  true)){
                    throw new \Exception("Could not create first folder.", 1);
                }
            }
            $filePath = (isset($param['filePath'])) ? '.'.$param['filePath'] : $mainFolder."/".uniqid($prefix).$fileExtension;
            if (!file_put_contents($filePath,$fileData)) {
                throw new \Exception("Could not save file", 1);
            }
            return substr($filePath, 1);
        }
        else {
            return unlink(".".$param['filePath']);
        }
        /*if($_SESSION['status'] == 'live'){
            $path = "photos/";
        }else{
            $path = "photos/";
          //  $path = "C:/DevTools/wamp64/www/Trophex/Trophex Code/photos/";
        }*/
    } catch (\Exception $e) {
      //  return $e->getMessage();
        return false;
    }
}

?>
