// --- DOM Elements Selection ---
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const recentSearchesContainer = document.getElementById('recent-searches');

const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const weatherCard = document.getElementById('weather-card');

const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const weatherConditionEl = document.getElementById('weather-condition');
const weatherIconEl = document.getElementById('weather-icon');
const tempValueEl = document.getElementById('temp-value');
const humidityValEl = document.getElementById('humidity-val');
const windValEl = document.getElementById('wind-val');

// State Array for Storage
let searchHistory = JSON.parse(localStorage.getItem('recent_cities')) || [];

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    renderRecentSearches();
});

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
        fetchWeatherData(city);
    }
});

// --- API & Core Functions ---

/**
 * Maps WMO weather code from Open-Meteo API to descriptive text & FontAwesome icon
 */
function decodeWMO(code) {
    const wmoMap = {
        0: { description: 'Clear Sky', icon: 'fa-sun' },
        1: { description: 'Mainly Clear', icon: 'fa-cloud-sun' },
        2: { description: 'Partly Cloudy', icon: 'fa-cloud-sun' },
        3: { description: 'Overcast', icon: 'fa-cloud' },
        45: { description: 'Foggy', icon: 'fa-smog' },
        48: { description: 'Depositing Rime Fog', icon: 'fa-smog' },
        51: { description: 'Light Drizzle', icon: 'fa-cloud-rain' },
        61: { description: 'Slight Rain', icon: 'fa-cloud-showers-heavy' },
        63: { description: 'Moderate Rain', icon: 'fa-cloud-showers-heavy' },
        71: { description: 'Slight Snow', icon: 'fa-snowflake' },
        95: { description: 'Thunderstorm', icon: 'fa-bolt' }
    };
    return wmoMap[code] || { description: 'Unspecified', icon: 'fa-cloud' };
}

async function fetchWeatherData(city) {
    showLoading();

    try {
        // 1. Geocoding API Request (City -> Lat/Long)
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error(`City "${city}" not found. Please verify spelling.`);
        }

        const location = geoData.results[0];
        const { latitude, longitude, name, country } = location;

        // 2. Weather API Request
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        if (!weatherData.current_weather) {
            throw new Error('Weather data currently unavailable.');
        }

        // 3. Render Data to UI
        displayWeather({
            cityName: name,
            country: country || '',
            temp: Math.round(weatherData.current_weather.temperature),
            windSpeed: weatherData.current_weather.windspeed,
            wmoCode: weatherData.current_weather.weathercode,
            humidity: weatherData.hourly?.relativehumidity_2m?.[0] ?? 'N/A'
        });

        saveToHistory(name);
    } catch (err) {
        showError(err.message);
    }
}

function displayWeather(data) {
    hideLoading();
    hideError();

    cityNameEl.textContent = `${data.cityName}${data.country ? ', ' + data.country : ''}`;
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });

    const conditionInfo = decodeWMO(data.wmoCode);
    weatherConditionEl.textContent = conditionInfo.description;
    
    // Reset and apply FontAwesome icon class
    weatherIconEl.className = `fa-solid ${conditionInfo.icon} weather-hero-icon`;

    tempValueEl.textContent = data.temp;
    humidityValEl.textContent = `${data.humidity}%`;
    windValEl.textContent = `${data.windSpeed} km/h`;

    weatherCard.classList.remove('hidden');
}

// --- Helper Functions (Loading, Error & History) ---

function showLoading() {
    weatherCard.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showError(msg) {
    hideLoading();
    weatherCard.classList.add('hidden');
    errorText.textContent = msg;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function saveToHistory(cityName) {
    if (!searchHistory.includes(cityName)) {
        searchHistory.unshift(cityName);
        if (searchHistory.length > 4) searchHistory.pop(); // Keep top 4
        localStorage.setItem('recent_cities', JSON.stringify(searchHistory));
        renderRecentSearches();
    }
}

function renderRecentSearches() {
    recentSearchesContainer.innerHTML = '';
    searchHistory.forEach(city => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = city;
        chip.onclick = () => {
            cityInput.value = city;
            fetchWeatherData(city);
        };
        recentSearchesContainer.appendChild(chip);
    });
}