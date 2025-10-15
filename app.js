const statusElement = document.getElementById('status');
const weatherSection = document.getElementById('weather');
const cityElement = weatherSection.querySelector('.city');
const temperatureElement = weatherSection.querySelector('.temperature');
const descriptionElement = weatherSection.querySelector('.description');
const retryButton = document.getElementById('retry');

function setStatus(message) {
  statusElement.textContent = message;
  statusElement.classList.remove('hidden');
}

function showWeather(data) {
  cityElement.textContent = `都市名：${data.name}`;
  temperatureElement.textContent = `気温：${Math.round(data.main.temp)}℃`;
  descriptionElement.textContent = `天気：${data.weather[0].description}`;

  statusElement.classList.add('hidden');
  weatherSection.classList.remove('hidden');
}

function handleError(message) {
  weatherSection.classList.add('hidden');
  setStatus(message);
  retryButton.classList.remove('hidden');
}

async function fetchWeather(latitude, longitude) {
  const apiKey = 'YOUR_API_KEY';
  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  url.searchParams.set('lat', latitude);
  url.searchParams.set('lon', longitude);
  url.searchParams.set('appid', apiKey);
  url.searchParams.set('units', 'metric');
  url.searchParams.set('lang', 'ja');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`APIエラーが発生しました（${response.status}）`);
    }

    const data = await response.json();
    showWeather(data);
  } catch (error) {
    console.error(error);
    handleError('天気情報の取得に失敗しました。しばらくしてから再試行してください。');
  }
}

function requestLocation() {
  retryButton.classList.add('hidden');
  weatherSection.classList.add('hidden');
  setStatus('位置情報を取得しています…');

  if (!navigator.geolocation) {
    handleError('このブラウザーでは位置情報が利用できません。');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      setStatus('天気情報を取得しています…');
      fetchWeather(latitude, longitude);
    },
    (error) => {
      console.error(error);
      switch (error.code) {
        case error.PERMISSION_DENIED:
          handleError('位置情報の利用が拒否されました。設定を確認してください。');
          break;
        case error.POSITION_UNAVAILABLE:
          handleError('位置情報を取得できませんでした。環境を確認して再試行してください。');
          break;
        case error.TIMEOUT:
          handleError('位置情報の取得がタイムアウトしました。再試行してください。');
          break;
        default:
          handleError('位置情報の取得に失敗しました。再試行してください。');
      }
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

retryButton.addEventListener('click', requestLocation);

document.addEventListener('DOMContentLoaded', requestLocation);
