$(function () {
    const App = {
        init() {
            this.attachListeners();
            this.initCameraSelection();
        },

        attachListeners() {
            $("#startScanner").on("click", () => {
                this.startScanner();
            });

            $("#stopScanner").on("click", () => {
                this.stopScanner();
            });

            $("#barcodeType, #resolution, #patchSize, #halfSample, #workers, #cameraSelection, #torch").on("change", () => {
                console.log("Settings updated. Restarting scanner...");
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

            // Manually add specific cameras if they are not detected automatically
            cameraSelect.append($("<option>").val("2_2_facing_back").text("Camera 2 2, facing back"));
            cameraSelect.append($("<option>").val("2_0_facing_back").text("Camera 2 0, facing back"));
        },

        startScanner() {
            const barcodeType = $("#barcodeType").val();
            const resolution = parseInt($("#resolution").val());
            const patchSize = $("#patchSize").val();
            const halfSample = $("#halfSample").is(":checked");
            const workers = parseInt($("#workers").val());
            const cameraDevice = $("#cameraSelection").val();
            const torch = $("#torch").is(":checked");

            Quagga.init(
                {
                    inputStream: {
                        name: "Live",
                        type: "LiveStream",
                        target: document.querySelector("#interactive"),
                        constraints: {
                            width: { min: resolution },
                            deviceId: cameraDevice,
                            facingMode: "environment",
                            torch,
                        },
                    },
                    decoder: {
                        readers: [`${barcodeType}_reader`],
                    },
                    locator: {
                        patchSize,
                        halfSample,
                    },
                    numOfWorkers: workers,
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
