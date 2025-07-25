let forecastChart = null; 

async function getWeather() {
  const cityInput = document.getElementById("cityInput").value.trim();
  if (!cityInput) {
    alert("Please enter a city name!");
    return;
  }

  lastSearchedCity = cityInput;
  const unit = document.getElementById("unitSelect").value;
  const apiKey = "0e4be4d99fdba59e0d476cc3ec4d6b95";
  const weatherApiKey = "71e2378caa2843b393991127252507";
  const unitSymbol = unit === "metric" ? "°C" : unit === "imperial" ? "°F" : "K";

  const geoUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cityInput}&appid=${apiKey}&units=${unit}`;

  try {
    const georesponse = await fetch(geoUrl);
    const geodata = await georesponse.json();
    if (!georesponse.ok) throw new Error(geodata.message);

    const { lat, lon } = geodata.coord;
    const forecastLink = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&appid=${apiKey}&units=${unit}`;
    const forecastRes = await fetch(forecastLink);
    const forecastinfo = await forecastRes.json();
    if (!forecastRes.ok) throw new Error(forecastinfo.message);

    const temp = forecastinfo.current.temp;
    document.body.classList.remove("cold", "warm", "hot", "default");
    if (temp < 10) {
      document.body.classList.add("cold");
    } else if (temp <= 25) {
      document.body.classList.add("warm");
    } else {
      document.body.classList.add("hot");
    }
    const currentWeatherHTML = `
      <h2>${geodata.name}, ${geodata.sys.country}</h2>
      <p>Current: ${temp}${unitSymbol}, ${forecastinfo.daily[0].weather[0].main}</p>
      <p>Humidity: ${forecastinfo.current.humidity}%, Wind: ${forecastinfo.current.wind_speed} m/s</p>
    `;

    let hourlyHTML = "<h3>Next 24 Hours:</h3><div class='hourly'>";
    forecastinfo.hourly.slice(0, 24).forEach(hour => {
      const time = new Date(hour.dt * 1000).getHours().toString().padStart(2, "0");
      const temp = hour.temp.toFixed(1);
      const icon = hour.weather[0].icon;
      const desc = hour.weather[0].main;
      hourlyHTML += `
        <div class="hour">
          <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" title="${desc}" />
          <div>${time}:00</div>
          <div>${temp}${unitSymbol}</div>
        </div>
      `;
    });
    hourlyHTML += "</div>";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let forecastHTML = "<h3>7-Day Forecast:</h3><div class='forecast'>";
    forecastinfo.daily.slice(1, 8).forEach(day => {
      const date = new Date(day.dt * 1000);
      const icon = day.weather[0].icon;
      const desc = day.weather[0].main;
      forecastHTML += `
        <div class="day">
          <strong>${days[date.getDay()]}</strong><br>
          <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" title="${desc}" /><br>
          ${desc}<br>
          🌡️ ${day.temp.min.toFixed(0)}${unitSymbol} / ${day.temp.max.toFixed(0)}${unitSymbol}
        </div>
      `;
    });
    forecastHTML += "</div>";
    document.getElementById("weatherResult").innerHTML = currentWeatherHTML + hourlyHTML + forecastHTML;

    // 24h forec
    const weatherApiUrl = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${cityInput}&days=1&aqi=no&alerts=no`;
    const weatherApiRes = await fetch(weatherApiUrl);
    const weatherApiData = await weatherApiRes.json();

    // preparing data chart
    const labels = [];
    const openweathertemperature = [];
    const weatherApitemperature = [];

    for (let i = 0; i < 24; i++) {
      const hourData = forecastinfo.hourly[i];
      const hourTime = new Date(hourData.dt * 1000);
      labels.push(hourTime.getHours().toString().padStart(2, "0") + ":00");
      openweathertemperature.push(hourData.temp);
      const wapiHour = weatherApiData.forecast.forecastday[0].hour[i];
      weatherApitemperature.push(wapiHour.temp_c);
    }

    // the chart
    if (forecastChart) forecastChart.destroy();
    const ctx = document.getElementById("forecastChart").getContext("2d");
    forecastChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "OpenWeather",
            data: openweathertemperature,
            borderColor: "blue",
            backgroundColor: "rgba(0,0,255,0.1)",
            fill: true,
          },
          {
            label: "WeatherAPI",
            data: weatherApitemperature,
            borderColor: "orange",
            backgroundColor: "rgba(255,165,0,0.1)",
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "24h Forecast Comparison",
          },
        },
      },
    });

  } catch (error) {
    console.error("Error:", error);
    document.getElementById("weatherResult").innerHTML = `<p style="color:red;">${error.message}</p>`;
  }
}



async function getWeatherByLocation() {
  const openApiKey = "0e4be4d99fdba59e0d476cc3ec4d6b95";
  const weatherApiKey = "71e2378caa2843b393991127252507";
  const unit = document.getElementById("unitSelect").value;
  const unitSymbol = unit === "metric" ? "°C" : unit === "imperial" ? "°F" : "K";

  if (!navigator.geolocation) {
    alert("Geo not supported by the browser. Error");
    return;
  }

  navigator.geolocation.getCurrentPosition(async position => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    try {
      const openUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&appid=${openApiKey}&units=${unit}`;
      const openresponse = await fetch(openUrl);
      const opendatainfo = await openresponse.json();
      if (!openresponse.ok) throw new Error(opendatainfo.message);

      const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${lat},${lon}&days=1&aqi=no&alerts=no`;
      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json();
      if (!weatherRes.ok) throw new Error(weatherData.error?.message || "WeatherAPI fetch failed");

      // chart data preparing
      const labels = opendatainfo.hourly.slice(0, 24).map(hour =>
        new Date(hour.dt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
      const opentemperatures = opendatainfo.hourly.slice(0, 24).map(hour => hour.temp);
      const weatherTemperatures = weatherData.forecast.forecastday[0].hour.slice(0, 24).map(h => h.temp_c);

      // background color temperature
      const temp = opendatainfo.current.temp;
      document.body.classList.remove("cold", "warm", "hot");
      if (temp < 10) document.body.classList.add("cold");
      else if (temp <= 25) document.body.classList.add("warm");
      else document.body.classList.add("hot");

      // current weather
      const currentWeatherHTML = `
        <h2>Your Location</h2>
        <p>Current: ${temp}${unitSymbol}, ${opendatainfo.current.weather[0].main}</p>
        <p>Humidity: ${opendatainfo.current.humidity}%, Wind: ${opendatainfo.current.wind_speed} m/s</p>
      `;
      // 24h forecast
      let hourlyHTML = "<h3>Next 24 Hours:</h3><div class='hourly'>";
      opendatainfo.hourly.slice(0, 24).forEach(hour => {
        const time = new Date(hour.dt * 1000).getHours().toString().padStart(2, "0");
        const temp = hour.temp.toFixed(1);
        const icon = hour.weather[0].icon;
        const desc = hour.weather[0].main;
        hourlyHTML += `
          <div class="hour">
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" title="${desc}" />
            <div>${time}:00</div>
            <div>${temp}${unitSymbol}</div>
          </div>
        `;
      });
      hourlyHTML += "</div>";
      

      // 7 day forecast
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      let forecastHTML = "<h3>7-Day Forecast:</h3><div class='forecast'>";
      opendatainfo.daily.slice(1, 8).forEach(day => {
        const date = new Date(day.dt * 1000);
        const icon = day.weather[0].icon;
        const desc = day.weather[0].main;

        forecastHTML += `
          <div class="day">
            <strong>${days[date.getDay()]}</strong><br>
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" title="${desc}" /><br>
            ${desc}<br>
            🌡️ ${day.temp.min.toFixed(0)}${unitSymbol} / ${day.temp.max.toFixed(0)}${unitSymbol}
          </div>
        `;
      });
      forecastHTML += "</div>";
      document.getElementById("weatherResult").innerHTML = currentWeatherHTML + hourlyHTML + forecastHTML;

      // draw Chart
      const ctx = document.getElementById("forecastChart").getContext("2d");
      if (forecastChart) forecastChart.destroy();
      forecastChart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "OpenWeather",
              data: opentemperatures,
              borderColor: "blue",
              fill: true,
              backgroundColor: "rgba(0, 0, 255, 0.1)",
            },
            {
              label: "WeatherAPI",
              data: weatherTemperatures,
              borderColor: "orange",
              fill: true,
              backgroundColor: "rgba(255, 165, 0, 0.1)",
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "24h Forecast Comparison"
            }
          }
        }
      });

    } catch (err) {
      console.error("Error:", err);
      document.getElementById("weatherResult").innerHTML = `<p style="color:red;">${err.message}</p>`;
    }
  }, () => {
    alert("Can not find the location.");
  });
}



function saveCurrentCity() {
  if (!lastSearchedCity) return;
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  if (!favorites.includes(lastSearchedCity)) {
    favorites.push(lastSearchedCity);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderFavorites();
  }
}

function renderFavorites() {
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  const list = document.getElementById("favoritesList");
  list.innerHTML = "";

  favorites.forEach(city => {
    const li = document.createElement("li");
    li.textContent = city;
    li.onclick = () => {
      document.getElementById("cityInput").value = city;
      getWeather();
    };
    list.appendChild(li);
  });
}

renderFavorites();
