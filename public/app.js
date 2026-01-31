document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const previewSection = document.getElementById('previewSection');
    const previewImage = document.getElementById('previewImage');
    const clearBtn = document.getElementById('clearBtn');
    const recognizeBtn = document.getElementById('recognizeBtn');
    const statusSection = document.getElementById('statusSection');
    const statusMessage = document.getElementById('statusMessage');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const resultsSection = document.getElementById('resultsSection');
    const plateResult = document.getElementById('plateResult');
    const originalImage = document.getElementById('originalImage');
    const plateImage = document.getElementById('plateImage');
    const originalCard = document.getElementById('originalCard');
    const plateCard = document.getElementById('plateCard');
    const newImageBtn = document.getElementById('newImageBtn');
    const historySection = document.getElementById('historySection');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    let selectedFile = null;
    let history = [];

    browseBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    dropZone.addEventListener('click', (e) => {
        if (e.target === dropZone || e.target.closest('.drop-zone-content')) {
            fileInput.click();
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showStatus('error', 'Please select a valid image file');
            return;
        }

        selectedFile = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            dropZone.style.display = 'none';
            previewSection.style.display = 'block';
            hideStatus();
            hideResults();
        };
        reader.readAsDataURL(file);
    }

    clearBtn.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        dropZone.style.display = 'block';
        previewSection.style.display = 'none';
        hideStatus();
        hideResults();
    });

    recognizeBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            showStatus('error', 'Please select an image first');
            return;
        }

        recognizeBtn.disabled = true;
        showStatus('processing', 'Processing image... Please wait');

        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            const response = await fetch('/api/recognize', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Processing failed');
            }

            hideStatus();
            showResults(data);
            addToHistory(data);

        } catch (error) {
            showStatus('error', error.message || 'Failed to process image. Please try again.');
        } finally {
            recognizeBtn.disabled = false;
        }
    });

    newImageBtn.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        dropZone.style.display = 'block';
        previewSection.style.display = 'none';
        hideResults();
    });

    clearHistoryBtn.addEventListener('click', () => {
        history = [];
        renderHistory();
    });

    function showStatus(type, message) {
        statusSection.style.display = 'block';
        statusSection.className = 'status-section ' + type;
        statusMessage.textContent = message;

        if (type === 'processing') {
            progressBar.style.display = 'block';
        } else {
            progressBar.style.display = 'none';
        }
    }

    function hideStatus() {
        statusSection.style.display = 'none';
    }

    function showResults(data) {
        resultsSection.style.display = 'block';

        if (data.recognizedText && data.recognizedText !== 'unknown') {
            plateResult.textContent = data.recognizedText;
            plateResult.classList.remove('unknown');
        } else {
            plateResult.textContent = 'No license plate detected';
            plateResult.classList.add('unknown');
        }

        if (data.originalImagePath) {
            originalImage.src = data.originalImagePath;
            originalCard.style.display = 'block';
        } else {
            originalCard.style.display = 'none';
        }

        if (data.plateImage) {
            plateImage.src = data.plateImage;
            plateCard.style.display = 'block';
        } else {
            plateCard.style.display = 'none';
        }

        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    function hideResults() {
        resultsSection.style.display = 'none';
    }

    function addToHistory(data) {
        const item = {
            plate: data.recognizedText || 'Unknown',
            time: new Date().toLocaleTimeString(),
            timestamp: Date.now()
        };

        history.unshift(item);
        if (history.length > 10) {
            history.pop();
        }
        renderHistory();
    }

    function renderHistory() {
        if (history.length === 0) {
            historyList.innerHTML = '<p class="no-history">No images processed yet</p>';
            clearHistoryBtn.style.display = 'none';
            return;
        }

        clearHistoryBtn.style.display = 'inline-block';
        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <span class="history-plate">${item.plate}</span>
                <span class="history-time">${item.time}</span>
            </div>
        `).join('');
    }
});
