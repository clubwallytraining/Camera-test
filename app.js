$(function () {
    const App = {
        init() {
            this.bindListeners();
            this.initCameraSelection();
        },

        bindListeners() {
            $("#startScanner").on("click", () => {
                this.startScanner();
            });

            $("#stopScanner").on("click", () => {
                this.stopScanner();
            });

            $("#barcodeType, #resolution, #cameraSelection").on("change", () => {
                console.log("Settings changed, reinitializing scanner...");
                this.startScanner(); // Restart scanner with new settings
            });
        },

        async initCameraSelection() {
            const cameras = await Quagga.CameraAccess.enumerateVideoDevices();
            const cameraSelect = $("#cameraSelection");
            cameraSelect.empty();

            cameras.forEach((camera, index) => {
                const option = $("<option>")
                    .val(camera.deviceId)
                    .text(camera.label || `Camera ${index + 1}`);
                cameraSelect.append(option);
            });
        },

        startScanner() {
            const barcodeType = $("#barcodeType").val();
            const resolution = $("#resolution").val().split("x");
            const cameraDevice = $("#cameraSelection").val();

            Quagga.init(
                {
                    inputStream: {
                        name: "Live",
                        type: "LiveStream",
                        target: document.querySelector("#interactive"),
                        constraints: {
                            width: { min: parseInt(resolution[0]) },
                            height: { min: parseInt(resolution[1]) },
                            deviceId: cameraDevice,
                            facingMode: "environment",
                        },
                    },
                    decoder: {
                        readers: [`${barcodeType}_reader`],
                    },
                    locate: true,
                },
                (err) => {
                    if (err) {
                        console.error("Quagga initialization error:", err);
                        return;
                    }
                    Quagga.start();
                    console.log("Scanner started.");
                }
            );

            Quagga.onDetected((data) => {
                const code = data.codeResult.code;
                if (code) {
                    console.log(`Detected barcode: ${code}`);
                    this.displayResult(code);
                }
            });
        },

        stopScanner() {
            Quagga.stop();
            console.log("Scanner stopped.");
        },

        displayResult(code) {
            const resultList = $("#resultList");
            const listItem = $("<li>").text(`Detected: ${code}`);
            resultList.append(listItem);
        },
    };

    App.init();
});
