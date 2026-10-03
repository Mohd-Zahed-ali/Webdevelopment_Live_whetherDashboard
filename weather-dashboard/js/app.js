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
const feelsLikeValEl = document.getElementById('feels-like-val');
const humidityValEl = document.getElementById('humidity-val');
const windValEl = document.getElementById('wind-val');
const pressureValEl = document.getElementById('pressure-val');

let searchHistory = JSON.parse(localStorage.getItem('recent_cities')) || [];

document.addEventListener('DOMContentLoaded', () => {
    renderRecentSearches();
});

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) fetchWeatherData(city);
});

function decodeWMO(code) {
    const wmoMap = {
        0: { description: 'Clear Sky', icon: 'fa-sun' },
        1: { description: 'Mainly Clear', icon: 'fa-cloud-sun' },
        2: { description: 'Partly Cloudy', icon: 'fa-cloud-sun' },
        3: { description: 'Overcast', icon: 'fa-cloud' },
        45: { description: 'Foggy', icon: 'fa-smog' },
        51: { description: 'Drizzle', icon: 'fa-cloud-rain' },
        61: { description: 'Rain', icon: 'fa-cloud-showers-heavy' },
        71: { description: 'Snow', icon: 'fa-snowflake' },
        95: { description: 'Thunderstorm', icon: 'fa-bolt' }
    };
    return wmoMap[code] || { description: 'Clear', icon: 'fa-sun' };
}

async function fetchWeatherData(city) {
    showLoading();

    try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error(`City "${city}" not found.`);
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        if (!weatherData.current) {
            throw new Error('Failed to retrieve current weather parameters.');
        }

        displayWeather({
            cityName: name,
            country: country || '',
            temp: Math.round(weatherData.current.temperature_2m),
            feelsLike: Math.round(weatherData.current.apparent_temperature),
            humidity: weatherData.current.relative_humidity_2m,
            windSpeed: weatherData.current.wind_speed_10m,
            pressure: Math.round(weatherData.current.surface_pressure),
            wmoCode: weatherData.current.weather_code,
            lat: latitude,
            lon: longitude
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
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const conditionInfo = decodeWMO(data.wmoCode);
    weatherConditionEl.textContent = conditionInfo.description;
    weatherIconEl.className = `fa-solid ${conditionInfo.icon} weather-hero-icon`;

    tempValueEl.textContent = data.temp;
    feelsLikeValEl.textContent = `${data.feelsLike}°C`;
    humidityValEl.textContent = `${data.humidity}%`;
    windValEl.textContent = `${data.windSpeed} km/h`;
    pressureValEl.textContent = `${data.pressure} hPa`;

    weatherCard.classList.remove('hidden');

    // Trigger Week 3 forecast fetch if function exists
    if (typeof fetchForecastData === 'function') {
        fetchForecastData(data.lat, data.lon);
    }
}

function showLoading() {
    weatherCard.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
}

function hideLoading() { loadingSpinner.classList.add('hidden'); }

function showError(msg) {
    hideLoading();
    weatherCard.classList.add('hidden');
    errorText.textContent = msg;
    errorMessage.classList.remove('hidden');
}

function hideError() { errorMessage.classList.add('hidden'); }

function saveToHistory(cityName) {
    if (!searchHistory.includes(cityName)) {
        searchHistory.unshift(cityName);
        if (searchHistory.length > 4) searchHistory.pop();
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

async function fetchForecastData(lat, lon) {
    const forecastSection = document.getElementById('forecast-section');
    const forecastGrid = document.getElementById('forecast-grid');

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.daily) return;

        forecastGrid.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const dateStr = data.daily.time[i];
            const dateObj = new Date(dateStr + 'T00:00:00');
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

            const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
            const minTemp = Math.round(data.daily.temperature_2m_min[i]);
            const wmoInfo = decodeWMO(data.daily.weather_code[i]);

            const forecastCard = document.createElement('div');
            forecastCard.style.cssText = `
                background: var(--bg-main);
                padding: 12px 8px;
                border-radius: var(--radius);
                text-align: center;
                border: 1px solid var(--border-color);
            `;

            forecastCard.innerHTML = `
                <p style="font-weight: 600; font-size: 0.85rem; margin-bottom: 6px;">${dayName}</p>
                <i class="fa-solid ${wmoInfo.icon}" style="font-size: 1.5rem; color: var(--primary); margin-bottom: 6px;"></i>
                <p style="font-size: 0.85rem; font-weight: 700;">${maxTemp}° <span style="color: var(--text-secondary); font-weight: 400;">${minTemp}°</span></p>
            `;

            forecastGrid.appendChild(forecastCard);
        }

        forecastSection.classList.remove('hidden');
    } catch (err) {
        console.error('Forecast error:', err);
    }
}
