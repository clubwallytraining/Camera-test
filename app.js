$(function () {
    const App = {
        init() {
            this.attachListeners();
            this.initCameraSelection();
        },

        attachListeners() {
            $("#stopScanner").on("click", () => {
                Quagga.stop();
                console.log("Scanner stopped.");
            });

            $("#barcodeType, #resolution, #cameraSelection").on("change", () => {
                App.updateSettings();
            });

            $("#startScanner").on("click", () => {
                App.startScanner();
            });
        },

        initCameraSelection() {
            Quagga.CameraAccess.enumerateVideoDevices().then((devices) => {
                const cameraSelection = $("#cameraSelection");
                devices.forEach((device) => {
                    const option = $("<option>")
                        .val(device.deviceId)
                        .text(device.label || `Camera ${cameraSelection.children().length + 1}`);
                    cameraSelection.append(option);
                });
            });
        },

        startScanner() {
            const barcodeType = $("#barcodeType").val();
            const resolution = $("#resolution").val().split("x");
            const cameraDevice = $("#cameraSelection").val();

            Quagga.init(
                {
                    inputStream: {
                        type: "LiveStream",
                        constraints: {
                            width: { min: parseInt(resolution[0]) },
                            height: { min: parseInt(resolution[1]) },
                            deviceId: cameraDevice,
                            facingMode: "environment",
                        },
                        target: document.querySelector("#interactive"),
                    },
                    decoder: {
                        readers: [`${barcodeType}_reader`],
                    },
                    locate: true,
                },
                (err) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    Quagga.start();
                    console.log("Scanner started.");
                }
            );

            Quagga.onDetected((data) => {
                const code = data.codeResult.code;
                if (code) {
                    console.log(`Detected code: ${code}`);
                    App.displayResult(code);
                }
            });
        },

        displayResult(code) {
            const resultList = $("#result_strip ul.thumbnails");
            const listItem = $("<li>").text(`Detected: ${code}`);
            resultList.append(listItem);
        },

        updateSettings() {
            console.log("Settings updated.");
        },
    };

    App.init();
});
