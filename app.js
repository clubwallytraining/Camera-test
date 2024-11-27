document.addEventListener("DOMContentLoaded", () => {
    const messageBox = document.getElementById("message");
    const startButton = document.getElementById("startScanner");
    const exportButton = document.getElementById("exportData");
    let csvData = [];
    let isScannerActive = false;

    // Show a temporary message
    function showMessage(message, isError = false) {
        messageBox.textContent = message;
        messageBox.className = isError ? "error" : "success";
        messageBox.style.display = "block";
        setTimeout(() => {
            messageBox.style.display = "none";
        }, 3000);
    }

    // Initialize the scanner
    function initScanner() {
        Quagga.init(
            {
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: document.querySelector("#interactive"),
                    constraints: {
                        facingMode: "environment",
                    },
                },
                decoder: {
                    readers: ["upc_reader", "code_128_reader"],
                },
                locate: true,
            },
            (err) => {
                if (err) {
                    console.error("Quagga initialization error:", err);
                    showMessage("Error initializing scanner", true);
                    return;
                }
                Quagga.start();
                isScannerActive = true;
                showMessage("Scanner started successfully");
            }
        );

        Quagga.onDetected((data) => {
            const code = data.codeResult.code;
            if (!csvData.some((item) => item.code === code)) {
                csvData.push({ code });
                showMessage(`Detected: ${code}`);
            }
        });
    }

    // Stop the scanner
    function stopScanner() {
        if (isScannerActive) {
            Quagga.stop();
            isScannerActive = false;
            showMessage("Scanner stopped");
        }
    }

    // Export data to CSV
    function exportCSV() {
        if (csvData.length === 0) {
            showMessage("No data to export", true);
            return;
        }
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, "barcode_data.csv");
        showMessage("Data exported successfully");
    }

    // Event listeners
    startButton.addEventListener("click", () => {
        if (isScannerActive) {
            stopScanner();
            startButton.textContent = "Start Scanner";
        } else {
            initScanner();
            startButton.textContent = "Stop Scanner";
        }
    });

    exportButton.addEventListener("click", exportCSV);
});
