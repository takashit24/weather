const statusElement = document.getElementById('status');
const weatherSection = document.getElementById('weather');
const forecastSection = document.getElementById('forecast');
const forecastList = document.getElementById('forecastList');
const locationElement = document.getElementById('location');
const updatedElement = document.getElementById('updated');
const temperatureElement = document.getElementById('temperature');
const descriptionElement = document.getElementById('description');
const windspeedElement = document.getElementById('windspeed');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const geolocationButton = document.getElementById('geolocationButton');

let hasSuccessfulGeolocation = false;

const weatherCodeMap = {
  0: '快晴',
  1: '晴れ',
  2: '薄曇り',
  3: '曇り',
  45: '霧',
  48: '霧（霧氷）',
  51: '弱い霧雨',
  53: '霧雨',
  55: '強い霧雨',
  56: '弱い氷の霧雨',
  57: '強い氷の霧雨',
  61: '弱い雨',
  63: '雨',
  65: '強い雨',
  66: '弱い氷の雨',
  67: '強い氷の雨',
  71: '弱い雪',
  73: '雪',
  75: '大雪',
  77: '雪あられ',
  80: 'にわか雨',
  81: '強いにわか雨',
  82: '激しいにわか雨',
  85: '弱いにわか雪',
  86: '強いにわか雪',
  95: '雷雨',
  96: '雷雨（雹）',
  99: '雷雨（大きな雹）'
};

function setStatus(message, type = 'info') {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
}

function setGeolocationButtonLoading() {
  if (!geolocationButton) {
    return;
  }
  geolocationButton.disabled = true;
  geolocationButton.setAttribute('aria-busy', 'true');
  geolocationButton.textContent = '取得中…';
}

function setGeolocationButtonIdle() {
  if (!geolocationButton) {
    return;
  }
  geolocationButton.disabled = false;
  geolocationButton.removeAttribute('aria-busy');
  geolocationButton.textContent = hasSuccessfulGeolocation ? '現在地を再取得' : '現在地を取得';
}

function disableGeolocationButton(message) {
  if (!geolocationButton) {
    return;
  }
  geolocationButton.disabled = true;
  geolocationButton.removeAttribute('aria-busy');
  geolocationButton.textContent = message;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { month: 'long', day: 'numeric', weekday: 'short' };
  return date.toLocaleDateString('ja-JP', options);
}

function weatherCodeToText(code) {
  return weatherCodeMap[code] || '不明な天気';
}

function clearForecast() {
  forecastList.innerHTML = '';
}

function showWeatherCard() {
  weatherSection.classList.remove('hidden');
}

function showForecastCard() {
  forecastSection.classList.remove('hidden');
}

function createForecastItem({ date, max, min, code }) {
  const li = document.createElement('li');
  li.className = 'forecast-item';

  const title = document.createElement('h3');
  title.textContent = date;
  li.appendChild(title);

  const desc = document.createElement('p');
  desc.textContent = weatherCodeToText(code);
  li.appendChild(desc);

  const temps = document.createElement('p');
  temps.className = 'forecast-temp';
  temps.textContent = `最高：${Math.round(max)}℃　最低：${Math.round(min)}℃`;
  li.appendChild(temps);

  return li;
}

async function fetchPlaceName(latitude, longitude) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse');
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('language', 'ja');
  url.searchParams.set('format', 'json');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      return `緯度 ${latitude.toFixed(2)}, 経度 ${longitude.toFixed(2)}`;
    }

    const place = data.results[0];
    const parts = [place.name];
    if (place.admin1 && place.admin1 !== place.name) {
      parts.push(place.admin1);
    }
    if (place.country) {
      parts.push(place.country);
    }
    return parts.filter(Boolean).join('・');
  } catch (error) {
    console.error(error);
    return `緯度 ${latitude.toFixed(2)}, 経度 ${longitude.toFixed(2)}`;
  }
}

async function fetchWeather(latitude, longitude, label) {
  setStatus('天気情報を取得しています…', 'info');

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('current_weather', 'true');
  url.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '3');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.current_weather || !data.daily) {
      throw new Error('天気データを取得できませんでした。');
    }

    const { current_weather: current, daily } = data;

    const locationName = label || (await fetchPlaceName(latitude, longitude));
    locationElement.textContent = locationName;

    temperatureElement.textContent = `${Math.round(current.temperature)}℃`;
    descriptionElement.textContent = weatherCodeToText(current.weathercode);
    windspeedElement.textContent = `風速：${Math.round(current.windspeed)}m/s`;

    const updatedTime = new Date(current.time);
    updatedElement.textContent = `更新：${updatedTime.toLocaleString('ja-JP')}`;

    clearForecast();
    const forecastItems = daily.time.map((date, index) => ({
      date,
      max: daily.temperature_2m_max[index],
      min: daily.temperature_2m_min[index],
      code: daily.weathercode[index]
    }));

    forecastItems.slice(0, 2).forEach((item) => {
      const formattedDate = formatDate(item.date);
      forecastList.appendChild(
        createForecastItem({
          date: formattedDate,
          max: item.max,
          min: item.min,
          code: item.code
        })
      );
    });

    showWeatherCard();
    showForecastCard();
    setStatus('最新の天気を表示しています。', 'success');
  } catch (error) {
    console.error(error);
    setStatus('天気情報の取得に失敗しました。時間をおいて再度お試しください。', 'error');
  }
}

async function handleCoordinates(latitude, longitude, label, options = {}) {
  const { fromGeolocation = false } = options;
  try {
    await fetchWeather(latitude, longitude, label);
    if (fromGeolocation) {
      hasSuccessfulGeolocation = true;
    }
  } finally {
    if (fromGeolocation) {
      setGeolocationButtonIdle();
    }
  }
}

function handleGeolocationSuccess(position) {
  const { latitude, longitude } = position.coords;
  handleCoordinates(latitude, longitude, undefined, { fromGeolocation: true });
}

function handleGeolocationError(error) {
  console.error(error);
  let message = '位置情報を取得できませんでした。検索ボックスから場所を指定してください。';
  if (error.code === error.PERMISSION_DENIED) {
    message = '位置情報の利用が許可されませんでした。検索ボックスから場所を指定してください。';
  } else if (error.code === error.POSITION_UNAVAILABLE) {
    message = '位置情報を取得できませんでした（電波状況をご確認ください）。検索をご利用ください。';
  } else if (error.code === error.TIMEOUT) {
    message = '位置情報の取得がタイムアウトしました。再試行するか検索をご利用ください。';
  }

  setStatus(message, 'warning');
  setGeolocationButtonIdle();
}

function requestGeolocation() {
  if (!('geolocation' in navigator)) {
    const insecureContextMessage = !window.isSecureContext
      ? '現在の接続では位置情報が利用できません（HTTPSでアクセスしてください）。検索をご利用ください。'
      : 'このブラウザでは位置情報が利用できません。検索をご利用ください。';

    setStatus(insecureContextMessage, 'warning');
    disableGeolocationButton('位置情報は利用できません');
    return;
  }

  setStatus('位置情報を取得しています…', 'info');
  setGeolocationButtonLoading();
  navigator.geolocation.getCurrentPosition(handleGeolocationSuccess, handleGeolocationError, {
    timeout: 10000
  });
}

async function searchPlaces(query) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'ja');
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Geocoding search failed: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

function renderSearchResults(results) {
  searchResults.innerHTML = '';

  if (results.length === 0) {
    const li = document.createElement('li');
    li.textContent = '候補が見つかりませんでした。';
    searchResults.appendChild(li);
    return;
  }

  results.forEach((result) => {
    const li = document.createElement('li');
    li.className = 'search-result-item';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = formatPlaceResult(result);
    button.addEventListener('click', () => {
      handleCoordinates(result.latitude, result.longitude, formatPlaceResult(result));
      searchResults.innerHTML = '';
      searchInput.value = '';
    });

    li.appendChild(button);
    searchResults.appendChild(li);
  });
}

function formatPlaceResult(result) {
  const parts = [result.name];
  if (result.admin1 && result.admin1 !== result.name) {
    parts.push(result.admin1);
  }
  if (result.country) {
    parts.push(result.country);
  }
  return parts.filter(Boolean).join('・');
}

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) {
    return;
  }

  setStatus(`「${query}」を検索しています…`, 'info');
  try {
    const results = await searchPlaces(query);
    if (results.length === 0) {
      setStatus('候補が見つかりませんでした。別のキーワードをお試しください。', 'warning');
    } else {
      setStatus('候補から場所を選んでください。', 'info');
    }
    renderSearchResults(results);
  } catch (error) {
    console.error(error);
    setStatus('場所の検索に失敗しました。時間をおいて再度お試しください。', 'error');
  }
});

if (geolocationButton) {
  geolocationButton.addEventListener('click', () => {
    requestGeolocation();
  });
  setGeolocationButtonIdle();
}

requestGeolocation();
