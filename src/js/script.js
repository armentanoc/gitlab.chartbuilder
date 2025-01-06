
function populateYearDropdown() {
  const currentYear = new Date().getFullYear();
  const yearDropdown = document.getElementById('year-input');
  
  yearDropdown.innerHTML = '';
  
  for (let year = currentYear; year >= currentYear - 5; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearDropdown.appendChild(option);
  }

  yearDropdown.value = currentYear;
  yearDropdown.addEventListener('change', handleYearChange);
}

function handleYearChange() {
  const year = parseInt(document.getElementById('year-input').value);
  if (window.inputData) {
    processInputData(window.inputData);
  }
}

populateYearDropdown();

function isLeapYear(year) {
  return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
}

const generateSVGFromJSON = (data, filterYear) => {
  const rectWidth = 10;
  const rectHeight = 10;
  const padding = 2;
  const cols = 53;
  const rows = 7;
  const xOffset = 10;
  const yOffset = 20;
  const dayWidth = rectWidth + padding;
  const dayHeight = rectHeight + padding;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const startDate = new Date(filterYear, 0, 1);
  const endDate = new Date(filterYear, 11, 31);

  const result = {};
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    result[dateStr] = data[dateStr] || 0;
  }

  const getColor = (level) => {
    if (level === 0) return "#e1e4e8";
    if (level < 5) return "#f4c20d";
    if (level < 10) return "#f39c12";
    return "#e67e22";
  };

  let rects = '';
  let monthMarkers = new Map();
  let weekCounter = 0;

  const firstSunday = new Date(startDate);
  while (firstSunday.getDay() !== 0) {
    firstSunday.setDate(firstSunday.getDate() - 1);
  }

  let currentDate = new Date(firstSunday);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const year = currentDate.getFullYear();
    
    if (year === filterYear) {
      const dayOfWeek = currentDate.getDay();
      const month = currentDate.getMonth();
      const dayOfMonth = currentDate.getDate();
      
      const x = xOffset + weekCounter * dayWidth;
      const y = yOffset + dayOfWeek * dayHeight;
      
      const level = result[dateStr] || 0;
      const color = getColor(level);

      if (dayOfMonth === 1) {
        monthMarkers.set(month, x);
      }

      rects += ` 
        <rect width="${rectWidth}" height="${rectHeight}" x="${x}" y="${y}" 
              class="ContributionCalendar-day" data-date="${dateStr}" 
              data-level="${level}" rx="2" ry="2" fill="${color}"></rect>`;
    }
    
    if (currentDate.getDay() === 6) {
      weekCounter++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const monthMarkersArray = Array.from(monthMarkers, ([month, x]) => ({month, x}))
    .sort((a, b) => a.x - b.x);

  const lastMonthMarker = monthMarkersArray[monthMarkersArray.length - 1] || { x: xOffset };
  const svgWidth = Math.max(
    (cols * dayWidth) + xOffset + 10,
    lastMonthMarker.x + rectWidth + 10
  );

  const svgHeight = rows * dayHeight + yOffset + 15;

  const monthLabels = monthMarkersArray.map(marker => `
    <text x="${marker.x + rectWidth / 2}" y="${yOffset - 5}" text-anchor="middle" fill="#333" font-size="10">
      ${monthNames[marker.month]}
    </text>
  `).join('');

  const totalContributions = Object.values(result).reduce((sum, value) => sum + value, 0);

  return `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" 
         preserveAspectRatio="xMidYMid meet" 
         xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0, 0)">
        <text x="${svgWidth - 515}" y="${svgHeight - 0.2}" text-anchor="end" fill="#333" font-size="10">Total Contributions ${filterYear}: ${totalContributions}</text>
        ${rects}
        ${monthLabels}
      </g>
    </svg>`;
};

function handleInput(event) {
  let inputData = null;

  if (event.target.files && event.target.files[0]) {
    const file = event.target.files[0];
    if (file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          inputData = JSON.parse(e.target.result);
          window.inputData = inputData; 
          processInputData(inputData);
        } catch (error) {
          showError('Error parsing JSON from file: ' + error.message);
        }
      };
      reader.readAsText(file);
    } else {
      showError('Please upload a valid JSON file.');
    }
  } else if (event.target.value) {
    try {
      inputData = JSON.parse(event.target.value);
      window.inputData = inputData;
      processInputData(inputData);
    } catch (error) {
      showError('Error parsing JSON string: ' + error.message);
    }
  }
}

function processInputData(data) {
  try {
    showError('');
    const year = parseInt(document.getElementById('year-input').value);
    document.getElementById('calendar-svg').innerHTML = '';
    const svgContent = generateSVGFromJSON(data, year); 

    const calendarSvgElement = document.getElementById('calendar-svg');
    if (calendarSvgElement) {
      document.getElementById('error-message').style.display = 'none';
      calendarSvgElement.style.display = 'block';
      calendarSvgElement.innerHTML = svgContent;
    } else {
      showError('SVG container element not found.');
    }

    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
      downloadBtn.removeEventListener('click', handleDownload);
      downloadBtn.addEventListener('click', () => handleDownload(svgContent));
      downloadBtn.style.display = 'inline';
    } else {
      showError('Download button element not found.');
    }
  } catch (error) {
    showError('Error processing JSON data: ' + error.message);
  }
}

function handleDownload(svgContent) {
  if (!svgContent) {
    showError('SVG content is not available for download.');
    return;
  }

  downloadPNG(svgContent);
}

function downloadPNG(svgContent) {
  if (!svgContent) {
    console.error('SVG content is not available.');
    showError('SVG content not found.');
    return;
  }

  const filename = 'calendar';
  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.src = svgUrl;

  img.onload = function () {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const svgElement = document.createElement('svg');
    svgElement.innerHTML = svgContent;
    document.body.appendChild(svgElement);

    const svgWidth = svgElement.clientWidth;
    const svgHeight = svgElement.clientHeight;

    document.body.removeChild(svgElement);

    canvas.width = svgWidth;
    canvas.height = svgHeight;

    ctx.drawImage(img, 0, 0, svgWidth, svgHeight);

    const pngUrl = canvas.toDataURL('image/png');

    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(svgUrl);
  };

  img.onerror = function () {
    console.error('Error loading SVG image for PNG conversion.');
    showError('Error converting SVG to PNG.');
  };
}

function showError(message) {
  const errorMessageDiv = document.getElementById('error-message');
  if (errorMessageDiv) {
    errorMessageDiv.textContent = '';
    if (message) {
      document.getElementById('calendar-svg').style.display = 'none';
      errorMessageDiv.style.display = 'block';
      errorMessageDiv.textContent = message;
    }
  } else {
    console.error(message);
  }
}

document.getElementById('file-input').addEventListener('change', handleInput);
document.getElementById('json-input').addEventListener('input', handleInput);

document.getElementById('download-btn').addEventListener('click', function() {
  const svgContent = document.getElementById('calendar-svg').innerHTML;
  downloadPNG(svgContent);
});
