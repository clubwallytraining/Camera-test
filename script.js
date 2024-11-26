// script.js

// Initialize variables
let csvData = [];
let currentUPC = '';
const csvFileName = 'data.csv'; // Initial CSV file name

// Elements
const startButton = document.getElementById('startButton');
const exportButton = document.getElementById('exportButton');
const message = document.getElementById('message');
const infoModal = document.getElementById('infoModal');
const modalUPC = document.getElementById('modalUPC');
const saveInfoButton = document.getElementById('saveInfo');
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d');

// Load initial CSV data from GitHub Pages
// Since GitHub Pages is static, you need to host the CSV file in the repository and fetch it
async function loadCSV() {
    try {
        const storedData = localStorage.getItem('csvData');
        if (storedData) {
            csvData = JSON.parse(storedData);
        } else {
            const response = await fetch(csvFileName);
            if (!response.ok) {
                throw new Error('CSV file not found.');
            }
            const csvText = await response.text();
            const parsedData = Papa.parse(csvText, { header: true });
            csvData = parsedData.data.filter(row => row.upc); // Filter out empty rows
            // Save to localStorage
            localStorage.setItem('csvData', JSON.stringify(csvData));
        }
    } catch (error) {
        console.error('Error loading CSV:', error);
        showMessage('Error loading CSV file.');
        csvData = []; // Initialize empty if not found
    }
}

// Function to show messages
function showMessage(msg, isError = true) {
    message.textContent = msg;
    message.style.display = 'block';
    message.style.backgroundColor = isError ? '#dc3545' : '#28a745';
    setTimeout(() => {
        message.style.display = 'none';
    }, 3000);
}

// Function to start the scanner
function startScanner() {
    Quagga.init({
        inputStream: {
            type: "LiveStream",
            constraints: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "environment" // Use rear camera
            },
            target: document.querySelector('#video-container') // Or '#yourElement' (optional)
        },
        decoder: {
            readers: ["upc_reader", "upc_e_reader"] // Specify barcode types
        },
        locate: true,
        numOfWorkers: navigator.hardwareConcurrency || 4,
        frequency: 10,
        debug: {
            showCanvas: false,
            showPatches: false,
            showFoundPatches: false,
            showSkeleton: false,
            showLabels: false,
            showPatchLabels: false,
            showRemainingPatchLabels: false,
            boxFromPatches: {
                showTransformed: false,
                showTransformedBox: false,
                showBB: false
            }
        }
    }, function(err) {
        if (err) {
            console.error(err);
            showMessage('Error initializing scanner.');
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(onDetected);
    Quagga.onProcessed(onProcessed);
}

// Handler when a barcode is detected
function onDetected(result) {
    const code = result.codeResult.code;
    if (code !== currentUPC) { // Prevent multiple detections of the same UPC
        currentUPC = code;
        Quagga.pause(); // Pause scanning while processing
        handleUPC(code);
    }
}

// Handler for processed frames to draw AR elements and the rectangle guide
function onProcessed(result) {
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    if (result) {
        if (result.boxes) {
            result.boxes.filter(box => box !== result.box).forEach(box => {
                drawPath(box, 'rgba(0, 255, 0, 0.3)');
            });
        }

        if (result.box) {
            drawPath(result.box, '#00FF00');
        }

        if (result.codeResult && result.codeResult.code) {
            drawPath(result.line, '#FF0000');
        }
    }

    // Draw the rectangle guide
    drawGuideRectangle();
}

// Function to draw paths on the canvas
function drawPath(path, color) {
    overlayCtx.beginPath();
    overlayCtx.moveTo(path[0].x, path[0].y);
    path.forEach(point => {
        overlayCtx.lineTo(point.x, point.y);
    });
    overlayCtx.lineWidth = 2;
    overlayCtx.strokeStyle = color;
    overlayCtx.stroke();
}

// Function to draw the rectangle guide
function drawGuideRectangle() {
    const width = overlay.width;
    const height = overlay.height;
    const rectWidth = width * 0.6;
    const rectHeight = height * 0.2;
    const rectX = (width - rectWidth) / 2;
    const rectY = (height - rectHeight) / 2;

    overlayCtx.beginPath();
    overlayCtx.lineWidth = 4;
    overlayCtx.strokeStyle = '#FF0000';
    overlayCtx.rect(rectX, rectY, rectWidth, rectHeight);
    overlayCtx.stroke();
}

// Handle UPC after detection
function handleUPC(upc) {
    const item = csvData.find(row => row.upc === upc);
    if (item && item['item name'] && item['aisle location'] && item['downstack pallet']) {
        // Item exists with all information
        showAROverlay(item);
    } else {
        // Missing information
        currentUPC = upc;
        infoModal.style.display = 'block';
        modalUPC.textContent = upc;
    }
}

// Show AR Overlay
function showAROverlay(item) {
    // Clear any existing drawings
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    
    // Display information on the screen as AR elements
    showMessage(`Item: ${item['item name']} | Aisle: ${item['aisle location']} | Pallet: ${item['downstack pallet']}`, false);
    
    // Optionally, you can implement more advanced AR overlays here
    
    // Resume scanning after displaying
    setTimeout(() => {
        Quagga.start();
    }, 3000);
}

// Save information from modal
saveInfoButton.addEventListener('click', () => {
    const itemName = document.getElementById('itemName').value.trim();
    const aisleLocation = document.getElementById('aisleLocation').value.trim();
    const pallet = document.getElementById('pallet').value.trim();

    if (!itemName || !aisleLocation || !pallet) {
        alert('Please fill in all fields.');
        return;
    }

    // Check if UPC already exists
    const existingIndex = csvData.findIndex(row => row.upc === currentUPC);
    if (existingIndex !== -1) {
        csvData[existingIndex]['item name'] = itemName;
        csvData[existingIndex]['aisle location'] = aisleLocation;
        csvData[existingIndex]['downstack pallet'] = pallet;
    } else {
        // Add new entry to csvData
        csvData.push({
            upc: currentUPC,
            'item name': itemName,
            'aisle location': aisleLocation,
            'downstack pallet': pallet
        });
    }

    // Save to localStorage
    localStorage.setItem('csvData', JSON.stringify(csvData));

    // Close modal and resume scanning
    infoModal.style.display = 'none';
    showMessage('Information saved.', false);
    Quagga.start();
});

// Export CSV
function exportCSV() {
    if (csvData.length === 0) {
        showMessage('No data to export.');
        return;
    }
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "updated_data.csv");
}

// Event Listeners
startButton.addEventListener('click', () => {
    startScanner();
    startButton.style.display = 'none';
});

exportButton.addEventListener('click', exportCSV);

// Close modal when clicking outside of it
window.onclick = function(event) {
    if (event.target == infoModal) {
        infoModal.style.display = "none";
        Quagga.start();
    }
}

// Initialize the app
window.onload = loadCSV;

// Adjust canvas size when video metadata is loaded
video.addEventListener('loadedmetadata', () => {
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
});
