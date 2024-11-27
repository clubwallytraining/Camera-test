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

// Load initial CSV data
async function loadCSV() {
    try {
        const storedData = localStorage.getItem('csvData');
        if (storedData) {
            csvData = JSON.parse(storedData);
            console.log('Loaded CSV data from localStorage.');
        } else {
            const response = await fetch(csvFileName);
            if (!response.ok) {
                if (response.status === 404 || response.status === 400) {
                    csvData = [];
                    console.warn('CSV file not found or empty. Initializing with empty data.');
                } else {
                    throw new Error('Failed to fetch CSV file.');
                }
            } else {
                const csvText = await response.text();
                if (csvText.trim() === '') {
                    csvData = [];
                    console.warn('CSV file is empty. Initializing with empty data.');
                } else {
                    const parsedData = Papa.parse(csvText, { header: true });
                    csvData = parsedData.data.filter(row => row.upc);
                    console.log('Loaded CSV data from data.csv:', csvData);
                }
                localStorage.setItem('csvData', JSON.stringify(csvData));
            }
        }
    } catch (error) {
        console.error('Error loading CSV:', error);
        showMessage('Error loading CSV file.');
        csvData = [];
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
    Quagga.init(
        {
            inputStream: {
                type: 'LiveStream',
                constraints: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment',
                },
                target: document.querySelector('#video-container'),
            },
            decoder: {
                readers: ['upc_reader', 'upc_e_reader'],
            },
            locate: true,
            numOfWorkers: navigator.hardwareConcurrency || 4,
            frequency: 10,
        },
        function (err) {
            if (err) {
                console.error('Error initializing Quagga:', err);
                showMessage('Error initializing scanner. Please try again.', true);
                return;
            }
            Quagga.start();
            console.log('Quagga scanner started.');
        }
    );

    Quagga.onDetected(onDetected);
    Quagga.onProcessed(onProcessed);
}

// Handler when a barcode is detected
function onDetected(result) {
    const code = result.codeResult.code;
    if (code !== currentUPC) {
        currentUPC = code;
        Quagga.pause(); // Pause scanning while processing
        console.log('Detected UPC:', code);
        handleUPC(code);
    }
}

// Handler for processed frames
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
    overlayCtx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    overlayCtx.rect(rectX, rectY, rectWidth, rectHeight);
    overlayCtx.stroke();
}

// Handle UPC after detection
function handleUPC(upc) {
    const item = csvData.find(row => row.upc === upc);
    if (item && item['item name'] && item['aisle location'] && item['downstack pallet']) {
        showAROverlay(item);
    } else {
        currentUPC = upc;
        infoModal.style.display = 'block';
        modalUPC.textContent = upc;
        console.log('UPC not found or missing data:', upc);
    }
}

// Show AR Overlay
function showAROverlay(item) {
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    showMessage(`Item: ${item['item name']} | Aisle: ${item['aisle location']} | Pallet: ${item['downstack pallet']}`, false);
    console.log('Displaying item information:', item);

    setTimeout(() => {
        currentUPC = '';
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

    const existingIndex = csvData.findIndex(row => row.upc === currentUPC);
    if (existingIndex !== -1) {
        csvData[existingIndex]['item name'] = itemName;
        csvData[existingIndex]['aisle location'] = aisleLocation;
        csvData[existingIndex]['downstack pallet'] = pallet;
        console.log('Updated existing item:', csvData[existingIndex]);
    } else {
        const newEntry = { upc: currentUPC, 'item name': itemName, 'aisle location': aisleLocation, 'downstack pallet': pallet };
        csvData.push(newEntry);
        console.log('Added new item:', newEntry);
    }

    localStorage.setItem('csvData', JSON.stringify(csvData));
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
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'updated_data.csv');
    showMessage('CSV exported successfully.', false);
}

// Event Listeners
startButton.addEventListener('click', () => {
    startScanner();
    startButton.style.display = 'none';
});

exportButton.addEventListener('click', exportCSV);

// Initialize the app
window.onload = loadCSV;

// Adjust canvas size when video metadata is loaded
video.addEventListener('loadedmetadata', () => {
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
});
