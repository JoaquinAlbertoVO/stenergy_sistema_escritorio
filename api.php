<?php
// ==========================================
// API DE SINCRONIZACIÓN ST ENERGY
// ==========================================

// Configuración de la base de datos MySQL de cPanel
$db_host = 'localhost'; // En cPanel siempre es localhost
$db_user = 'stenergyedu_app'; // Reemplaza con el usuario que creaste
$db_pass = 'TU_NUEVA_CONTRASEÑA'; // Reemplaza con la contraseña que le pusiste
$db_name = 'stenergyedu_wp68446'; // Tu base de datos

// Clave secreta (Pon la misma en la aplicación de escritorio)
$api_secret = 'STENERGY_2026_SECRETO_SEGURO';

// ==========================================
// NO EDITAR MÁS ABAJO
// ==========================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Validar clave secreta
$headers = apache_request_headers();
$auth = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($_POST['api_secret']) ? $_POST['api_secret'] : '');

if ($auth !== $api_secret) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "No autorizado. Clave secreta incorrecta."]);
    exit();
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// 1. Alojamiento de PDFs (Certificados)
if ($action === 'upload_pdf') {
    if (!isset($_FILES['pdf'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "No se recibió ningún archivo PDF."]);
        exit();
    }
    
    $saleId = isset($_POST['saleId']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['saleId']) : 'cert_'.time();
    $uploadDir = __DIR__ . '/certificados/';
    
    // Crear carpeta /certificados/ si no existe
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $fileName = $saleId . '.pdf';
    $targetFilePath = $uploadDir . $fileName;
    
    if (move_uploaded_file($_FILES['pdf']['tmp_name'], $targetFilePath)) {
        echo json_encode(["success" => true, "url" => "/certificados/" . $fileName]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Error al guardar el archivo en el servidor."]);
    }
    exit();
}

// Conectar a la base de datos
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Error de conexión: " . $conn->connect_error]);
    exit();
}

// Asegurar que las tablas existan
$conn->query("
    CREATE TABLE IF NOT EXISTS stenergy_sales (
        id VARCHAR(255) PRIMARY KEY,
        date VARCHAR(255),
        clientId VARCHAR(255),
        clientName VARCHAR(255),
        clientDni VARCHAR(255),
        clientPhone VARCHAR(255),
        clientEmail VARCHAR(255),
        courseId VARCHAR(255),
        courseName VARCHAR(255),
        modality VARCHAR(255),
        sellerId VARCHAR(255),
        sellerName VARCHAR(255),
        status VARCHAR(255),
        totalAmount DOUBLE,
        paidAmount DOUBLE,
        certificateGenerated INT,
        certificateOverrides TEXT
    )
");

$conn->query("
    CREATE TABLE IF NOT EXISTS stenergy_payments (
        id VARCHAR(255) PRIMARY KEY,
        saleId VARCHAR(255),
        date VARCHAR(255),
        amount DOUBLE,
        account VARCHAR(255)
    )
");

// 2. Sincronización de Base de Datos
if ($action === 'sync') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "JSON inválido."]);
        exit();
    }
    
    $salesToUpload = isset($data['sales']) ? $data['sales'] : [];
    $paymentsToUpload = isset($data['payments']) ? $data['payments'] : [];
    
    $conn->begin_transaction();
    try {
        $stmtSale = $conn->prepare("REPLACE INTO stenergy_sales (id, date, clientId, clientName, clientDni, clientPhone, clientEmail, courseId, courseName, modality, sellerId, sellerName, status, totalAmount, paidAmount, certificateGenerated, certificateOverrides) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        foreach ($salesToUpload as $sale) {
            $stmtSale->bind_param("ssssssssssssssdis", 
                $sale['id'], $sale['date'], $sale['clientId'], $sale['clientName'], 
                $sale['clientDni'], $sale['clientPhone'], $sale['clientEmail'], 
                $sale['courseId'], $sale['courseName'], $sale['modality'], 
                $sale['sellerId'], $sale['sellerName'], $sale['status'], 
                $sale['totalAmount'], $sale['paidAmount'], $sale['certificateGenerated'], 
                $sale['certificateOverrides']
            );
            $stmtSale->execute();
        }
        
        $stmtPayment = $conn->prepare("REPLACE INTO stenergy_payments (id, saleId, date, amount, account) VALUES (?, ?, ?, ?, ?)");
        foreach ($paymentsToUpload as $p) {
            $stmtPayment->bind_param("sssds", $p['id'], $p['saleId'], $p['date'], $p['amount'], $p['account']);
            $stmtPayment->execute();
        }
        
        $conn->commit();
    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Error guardando en nube: " . $e->getMessage()]);
        exit();
    }
    
    $remoteSales = [];
    $resSales = $conn->query("SELECT * FROM stenergy_sales");
    while($row = $resSales->fetch_assoc()) {
        $remoteSales[] = $row;
    }
    
    $remotePayments = [];
    $resPay = $conn->query("SELECT * FROM stenergy_payments");
    while($row = $resPay->fetch_assoc()) {
        $remotePayments[] = $row;
    }
    
    echo json_encode([
        "success" => true,
        "remoteSales" => $remoteSales,
        "remotePayments" => $remotePayments
    ]);
    exit();
}

http_response_code(400);
echo json_encode(["success" => false, "error" => "Acción desconocida."]);
$conn->close();
?>
