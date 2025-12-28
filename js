const video = document.getElementById("video");
const alertScreen = document.getElementById("alertScreen");
const registerBtn = document.getElementById("registerBtn");
const status = document.getElementById("status");

const TIMEOUT = 5000; // 5 seconds
let lastSeen = Date.now();
let authorizedDescriptor = null;

// Load models from CDN
async function loadModels() {
  const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
  status.textContent = "Loading face detection models...";
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  status.textContent = "Models loaded! Starting camera...";
  startVideo();
}

// Start webcam
function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
      video.addEventListener("play", () => {
        registerBtn.disabled = false;
        status.textContent = "Camera ready. Click 'Register Face' to save your face.";
        loadAuthorizedFace();
        startDetectionLoop();
      });
    })
    .catch(err => status.textContent = "Camera error: " + err);
}

// Load saved face from localStorage
function loadAuthorizedFace() {
  const data = localStorage.getItem("authorizedFace");
  if (data) {
    authorizedDescriptor = new Float32Array(JSON.parse(data));
    status.textContent = "Authorized face loaded!";
  }
}

// Save face descriptor
function saveAuthorizedFace(descriptor) {
  localStorage.setItem("authorizedFace", JSON.stringify(Array.from(descriptor)));
  authorizedDescriptor = descriptor;
  status.textContent = "Face registered successfully!";
}

// Register face
registerBtn.addEventListener("click", async () => {
  status.textContent = "Detecting face for registration...";
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    status.textContent = "No face detected. Try again.";
    return;
  }
  saveAuthorizedFace(detection.descriptor);
});

// Detection loop
function startDetectionLoop() {
  setInterval(async () => {
    if (!authorizedDescriptor) return;

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      const faceMatcher = new faceapi.FaceMatcher(
        new faceapi.LabeledFaceDescriptors("Authorized", [authorizedDescriptor]),
        0.5
      );
      const match = faceMatcher.findBestMatch(detection.descriptor);

      if (match.label === "Authorized") {
        lastSeen = Date.now();
        alertScreen.style.display = "none";
        status.textContent = "Face recognized: Access granted";
      } else {
        status.textContent = "Face not recognized";
      }
    } else {
      status.textContent = "No face detected";
    }

    if (Date.now() - lastSeen > TIMEOUT) {
      alertScreen.style.display = "flex";
    }
  }, 300);
}

// Initialize
window.addEventListener('load', loadModels);
